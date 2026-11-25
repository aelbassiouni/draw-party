import { expect, test } from '@jest/globals';
import {
  applyCommand,
  createGame,
  eligibleGuessers,
  remainingAt,
  scores,
  visibleWord,
  type Action,
  type Command,
  type Game,
} from './engine';
import { DEFAULT_SETTINGS, validateSetup, type Settings } from './setup';
import { developmentWords } from './words';

function game(timerSeconds: Settings['timerSeconds'] = 30, teams = false) {
  const setup = validateSetup({
    mode: teams ? 'teams' : 'freeForAll',
    players: ['a', 'b', 'c', 'd'].map((id) => ({ id, name: id })),
    playerOrder: teams ? [] : ['a', 'b', 'c', 'd'],
    teamOrder: teams ? ['red', 'blue'] : [],
    teams: teams
      ? [
          { id: 'red', name: 'Red', playerIds: ['a', 'b'] },
          { id: 'blue', name: 'Blue', playerIds: ['c', 'd'] },
        ]
      : [],
    settings: { ...DEFAULT_SETTINGS, rounds: 1, timerSeconds },
  });
  if (!setup.ok) throw new Error(setup.errors.join(', '));
  return createGame('test-game', setup.value, developmentWords, () => 0);
}

function command(game: Game, input: Action): Command {
  if (!game.turn) throw new Error('Expected an active turn');
  return { ...input, turnId: game.turn.id, revision: game.revision };
}

function apply(game: Game, cmd: Command) {
  return applyCommand(game, cmd, developmentWords, () => 0);
}

function send(game: Game, input: Action) {
  return apply(game, command(game, input));
}

function start(state: Game, at = 100) {
  return send(send(state, { kind: 'reveal' }), { kind: 'start', at });
}

test('only legal phases expose the word and stale commands cannot advance', () => {
  const initial = game();
  expect(visibleWord(initial, true)).toBeNull();
  expect(send(initial, { kind: 'start', at: 0 })).toBe(initial);
  const reveal = command(initial, { kind: 'reveal' });
  const revealed = apply(initial, reveal);
  const word = visibleWord(revealed, true);
  expect(word).toBeTruthy();
  expect(apply(revealed, reveal)).toBe(revealed);
  const drawing = send(revealed, { kind: 'start', at: 100 });
  expect(visibleWord(drawing)).toBeNull();
  expect(visibleWord(drawing, true)).toBe(word);
  const paused = send(drawing, { kind: 'pause', at: 2100 });
  expect(visibleWord(paused, true)).toBeNull();
  const resumed = send(paused, { kind: 'resume', at: 10000 });
  expect(remainingAt(resumed, 10000)).toBe(28000);
  expect(visibleWord(resumed, true)).toBe(word);
  const violation = send(paused, { kind: 'endWithoutPoints' });
  expect(scores(violation)).toEqual({ a: 0, b: 0, c: 0, d: 0 });
  const between = send(violation, { kind: 'continue' });
  const advance = command(between, { kind: 'advance' });
  const next = apply(between, advance);
  expect(next.turn?.slot.drawerId).toBe('b');
  expect(next.turn?.id).not.toBe(initial.turn?.id);
  expect(apply(next, advance)).toBe(next);
});

test.each([30, 60, 90, 120] as const)(
  'uses elapsed time for the %s-second timer',
  (seconds) => {
    const drawing = start(game(seconds));
    const deadline = 100 + seconds * 1000;
    expect(remainingAt(drawing, deadline - 1)).toBe(1);
    const guess = command(drawing, { kind: 'guess', at: deadline - 1 });
    const expire = command(drawing, { kind: 'expire', at: deadline + 5000 });
    const pending = apply(drawing, guess);
    expect(remainingAt(pending, deadline + 5000)).toBe(1);
    expect(visibleWord(pending, true)).toBeNull();
    expect(apply(pending, expire)).toBe(pending);
    const timedOut = apply(drawing, expire);
    expect(remainingAt(timedOut, deadline + 5000)).toBe(0);
    expect(apply(timedOut, expire)).toBe(timedOut);
    expect(send(drawing, { kind: 'guess', at: deadline }).turn?.phase).toEqual(
      timedOut.turn?.phase,
    );
    expect(send(drawing, { kind: 'expire', at: deadline - 1 })).toBe(drawing);
  },
);

test('credits simultaneous eligible guessers and the drawer exactly once', () => {
  const drawing = start(game());
  const pending = send(drawing, { kind: 'guess', at: 500 });
  const resumed = send(pending, { kind: 'resume', at: 2500 });
  expect(remainingAt(resumed, 2500)).toBe(29600);
  expect(visibleWord(resumed, true)).toBe(visibleWord(drawing, true));
  for (const guesserIds of [[], ['a'], ['b', 'b'], ['unknown']]) {
    expect(send(pending, { kind: 'confirm', guesserIds })).toBe(pending);
  }
  const confirm = command(pending, { kind: 'confirm', guesserIds: ['b', 'd'] });
  const result = apply(pending, confirm);
  expect(visibleWord(result)).toBeTruthy();
  expect(scores(result)).toEqual({ a: 1, b: 1, c: 0, d: 1 });
  expect(apply(result, confirm)).toBe(result);
  const continued = send(result, { kind: 'continue' });
  expect(scores(continued)).toEqual(scores(result));
  expect(send(continued, { kind: 'continue' })).toBe(continued);
});

test('timeout defaults to zero and can count a last-second team guess once', () => {
  const drawing = start(game(30, true));
  expect(eligibleGuessers(drawing)).toEqual(['b']);
  const timeout = send(drawing, { kind: 'expire', at: 30100 });
  expect(visibleWord(timeout)).toBeTruthy();
  expect(scores(timeout)).toEqual({ red: 0, blue: 0 });
  expect(send(timeout, { kind: 'lastSecond', guesserIds: ['c'] })).toBe(
    timeout,
  );
  const result = send(timeout, { kind: 'lastSecond' });
  expect(scores(result)).toEqual({ red: 1, blue: 0 });
  expect(send(result, { kind: 'lastSecond' })).toBe(result);
  const second = send(send(result, { kind: 'continue' }), { kind: 'advance' });
  const pending = send(start(second), { kind: 'guess', at: 200 });
  const final = send(
    send(send(pending, { kind: 'confirm' }), { kind: 'continue' }),
    { kind: 'advance' },
  );
  expect(final.completion).toBeNull();
  expect(final.turn?.slot.drawerId).toBe('b');
  expect(scores(final)).toEqual({ red: 1, blue: 1 });
});
