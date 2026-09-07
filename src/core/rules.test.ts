import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, MODE_LABELS, rulesForMode } from './rules';

describe('rulesForMode', () => {
  it('marathon: 150 líneas y tope 15; endless sin objetivo y tope 20', () => {
    const m = rulesForMode('marathon');
    expect(m.goal).toEqual({ type: 'lines', lines: 150 });
    expect(m.levelCap).toBe(15);
    const e = rulesForMode('marathon', { endless: true, startLevel: 7 });
    expect(e.goal).toEqual({ type: 'none' });
    expect(e.levelCap).toBe(20);
    expect(e.startLevel).toBe(7);
  });

  it('sprint, ultra y zen', () => {
    expect(rulesForMode('sprint').goal).toEqual({ type: 'lines', lines: 40 });
    expect(rulesForMode('sprint').lineClearDelayMs).toBe(0);
    expect(rulesForMode('ultra').goal).toEqual({ type: 'time', ms: 120_000 });
    expect(rulesForMode('ultra').levelCap).toBe(20);
    expect(rulesForMode('zen').goal).toEqual({ type: 'none' });
    expect(rulesForMode('zen').gravityMode).toBe('fixed');
  });

  it('acota el nivel inicial a [1, 20] y conserva los valores por defecto', () => {
    expect(rulesForMode('marathon', { startLevel: 0 }).startLevel).toBe(1);
    expect(rulesForMode('marathon', { startLevel: 99 }).startLevel).toBe(20);
    expect(rulesForMode('zen').lockDelayMs).toBe(DEFAULT_RULES.lockDelayMs);
    expect(Object.keys(MODE_LABELS)).toEqual(['marathon', 'sprint', 'ultra', 'zen']);
  });
});
