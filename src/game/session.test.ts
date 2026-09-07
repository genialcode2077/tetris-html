import { describe, expect, it } from 'vitest';
import { Session } from './session';

describe('Session', () => {
  it('cuenta atrás → jugando; pausa y reanuda', () => {
    const s = new Session({ mode: 'marathon', countdownMs: 100, seed: 1 });
    expect(s.status).toBe('countdown');
    s.step(50);
    expect(s.game.state.phase).toBe('ready');
    s.step(60);
    expect(s.status).toBe('playing');
    expect(s.game.state.active).not.toBeNull();
    s.pause();
    expect(s.status).toBe('paused');
    const t = s.elapsedMs;
    s.step(100);
    expect(s.elapsedMs).toBe(t);
    s.resume();
    s.step(100);
    expect(s.elapsedMs).toBeGreaterThan(t);
  });

  it('Sprint usa reglas de 40 líneas y gravedad fija', () => {
    const s = new Session({ mode: 'sprint', countdownMs: 0, seed: 1 });
    expect(s.rules.goal).toEqual({ type: 'lines', lines: 40 });
    expect(s.rules.gravityMode).toBe('fixed');
    expect(s.status).toBe('playing');
  });

  it('propaga eventos y termina en gameover', () => {
    const s = new Session({ mode: 'marathon', countdownMs: 0, seed: 2 });
    const types: string[] = [];
    s.onEvent((e) => types.push(e.type));
    for (let i = 0; i < 200 && s.status === 'playing'; i++) {
      s.press('hardDrop');
      s.release('hardDrop');
      s.step(8);
    }
    expect(types).toContain('lock');
    expect(s.status).toBe('gameover');
  });
});
