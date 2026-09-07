import { describe, expect, it } from 'vitest';
import { gravityMsPerRow, softDropMsPerRow } from './gravity';

describe('gravedad Guideline', () => {
  it('coincide con la tabla de tetris.wiki (ms por fila)', () => {
    expect(gravityMsPerRow(1)).toBeCloseTo(1000, 3);
    expect(gravityMsPerRow(2)).toBeCloseTo(793, 0);
    expect(gravityMsPerRow(5)).toBeCloseTo(355.2, 0);
    expect(gravityMsPerRow(10)).toBeCloseTo(64.15, 0);
    expect(gravityMsPerRow(15)).toBeCloseTo(7.06, 1);
    expect(gravityMsPerRow(19)).toBeCloseTo(0.82, 1);
    expect(gravityMsPerRow(20)).toBe(0);
    expect(gravityMsPerRow(25)).toBe(0);
    expect(gravityMsPerRow(0)).toBe(1000);
  });

  it('soft drop nunca es más lento que la gravedad y admite infinito', () => {
    expect(softDropMsPerRow(1, 20)).toBe(50);
    expect(softDropMsPerRow(15, 20)).toBeLessThanOrEqual(gravityMsPerRow(15));
    expect(softDropMsPerRow(1, Number.POSITIVE_INFINITY)).toBe(0);
    expect(softDropMsPerRow(1, 0)).toBe(0);
  });
});
