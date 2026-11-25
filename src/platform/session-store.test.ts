/// <reference types="node" />
import { expect, test } from '@jest/globals';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyCommand, createGame, scores, type Action } from '../game/engine';
import { recoverySnapshot, type SessionWrite } from '../game/persistence';
import { SessionController } from '../game/session';
import { DEFAULT_SETTINGS } from '../game/setup';
import { developmentWords } from '../game/words';
import { SqliteSessionStore } from './session-store';

const setup = {
  mode: 'teams',
  players: ['a', 'b', 'c', 'd'].map((id) => ({ id, name: id })),
  teams: [
    { id: 'red', name: 'Red', playerIds: ['a', 'b'] },
    { id: 'blue', name: 'Blue', playerIds: ['c', 'd'] },
  ],
  teamOrder: ['blue', 'red'],
  playerOrder: [],
  settings: { ...DEFAULT_SETTINGS, rounds: 1 },
} as const;

function fixture(path = ':memory:') {
  const db = new DatabaseSync(path);
  const connection = {
    getFirstAsync: async <T>(sql: string, ...params: (string | number)[]) =>
      (db.prepare(sql).get(...params) as T | undefined) ?? null,
    getAllAsync: async <T>(sql: string, ...params: (string | number)[]) =>
      db.prepare(sql).all(...params) as T[],
    runAsync: async (sql: string, ...params: (string | number)[]) =>
      db.prepare(sql).run(...params),
    execAsync: async (sql: string) => db.exec(sql),
  };
  const database = {
    ...connection,
    withExclusiveTransactionAsync: async (
      task: (conn: typeof connection) => Promise<void>,
    ) => {
      db.exec('BEGIN IMMEDIATE');
      try {
        await task(connection);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
  let game = createGame('db-test', setup, developmentWords, () => 0);
  return {
    db,
    database,
    write: (key: string, previousKey: string | null, at = 0): SessionWrite => ({
      key,
      previousKey,
      game: recoverySnapshot(game, at),
      capturedAt: at,
    }),
    step: (action: Action) => {
      if (!game.turn) throw new Error('Missing test turn');
      game = applyCommand(
        game,
        { ...action, revision: game.revision, turnId: game.turn.id },
        developmentWords,
        () => 0,
      );
      return game;
    },
  };
}

test('reopens a disk-backed session through a tiebreaker and recovers its completed results', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'draw-party-recovery-'));
  const path = join(directory, 'session.sqlite');
  let connection = fixture(path);
  try {
    let store = await SqliteSessionStore.initialize(connection.database);
    let controller = new SessionController(
      setup,
      store,
      developmentWords,
      () => 0,
    );
    const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
    async function reopen() {
      await settle();
      expect(controller.readView().status).toBe('ready');
      const before = controller.read();
      connection.db.close();
      connection = fixture(path);
      store = await SqliteSessionStore.initialize(connection.database);
      const saved = await store.read();
      if (!saved) throw new Error('Missing committed session');
      expect(saved.game).toEqual(recoverySnapshot(before, 0));
      controller = new SessionController(
        setup,
        store,
        developmentWords,
        () => 0,
        () => 0,
        Date.now,
        saved,
      );
    }
    async function send(action: Action) {
      const input = controller.read();
      controller.dispatch(input, action);
      controller.dispatch(input, action);
      await settle();
    }

    await reopen();
    for (let index = 0; index < 4; index++) {
      await send({ kind: 'reveal' });
      await reopen();
      await send({ kind: 'start', at: 0 });
      await send({ kind: 'pause', at: 1500 });
      await reopen();
      expect(controller.read().turn?.phase).toEqual({
        kind: 'paused',
        remainingMs: 58500,
      });
      await send({ kind: 'resume', at: 2000 });
      if (index < 3) {
        await send({ kind: 'guess', at: 2100 });
        await reopen();
        await send({ kind: 'confirm' });
      } else {
        await send({ kind: 'expire', at: 60500 });
      }
      await reopen();
      await send({ kind: 'continue' });
      await reopen();
      await send({ kind: 'advance' });
      await reopen();
      if (index === 1) expect(controller.read().tiebreaker?.round).toBe(1);
    }
    const result = controller.read();
    expect(result.completion).toBe('tiebreaker');
    expect(result.winners).toEqual(['blue']);
    expect(scores(result)).toEqual({ blue: 2, red: 1 });
    expect(new Set(result.used.map(({ conceptId }) => conceptId)).size).toBe(4);
    expect(await store.loadRecentWords('en')).toHaveLength(4);
  } finally {
    connection.db.close();
    rmSync(path, { force: true });
    rmdirSync(directory);
  }
});

test('migrates the feasibility schema, leaves probe data readable, and version-checks settings and groups', async () => {
  const { db, database } = fixture();
  try {
    db.exec(`
      CREATE TABLE sample_snapshots (key TEXT PRIMARY KEY NOT NULL, version INTEGER NOT NULL, payload TEXT NOT NULL);
      INSERT INTO sample_snapshots VALUES ('sample', 1, '{"version":1,"revision":2,"player":"Ada","remainingMs":24000}');
    `);
    const store = await SqliteSessionStore.initialize(database);
    expect(db.prepare('PRAGMA user_version').get()).toEqual({
      user_version: 1,
    });
    expect(db.prepare('SELECT version FROM sample_snapshots').get()).toEqual({
      version: 1,
    });
    expect(await store.read()).toBeNull();
    expect(await store.loadInterfaceLanguage()).toBeNull();
    expect(await store.hasSeenFirstGameGuide()).toBe(false);
    await store.saveInterfaceLanguage('ar');
    await store.markFirstGameGuideSeen();
    await store.saveGroup('group', setup);
    const reopened = await SqliteSessionStore.initialize(database);
    expect(await reopened.loadInterfaceLanguage()).toBe('ar');
    expect(await reopened.hasSeenFirstGameGuide()).toBe(true);
    expect(await reopened.loadGroups()).toEqual([{ id: 'group', setup }]);
    db.exec('UPDATE saved_groups SET version = 5');
    await expect(reopened.loadGroups()).rejects.toThrow(
      'Unsupported saved group version',
    );
  } finally {
    db.close();
  }
});

test.each([
  ['en', 'en'],
  ['en', 'ar'],
  ['ar', 'en'],
  ['ar', 'ar'],
] as const)(
  'preserves interface %s and word bank %s on recovery and restart',
  async (interfaceLanguage, wordLanguage) => {
    const { db, database } = fixture();
    try {
      const store = await SqliteSessionStore.initialize(database);
      const settings = { ...setup.settings, interfaceLanguage, wordLanguage };
      const draft = { ...setup, settings };
      const controller = new SessionController(draft, store);
      const settle = () =>
        new Promise<void>((resolve) => setImmediate(resolve));
      await settle();
      expect(controller.read().turn?.word.language).toBe(wordLanguage);
      await store.saveInterfaceLanguage(
        interfaceLanguage === 'en' ? 'ar' : 'en',
      );
      const saved = await store.read();
      if (!saved) throw new Error('Missing committed session');
      expect(saved.game.setup.settings).toEqual(settings);
      expect(saved.game.turn?.word.language).toBe(wordLanguage);
      const resumed = new SessionController(
        draft,
        store,
        developmentWords,
        undefined,
        undefined,
        undefined,
        saved,
      );
      resumed.restart(resumed.read());
      await settle();
      const restarted = await store.read();
      expect(restarted?.game.setup.settings).toEqual(settings);
      expect(restarted?.game.turn?.word.language).toBe(wordLanguage);
    } finally {
      db.close();
    }
  },
);

test('round-trips real phases, rejects stale writes, and retains completed results until departure', async () => {
  const { db, database, write, step } = fixture();
  try {
    const store = await SqliteSessionStore.initialize(database);
    const initial = write('1', null);
    await store.commit(initial);
    const reserved = initial.game?.turn?.word;
    step({ kind: 'reveal' });
    const reveal = { ...write('2', '1'), revealedWord: reserved };
    db.exec(
      "CREATE TRIGGER fail_reveal BEFORE INSERT ON recent_words BEGIN SELECT RAISE(ABORT, 'injected failure'); END",
    );
    await expect(store.commit(reveal)).rejects.toThrow('injected failure');
    expect((await store.read())?.game).toEqual(initial.game);
    db.exec('DROP TRIGGER fail_reveal');
    await store.commit(reveal);
    await store.commit(reveal);
    expect(await store.loadRecentWords('en')).toEqual([reserved?.conceptId]);
    expect(await store.loadRecentWords('ar')).toEqual([]);
    expect(db.prepare('SELECT concept_id FROM recent_words').get()).toEqual({
      concept_id: `en:${reserved?.conceptId}`,
    });
    step({ kind: 'start', at: 0 });
    const checkpoint = write('3', '2', 2150);
    await store.commit(checkpoint);
    expect((await store.read())?.game.turn).toMatchObject({
      word: reserved,
      phase: { kind: 'paused', remainingMs: 57850 },
    });
    await expect(store.commit(reveal)).rejects.toThrow('Stale session write');
    step({ kind: 'guess', at: 3000 });
    step({ kind: 'confirm' });
    step({ kind: 'continue' });
    const next = step({ kind: 'advance' });
    await store.commit(write('prior', '3'));
    expect((await store.read())?.game.previousResult).toEqual(
      next.previousResult,
    );
    expect(next.previousResult?.turn.phase.kind).toBe('between');
    expect(step({ kind: 'reveal' }).previousResult).toBeUndefined();
    step({ kind: 'start', at: 0 });
    step({ kind: 'expire', at: 60000 });
    step({ kind: 'continue' });
    const final = step({ kind: 'advance' });
    await store.commit(write('4', 'prior'));
    const reopened = await SqliteSessionStore.initialize(database);
    expect((await reopened.read())?.game).toEqual(final);
    expect(final.winners).toEqual(['blue']);
    expect(final.finalTurn?.phase).toEqual({
      kind: 'between',
      outcome: { kind: 'timeout' },
    });
    const invalid = JSON.stringify({ ...final, winners: ['unknown'] });
    db.prepare('UPDATE active_session SET payload = ?').run(invalid);
    await expect(reopened.read()).rejects.toThrow('Invalid saved game data');
    expect(await reopened.inspect()).toEqual({ kind: 'damaged', key: '4' });
    expect(await reopened.head()).toBe('4');
    const departure = { ...write('5', '4'), game: null };
    await reopened.commit(departure);
    await reopened.commit(departure);
    expect(await reopened.read()).toBeNull();
    await expect(reopened.commit(checkpoint)).rejects.toThrow(
      'Stale session write',
    );
  } finally {
    db.close();
  }
});

test('reopens reveal, pending and between phases and durably edits a restored score once', async () => {
  const { db, database, write, step } = fixture();
  try {
    const store = await SqliteSessionStore.initialize(database);
    await store.commit(write('handoff', null));
    const reveal = step({ kind: 'reveal' });
    await store.commit({
      ...write('reveal', 'handoff'),
      revealedWord: reveal.turn?.word,
    });
    expect(
      await (await SqliteSessionStore.initialize(database)).inspect(),
    ).toMatchObject({
      kind: 'available',
      game: reveal,
    });
    step({ kind: 'start', at: 100 });
    const pending = step({ kind: 'guess', at: 970 });
    await store.commit(write('pending', 'reveal', 970));
    expect(
      (await (await SqliteSessionStore.initialize(database)).read())?.game,
    ).toEqual(pending);
    step({ kind: 'confirm' });
    const between = step({ kind: 'continue' });
    await store.commit(write('between', 'pending'));
    const reopened = await SqliteSessionStore.initialize(database);
    expect((await reopened.read())?.game).toEqual(between);
    const advanced = step({ kind: 'advance' });
    await reopened.commit(write('advance', 'between'));
    const saved = await reopened.read();
    expect(saved?.game).toEqual(advanced);
    expect(saved?.game.previousResult?.turn).toEqual(between.turn);
    if (!saved) throw new Error('Missing saved game');
    const controller = new SessionController(
      setup,
      reopened,
      undefined,
      () => 0,
      () => 100000,
      () => 999999,
      saved,
    );
    expect(controller.readView().status).toBe('ready');
    expect(scores(controller.read())).toEqual({ blue: 1, red: 0 });
    const input = controller.read();
    db.exec(
      "CREATE TRIGGER fail_correction BEFORE UPDATE ON active_session BEGIN SELECT RAISE(ABORT, 'injected failure'); END",
    );
    controller.correct(input, null);
    controller.correct(input, null);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(controller.readView().status).toBe('retry');
    expect((await reopened.read())?.game).toEqual(advanced);
    db.exec('DROP TRIGGER fail_correction');
    controller.retry();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect((await reopened.read())?.game).toEqual(controller.read());
    expect(controller.read().results).toEqual([{ kind: 'violation' }]);
    expect(scores(controller.read())).toEqual({ blue: 0, red: 0 });
    controller.restart(controller.read());
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(controller.read().setup).toEqual(setup);
    expect(controller.read().turn?.slot.index).toBe(0);
    expect(controller.read().results).toEqual([]);
    expect(controller.read().turn?.word).not.toEqual(reveal.turn?.word);
    expect(await reopened.loadRecentWords('en')).toEqual([
      reveal.turn?.word.conceptId,
    ]);
    controller.leave(() => {});
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(await reopened.read()).toBeNull();
    expect(await reopened.loadRecentWords('en')).toEqual([
      reveal.turn?.word.conceptId,
    ]);
  } finally {
    db.close();
  }
});

test('a game started from a saved group keeps its roster after the group is edited, renamed, or deleted', async () => {
  const { db, database } = fixture();
  try {
    const store = await SqliteSessionStore.initialize(database);
    await store.saveGroup('friends', setup, ' Friday ');
    const groups = await store.loadGroups();
    expect(groups).toEqual([{ id: 'friends', name: 'Friday', setup }]);
    new SessionController(groups[0].setup, store);
    await new Promise<void>((resolve) => setImmediate(resolve));
    const reopened = await SqliteSessionStore.initialize(database);
    const edited = {
      ...setup,
      players: setup.players.map((player) => ({
        ...player,
        name: player.name.toUpperCase(),
      })),
      teams: [
        { ...setup.teams[0], playerIds: ['a', 'c'] },
        { ...setup.teams[1], playerIds: ['b', 'd'] },
      ],
    };
    await reopened.saveGroup('friends', edited, 'Saturday');
    expect(await reopened.loadGroups()).toEqual([
      { id: 'friends', name: 'Saturday', setup: edited },
    ]);
    expect((await reopened.read())?.game.setup).toEqual(setup);
    await reopened.deleteGroup('friends');
    expect(await reopened.loadGroups()).toEqual([]);
    expect((await reopened.read())?.game.setup).toEqual(setup);
  } finally {
    db.close();
  }
});
