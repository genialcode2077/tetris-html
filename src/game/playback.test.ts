import { describe, expect, it } from 'vitest';
import { LOGIC_HZ } from './loop';
import { Session } from './session';
import type { InputAction } from './handling';
import type { Replay } from './replay';

const STEP = 1000 / LOGIC_HZ;

/** Juega una partida guiada por un guion y devuelve la repetición resultante. */
function record(seed: number): Replay {
  const s = new Session({ mode: 'marathon', countdownMs: 0, seed });
  const script: [number, InputAction][] = [];
  const actions: InputAction[] = ['left', 'right', 'cw', 'ccw', 'hardDrop'];
  for (let t = 100; t < 6000; t += 120) {
    script.push([t, actions[Math.floor(t / 120) % actions.length] ?? 'left']);
  }
  let i = 0;
  for (let t = 0; t < 12_000 && s.status === 'playing'; t += STEP) {
    while (i < script.length && (script[i]?.[0] ?? Infinity) <= s.elapsedMs) {
      const action = script[i]?.[1];
      i++;
      if (!action) continue;
      s.press(action);
      s.release(action);
    }
    s.step(STEP);
  }
  return s.buildReplay('test');
}

/** Reproduce una repetición entera a la velocidad indicada. */
function play(replay: Replay, rate: number): Session {
  const s = new Session({ mode: replay.mode, countdownMs: 0, replay });
  s.setPlaybackRate(rate);
  // A mayor velocidad hacen falta menos cuadros para llegar al final.
  for (let i = 0; i < 4000 && s.status === 'playing'; i++) s.step(STEP);
  return s;
}

describe('velocidad al ver una repetición', () => {
  const replay = record(2026);

  it('empieza a velocidad normal y se puede cambiar', () => {
    const s = new Session({ mode: replay.mode, countdownMs: 0, replay });
    expect(s.playbackRate).toBe(1);
    s.setPlaybackRate(2);
    expect(s.playbackRate).toBe(2);
    s.setPlaybackRate(1);
    expect(s.playbackRate).toBe(1);
  });

  it('se queda dentro del rango que admiten los reproductores accesibles', () => {
    const s = new Session({ mode: replay.mode, countdownMs: 0, replay });
    s.setPlaybackRate(0.1);
    expect(s.playbackRate).toBe(0.5);
    s.setPlaybackRate(10);
    expect(s.playbackRate).toBe(2.5);
  });

  it('el resultado es idéntico a cualquier velocidad', () => {
    const normal = play(replay, 1);
    for (const rate of [0.5, 1.5, 2, 2.5]) {
      const fast = play(replay, rate);
      expect(Array.from(fast.game.state.board), `velocidad ${rate}`).toEqual(
        Array.from(normal.game.state.board),
      );
      expect(fast.game.state.score, `velocidad ${rate}`).toBe(normal.game.state.score);
      expect(fast.game.state.stats.pieces, `velocidad ${rate}`).toBe(
        normal.game.state.stats.pieces,
      );
    }
  });

  it('ir al doble llega más lejos en los mismos cuadros', () => {
    const lenta = new Session({ mode: replay.mode, countdownMs: 0, replay });
    lenta.setPlaybackRate(0.5);
    const rapida = new Session({ mode: replay.mode, countdownMs: 0, replay });
    rapida.setPlaybackRate(2);
    for (let i = 0; i < 200; i++) {
      lenta.step(STEP);
      rapida.step(STEP);
    }
    expect(rapida.elapsedMs).toBeGreaterThan(lenta.elapsedMs * 3);
    expect(rapida.replayProgress).toBeGreaterThan(lenta.replayProgress);
  });

  it('pausar detiene el avance y reanudar lo continúa', () => {
    const s = new Session({ mode: replay.mode, countdownMs: 0, replay });
    s.setPlaybackRate(2);
    for (let i = 0; i < 50; i++) s.step(STEP);
    const antes = s.elapsedMs;
    s.pause();
    for (let i = 0; i < 50; i++) s.step(STEP);
    expect(s.elapsedMs).toBe(antes);
    s.resume();
    for (let i = 0; i < 50; i++) s.step(STEP);
    expect(s.elapsedMs).toBeGreaterThan(antes);
  });

  it('la velocidad no afecta a una partida normal', () => {
    const s = new Session({ mode: 'marathon', countdownMs: 0, seed: 7 });
    expect(s.isReplay).toBe(false);
    s.setPlaybackRate(2);
    for (let i = 0; i < 120; i++) s.step(STEP);
    // Sin repetición se ignora: el tiempo avanza uno a uno.
    expect(s.elapsedMs).toBeCloseTo(120 * STEP, 3);
  });
});
