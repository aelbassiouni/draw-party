import { describe, expect, it } from '@jest/globals';
import { TurnProbe } from './turn-probe';

describe('interrupted turn probe', () => {
  it('uses clock elapsed time rather than counting rendering ticks', () => {
    let now = 0;
    const turn = new TurnProbe(() => now);
    turn.start();
    now = 7250;
    expect(turn.read().remaining).toBe(22750);
    turn.pause();
    now += 60000;
    expect(turn.read().remaining).toBe(22750);
    turn.start();
    now += 750;
    expect(turn.read().remaining).toBe(22000);
  });
  it('requires explicit resume and a fresh gesture after an interruption', () => {
    let now = 0;
    const turn = new TurnProbe(() => now);
    turn.start();
    turn.beginHold();
    expect(turn.read().visible).toBe(true);
    now = 1000;
    turn.interrupt();
    turn.start();
    now = 50000;
    expect(turn.read()).toMatchObject({
      remaining: 29000,
      running: false,
      visible: false,
    });
    turn.foreground();
    expect(turn.read()).toMatchObject({ running: false, visible: false });
    turn.start();
    expect(turn.read().visible).toBe(false);
  });
  it('hides on release, leaving the control, cancellation, pause and expiry', () => {
    let now = 0;
    const turn = new TurnProbe(() => now);
    turn.start();
    for (const hide of [() => turn.hide(), () => turn.moveInside(false)]) {
      turn.beginHold();
      hide();
      turn.moveInside(true);
      expect(turn.read().visible).toBe(false);
    }
    turn.beginHold();
    turn.pause();
    expect(turn.read().visible).toBe(false);
    turn.start();
    turn.beginHold();
    now = 30000;
    expect(turn.read()).toMatchObject({
      remaining: 0,
      running: false,
      visible: false,
    });
  });
});
