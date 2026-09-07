import { BOARD_H, BOARD_W } from './constants';
import { PIECE_VALUE, cellsOf } from './pieces';
import type { ActivePiece, PieceType, Rotation } from './types';

export function createBoard(): Uint8Array {
  return new Uint8Array(BOARD_W * BOARD_H);
}

export function cellAt(board: Uint8Array, x: number, y: number): number {
  if (x < 0 || x >= BOARD_W || y < 0 || y >= BOARD_H) return 1;
  return board[y * BOARD_W + x] ?? 0;
}

export function isOccupied(board: Uint8Array, x: number, y: number): boolean {
  return cellAt(board, x, y) !== 0;
}

/** true si la pieza en (x, y, rotation) solapa algo o sale del tablero. */
export function collides(
  board: Uint8Array,
  type: PieceType,
  rotation: Rotation,
  x: number,
  y: number,
): boolean {
  for (const c of cellsOf(type, rotation)) {
    if (isOccupied(board, x + c.x, y + c.y)) return true;
  }
  return false;
}

export function lockPiece(board: Uint8Array, piece: ActivePiece): void {
  const v = PIECE_VALUE[piece.type];
  for (const c of cellsOf(piece.type, piece.rotation)) {
    const x = piece.x + c.x;
    const y = piece.y + c.y;
    if (x >= 0 && x < BOARD_W && y >= 0 && y < BOARD_H) board[y * BOARD_W + x] = v;
  }
}

export function dropDistance(board: Uint8Array, piece: ActivePiece): number {
  let d = 0;
  while (!collides(board, piece.type, piece.rotation, piece.x, piece.y - d - 1)) d++;
  return d;
}

export function fullRows(board: Uint8Array): number[] {
  const rows: number[] = [];
  for (let y = 0; y < BOARD_H; y++) {
    let full = true;
    for (let x = 0; x < BOARD_W; x++) {
      if (board[y * BOARD_W + x] === 0) {
        full = false;
        break;
      }
    }
    if (full) rows.push(y);
  }
  return rows;
}

/** Elimina las filas indicadas y compacta hacia abajo. */
export function clearRows(board: Uint8Array, rows: readonly number[]): void {
  if (rows.length === 0) return;
  const remove = new Set(rows);
  let write = 0;
  for (let y = 0; y < BOARD_H; y++) {
    if (remove.has(y)) continue;
    if (write !== y) board.copyWithin(write * BOARD_W, y * BOARD_W, (y + 1) * BOARD_W);
    write++;
  }
  board.fill(0, write * BOARD_W);
}

export function isEmptyExcept(board: Uint8Array, ignoredRows: readonly number[]): boolean {
  const ignore = new Set(ignoredRows);
  for (let y = 0; y < BOARD_H; y++) {
    if (ignore.has(y)) continue;
    for (let x = 0; x < BOARD_W; x++) {
      if (board[y * BOARD_W + x] !== 0) return false;
    }
  }
  return true;
}

/** Altura de la pila (fila más alta ocupada + 1), 0 si vacío. */
export function stackHeight(board: Uint8Array): number {
  for (let y = BOARD_H - 1; y >= 0; y--) {
    for (let x = 0; x < BOARD_W; x++) {
      if (board[y * BOARD_W + x] !== 0) return y + 1;
    }
  }
  return 0;
}
