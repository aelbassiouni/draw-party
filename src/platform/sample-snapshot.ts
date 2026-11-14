import * as SQLite from 'expo-sqlite';

export interface SampleSnapshot {
  version: 1;
  revision: number;
  player: string;
  remainingMs: number;
}

const DATABASE = 'draw-party-feasibility.db';
const KEY = 'sample';

export class SampleSnapshotStore {
  private constructor(private readonly db: SQLite.SQLiteDatabase) {}

  static async open(): Promise<SampleSnapshotStore> {
    const db = await SQLite.openDatabaseAsync(DATABASE);
    await db.execAsync(
      'CREATE TABLE IF NOT EXISTS sample_snapshots (key TEXT PRIMARY KEY NOT NULL, version INTEGER NOT NULL, payload TEXT NOT NULL)',
    );
    return new SampleSnapshotStore(db);
  }

  async read(): Promise<SampleSnapshot | null> {
    const row = await this.db.getFirstAsync<{
      version: number;
      payload: string;
    }>('SELECT version, payload FROM sample_snapshots WHERE key = ?', KEY);
    if (!row) return null;
    if (row.version !== 1)
      throw new Error('Unsupported sample snapshot version');
    const value: unknown = JSON.parse(row.payload);
    if (
      !value ||
      typeof value !== 'object' ||
      !('version' in value) ||
      value.version !== 1 ||
      !('revision' in value) ||
      typeof value.revision !== 'number' ||
      !('player' in value) ||
      typeof value.player !== 'string' ||
      !('remainingMs' in value) ||
      typeof value.remainingMs !== 'number'
    ) {
      throw new Error('Invalid sample snapshot');
    }
    return value as SampleSnapshot;
  }

  async save(snapshot: SampleSnapshot, failAfterWrite = false): Promise<void> {
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        'INSERT OR REPLACE INTO sample_snapshots (key, version, payload) VALUES (?, ?, ?)',
        KEY,
        snapshot.version,
        JSON.stringify(snapshot),
      );
      if (failAfterWrite) throw new Error('Injected failure after write');
    });
  }

  async close(): Promise<void> {
    await this.db.closeAsync();
  }
}
