import { describe, expect, it } from '@jest/globals';
import { DEFAULT_SETTINGS, Setup, validateSetup } from './setup';

const players = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i}`,
  }));

const free = (count = 3): Setup => ({
  mode: 'freeForAll',
  players: players(count),
  teams: [],
  playerOrder: players(count).map((player) => player.id),
  teamOrder: [],
  settings: { ...DEFAULT_SETTINGS },
});

const teamSetup = (sizes: number[]): Setup => {
  const roster = players(sizes.reduce((sum, size) => sum + size, 0));
  let offset = 0;
  const teams = sizes.map((size, i) => {
    const team = {
      id: `t${i}`,
      name: `Team ${i}`,
      playerIds: roster.slice(offset, offset + size).map((player) => player.id),
    };
    offset += size;
    return team;
  });
  return {
    mode: 'teams',
    players: roster,
    teams,
    playerOrder: [],
    teamOrder: teams.map((team) => team.id),
    settings: { ...DEFAULT_SETTINGS },
  };
};

const invalid = (draft: Setup, error: string) => {
  const result = validateSetup(draft);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.errors).toContain(error);
};

describe('setup validation', () => {
  it('accepts free-for-all limits and every supported option boundary', () => {
    for (const count of [3, 12])
      for (const rounds of [1, 3, 5])
        for (const timerSeconds of [30, 60, 90, 120] as const)
          for (const difficulty of ['easy', 'medium', 'mixed'] as const) {
            const draft = free(count);
            draft.settings = {
              ...draft.settings,
              rounds,
              timerSeconds,
              difficulty,
              interfaceLanguage: 'ar',
              wordLanguage: 'en',
              sound: false,
              vibration: false,
            };
            expect(validateSetup(draft).ok).toBe(true);
          }
  });

  it('accepts team limits, unequal teams and independent languages', () => {
    for (const sizes of [
      [2, 2],
      [6, 6, 6, 6],
      [2, 3, 4],
    ]) {
      const draft = teamSetup(sizes);
      draft.teamOrder = [...draft.teamOrder].reverse();
      draft.settings = {
        ...draft.settings,
        interfaceLanguage: 'en',
        wordLanguage: 'ar',
      };
      expect(validateSetup(draft).ok).toBe(true);
    }
  });

  it('rejects invalid roster counts, assignments and order', () => {
    for (const count of [2, 13]) invalid(free(count), 'playerCount');
    for (const sizes of [[2], [2, 2, 2, 2, 2], [1, 2], [7, 2]])
      invalid(
        teamSetup(sizes),
        sizes.length < 2 || sizes.length > 4 ? 'teamCount' : 'teamSize',
      );
    const duplicate = free();
    duplicate.players = duplicate.players.map((player, i) =>
      i === 1 ? { id: 'p0', name: 'Other' } : player,
    );
    invalid(duplicate, 'playerIds');
    const wrongOrder = free();
    wrongOrder.playerOrder = ['p0', 'p0', 'p2'];
    invalid(wrongOrder, 'playerOrder');
    const missing = teamSetup([2, 2]);
    missing.teams = missing.teams.map((team, i) =>
      i === 0 ? { ...team, playerIds: ['p0', 'p1', 'p2'] } : team,
    );
    invalid(missing, 'teamMembership');
    const wrongTeams = teamSetup([2, 2]);
    wrongTeams.teamOrder = ['t0', 't0'];
    invalid(wrongTeams, 'teamOrder');
  });

  it('validates names and keeps equal display names as distinct identities', () => {
    const draft = free();
    draft.players = [
      { id: 'p0', name: ' Sam ' },
      { id: 'p1', name: 'Sam' },
      draft.players[2],
    ];
    const result = validateSetup(draft);
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.value.players.slice(0, 2)).toEqual([
        { id: 'p0', name: 'Sam' },
        { id: 'p1', name: 'Sam' },
      ]);
    for (const name of ['', '  ', 'x'.repeat(41), 'bad\nname']) {
      draft.players = [{ id: 'p0', name }, ...draft.players.slice(1)];
      invalid(draft, 'playerNames');
    }
  });

  it('rejects every unsupported setting without creating a session', () => {
    const bad: [keyof Setup['settings'], unknown, string][] = [
      ['rounds', 0, 'rounds'],
      ['rounds', 6, 'rounds'],
      ['rounds', 1.5, 'rounds'],
      ['timerSeconds', 45, 'timerSeconds'],
      ['difficulty', 'hard', 'difficulty'],
      ['interfaceLanguage', 'fr', 'interfaceLanguage'],
      ['wordLanguage', 'fr', 'wordLanguage'],
      ['sound', 'yes', 'sound'],
      ['vibration', null, 'vibration'],
    ];
    for (const [key, value, error] of bad) {
      const draft = free();
      draft.settings = { ...draft.settings, [key]: value } as Setup['settings'];
      invalid(draft, error);
    }
  });

  it('copies and freezes the validated setup', () => {
    const draft = teamSetup([2, 2]);
    const result = validateSetup(draft);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    draft.players = [
      { id: 'changed', name: 'Changed' },
      ...draft.players.slice(1),
    ];
    draft.teams = [
      { ...draft.teams[0], playerIds: ['changed', 'p1'] },
      ...draft.teams.slice(1),
    ];
    draft.settings = { ...draft.settings, rounds: 5 };
    expect(result.value.players[0].id).toBe('p0');
    expect(result.value.teams[0].playerIds[0]).toBe('p0');
    expect(result.value.settings.rounds).toBe(3);
    expect(Object.isFrozen(result.value.teams[0].playerIds)).toBe(true);
    expect(Object.isFrozen(result.value.settings)).toBe(true);
  });
});
