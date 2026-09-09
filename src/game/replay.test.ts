import { describe, expect, it } from 'vitest';
import { Session } from './session';
import { LOGIC_HZ } from './loop';
import {
  LEGACY_LOGIC_HZ,
  REPLAY_VERSION,
  parseReplay,
  serializeReplay,
  ReplayPlayer,
  ReplayRecorder,
} from './replay';
import type { InputAction } from './handling';

const STEP = 1000 / LOGIC_HZ;

/** Juega una partida guiada por un guion y devuelve la sesión terminada. */
function playScripted(seed: number, script: [number, InputAction, boolean][]): Session {
  const s = new Session({ mode: 'marathon', countdownMs: 0, seed });
  let i = 0;
  for (let t = 0; t < 20_000 && s.status === 'playing'; t += STEP) {
    while (i < script.length && (script[i]?.[0] ?? Infinity) <= s.elapsedMs) {
      const entry = script[i];
      i++;
      if (!entry) continue;
      if (entry[2]) s.press(entry[1]);
      else s.release(entry[1]);
    }
    s.step(STEP);
  }
  return s;
}

describe('repeticiones', () => {
  it('reproducir una repetición da exactamente el mismo resultado', () => {
    const script: [number, InputAction, boolean][] = [];
    // Se alternan movimientos, rotaciones y caídas rápidas durante unos segundos.
    const actions: InputAction[] = ['left', 'right', 'cw', 'ccw', 'hold', 'softDrop'];
    for (let t = 100; t < 8000; t += 90) {
      const action = actions[Math.floor(t / 90) % actions.length]!;
      script.push([t, action, true], [t + 40, action, false]);
      if (t % 450 === 100) script.push([t + 45, 'hardDrop', true], [t + 60, 'hardDrop', false]);
    }

    const original = playScripted(1234, script);
    const replay = original.buildReplay('test');
    expect(replay.inputs.length).toBeGreaterThan(50);
    expect(replay.seed).toBe(1234);

    const playback = new Session({ mode: 'marathon', countdownMs: 0, replay });
    expect(playback.isReplay).toBe(true);
    for (let t = 0; t < 20_000 && playback.status === 'playing'; t += STEP) playback.step(STEP);

    expect(playback.game.state.score).toBe(original.game.state.score);
    expect(playback.game.state.lines).toBe(original.game.state.lines);
    expect(playback.game.state.stats.pieces).toBe(original.game.state.stats.pieces);
    expect(Array.from(playback.game.state.board)).toEqual(Array.from(original.game.state.board));
    expect(playback.status).toBe(original.status);
  });

  it('una repetición ignora las órdenes del jugador', () => {
    const original = playScripted(7, [
      [50, 'hardDrop', true],
      [70, 'hardDrop', false],
    ]);
    const replay = original.buildReplay('test');
    const playback = new Session({ mode: 'marathon', countdownMs: 0, replay });
    playback.press('left');
    playback.step(STEP);
    expect(playback.game.state.active?.x).toBe(
      3 + (playback.game.state.active?.type === 'O' ? 1 : 0),
    );
  });

  it('el formato se guarda y se lee sin perder nada', () => {
    const original = playScripted(99, [
      [100, 'cw', true],
      [140, 'cw', false],
      [200, 'hardDrop', true],
      [220, 'hardDrop', false],
    ]);
    const replay = original.buildReplay('1.2.3');
    const parsed = parseReplay(serializeReplay(replay));
    expect(parsed).not.toBeNull();
    expect(parsed?.appVersion).toBe('1.2.3');
    expect(parsed?.inputs).toEqual(replay.inputs);
    expect(parsed?.result.pieces).toBe(replay.result.pieces);
  });

  it('rechaza datos que no son una repetición válida', () => {
    expect(parseReplay('no es json')).toBeNull();
    expect(parseReplay('{}')).toBeNull();
    expect(parseReplay('{"version":99}')).toBeNull();
    expect(parseReplay('{"version":1,"seed":1,"rules":{},"inputs":"no"}')).toBeNull();
    expect(parseReplay('{"version":1,"seed":1,"rules":{},"inputs":[{"t":"a"}]}')).toBeNull();
  });

  it('el reproductor entrega las entradas en orden y solo una vez', () => {
    const player = new ReplayPlayer([
      { t: 10, action: 'left', down: true },
      { t: 20, action: 'left', down: false },
      { t: 100, action: 'cw', down: true },
    ]);
    expect(player.drain(5)).toEqual([]);
    expect(player.drain(20)).toHaveLength(2);
    expect(player.drain(20)).toEqual([]);
    expect(player.finished).toBe(false);
    expect(player.drain(1000)).toHaveLength(1);
    expect(player.finished).toBe(true);
    expect(player.progress).toBe(1);
  });

  it('el grabador trunca el tiempo y se puede vaciar', () => {
    const rec = new ReplayRecorder();
    rec.record(12.7, 'left', true);
    rec.record(30.2, 'left', false);
    expect(rec.count).toBe(2);
    const built = rec.build({
      appVersion: 'x',
      mode: 'sprint',
      seed: 5,
      rules: new Session({ mode: 'sprint', countdownMs: 0, seed: 5 }).rules,
      handling: { dasMs: 100, arrMs: 0, dcdMs: 0 },
      logicHz: 240,
      result: { score: 0, lines: 0, level: 1, timeMs: 0, pieces: 0, finished: false },
    });
    // Se trunca, no se redondea: hacia arriba la pulsación se aplicaría en el
    // paso siguiente al que ocurrió (F-042).
    expect(built.inputs[0]?.t).toBe(12);
    expect(built.inputs[1]?.t).toBe(30);
    rec.clear();
    expect(rec.count).toBe(0);
  });
});

describe('reloj grabado en la repetición', () => {
  const base = {
    createdAt: '2026-01-01T00:00:00.000Z',
    appVersion: 'x',
    mode: 'sprint',
    seed: 7,
    rules: { goal: { type: 'none' } },
    handling: { dasMs: 167, arrMs: 33, dcdMs: 0 },
    inputs: [{ t: 10, action: 'left', down: true }],
    result: { score: 0, lines: 0, level: 1, timeMs: 0, pieces: 0, finished: false },
  };

  it('una repetición de la versión 1 se lee con el reloj que tenía entonces', () => {
    const v1 = parseReplay(JSON.stringify({ ...base, version: 1 }));
    expect(v1).not.toBeNull();
    expect(v1?.logicHz).toBe(LEGACY_LOGIC_HZ);
    expect(v1?.version).toBe(1);
    // Y sigue conservando sus pulsaciones intactas.
    expect(v1?.inputs).toEqual(base.inputs);
  });

  it('una repetición nueva conserva el reloj con el que se jugó', () => {
    const v2 = parseReplay(JSON.stringify({ ...base, version: 2, logicHz: 240 }));
    expect(v2?.logicHz).toBe(240);
  });

  it('se rechaza una versión desconocida o un reloj imposible', () => {
    expect(parseReplay(JSON.stringify({ ...base, version: 3, logicHz: 240 }))).toBeNull();
    expect(parseReplay(JSON.stringify({ ...base, version: 2 }))).toBeNull();
    expect(parseReplay(JSON.stringify({ ...base, version: 2, logicHz: 0 }))).toBeNull();
  });

  it('la sesión reproduce cada repetición con su propio reloj', () => {
    const v1 = parseReplay(JSON.stringify({ ...base, version: 1 }));
    const v2 = parseReplay(JSON.stringify({ ...base, version: 2, logicHz: 240 }));
    expect(v1).not.toBeNull();
    expect(v2).not.toBeNull();
    if (!v1 || !v2) return;
    expect(new Session({ mode: 'sprint', countdownMs: 0, replay: v1 }).logicHz).toBe(120);
    expect(new Session({ mode: 'sprint', countdownMs: 0, replay: v2 }).logicHz).toBe(240);
    // Una partida nueva usa el reloj actual del juego.
    expect(new Session({ mode: 'sprint', countdownMs: 0, seed: 1 }).logicHz).toBe(LOGIC_HZ);
  });

  it('lo que se graba hoy lleva el reloj actual y se vuelve a leer igual', () => {
    const s = new Session({ mode: 'sprint', countdownMs: 0, seed: 3 });
    const replay = s.buildReplay('1.0.0');
    expect(replay.version).toBe(REPLAY_VERSION);
    expect(replay.logicHz).toBe(LOGIC_HZ);
    const leida = parseReplay(serializeReplay(replay));
    expect(leida?.logicHz).toBe(LOGIC_HZ);
  });
});
