import { describe, expect, it } from 'vitest';
import { Session } from './session';
import { parseReplay, serializeReplay, ReplayPlayer, ReplayRecorder } from './replay';
import type { InputAction } from './handling';

const STEP = 1000 / 120;

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

  it('el grabador redondea el tiempo y se puede vaciar', () => {
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
      result: { score: 0, lines: 0, level: 1, timeMs: 0, pieces: 0, finished: false },
    });
    expect(built.inputs[0]?.t).toBe(13);
    expect(built.inputs[1]?.t).toBe(30);
    rec.clear();
    expect(rec.count).toBe(0);
  });
});
