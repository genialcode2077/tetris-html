import { describe, expect, it } from 'vitest';
import { SRS_TABLES, kicksFor } from './srs';
import type { Rotation } from './types';

const transitions: [Rotation, Rotation][] = [
  [0, 1],
  [1, 0],
  [1, 2],
  [2, 1],
  [2, 3],
  [3, 2],
  [3, 0],
  [0, 3],
];

describe('SRS kicks', () => {
  it('JLSTZ e I tienen 8 transiciones con 5 tests', () => {
    for (const [from, to] of transitions) {
      expect(kicksFor('T', from, to, 'srs')).toHaveLength(5);
      expect(kicksFor('I', from, to, 'srs')).toHaveLength(5);
      expect(kicksFor('I', from, to, 'srs-plus')).toHaveLength(5);
    }
  });

  it('valores de la tabla Guideline (tetris.wiki)', () => {
    expect(kicksFor('T', 0, 1, 'srs')).toEqual([
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      { x: -1, y: 1 },
      { x: 0, y: -2 },
      { x: -1, y: -2 },
    ]);
    expect(kicksFor('Z', 0, 3, 'srs')).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: -2 },
      { x: 1, y: -2 },
    ]);
    expect(kicksFor('I', 0, 1, 'srs')).toEqual([
      { x: 0, y: 0 },
      { x: -2, y: 0 },
      { x: 1, y: 0 },
      { x: -2, y: -1 },
      { x: 1, y: 2 },
    ]);
    expect(kicksFor('I', 3, 0, 'srs')).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: -2, y: 0 },
      { x: 1, y: -2 },
      { x: -2, y: 1 },
    ]);
  });

  it('cada transición es la inversa de su contraria (JLSTZ)', () => {
    for (const [from, to] of transitions) {
      const a = kicksFor('L', from, to, 'srs');
      const b = kicksFor('L', to, from, 'srs');
      for (let i = 0; i < 5; i++) {
        expect(a[i]!.x + b[i]!.x).toBe(0);
        expect(a[i]!.y + b[i]!.y).toBe(0);
      }
    }
  });

  it('SRS+ usa la I simétrica (Arika) y difiere de la Guideline', () => {
    expect(kicksFor('I', 0, 1, 'srs-plus')).toEqual([
      { x: 0, y: 0 },
      { x: -2, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 2 },
      { x: -2, y: -1 },
    ]);
    expect(kicksFor('I', 0, 1, 'srs-plus')).not.toEqual(kicksFor('I', 0, 1, 'srs'));
    expect(SRS_TABLES.I_SYMMETRIC['2>1']).toEqual([
      { x: 0, y: 0 },
      { x: -2, y: 0 },
      { x: 1, y: 0 },
      { x: -2, y: 1 },
      { x: 1, y: -1 },
    ]);
  });

  it('O no hace kicks; 180 usa su propia tabla', () => {
    expect(kicksFor('O', 0, 1, 'srs')).toEqual([{ x: 0, y: 0 }]);
    expect(kicksFor('T', 0, 2, 'srs')).toHaveLength(6);
    expect(kicksFor('I', 1, 3, 'srs')).toEqual([{ x: 0, y: 0 }]);
  });
});

describe('SRS kicks: casos límite', () => {
  it('180 con I y transiciones no adyacentes devuelven (0,0)', () => {
    expect(kicksFor('I', 0, 2, 'srs')).toEqual([{ x: 0, y: 0 }]);
    expect(kicksFor('I', 2, 0, 'srs-plus')).toEqual([{ x: 0, y: 0 }]);
    expect(kicksFor('J', 3, 1, 'srs')).toHaveLength(6);
    expect(kicksFor('S', 2, 0, 'srs')).toHaveLength(6);
  });
});
