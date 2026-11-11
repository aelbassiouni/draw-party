/** In-memory feasibility clock. Storage/session ownership is a later task. */
export class TurnProbe {
  private remaining: number;
  private deadline = 0;
  private running = false;
  private held = false;
  private visible = false;
  private focused = true;
  constructor(
    private readonly now: () => number,
    private readonly duration = 30000,
  ) {
    this.remaining = duration;
  }
  read() {
    const remaining = this.running
      ? Math.max(0, this.deadline - this.now())
      : this.remaining;
    if (remaining === 0) {
      this.remaining = 0;
      this.running = false;
      this.hide();
    }
    return {
      remaining,
      running: this.running,
      visible: this.visible,
      focused: this.focused,
    };
  }
  start() {
    if (!this.focused || this.running || this.remaining <= 0) return;
    this.deadline = this.now() + this.remaining;
    this.running = true;
    this.hide();
  }
  pause() {
    this.remaining = this.read().remaining;
    this.running = false;
    this.hide();
  }
  interrupt() {
    this.pause();
    this.focused = false;
  }
  foreground() {
    this.focused = true;
    this.hide();
  }
  beginHold() {
    this.held = true;
    this.visible = this.focused && this.read().running;
  }
  hide() {
    this.held = false;
    this.visible = false;
  }
  moveInside(inside: boolean) {
    if (!inside) this.hide();
  }
  reset() {
    this.running = false;
    this.remaining = this.duration;
    this.hide();
  }
}
