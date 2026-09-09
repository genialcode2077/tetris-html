import { describe, expect, it } from 'vitest';
import { Game } from '@/core/game';
import { STEP_MS } from './loop';
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

describe('precisión temporal del reloj lógico', () => {
  /** Milisegundo real en que se dispara el primer movimiento automático. */
  function dasReal(stepMs: number, dasMs: number): number {
    const g = new Game({
      seed: 1,
      rules: { goal: { type: 'none' }, gravityMode: 'fixed', startLevel: 1 },
    });
    g.start();
    const h = new Handling({ dasMs, arrMs: 33, dcdMs: 0 });
    h.press('left', g);
    const x = g.state.active?.x ?? 0;
    let t = 0;
    for (let i = 0; i < 4000; i++) {
      t += stepMs;
      h.step(stepMs, g);
      g.step(0);
      if ((g.state.active?.x ?? x) !== x) return t;
    }
    return -1;
  }

  it('un evento nunca se adelanta, y llega como mucho un paso tarde', () => {
    // Solo puede ocurrir al terminar un paso, así que el retraso está acotado
    // por el tamaño del paso. Lo que no puede es adelantarse.
    for (const das of [100, 133, 167, 200]) {
      const real = dasReal(STEP_MS, das);
      expect(real, `DAS ${das}`).toBeGreaterThanOrEqual(das);
      expect(real, `DAS ${das}`).toBeLessThan(das + STEP_MS);
    }
  });

  it('el reloj actual acerca el DAS a lo pedido más que el anterior', () => {
    // A 120 Hz un DAS de 167 ms llegaba a los 175,0; a 240 Hz llega a 170,8
    // (F-035, ADR-0009).
    const antes = dasReal(1000 / 120, 167);
    const ahora = dasReal(STEP_MS, 167);
    expect(antes).toBeCloseTo(175, 0);
    expect(ahora).toBeCloseTo(170.8, 0);
    expect(ahora - 167).toBeLessThan(antes - 167);
  });
});
