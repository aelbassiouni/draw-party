import type { SessionStorage, SessionWrite } from '../game/persistence';
import type { Language, SessionSetup } from '../game/setup';
import { decodeSession, decodeSetup } from './session-codec';

type Parameter = string | number;
type Connection = {
  getFirstAsync<T>(sql: string, ...params: Parameter[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: Parameter[]): Promise<T[]>;
  runAsync(sql: string, ...params: Parameter[]): Promise<unknown>;
  execAsync(sql: string): Promise<void>;
};
type Database = Connection & {
  withExclusiveTransactionAsync(
    task: (db: Connection) => Promise<void>,
  ): Promise<void>;
};

export const SESSION_DATABASE = 'draw-party-feasibility.db';
const version = 1;
const schema = `
  CREATE TABLE app_settings (
    key TEXT PRIMARY KEY NOT NULL, version INTEGER NOT NULL, payload TEXT NOT NULL
  );
  CREATE TABLE saved_groups (
    id TEXT PRIMARY KEY NOT NULL, version INTEGER NOT NULL, payload TEXT NOT NULL
  );
  CREATE TABLE active_session (
    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
    write_key TEXT NOT NULL, version INTEGER NOT NULL, payload TEXT NOT NULL,
    captured_at INTEGER NOT NULL
  );
  CREATE TABLE recent_words (
    concept_id TEXT PRIMARY KEY NOT NULL, seen_at INTEGER NOT NULL
  );
  PRAGMA user_version = 1;
`;

async function head(db: Pick<Database, 'getFirstAsync'>) {
  return (
    (
      await db.getFirstAsync<{ write_key: string }>(
        'SELECT write_key FROM active_session WHERE singleton = 1',
      )
    )?.write_key ?? null
  );
}

export class SqliteSessionStore implements SessionStorage {
  private constructor(private readonly db: Database) {}

  static async initialize(db: Database) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      const row = await transaction.getFirstAsync<{ user_version: number }>(
        'PRAGMA user_version',
      );
      if (row?.user_version === 0) await transaction.execAsync(schema);
      else if (row?.user_version !== version)
        throw new Error('Unsupported database version');
    });
    return new SqliteSessionStore(db);
  }

  head() {
    return head(this.db);
  }

  private readRow() {
    return this.db.getFirstAsync<{
      version: number;
      payload: string;
      write_key: string;
      captured_at: number;
    }>(
      'SELECT version, payload, write_key, captured_at FROM active_session WHERE singleton = 1',
    );
  }

  async read() {
    const row = await this.readRow();
    return (
      row && {
        game: decodeSession(row.payload, row.version),
        key: row.write_key,
        capturedAt: row.captured_at,
      }
    );
  }

  async inspect() {
    const row = await this.readRow();
    if (!row) return { kind: 'empty' } as const;
    try {
      return {
        kind: 'available',
        game: decodeSession(row.payload, row.version),
        key: row.write_key,
      } as const;
    } catch {
      return { kind: 'damaged', key: row.write_key } as const;
    }
  }

  async loadRecentWords(language: Language) {
    const prefix = language + ':';
    const rows = await this.db.getAllAsync<{ concept_id: string }>(
      'SELECT concept_id FROM recent_words WHERE substr(concept_id, 1, ?) = ? ORDER BY seen_at, rowid',
      prefix.length,
      prefix,
    );
    return rows.map(({ concept_id }) => concept_id.slice(prefix.length));
  }

  async commit(write: SessionWrite) {
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      const current = await head(transaction);
      if (current === write.key || (current === null && write.game === null))
        return;
      if (current !== write.previousKey) throw new Error('Stale session write');
      if (!write.game) {
        await transaction.runAsync(
          'DELETE FROM active_session WHERE singleton = 1',
        );
        return;
      }
      await transaction.runAsync(
        `
        INSERT INTO active_session VALUES (1, ?, ?, ?, ?)
        ON CONFLICT(singleton) DO UPDATE SET write_key = excluded.write_key,
          version = excluded.version, payload = excluded.payload, captured_at = excluded.captured_at
      `,
        write.key,
        version,
        JSON.stringify(write.game),
        write.capturedAt,
      );
      if (write.revealedWord) {
        await transaction.runAsync(
          `
          INSERT INTO recent_words VALUES (?, MAX(?, COALESCE((SELECT MAX(seen_at) + 1 FROM recent_words), 0)))
          ON CONFLICT(concept_id) DO UPDATE SET seen_at = excluded.seen_at
        `,
          `${write.revealedWord.language}:${write.revealedWord.conceptId}`,
          write.capturedAt,
        );
      }
    });
  }

  async saveGroup(id: string, setup: SessionSetup, name?: string) {
    const validated = decodeSetup(setup);
    const trimmed = name?.trim();
    if (name !== undefined && !trimmed)
      throw new Error('A group name is required');
    await this.db.runAsync(
      `
      INSERT INTO saved_groups VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET version = excluded.version, payload = excluded.payload
    `,
      id,
      version,
      JSON.stringify(trimmed ? { name: trimmed, setup: validated } : validated),
    );
  }

  async loadGroups() {
    const rows = await this.db.getAllAsync<{
      id: string;
      version: number;
      payload: string;
    }>('SELECT id, version, payload FROM saved_groups ORDER BY id');
    return rows.map((row) => {
      if (row.version !== version)
        throw new Error('Unsupported saved group version');
      const payload = JSON.parse(row.payload);
      if (payload && typeof payload.name === 'string' && payload.name.trim()) {
        return {
          id: row.id,
          name: payload.name,
          setup: decodeSetup(payload.setup),
        };
      }
      return { id: row.id, setup: decodeSetup(payload) };
    });
  }

  async deleteGroup(id: string) {
    await this.db.runAsync('DELETE FROM saved_groups WHERE id = ?', id);
  }

  async saveInterfaceLanguage(language: 'en' | 'ar') {
    await this.db.runAsync(
      `
      INSERT INTO app_settings VALUES ('interface_language', ?, ?)
      ON CONFLICT(key) DO UPDATE SET version = excluded.version, payload = excluded.payload
    `,
      version,
      JSON.stringify(language),
    );
  }

  async loadInterfaceLanguage() {
    const row = await this.db.getFirstAsync<{
      version: number;
      payload: string;
    }>(
      "SELECT version, payload FROM app_settings WHERE key = 'interface_language'",
    );
    if (!row) return null;
    const language: unknown = JSON.parse(row.payload);
    if (row.version !== version || (language !== 'en' && language !== 'ar'))
      throw new Error('Invalid saved interface language');
    return language;
  }

  async hasSeenFirstGameGuide() {
    const row = await this.db.getFirstAsync<{
      version: number;
      payload: string;
    }>(
      "SELECT version, payload FROM app_settings WHERE key = 'first_game_guide'",
    );
    return row?.version === version && row.payload === 'true';
  }

  async markFirstGameGuideSeen() {
    await this.db.runAsync(
      `
      INSERT INTO app_settings VALUES ('first_game_guide', ?, 'true')
      ON CONFLICT(key) DO UPDATE SET version = excluded.version, payload = excluded.payload
    `,
      version,
    );
  }
}
