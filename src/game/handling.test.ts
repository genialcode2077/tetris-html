import { describe, expect, it } from 'vitest';
import { Game } from '@/core/game';
import { Handling } from './handling';

function game(): Game {
  const g = new Game({ seed: 1, rules: { goal: { type: 'none' } } });
  g.start();
  return g;
}

describe('Handling DAS/ARR', () => {
  it('mueve una vez al pulsar, espera DAS y repite cada ARR', () => {
    const g = game();
    const h = new Handling({ dasMs: 100, arrMs: 50, dcdMs: 0 });
    const x0 = g.state.active!.x;
    h.press('left', g);
    expect(g.state.active!.x).toBe(x0 - 1);
    h.step(90, g);
    expect(g.state.active!.x).toBe(x0 - 1);
    h.step(10, g); // DAS cumplido → primer auto-shift inmediato
    expect(g.state.active!.x).toBe(x0 - 2);
    h.step(50, g);
    expect(g.state.active!.x).toBe(x0 - 3);
    h.release('left', g);
    h.step(200, g);
    expect(g.state.active!.x).toBe(x0 - 3);
  });

  it('ARR 0 lleva la pieza hasta la pared', () => {
    const g = game();
    const h = new Handling({ dasMs: 50, arrMs: 0, dcdMs: 0 });
    h.press('right', g);
    h.step(60, g);
    const p = g.state.active!;
    expect(p.x).toBeGreaterThanOrEqual(5);
    g.dispatch('right');
    g.step(0);
    expect(g.state.active!.x).toBe(p.x);
  });

  it('al soltar una dirección con la otra mantenida cambia de sentido', () => {
    const g = game();
    const h = new Handling({ dasMs: 50, arrMs: 0, dcdMs: 0 });
    const x0 = g.state.active!.x;
    h.press('left', g);
    h.press('right', g);
    expect(g.state.active!.x).toBe(x0);
    h.release('right', g);
    h.step(60, g);
    expect(g.state.active!.x).toBeLessThan(x0);
  });

  it('soft drop y hard drop se despachan al motor', () => {
    const g = game();
    const h = new Handling();
    h.press('softDrop', g);
    expect(g.state.softDropping).toBe(true);
    h.release('softDrop', g);
    expect(g.state.softDropping).toBe(false);
    h.press('hardDrop', g);
    expect(g.state.stats.pieces).toBe(1);
  });
});
