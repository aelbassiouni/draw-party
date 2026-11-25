import { expect, test } from '@jest/globals';
import {
  applyCommand,
  correctFinalTurn,
  createGame,
  editableResult,
  eligibleGuessers,
  scoreBreakdown,
  scores,
  type Action,
  type Game,
} from './engine';
import { DEFAULT_SETTINGS, validateSetup } from './setup';
import { developmentWords, type Word } from './words';

const ids = ['a', 'b', 'c', 'd'];
function scenario(capacity: number, teams = false) {
  const bank = developmentWords
    .filter(({ language }) => language === 'en')
    .slice(0, capacity);
  const setup = validateSetup({
    mode: teams ? 'teams' : 'freeForAll',
    players: ids.map((id) => ({ id, name: id })),
    playerOrder: teams ? [] : ids,
    teamOrder: teams ? ['red', 'blue'] : [],
    teams: teams
      ? [
          { id: 'red', name: 'Red', playerIds: ['a', 'b'] },
          { id: 'blue', name: 'Blue', playerIds: ['c', 'd'] },
        ]
      : [],
    settings: { ...DEFAULT_SETTINGS, rounds: 1 },
  });
  if (!setup.ok) throw new Error('Invalid fixture');
  // All concepts are recent, and duplicate records do not increase capacity.
  const duplicated = bank.flatMap((word) => [word, word]);
  return {
    bank: duplicated,
    game: createGame(
      'test',
      setup.value,
      duplicated,
      () => 0,
      bank.map((word) => word.conceptId),
    ),
  };
}

function finish(game: Game, bank: readonly Word[], guesserIds?: string[]) {
  const actions: Action[] = [
    { kind: 'reveal' },
    { kind: 'start', at: 0 },
    ...(guesserIds
      ? ([
          { kind: 'guess', at: 1 },
          { kind: 'confirm', guesserIds },
        ] as const)
      : ([{ kind: 'expire', at: 60000 }] as const)),
    { kind: 'continue' },
    { kind: 'advance' },
  ];
  return actions.reduce((state, action) => {
    if (!state.turn) throw new Error('Missing turn');
    return applyCommand(
      state,
      { ...action, turnId: state.turn.id, revision: state.revision },
      bank,
      () => 0,
    );
  }, game);
}

test.each([0, 3, 4])(
  'requires full capacity with %s unused concepts',
  (available) => {
    const { game, bank } = scenario(4 + available);
    let state = game;
    for (let index = 0; index < ids.length; index++)
      state = finish(state, bank);
    if (available === 4) {
      expect(state.tiebreaker?.participants).toEqual(ids);
      for (let index = 0; index < ids.length; index++)
        state = finish(state, bank);
      expect(state.completion).toBe('tiebreaker');
      expect(state.used).toHaveLength(8);
    } else {
      expect(state.completion).toBe('regular');
      expect(state.used).toHaveLength(4);
    }
    expect(state.winners).toEqual(ids);
  },
);

test.each([9, 10])(
  'finishes the full round, narrows leaders and checks later capacity (%s concepts)',
  (capacity) => {
    const { game, bank } = scenario(capacity);
    let state = game;
    for (let index = 0; index < ids.length; index++)
      state = finish(state, bank);
    state = finish(state, bank, ['b', 'c']);
    expect(state.turn?.slot.drawerId).toBe('b');
    for (let index = 0; index < 3; index++) state = finish(state, bank);
    expect(scoreBreakdown(state)).toEqual({
      a: { regular: 0, tiebreaker: 0, total: 0 },
      b: { regular: 0, tiebreaker: 1, total: 1 },
      c: { regular: 0, tiebreaker: 1, total: 1 },
      d: { regular: 0, tiebreaker: 0, total: 0 },
    });
    if (capacity === 9) {
      expect(state.winners).toEqual(['b', 'c']);
      expect(state.used).toHaveLength(8);
    } else {
      expect(state.tiebreaker?.participants).toEqual(['b', 'c']);
      expect(eligibleGuessers(state)).toEqual(['c']);
      state = finish(state, bank, ['c']);
      expect(state.winners).toEqual([]);
      state = finish(state, bank);
      expect(state.winners).toEqual(['c']);
    }
  },
);

test('teams rotate their drawers into the complete extra round', () => {
  const { game, bank } = scenario(4, true);
  const extra = finish(finish(game, bank, []), bank, []);
  expect(extra.turn?.slot.drawerId).toBe('b');
  const last = finish(extra, bank, []);
  expect(last.turn?.slot.drawerId).toBe('d');
  expect(finish(last, bank).winners).toEqual(['red']);
});

test('a final-turn correction can reopen a tie and replay starts a fresh scorecard', () => {
  const { game, bank } = scenario(4, true);
  const final = finish(finish(game, bank, []), bank);
  expect(final.winners).toEqual(['red']);
  expect(correctFinalTurn(final, ['a'], bank, () => 0)).toBe(final);
  const extra = correctFinalTurn(final, [], bank, () => 0);
  expect(extra.completion).toBeNull();
  expect(extra.tiebreaker?.participants).toEqual(['red', 'blue']);
  expect(extra.used.slice(0, final.used.length)).toEqual(final.used);
  expect(extra.turn?.slot.drawerId).toBe('b');
  expect(extra.previousResult?.turn.phase).toEqual({
    kind: 'between',
    outcome: { kind: 'correct', creditedIds: ['blue'] },
  });
  expect(scores(extra)).toEqual({ red: 1, blue: 1 });
  const replay = createGame('replay', final.setup, bank, () => 0);
  expect(replay.setup).toBe(final.setup);
  expect(replay.turn?.slot).toEqual(game.turn?.slot);
  expect(scores(replay)).toEqual({ red: 0, blue: 0 });
});

test('a correction can turn a tie into a winner or finish when the new tie exceeds word capacity', () => {
  const { game, bank } = scenario(7);
  let state = finish(game, bank, ['b']);
  state = finish(state, bank);
  state = finish(state, bank);
  state = finish(state, bank, ['a']);
  expect(state.winners).toEqual(['a']);
  state = correctFinalTurn(state, null, bank, () => 0);
  expect(state.tiebreaker?.participants).toEqual(['a', 'b']);
  const prior = editableResult(state);
  state = correctFinalTurn(state, ['a'], bank, () => 0);
  expect(state.winners).toEqual(['a']);
  expect(state.finalTurn?.word).toEqual(prior?.word);
  state = correctFinalTurn(state, ['c'], bank, () => 0);
  expect(state.winners).toEqual(ids);
  expect(state.used).toHaveLength(4);
  expect(state.tiebreaker).toBeNull();
});

test('undo can change the tied roster before reveal and then expires at reveal', () => {
  const { game, bank } = scenario(8);
  let state = finish(game, bank, ['b']);
  state = finish(state, bank);
  state = finish(state, bank);
  state = finish(state, bank);
  expect(state.tiebreaker?.participants).toEqual(['a', 'b']);
  const history = state.recent;
  state = correctFinalTurn(state, ['c'], bank, () => 0);
  expect(state.tiebreaker?.participants).toEqual(ids);
  expect(state.recent).toEqual(history);
  expect(state.used).toHaveLength(5);
  if (!state.turn) throw new Error('Missing handoff');
  state = applyCommand(
    state,
    { kind: 'reveal', turnId: state.turn.id, revision: state.revision },
    bank,
    () => 0,
  );
  expect(editableResult(state)).toBeUndefined();
  expect(correctFinalTurn(state, null, bank, () => 0)).toBe(state);
});
