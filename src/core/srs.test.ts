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

/**
 * La tabla de giro de 180 no tiene fuente numérica pública: el juego que la
 * estrenó solo publicó un diagrama (F-001, docs/research/11). Lo que sí se puede
 * comprobar es que cumple las propiedades que se le suponen a una tabla de este
 * tipo, para detectar errores al copiarla o al editarla.
 */
describe('tabla de giro de 180', () => {
  const HALF_TURNS: [Rotation, Rotation][] = [
    [0, 2],
    [2, 0],
    [1, 3],
    [3, 1],
  ];

  it('cubre las cuatro medias vueltas y siempre empieza sin desplazar', () => {
    for (const [from, to] of HALF_TURNS) {
      for (const type of ['J', 'L', 'S', 'T', 'Z', 'I'] as const) {
        const kicks = kicksFor(type, from, to, 'srs');
        expect(kicks.length, `${type} ${from}->${to}`).toBeGreaterThan(0);
        expect(kicks[0], `${type} ${from}->${to}`).toEqual({ x: 0, y: 0 });
      }
    }
  });

  it('las pruebas de una media vuelta no se repiten entre sí', () => {
    for (const [from, to] of HALF_TURNS) {
      const kicks = kicksFor('T', from, to, 'srs');
      const seen = new Set(kicks.map((k) => `${k.x},${k.y}`));
      expect(seen.size, `${from}->${to}`).toBe(kicks.length);
    }
  });

  it('la ida y la vuelta son simétricas entre sí', () => {
    for (const [from, to] of [
      [0, 2],
      [1, 3],
    ] as [Rotation, Rotation][]) {
      const there = kicksFor('T', from, to, 'srs');
      const back = kicksFor('T', to, from, 'srs');
      expect(back.length).toBe(there.length);
    }
  });

  it('los desplazamientos son pequeños, como en el resto de la tabla', () => {
    for (const [from, to] of HALF_TURNS) {
      for (const kick of kicksFor('L', from, to, 'srs')) {
        expect(Math.abs(kick.x)).toBeLessThanOrEqual(2);
        expect(Math.abs(kick.y)).toBeLessThanOrEqual(2);
      }
    }
  });
});
