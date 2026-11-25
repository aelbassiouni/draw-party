import { expect, test } from '@jest/globals';
import { remainingAt, scores, type Action } from './engine';
import type { SessionWrite } from './persistence';
import { SessionController } from './session';
import { DEFAULT_SETTINGS } from './setup';

function writes() {
  let saved: SessionWrite | undefined;
  let blocked: { resolve: () => void; reject: () => void } | undefined;
  let blockNext = false;
  const attempts: SessionWrite[] = [];
  return {
    attempts,
    latest: () => saved,
    delay: () => {
      blockNext = true;
    },
    release: (fail = false) => {
      if (!blocked) throw new Error('No write to release');
      if (fail) blocked.reject();
      else blocked.resolve();
      blocked = undefined;
    },
    head: async () => saved?.key ?? null,
    commit: async (write: SessionWrite) => {
      attempts.push(write);
      if (blockNext) {
        blockNext = false;
        await new Promise<void>((resolve, reject) => {
          blocked = {
            resolve: () => resolve(),
            reject: () => reject(new Error('Injected write failure')),
          };
        });
      }
      expect(write.previousKey).toBe(saved?.key ?? null);
      saved = write;
    },
  };
}

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

async function fixture() {
  const storage = writes();
  let now = 0;
  const clock = (at: number) => {
    now = at;
  };
  const controller = new SessionController(
    {
      mode: 'freeForAll',
      players: ['a', 'b', 'c'].map((id) => ({ id, name: id })),
      playerOrder: ['a', 'b', 'c'],
      teams: [],
      teamOrder: [],
      settings: { ...DEFAULT_SETTINGS, rounds: 1, timerSeconds: 30 },
    },
    storage,
    undefined,
    () => 0,
    () => now,
    () => 10000 + now,
  );
  const dispatch = (action: Action) =>
    controller.dispatch(controller.read(), action);
  await settle();
  dispatch({ kind: 'reveal' });
  await settle();
  dispatch({ kind: 'start', at: 0 });
  await settle();
  return { storage, clock, controller, dispatch };
}

test('freezes a queued guess at input time and retries the same score commit', async () => {
  const { storage, clock, controller, dispatch } = await fixture();
  clock(1000);
  storage.delay();
  controller.checkpoint(1000);
  clock(1250);
  dispatch({ kind: 'guess', at: 1250 });
  dispatch({ kind: 'guess', at: 1250 });
  expect(controller.readView()).toMatchObject({
    status: 'saving',
    frozenMs: 28750,
  });
  clock(35000);
  storage.release();
  await settle();
  expect(controller.read().turn?.phase).toEqual({
    kind: 'pending',
    remainingMs: 28750,
  });
  const guess = storage.latest();
  storage.delay();
  const confirmation = { kind: 'confirm', guesserIds: ['b'] } as const;
  dispatch(confirmation);
  dispatch(confirmation);
  expect(scores(controller.read())).toEqual({ a: 0, b: 0, c: 0 });
  storage.release(true);
  await settle();
  expect(storage.latest()).toBe(guess);
  expect(controller.readView().status).toBe('retry');
  const failed = storage.attempts.at(-1);
  controller.retry();
  await settle();
  expect(storage.latest()).toEqual(failed);
  expect(scores(controller.read())).toEqual({ a: 1, b: 1, c: 0 });
  dispatch(confirmation);
  expect(storage.latest()).toEqual(failed);
});

test('reserves one next word across a failed advancement and repeated taps', async () => {
  const { storage, controller, dispatch } = await fixture();
  dispatch({ kind: 'guess', at: 20 });
  await settle();
  dispatch({ kind: 'confirm', guesserIds: ['b'] });
  await settle();
  dispatch({ kind: 'continue' });
  await settle();
  const prior = controller.read();
  storage.delay();
  dispatch({ kind: 'advance' });
  dispatch({ kind: 'advance' });
  const failed = storage.attempts.at(-1);
  storage.release(true);
  await settle();
  expect(controller.read()).toBe(prior);
  controller.retry();
  await settle();
  expect(storage.latest()).toEqual(failed);
  const reserved = controller.read().turn?.word;
  expect(reserved).toEqual(failed?.game?.turn?.word);
  dispatch({ kind: 'reveal' });
  await settle();
  expect(storage.latest()?.game?.turn?.word).toEqual(reserved);
  expect(storage.latest()?.revealedWord).toMatchObject({
    conceptId: reserved?.conceptId,
    language: reserved?.language,
  });
});

test.each([
  { scenario: 'normal', cut: 1650, durableAt: 1000, unsaved: 650 },
  { scenario: 'delayed', cut: 2500, durableAt: 0, unsaved: 2500 },
  { scenario: 'failed', cut: 2450, durableAt: 1000, unsaved: 1450 },
  { scenario: 'terminated', cut: 3350, durableAt: 1000, unsaved: 2350 },
])(
  'measures checkpoint age and unsaved time for $scenario writes',
  async ({ scenario, cut, durableAt, unsaved }) => {
    const { storage, clock, controller } = await fixture();
    if (scenario === 'delayed') storage.delay();
    clock(1000);
    controller.checkpoint(1000);
    await settle();
    if (scenario === 'failed' || scenario === 'terminated') {
      storage.delay();
      clock(2000);
      controller.checkpoint(2000);
    }
    clock(cut);
    if (scenario === 'delayed') controller.checkpoint(cut);
    if (scenario === 'failed') {
      storage.release(true);
      await settle();
    }
    const durable = storage.latest();
    if (!durable?.game) throw new Error('Missing durable game');
    expect(durable.game.turn?.word.id).toBe(controller.read().turn?.word.id);
    expect(durable.game.turn?.phase.kind).toBe('paused');
    expect(durable.capturedAt).toBe(10000 + durableAt);
    expect(10000 + cut - durable.capturedAt).toBe(unsaved);
    expect(
      remainingAt(durable.game, 99999) - remainingAt(controller.read(), cut),
    ).toBe(unsaved);
    if (scenario === 'delayed' || scenario === 'failed') {
      expect(controller.readView()).toMatchObject({
        status: scenario === 'delayed' ? 'saving' : 'retry',
        frozenMs: 30000 - cut,
      });
      const count = storage.attempts.length;
      clock(12000);
      controller.checkpoint(12000);
      expect(storage.attempts).toHaveLength(count);
      if (scenario === 'delayed') storage.release();
      else controller.retry();
      await settle();
      expect(controller.read().turn?.phase).toEqual({
        kind: 'paused',
        remainingMs: 30000 - cut,
      });
    }
  },
);

test('a failed or interrupted resume retries to a durable pause and needs a fresh resume', async () => {
  const { storage, clock, controller, dispatch } = await fixture();
  clock(2200);
  controller.interrupt(2200);
  await settle();
  storage.delay();
  dispatch({ kind: 'resume', at: 3000 });
  controller.interrupt(4200);
  storage.release(true);
  await settle();
  expect(controller.readView().status).toBe('retry');
  clock(8000);
  controller.retry();
  await settle();
  expect(controller.read().turn?.phase).toEqual({
    kind: 'paused',
    remainingMs: 27800,
  });
  dispatch({ kind: 'resume', at: 8000 });
  await settle();
  expect(controller.read().turn?.phase).toEqual({
    kind: 'drawing',
    remainingMs: 27800,
    startedAt: 8000,
  });
});
