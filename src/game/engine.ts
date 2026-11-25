import { regularTurnAt, type RegularTurn } from './rotation';
import type { SessionSetup } from './setup';
import { selectWord, unusedWords, type Word } from './words';

type Outcome =
  | Readonly<{ kind: 'correct'; creditedIds: readonly string[] }>
  | Readonly<{ kind: 'timeout' | 'violation' }>;

type Phase =
  | Readonly<{
      kind: 'handoff' | 'reveal' | 'paused' | 'pending';
      remainingMs: number;
    }>
  | Readonly<{ kind: 'drawing'; remainingMs: number; startedAt: number }>
  | Readonly<{ kind: 'result' | 'between'; outcome: Outcome }>;

type ActiveTurn = Readonly<{
  id: string;
  slot: RegularTurn;
  word: Word;
  phase: Phase;
}>;
export type Game = Readonly<{
  id: string;
  setup: SessionSetup;
  revision: number;
  turn: ActiveTurn | null;
  completion: 'regular' | 'tiebreaker' | 'exhausted' | null;
  tiebreaker: Readonly<{
    round: number;
    start: number;
    participants: readonly string[];
  }> | null;
  winners: readonly string[];
  finalTurn?: ActiveTurn;
  previousResult?: Readonly<{
    turn: ActiveTurn;
    tiebreaker: Game['tiebreaker'];
  }>;
  recent: readonly string[];
  used: readonly Word[];
  results: readonly Outcome[];
}>;

export type Action =
  | Readonly<{ kind: 'reveal' | 'continue' | 'advance' | 'endWithoutPoints' }>
  | Readonly<{
      kind: 'start' | 'pause' | 'guess' | 'resume' | 'expire';
      at: number;
    }>
  | Readonly<{
      kind: 'confirm' | 'lastSecond';
      guesserIds?: readonly string[];
    }>;

export type Command = Action & Readonly<{ turnId: string; revision: number }>;

function openTurn(
  game: Game,
  index: number,
  bank: readonly Word[],
  random: () => number,
): Game {
  let slot = regularTurnAt(game.setup, index);
  const { wordLanguage, difficulty, timerSeconds } = game.setup.settings;
  let extra = game.tiebreaker;
  if (!slot) {
    if (!extra || index === extra.start + extra.participants.length) {
      const totals = scores(game);
      const highest = Math.max(...Object.values(totals));
      const leaders = participantOrder(game.setup).filter(
        (id) => totals[id] === highest,
      );
      if (
        leaders.length === 1 ||
        unusedWords(bank, wordLanguage, difficulty, game.used).length <
          leaders.length
      ) {
        return {
          ...game,
          turn: null,
          completion: extra ? 'tiebreaker' : 'regular',
          winners: leaders,
        };
      }
      extra = {
        round: (extra?.round ?? 0) + 1,
        start: index,
        participants: leaders,
      };
    }
    const id = extra.participants[index - extra.start];
    const team = game.setup.teams.find((team) => team.id === id);
    const round = game.setup.settings.rounds + extra.round;
    slot = {
      index,
      round,
      drawerId: team ? team.playerIds[(round - 1) % team.playerIds.length] : id,
      teamId: team?.id ?? null,
    };
  }
  const selection = selectWord(
    bank,
    wordLanguage,
    difficulty,
    game.used,
    random,
    game.recent,
  );
  if ('exhausted' in selection)
    return { ...game, turn: null, completion: 'exhausted' };

  return {
    ...game,
    tiebreaker: extra,
    used: [...game.used, selection.word],
    turn: {
      id: `${game.id}:${index}`,
      slot,
      word: selection.word,
      phase: { kind: 'handoff', remainingMs: timerSeconds * 1000 },
    },
  };
}

export function createGame(
  id: string,
  setup: SessionSetup,
  bank: readonly Word[],
  random: () => number,
  recent: readonly string[] = [],
): Game {
  return openTurn(
    {
      id,
      setup,
      revision: 0,
      turn: null,
      completion: null,
      tiebreaker: null,
      winners: [],
      recent: [...recent],
      used: [],
      results: [],
    },
    0,
    bank,
    random,
  );
}

export function remainingAt(game: Game, at: number): number {
  const phase = game.turn?.phase;
  if (!phase || !('remainingMs' in phase)) return 0;
  if (phase.kind !== 'drawing') return phase.remainingMs;
  return Math.max(0, phase.remainingMs - Math.max(0, at - phase.startedAt));
}

export function visibleWord(
  game: Game,
  privatelyRevealed = false,
): string | null {
  const turn = game.turn;
  if (!turn) return null;
  const { kind } = turn.phase;
  if (kind === 'result') return turn.word.text;
  if (privatelyRevealed && (kind === 'reveal' || kind === 'drawing'))
    return turn.word.text;
  return null;
}

export function eligibleGuessers(game: Game): readonly string[] {
  const slot = (game.turn ?? game.finalTurn)?.slot;
  if (!slot) return [];
  const roster =
    slot.teamId === null
      ? (game.tiebreaker?.participants ?? game.setup.playerOrder)
      : (game.setup.teams.find(({ id }) => id === slot.teamId)?.playerIds ??
        []);
  return roster.filter((id) => id !== slot.drawerId);
}

function participantOrder(setup: SessionSetup) {
  return setup.mode === 'teams' ? setup.teamOrder : setup.playerOrder;
}

export function scoreBreakdown(game: Game) {
  const order = participantOrder(game.setup);
  const regularTurns = order.length * game.setup.settings.rounds;
  const rows = Object.fromEntries(
    order.map((id) => [id, { regular: 0, tiebreaker: 0, total: 0 }]),
  );
  const phase = game.turn?.phase;
  const results =
    phase?.kind === 'result' ? [...game.results, phase.outcome] : game.results;
  results.forEach((outcome, index) => {
    if (outcome.kind !== 'correct') return;
    for (const id of outcome.creditedIds) {
      rows[id][index < regularTurns ? 'regular' : 'tiebreaker']++;
      rows[id].total++;
    }
  });
  return rows;
}

export function scores(game: Game): Readonly<Record<string, number>> {
  return Object.fromEntries(
    Object.entries(scoreBreakdown(game)).map(([id, row]) => [id, row.total]),
  );
}

export function editableResult(game: Game): ActiveTurn | undefined {
  const kind = game.turn?.phase.kind;
  if (kind === 'result' || kind === 'between') return game.turn ?? undefined;
  return game.finalTurn ?? game.previousResult?.turn;
}

export function correctionContext(game: Game): Game {
  return {
    ...game,
    turn: editableResult(game) ?? null,
    tiebreaker: game.previousResult
      ? game.previousResult.tiebreaker
      : game.tiebreaker,
  };
}

export function correctFinalTurn(
  game: Game,
  guesserIds: readonly string[] | null,
  bank: readonly Word[],
  random: () => number,
): Game {
  const turn = editableResult(game);
  if (!turn || !('outcome' in turn.phase)) return game;
  const context = correctionContext(game);
  let outcome: Outcome = { kind: 'violation' };
  if (guesserIds !== null) {
    const phase = applyCommand(
      {
        ...context,
        turn: { ...turn, phase: { kind: 'pending', remainingMs: 0 } },
      },
      { turnId: turn.id, revision: game.revision, kind: 'confirm', guesserIds },
      bank,
      random,
    ).turn?.phase;
    if (phase?.kind !== 'result') return game;
    outcome = phase.outcome;
  }

  const correctedTurn = { ...turn, phase: { kind: turn.phase.kind, outcome } };
  const {
    finalTurn: _finalTurn,
    previousResult: _previousResult,
    ...rest
  } = context;
  const corrected: Game = {
    ...rest,
    revision: game.revision + 1,
    completion: null,
    winners: [],
    turn: correctedTurn,
    results:
      turn.phase.kind === 'between'
        ? [...game.results.slice(0, turn.slot.index), outcome]
        : game.results,
    // A handoff only reserved its word. The corrected turn and all revealed
    // words stay excluded even when the next round changes.
    used: game.used.slice(0, turn.slot.index + 1),
  };
  if (game.turn === turn) return corrected;
  const next = openTurn(corrected, turn.slot.index + 1, bank, random);
  return next.completion
    ? { ...next, finalTurn: correctedTurn }
    : {
        ...next,
        previousResult: { turn: correctedTurn, tiebreaker: context.tiebreaker },
      };
}

/** Capture timed action timestamps at input, before queueing persistence. */
export function applyCommand(
  game: Game,
  command: Command,
  bank: readonly Word[],
  random: () => number,
): Game {
  const turn = game.turn;
  if (!turn || turn.id !== command.turnId || game.revision !== command.revision)
    return game;
  const phase = turn.phase;
  const next = (phase: Phase): Game => ({
    ...game,
    revision: game.revision + 1,
    turn: { ...turn, phase },
  });

  if ('at' in command && (!Number.isFinite(command.at) || command.at < 0))
    return game;

  switch (command.kind) {
    case 'reveal': {
      if (phase.kind !== 'handoff') return game;
      const revealed = next({ ...phase, kind: 'reveal' });
      const { previousResult: _previousResult, ...rest } = revealed;
      return {
        ...rest,
        recent: [
          ...rest.recent.filter((id) => id !== turn.word.conceptId),
          turn.word.conceptId,
        ],
      };
    }
    case 'start':
    case 'resume':
      if (
        command.kind === 'start'
          ? phase.kind !== 'reveal'
          : phase.kind !== 'paused' && phase.kind !== 'pending'
      )
        return game;
      if (!('remainingMs' in phase)) return game;
      return next({
        kind: 'drawing',
        remainingMs: phase.remainingMs,
        startedAt: command.at,
      });
    case 'pause':
    case 'guess':
    case 'expire': {
      if (phase.kind !== 'drawing' || command.at < phase.startedAt) return game;
      const remainingMs = remainingAt(game, command.at);
      if (remainingMs === 0)
        return next({ kind: 'result', outcome: { kind: 'timeout' } });
      if (command.kind === 'expire') return game;
      return next({
        kind: command.kind === 'pause' ? 'paused' : 'pending',
        remainingMs,
      });
    }
    case 'endWithoutPoints':
      return phase.kind === 'paused'
        ? next({ kind: 'result', outcome: { kind: 'violation' } })
        : game;
    case 'confirm':
    case 'lastSecond': {
      if (
        command.kind === 'confirm'
          ? phase.kind !== 'pending'
          : phase.kind !== 'result' || phase.outcome.kind !== 'timeout'
      )
        return game;
      const guesserIds = command.guesserIds ?? [];
      const eligible = eligibleGuessers(game);
      if (
        new Set(guesserIds).size !== guesserIds.length ||
        guesserIds.some((id) => !eligible.includes(id))
      )
        return game;
      const { teamId, drawerId } = turn.slot;
      if (teamId === null && guesserIds.length === 0) return game;
      const creditedIds =
        teamId !== null
          ? [teamId]
          : game.tiebreaker
            ? guesserIds
            : [drawerId, ...guesserIds];
      return next({
        kind: 'result',
        outcome: { kind: 'correct', creditedIds },
      });
    }
    case 'continue':
      if (phase.kind !== 'result') return game;
      return {
        ...next({ kind: 'between', outcome: phase.outcome }),
        results: [...game.results, phase.outcome],
      };
    case 'advance': {
      if (phase.kind !== 'between') return game;
      const advanced = openTurn(
        { ...game, revision: game.revision + 1 },
        turn.slot.index + 1,
        bank,
        random,
      );
      return advanced.completion
        ? { ...advanced, finalTurn: turn }
        : {
            ...advanced,
            previousResult: { turn, tiebreaker: game.tiebreaker },
          };
    }
  }
}
