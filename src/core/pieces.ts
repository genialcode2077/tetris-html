import type { PieceType, Point, Rotation } from './types';

type Matrix = readonly (readonly (0 | 1)[])[];

/** Matrices de spawn (fila superior primero) según SRS. Ver docs/research/01 §2. */
const SPAWN_MATRIX: Record<PieceType, Matrix> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
};

function rotateCW(m: Matrix): Matrix {
  const n = m.length;
  const out: (0 | 1)[][] = [];
  for (let r = 0; r < n; r++) {
    const row: (0 | 1)[] = [];
    for (let c = 0; c < n; c++) {
      row.push(m[n - 1 - c]?.[r] ?? 0);
    }
    out.push(row);
  }
  return out;
}

/** Convierte una matriz (origen arriba-izquierda) en celdas con y hacia arriba. */
function toCells(m: Matrix): readonly Point[] {
  const n = m.length;
  const cells: Point[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (m[r]?.[c] === 1) cells.push({ x: c, y: n - 1 - r });
    }
  }
  return cells;
}

function buildRotations(type: PieceType): readonly (readonly Point[])[] {
  const base = SPAWN_MATRIX[type];
  const r1 = rotateCW(base);
  const r2 = rotateCW(r1);
  const r3 = rotateCW(r2);
  return [toCells(base), toCells(r1), toCells(r2), toCells(r3)];
}

/** Celdas de cada pieza por rotación, relativas a la esquina inferior-izquierda de su caja. */
export const PIECE_CELLS: Readonly<Record<PieceType, readonly (readonly Point[])[]>> = {
  I: buildRotations('I'),
  J: buildRotations('J'),
  L: buildRotations('L'),
  O: buildRotations('O'),
  S: buildRotations('S'),
  T: buildRotations('T'),
  Z: buildRotations('Z'),
};

/** Tamaño de la caja de rotación. */
export const PIECE_BOX: Readonly<Record<PieceType, number>> = {
  I: 4,
  J: 3,
  L: 3,
  O: 2,
  S: 3,
  T: 3,
  Z: 3,
};

export function cellsOf(type: PieceType, rotation: Rotation): readonly Point[] {
  const rots = PIECE_CELLS[type];
  return rots[rotation] ?? rots[0] ?? [];
}

/** Índice de color/valor de celda en el tablero (1-7). */
export const PIECE_VALUE: Readonly<Record<PieceType, number>> = {
  I: 1,
  J: 2,
  L: 3,
  O: 4,
  S: 5,
  T: 6,
  Z: 7,
};

export const VALUE_PIECE: readonly (PieceType | null)[] = [null, 'I', 'J', 'L', 'O', 'S', 'T', 'Z'];
