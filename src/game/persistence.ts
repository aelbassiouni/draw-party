import { remainingAt, type Game } from './engine';

export type SessionWrite = Readonly<{
  key: string;
  previousKey: string | null;
  game: Game | null;
  capturedAt: number;
  revealedWord?: Readonly<{ language: 'en' | 'ar'; conceptId: string }>;
}>;

export interface SessionStorage {
  commit(write: SessionWrite): Promise<void>;
}

export function recoverySnapshot(game: Game, at: number): Game {
  const turn = game.turn;
  if (!turn || turn.phase.kind !== 'drawing') return game;
  return {
    ...game,
    turn: {
      ...turn,
      phase: { kind: 'paused', remainingMs: remainingAt(game, at) },
    },
  };
}
