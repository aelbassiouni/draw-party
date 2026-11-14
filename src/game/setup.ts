export type Language = 'en' | 'ar';
export type Difficulty = 'easy' | 'medium' | 'mixed';
export type Player = Readonly<{ id: string; name: string }>;
export type Team = Readonly<{
  id: string;
  name: string;
  playerIds: readonly string[];
}>;
export type Settings = Readonly<{
  rounds: number;
  timerSeconds: 30 | 60 | 90 | 120;
  difficulty: Difficulty;
  interfaceLanguage: Language;
  wordLanguage: Language;
  sound: boolean;
  vibration: boolean;
}>;

export const DEFAULT_SETTINGS: Settings = Object.freeze({
  rounds: 3,
  timerSeconds: 60,
  difficulty: 'mixed',
  interfaceLanguage: 'en',
  wordLanguage: 'en',
  sound: true,
  vibration: true,
});

export type Setup = {
  mode: 'freeForAll' | 'teams';
  players: readonly Player[];
  teams: readonly Team[];
  /** First ID takes the first turn. Every eligible ID appears exactly once. */
  playerOrder: readonly string[];
  teamOrder: readonly string[];
  settings: Settings;
};

export type SessionSetup = Readonly<Setup>;
export type SetupResult =
  { ok: true; value: SessionSetup } | { ok: false; errors: readonly string[] };

const validId = (id: unknown): id is string =>
  typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id);

const validName = (name: unknown): name is string =>
  typeof name === 'string' &&
  name.trim().length > 0 &&
  Array.from(name.trim()).length <= 40 &&
  !/[\u0000-\u001f\u007f]/.test(name);

const isPermutation = (order: readonly string[], ids: readonly string[]) =>
  order.length === ids.length &&
  new Set(order).size === ids.length &&
  order.every((id) => ids.includes(id));

/** Validates a draft and copies it into an immutable value for a new game. */
export function validateSetup(draft: Setup): SetupResult {
  const errors: string[] = [];
  const players = draft.players ?? [];
  const teams = draft.teams ?? [];
  const playerIds = players.map((player) => player.id);
  const teamIds = teams.map((team) => team.id);

  if (draft.mode !== 'freeForAll' && draft.mode !== 'teams')
    errors.push('mode');
  if (
    players.some((player) => !validId(player.id)) ||
    new Set(playerIds).size !== players.length
  )
    errors.push('playerIds');
  if (players.some((player) => !validName(player.name)))
    errors.push('playerNames');
  if (
    teams.some((team) => !validId(team.id)) ||
    new Set(teamIds).size !== teams.length
  )
    errors.push('teamIds');
  if (teams.some((team) => !validName(team.name))) errors.push('teamNames');

  if (draft.mode === 'freeForAll') {
    if (players.length < 3 || players.length > 12) errors.push('playerCount');
    if (teams.length !== 0 || (draft.teamOrder ?? []).length !== 0)
      errors.push('teams');
    if (!isPermutation(draft.playerOrder ?? [], playerIds))
      errors.push('playerOrder');
  } else if (draft.mode === 'teams') {
    if (teams.length < 2 || teams.length > 4) errors.push('teamCount');
    if ((draft.playerOrder ?? []).length !== 0) errors.push('playerOrder');
    if (!isPermutation(draft.teamOrder ?? [], teamIds))
      errors.push('teamOrder');
    const assigned = teams.flatMap((team) => team.playerIds);
    if (
      teams.some(
        (team) => team.playerIds.length < 2 || team.playerIds.length > 6,
      )
    )
      errors.push('teamSize');
    if (!isPermutation(assigned, playerIds)) errors.push('teamMembership');
  }

  const settings = draft.settings;
  if (
    !settings ||
    !Number.isInteger(settings.rounds) ||
    settings.rounds < 1 ||
    settings.rounds > 5
  )
    errors.push('rounds');
  if (!settings || ![30, 60, 90, 120].includes(settings.timerSeconds))
    errors.push('timerSeconds');
  if (!settings || !['easy', 'medium', 'mixed'].includes(settings.difficulty))
    errors.push('difficulty');
  if (!settings || !['en', 'ar'].includes(settings.interfaceLanguage))
    errors.push('interfaceLanguage');
  if (!settings || !['en', 'ar'].includes(settings.wordLanguage))
    errors.push('wordLanguage');
  if (!settings || typeof settings.sound !== 'boolean') errors.push('sound');
  if (!settings || typeof settings.vibration !== 'boolean')
    errors.push('vibration');

  if (errors.length) return { ok: false, errors };
  const value: SessionSetup = Object.freeze({
    mode: draft.mode,
    players: Object.freeze(
      players.map((player) =>
        Object.freeze({ id: player.id, name: player.name.trim() }),
      ),
    ),
    teams: Object.freeze(
      teams.map((team) =>
        Object.freeze({
          id: team.id,
          name: team.name.trim(),
          playerIds: Object.freeze([...team.playerIds]),
        }),
      ),
    ),
    playerOrder: Object.freeze([...draft.playerOrder]),
    teamOrder: Object.freeze([...draft.teamOrder]),
    settings: Object.freeze({ ...settings }),
  });
  return { ok: true, value };
}
