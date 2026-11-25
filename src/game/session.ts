import { applyCommand, createGame, type Action, type Game } from './engine';
import type { SessionSetup } from './setup';
import { developmentWords, type Word } from './words';

let nextSessionId = 0;

class MemorySessionStorage {
  constructor(private game: Game) {}

  read() {
    return this.game;
  }

  write(game: Game) {
    this.game = game;
  }
}

/** Commits and publishes synchronously in input order while storage is in memory. */
export class SessionController {
  private readonly storage: MemorySessionStorage;
  private readonly listeners = new Set<() => void>();

  constructor(
    setup: SessionSetup,
    private readonly bank: readonly Word[] = developmentWords,
    private readonly random = Math.random,
    readonly now = () => performance.now(),
  ) {
    this.storage = new MemorySessionStorage(
      createGame(`local-${++nextSessionId}`, setup, bank, random),
    );
  }

  read = () => this.storage.read();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  dispatch(snapshot: Game, action: Action) {
    if (!snapshot.turn) return;
    const current = this.read();
    const next = applyCommand(
      current,
      {
        ...action,
        turnId: snapshot.turn.id,
        revision: snapshot.revision,
      },
      this.bank,
      this.random,
    );
    if (next === current) return;
    this.storage.write(next);
    this.listeners.forEach((listener) => listener());
  }
}
