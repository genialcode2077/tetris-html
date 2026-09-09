import { describe, expect, it } from 'vitest';
import { LOGIC_HZ } from './loop';
import type { InputAction } from './handling';
import { parseSavedGame, serializeSavedGame, type SavedGame } from './resume';
import { Session } from './session';

const STEP = 1000 / LOGIC_HZ;

/** Juega una partida a medias con un guion y devuelve la sesión. */
function jugar(seed: number, guion: readonly [number, InputAction][]): Session {
  const s = new Session({ mode: 'marathon', countdownMs: 0, seed });
  const pendientes = [...guion];
  for (let i = 0; i < 3000; i++) {
    while ((pendientes[0]?.[0] ?? Infinity) <= s.elapsedMs) {
      const siguiente = pendientes.shift();
      if (!siguiente) break;
      s.press(siguiente[1]);
      s.release(siguiente[1]);
    }
    s.step(STEP);
    if (s.status !== 'playing') break;
  }
  return s;
}

const GUION: [number, InputAction][] = [
  [50, 'left'],
  [120, 'cw'],
  [200, 'hardDrop'],
  [320, 'right'],
  [400, 'hardDrop'],
  [520, 'hold'],
  [640, 'hardDrop'],
  [760, 'ccw'],
  [880, 'hardDrop'],
];

/** Empaqueta lo jugado como partida guardada. */
function guardar(s: Session): SavedGame {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    replay: s.buildReplay('test'),
    elapsedMs: s.elapsedMs,
  };
}

describe('guardar y continuar una partida', () => {
  it('la partida rehecha es idéntica a la que se guardó', () => {
    const original = jugar(1234, GUION);
    const saved = guardar(original);

    const vuelta = new Session({ mode: 'marathon', countdownMs: 0, resume: saved });

    const a = original.game.state;
    const b = vuelta.game.state;
    expect(b.score).toBe(a.score);
    expect(b.lines).toBe(a.lines);
    expect(b.level).toBe(a.level);
    expect(b.stats.pieces).toBe(a.stats.pieces);
    expect([...b.board]).toEqual([...a.board]);
    expect(b.active?.type).toBe(a.active?.type);
    expect(b.active?.x).toBe(a.active?.x);
    expect(b.active?.y).toBe(a.active?.y);
    expect(b.hold).toBe(a.hold);
    expect(b.queue.slice(0, 5)).toEqual(a.queue.slice(0, 5));
    expect(vuelta.elapsedMs).toBeGreaterThanOrEqual(saved.elapsedMs);
  });

  it('vuelve en pausa y con el control en manos del jugador', () => {
    const vuelta = new Session({
      mode: 'marathon',
      countdownMs: 0,
      resume: guardar(jugar(7, GUION)),
    });
    expect(vuelta.status).toBe('paused');
    // No es una reproducción: acepta órdenes.
    expect(vuelta.isReplay).toBe(false);
    const antes = vuelta.game.state.active?.x ?? 0;
    vuelta.resume();
    vuelta.press('left');
    vuelta.step(STEP);
    expect(vuelta.game.state.active?.x).toBe(antes - 1);
  });

  it('lo que se juega tras continuar se puede volver a guardar', () => {
    const primera = guardar(jugar(99, GUION));
    const vuelta = new Session({ mode: 'marathon', countdownMs: 0, resume: primera });
    vuelta.resume();
    vuelta.press('hardDrop');
    vuelta.release('hardDrop');
    for (let i = 0; i < 200; i++) vuelta.step(STEP);

    const segunda = guardar(vuelta);
    expect(segunda.replay.inputs.length).toBeGreaterThan(primera.replay.inputs.length);
    expect(segunda.replay.seed).toBe(primera.replay.seed);

    // Y la segunda también se rehace bien: continuar no degrada la partida.
    const tercera = new Session({ mode: 'marathon', countdownMs: 0, resume: segunda });
    expect([...tercera.game.state.board]).toEqual([...vuelta.game.state.board]);
    expect(tercera.game.state.score).toBe(vuelta.game.state.score);
  });

  it('se guarda y se lee sin perder nada', () => {
    const saved = guardar(jugar(55, GUION));
    const leida = parseSavedGame(serializeSavedGame(saved));
    expect(leida).not.toBeNull();
    expect(leida?.elapsedMs).toBe(saved.elapsedMs);
    expect(leida?.replay.seed).toBe(saved.replay.seed);
    expect(leida?.replay.inputs).toEqual(saved.replay.inputs);
  });

  it('se rechaza lo que no encaje', () => {
    const saved = guardar(jugar(3, GUION));
    const ok = JSON.parse(serializeSavedGame(saved)) as Record<string, unknown>;
    expect(parseSavedGame('no es json')).toBeNull();
    expect(parseSavedGame('null')).toBeNull();
    expect(parseSavedGame(JSON.stringify({ ...ok, version: 99 }))).toBeNull();
    expect(parseSavedGame(JSON.stringify({ ...ok, elapsedMs: -1 }))).toBeNull();
    expect(parseSavedGame(JSON.stringify({ ...ok, elapsedMs: 'mucho' }))).toBeNull();
    expect(parseSavedGame(JSON.stringify({ ...ok, replay: { version: 9 } }))).toBeNull();
  });

  it('un tiempo desmesurado no cuelga el arranque', () => {
    const saved = guardar(jugar(11, GUION));
    const s = new Session({
      mode: 'marathon',
      countdownMs: 0,
      resume: { ...saved, elapsedMs: 1e12 },
    });
    // Se detiene en el tope en vez de intentar reconstruir siglos de partida.
    expect(s.elapsedMs).toBeLessThanOrEqual(6 * 60 * 60 * 1000 + 1000);
  });
});
