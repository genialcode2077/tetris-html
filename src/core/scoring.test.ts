import { describe, expect, it } from 'vitest';
import { isDifficult, scoreClear } from './scoring';

describe('scoring Guideline', () => {
  const base = { level: 1, b2bActive: false, combo: 0, perfectClear: false } as const;

  it('tabla base × nivel', () => {
    expect(scoreClear({ ...base, lines: 1, tspin: 'none' }).points).toBe(100);
    expect(scoreClear({ ...base, lines: 2, tspin: 'none' }).points).toBe(300);
    expect(scoreClear({ ...base, lines: 3, tspin: 'none' }).points).toBe(500);
    expect(scoreClear({ ...base, lines: 4, tspin: 'none' }).points).toBe(800);
    expect(scoreClear({ ...base, lines: 0, tspin: 'mini' }).points).toBe(100);
    expect(scoreClear({ ...base, lines: 0, tspin: 'full' }).points).toBe(400);
    expect(scoreClear({ ...base, lines: 1, tspin: 'mini' }).points).toBe(200);
    expect(scoreClear({ ...base, lines: 1, tspin: 'full' }).points).toBe(800);
    expect(scoreClear({ ...base, lines: 2, tspin: 'mini' }).points).toBe(400);
    expect(scoreClear({ ...base, lines: 2, tspin: 'full' }).points).toBe(1200);
    expect(scoreClear({ ...base, lines: 3, tspin: 'full' }).points).toBe(1600);
    expect(scoreClear({ ...base, lines: 4, tspin: 'none', level: 7 }).points).toBe(5600);
  });

  it('back-to-back multiplica ×1.5 solo acciones difíciles', () => {
    expect(scoreClear({ ...base, lines: 4, tspin: 'none', b2bActive: true }).points).toBe(1200);
    expect(scoreClear({ ...base, lines: 2, tspin: 'full', b2bActive: true }).points).toBe(1800);
    expect(scoreClear({ ...base, lines: 1, tspin: 'none', b2bActive: true }).points).toBe(100);
    expect(scoreClear({ ...base, lines: 1, tspin: 'none', b2bActive: true }).b2bApplied).toBe(
      false,
    );
    expect(scoreClear({ ...base, lines: 0, tspin: 'full', b2bActive: true }).points).toBe(400);
  });

  it('combo = 50 × combo × nivel', () => {
    expect(scoreClear({ ...base, lines: 1, tspin: 'none', combo: 3, level: 2 }).comboPoints).toBe(
      300,
    );
    expect(scoreClear({ ...base, lines: 1, tspin: 'none', combo: 3, level: 2 }).points).toBe(500);
    expect(scoreClear({ ...base, lines: 0, tspin: 'full', combo: 3 }).comboPoints).toBe(0);
  });

  it('perfect clear se suma a la limpieza', () => {
    expect(scoreClear({ ...base, lines: 1, tspin: 'none', perfectClear: true }).points).toBe(900);
    expect(scoreClear({ ...base, lines: 3, tspin: 'none', perfectClear: true }).points).toBe(2300);
    expect(scoreClear({ ...base, lines: 4, tspin: 'none', perfectClear: true }).points).toBe(2800);
    expect(
      scoreClear({ ...base, lines: 4, tspin: 'none', perfectClear: true, b2bActive: true }).points,
    ).toBe(1200 + 3200);
  });

  it('isDifficult', () => {
    expect(isDifficult(4, 'none')).toBe(true);
    expect(isDifficult(1, 'mini')).toBe(true);
    expect(isDifficult(0, 'full')).toBe(false);
    expect(isDifficult(3, 'none')).toBe(false);
  });
});
