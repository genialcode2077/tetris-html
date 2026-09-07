import { describe, expect, it } from 'vitest';
import {
  cellAt,
  clearRows,
  collides,
  createBoard,
  dropDistance,
  fullRows,
  isEmptyExcept,
  lockPiece,
  stackHeight,
} from './board';
import { BOARD_H, BOARD_W } from './constants';

function fillRow(board: Uint8Array, y: number, except: number[] = []): void {
  for (let x = 0; x < BOARD_W; x++) if (!except.includes(x)) board[y * BOARD_W + x] = 8;
}

describe('board', () => {
  it('fuera del tablero cuenta como ocupado', () => {
    const b = createBoard();
    expect(cellAt(b, -1, 0)).toBe(1);
    expect(cellAt(b, 10, 0)).toBe(1);
    expect(cellAt(b, 0, -1)).toBe(1);
    expect(cellAt(b, 0, BOARD_H)).toBe(1);
    expect(cellAt(b, 0, 0)).toBe(0);
  });

  it('collides detecta paredes, suelo y bloques', () => {
    const b = createBoard();
    expect(collides(b, 'I', 0, -1, 5)).toBe(true);
    expect(collides(b, 'I', 0, 7, 5)).toBe(true);
    expect(collides(b, 'I', 0, 6, 5)).toBe(false);
    expect(collides(b, 'O', 0, 0, -1)).toBe(true);
    b[0] = 8;
    expect(collides(b, 'O', 0, 0, 0)).toBe(true);
  });

  it('lockPiece escribe el valor de la pieza; dropDistance mide la caída', () => {
    const b = createBoard();
    lockPiece(b, { type: 'O', rotation: 0, x: 4, y: 0 });
    expect(cellAt(b, 4, 0)).toBe(4);
    expect(cellAt(b, 5, 1)).toBe(4);
    expect(dropDistance(b, { type: 'O', rotation: 0, x: 4, y: 10 })).toBe(8);
    expect(dropDistance(b, { type: 'O', rotation: 0, x: 0, y: 10 })).toBe(10);
  });

  it('fullRows y clearRows compactan correctamente', () => {
    const b = createBoard();
    fillRow(b, 0);
    fillRow(b, 1, [3]);
    fillRow(b, 2);
    b[3 * BOARD_W + 7] = 5;
    expect(fullRows(b)).toEqual([0, 2]);
    clearRows(b, [0, 2]);
    expect(fullRows(b)).toEqual([]);
    expect(cellAt(b, 3, 0)).toBe(0);
    expect(cellAt(b, 0, 0)).toBe(8);
    expect(cellAt(b, 7, 1)).toBe(5);
    expect(stackHeight(b)).toBe(2);
  });

  it('isEmptyExcept ignora las filas indicadas', () => {
    const b = createBoard();
    fillRow(b, 0);
    expect(isEmptyExcept(b, [0])).toBe(true);
    b[5 * BOARD_W + 2] = 1;
    expect(isEmptyExcept(b, [0])).toBe(false);
  });
});
