import {
  applyCommand,
  correctFinalTurn,
  createGame,
  remainingAt,
  type Action,
  type Game,
} from './engine';
import {
  recoverySnapshot,
  type SessionStorage,
  type SessionWrite,
} from './persistence';
import type { SessionSetup } from './setup';
import { developmentWords, type Word } from './words';

export const CHECKPOINT_INTERVAL_MS = 1000;
let nextSessionId = 0;

type View = Readonly<{
  game: Game;
  status: 'ready' | 'saving' | 'retry';
  frozenMs?: number;
}>;

type Write = Omit<SessionWrite, 'previousKey'>;
type Transition = {
  write: Write;
  next: Game;
  frozenMs?: number;
  departed?: () => void;
  startSuspended?: boolean;
};

export class SessionController {
  private view: View;
  private readonly listeners = new Set<() => void>();
  private key: string | null;
  private serial = 0;
  private readonly writerId: string;
  private pending?: Transition;
  private timerWrite?: Write;
  private writing = false;
  private closed = false;

  constructor(
    setup: SessionSetup,
    private readonly storage: SessionStorage,
    private readonly bank: readonly Word[] = developmentWords,
    private readonly random = Math.random,
    readonly now = () => performance.now(),
    private readonly wallTime = Date.now,
    initial?:
      | { game: Game; key: string }
      | { recent: readonly string[]; key: string | null },
  ) {
    this.writerId = `local-${wallTime()}-${Math.random().toString(36).slice(2)}-${++nextSessionId}`;
    this.key = initial?.key ?? null;
    if (initial && 'game' in initial) {
      this.view = { game: initial.game, status: 'ready' };
      return;
    }
    const game = createGame(
      this.writerId,
      setup,
      bank,
      random,
      initial?.recent,
    );
    this.view = { game, status: 'saving' };
    this.queue(game, this.now());
  }

  read = () => this.view.game;

  readView = () => this.view;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  dispatch(snapshot: Game, action: Action) {
    if (!this.canCommand(snapshot) || !snapshot.turn) return;
    const next = applyCommand(
      snapshot,
      { ...action, turnId: snapshot.turn.id, revision: snapshot.revision },
      this.bank,
      this.random,
    );
    if (next === snapshot) return;
    const at = 'at' in action ? action.at : this.now();
    this.queue(
      next,
      at,
      action.kind === 'reveal' ? next.turn?.word : undefined,
    );
  }

  correct(snapshot: Game, guesserIds: readonly string[] | null) {
    if (!this.canCommand(snapshot)) return;
    const next = correctFinalTurn(snapshot, guesserIds, this.bank, this.random);
    if (next !== snapshot) this.queue(next, this.now());
  }

  restart(snapshot: Game) {
    if (!this.canCommand(snapshot)) return;
    const game = createGame(
      `${this.writerId}-restart-${this.serial + 1}`,
      snapshot.setup,
      this.bank,
      this.random,
      snapshot.recent,
    );
    this.queue(game, this.now());
  }

  suspend(afterPause: () => void) {
    const game = this.read();
    if (!this.canCommand(game)) return;
    const at = this.now();
    this.queue(recoverySnapshot(game, at), at, undefined, afterPause, false);
  }

  leave(afterCommit: () => void) {
    if (this.canCommand(this.read()))
      this.queue(this.read(), this.now(), undefined, afterCommit);
  }

  interrupt(at: number) {
    if (this.pending?.next.turn?.phase.kind === 'drawing') {
      this.pending.startSuspended = true;
      return;
    }
    this.dispatch(this.read(), { kind: 'pause', at });
  }

  checkpoint(at: number) {
    if (
      !this.canCommand(this.read()) ||
      this.read().turn?.phase.kind !== 'drawing'
    )
      return;
    if (this.timerWrite) {
      this.interrupt(at);
      return;
    }
    this.timerWrite = this.makeWrite(recoverySnapshot(this.read(), at));
    void this.flush();
  }

  retry() {
    if (this.view.status !== 'retry' || !this.pending) return;
    this.publish({ ...this.view, status: 'saving' });
    void this.flush();
  }

  private canCommand(snapshot: Game) {
    return (
      !this.closed && this.view.status === 'ready' && snapshot === this.read()
    );
  }

  private publish(view: View) {
    this.view = view;
    this.listeners.forEach((listener) => listener());
  }

  private makeWrite(
    game: Game | null,
    revealedWord?: Write['revealedWord'],
  ): Write {
    return {
      key: `${this.writerId}/${++this.serial}`,
      game,
      capturedAt: this.wallTime(),
      revealedWord,
    };
  }

  private queue(
    next: Game,
    at: number,
    revealedWord?: Write['revealedWord'],
    departed?: () => void,
    clear = Boolean(departed),
  ) {
    const game = this.read();
    const frozenMs =
      game.turn?.phase.kind === 'drawing' ? remainingAt(game, at) : undefined;
    this.pending = {
      next,
      write: this.makeWrite(
        clear ? null : recoverySnapshot(next, at),
        revealedWord,
      ),
      frozenMs,
      departed,
    };
    this.publish({ game, status: 'saving', frozenMs });
    void this.flush();
  }

  private async commit(write: Write) {
    await this.storage.commit({ ...write, previousKey: this.key });
    this.key = write.game ? write.key : null;
  }

  private async flush() {
    if (this.writing || this.view.status === 'retry') return;
    this.writing = true;
    try {
      if (this.timerWrite) {
        await this.commit(this.timerWrite);
        this.timerWrite = undefined;
      }
      const pending = this.pending;
      if (!pending) return;
      await this.commit(pending.write);
      this.pending = undefined;
      let game = pending.next;
      const turn = game.turn;
      if (turn?.phase.kind === 'drawing') {
        // Time only runs once drawing is visible. The saved baseline is already paused.
        game = pending.startSuspended
          ? recoverySnapshot(game, turn.phase.startedAt)
          : {
              ...game,
              turn: {
                ...turn,
                phase: { ...turn.phase, startedAt: this.now() },
              },
            };
      }
      this.closed = Boolean(pending.departed);
      this.publish({ game, status: 'ready' });
      pending.departed?.();
    } catch {
      // Keep the original write key and capture time, including an ambiguous commit.
      if (!this.pending) this.interrupt(this.now());
      if (this.pending?.next.turn?.phase.kind === 'drawing')
        this.pending.startSuspended = true;
      this.publish({
        ...this.view,
        status: 'retry',
        frozenMs: this.pending?.frozenMs,
      });
    } finally {
      this.writing = false;
    }
  }
}
