import { expect, test } from '@jest/globals';
import { regularTurnAt } from './rotation';
import { DEFAULT_SETTINGS, validateSetup, type Setup } from './setup';

function turns(draft: Setup) {
  const setup = validateSetup(draft);
  if (!setup.ok) throw new Error(setup.errors.join(', '));
  return Array.from({ length: 16 }, (_, index) =>
    regularTurnAt(setup.value, index),
  );
}

const settings = { ...DEFAULT_SETTINGS, rounds: 5 };
const players = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, name: id }));

test('free-for-all gives every player one turn per round in the chosen order', () => {
  const schedule = turns({
    mode: 'freeForAll',
    players: players.slice(0, 3),
    playerOrder: ['c', 'a', 'b'],
    teams: [],
    teamOrder: [],
    settings,
  });
  for (let round = 1; round <= 5; round++) {
    expect(schedule.slice((round - 1) * 3, round * 3)).toEqual(
      ['c', 'a', 'b'].map((drawerId, offset) => ({
        index: (round - 1) * 3 + offset,
        round,
        drawerId,
        teamId: null,
      })),
    );
  }
  expect(schedule[15]).toBeNull();
});

test('unequal teams take one turn per round and cycle their drawers independently', () => {
  const schedule = turns({
    mode: 'teams',
    players,
    playerOrder: [],
    teams: [
      { id: 'red', name: 'Red', playerIds: ['b', 'a'] },
      { id: 'blue', name: 'Blue', playerIds: ['e', 'c', 'd'] },
    ],
    teamOrder: ['blue', 'red'],
    settings,
  });
  expect(schedule.slice(0, 10).map((turn) => turn?.drawerId)).toEqual([
    'e',
    'b',
    'c',
    'a',
    'd',
    'b',
    'e',
    'a',
    'c',
    'b',
  ]);
  expect(schedule.slice(0, 10).map((turn) => turn?.teamId)).toEqual(
    Array.from({ length: 10 }, (_, index) =>
      index % 2 === 0 ? 'blue' : 'red',
    ),
  );
  expect(schedule[9]).toMatchObject({ round: 5, drawerId: 'b' });
  expect(schedule[10]).toBeNull();
});
