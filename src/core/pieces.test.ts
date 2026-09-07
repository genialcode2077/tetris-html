import { describe, expect, it } from 'vitest';
import { PIECE_BOX, PIECE_CELLS, cellsOf } from './pieces';
import { PIECE_TYPES } from './types';

describe('pieces', () => {
  it('cada rotación tiene 4 celdas dentro de su caja', () => {
    for (const t of PIECE_TYPES) {
      for (let r = 0; r < 4; r++) {
        const cells = PIECE_CELLS[t][r]!;
        expect(cells).toHaveLength(4);
        for (const c of cells) {
          expect(c.x).toBeGreaterThanOrEqual(0);
          expect(c.y).toBeGreaterThanOrEqual(0);
          expect(c.x).toBeLessThan(PIECE_BOX[t]);
          expect(c.y).toBeLessThan(PIECE_BOX[t]);
        }
      }
    }
  });

  it('spawn: lado plano abajo y T apunta hacia arriba', () => {
    const t = cellsOf('T', 0)
      .map((c) => `${c.x},${c.y}`)
      .sort();
    expect(t).toEqual(['0,1', '1,1', '1,2', '2,1']);
    const j = cellsOf('J', 0)
      .map((c) => `${c.x},${c.y}`)
      .sort();
    expect(j).toEqual(['0,1', '0,2', '1,1', '2,1']);
  });

  it('I: estado 0 fila 2, R columna 2, 2 fila 1, L columna 1 (SRS)', () => {
    const ys = (r: 0 | 1 | 2 | 3) => new Set(cellsOf('I', r).map((c) => c.y));
    const xs = (r: 0 | 1 | 2 | 3) => new Set(cellsOf('I', r).map((c) => c.x));
    expect([...ys(0)]).toEqual([2]);
    expect([...xs(1)]).toEqual([2]);
    expect([...ys(2)]).toEqual([1]);
    expect([...xs(3)]).toEqual([1]);
  });

  it('O es idéntica en todas las rotaciones', () => {
    const key = (r: 0 | 1 | 2 | 3) =>
      cellsOf('O', r)
        .map((c) => `${c.x},${c.y}`)
        .sort()
        .join(' ');
    expect(key(1)).toBe(key(0));
    expect(key(2)).toBe(key(0));
    expect(key(3)).toBe(key(0));
  });
});
