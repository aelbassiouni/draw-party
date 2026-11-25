import type { Game } from '../game/engine';
import { regularTurnAt } from '../game/rotation';
import { validateSetup, type Setup } from '../game/setup';

function requireValid(valid: unknown): asserts valid {
  if (!valid) throw new Error('Invalid saved game data');
}

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const natural = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const string = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(string);
const unique = (values: readonly string[]) =>
  new Set(values).size === values.length;

export function decodeSetup(value: unknown) {
  requireValid(
    record(value) &&
      Array.isArray(value.players) &&
      value.players.every(record) &&
      Array.isArray(value.teams) &&
      value.teams.every((team) => record(team) && strings(team.playerIds)) &&
      strings(value.playerOrder) &&
      strings(value.teamOrder) &&
      record(value.settings),
  );
  const result = validateSetup(value as unknown as Setup);
  requireValid(result.ok);
  return result.value;
}

export function decodeSession(payload: string, version: number): Game {
  requireValid(version === 1);
  const value: unknown = JSON.parse(payload);
  requireValid(record(value) && string(value.id) && natural(value.revision));
  const setup = decodeSetup(value.setup);
  const order = setup.mode === 'teams' ? setup.teamOrder : setup.playerOrder;
  const participants = (ids: unknown): ids is string[] =>
    strings(ids) && unique(ids) && ids.every((id) => order.includes(id));
  requireValid(participants(value.winners) && strings(value.recent));
  requireValid(
    value.completion === null ||
      value.completion === 'regular' ||
      value.completion === 'tiebreaker' ||
      value.completion === 'exhausted',
  );
  const outcome = (candidate: unknown) =>
    record(candidate) &&
    (candidate.kind === 'timeout' ||
      candidate.kind === 'violation' ||
      (candidate.kind === 'correct' &&
        participants(candidate.creditedIds) &&
        candidate.creditedIds.length > 0));
  requireValid(Array.isArray(value.results) && value.results.every(outcome));
  const results = value.results;
  const regularCount = order.length * setup.settings.rounds;
  function decodeTiebreaker(extra: unknown): Game['tiebreaker'] {
    if (extra === null) return null;
    requireValid(
      record(extra) &&
        natural(extra.round) &&
        extra.round > 0 &&
        natural(extra.start) &&
        extra.start >= regularCount &&
        extra.start <= results.length &&
        participants(extra.participants) &&
        extra.participants.length >= 2,
    );
    return {
      round: extra.round,
      start: extra.start,
      participants: extra.participants,
    };
  }
  const extra = decodeTiebreaker(value.tiebreaker);
  const word = (candidate: unknown) =>
    record(candidate) &&
    string(candidate.id) &&
    string(candidate.conceptId) &&
    candidate.language === setup.settings.wordLanguage &&
    string(candidate.text) &&
    (candidate.difficulty === 'easy' || candidate.difficulty === 'medium') &&
    (setup.settings.difficulty === 'mixed' ||
      setup.settings.difficulty === candidate.difficulty);
  requireValid(
    Array.isArray(value.used) &&
      value.used.every(word) &&
      unique(value.used.map((entry) => entry.conceptId)),
  );
  const used = value.used;
  const validateTurn = (
    turn: unknown,
    finished: boolean,
    roundState = extra,
  ) => {
    requireValid(
      record(turn) &&
        record(turn.slot) &&
        record(turn.phase) &&
        word(turn.word),
    );
    const { slot, phase } = turn;
    const between = phase.kind === 'between';
    requireValid(!finished || between);
    const index = results.length - (between ? 1 : 0);
    requireValid(
      index >= 0 &&
        slot.index === index &&
        turn.id === `${value.id}:${index}` &&
        JSON.stringify(used[index]) === JSON.stringify(turn.word),
    );
    const normal = regularTurnAt(setup, index);
    if (normal) {
      requireValid(
        slot.round === normal.round &&
          slot.drawerId === normal.drawerId &&
          slot.teamId === normal.teamId,
      );
    } else {
      requireValid(
        roundState &&
          index >= roundState.start &&
          index < roundState.start + roundState.participants.length,
      );
      const round = setup.settings.rounds + roundState.round;
      const id = roundState.participants[index - roundState.start];
      const team = setup.teams.find((candidate) => candidate.id === id);
      requireValid(
        slot.round === round &&
          slot.teamId === (team?.id ?? null) &&
          slot.drawerId ===
            (team ? team.playerIds[(round - 1) % team.playerIds.length] : id),
      );
    }
    if (between || phase.kind === 'result') {
      requireValid(
        outcome(phase.outcome) &&
          (!between ||
            JSON.stringify(phase.outcome) === JSON.stringify(results[index])),
      );
    } else {
      requireValid(
        (phase.kind === 'handoff' ||
          phase.kind === 'reveal' ||
          phase.kind === 'paused' ||
          phase.kind === 'pending') &&
          typeof phase.remainingMs === 'number' &&
          Number.isFinite(phase.remainingMs) &&
          phase.remainingMs >= 0 &&
          phase.remainingMs <= setup.settings.timerSeconds * 1000,
      );
    }
    return index;
  };
  if (value.completion === null) {
    requireValid(value.winners.length === 0 && value.finalTurn === undefined);
    requireValid(used.length === validateTurn(value.turn, false) + 1);
    if (value.previousResult !== undefined) {
      requireValid(
        record(value.previousResult) &&
          (value.turn as NonNullable<Game['turn']>).phase.kind === 'handoff',
      );
      validateTurn(
        value.previousResult.turn,
        true,
        decodeTiebreaker(value.previousResult.tiebreaker),
      );
    }
  } else {
    requireValid(
      value.turn === null &&
        value.previousResult === undefined &&
        used.length === results.length,
    );
    if (value.finalTurn !== undefined) validateTurn(value.finalTurn, true);
    requireValid(
      value.completion === 'exhausted' ||
        (value.winners.length > 0 && value.finalTurn),
    );
  }
  return { ...(value as unknown as Game), setup };
}
