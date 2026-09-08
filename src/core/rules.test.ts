import { describe, expect, it } from 'vitest';
import {
  ALL_MODES,
  DEFAULT_RULES,
  MODE_LABELS,
  dailyLabel,
  dailySeed,
  rulesForMode,
} from './rules';

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
    expect(Object.keys(MODE_LABELS)).toContain('marathon');
  });
});

describe('modos nuevos', () => {
  it('el reto diario usa la misma semilla todo el día y cambia al siguiente', () => {
    const hoy = new Date(2026, 8, 7, 10, 0, 0);
    const masTarde = new Date(2026, 8, 7, 23, 59, 0);
    const manana = new Date(2026, 8, 8, 0, 1, 0);
    expect(dailySeed(hoy)).toBe(dailySeed(masTarde));
    expect(dailySeed(hoy)).not.toBe(dailySeed(manana));
    expect(dailyLabel(hoy)).toBe('2026-09-07');
  });

  it('el reto diario son 40 líneas y la práctica no termina', () => {
    expect(rulesForMode('daily').goal).toEqual({ type: 'lines', lines: 40 });
    expect(rulesForMode('practice').goal).toEqual({ type: 'none' });
    expect(rulesForMode('practice').gravityMode).toBe('fixed');
    // El nivel llega hasta veinte para poder practicar con gravedad máxima.
    expect(rulesForMode('practice').levelCap).toBe(20);
    expect(rulesForMode('practice').garbage).toBeNull();
  });

  it('la práctica activa la basura solo si se pide', () => {
    expect(rulesForMode('practice', { garbageEveryPieces: 0 }).garbage).toBeNull();
    const con = rulesForMode('practice', { garbageEveryPieces: 8, garbageHoleChange: 0.5 });
    expect(con.garbage).toEqual({ everyPieces: 8, holeChangeChance: 0.5 });
    // El resto de modos nunca la traen.
    for (const mode of ['marathon', 'sprint', 'ultra', 'zen', 'daily'] as const) {
      expect(rulesForMode(mode, { garbageEveryPieces: 8 }).garbage).toBeNull();
    }
  });

  it('todos los modos tienen etiqueta', () => {
    for (const mode of ALL_MODES) expect(MODE_LABELS[mode]).toBeTruthy();
    expect(ALL_MODES).toHaveLength(6);
  });
});
