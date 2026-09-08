import { createBoard } from './board';
import { BOARD_W, GARBAGE_CELL } from './constants';
import type { PieceType, SpinDetection } from './types';

/**
 * Posiciones preparadas para entrenar jugadas concretas: el tablero empieza
 * montado y la cola de piezas es fija, así la misma situación se puede repetir
 * hasta que salga (docs/research/16).
 */

export type DrillId = 'tspinDouble' | 'tspinTriple' | 'perfectClear' | 'immobileSpin';

export const DRILL_IDS: readonly DrillId[] = [
  'tspinDouble',
  'tspinTriple',
  'perfectClear',
  'immobileSpin',
];

export interface Drill {
  readonly id: DrillId;
  /** Filas ocupadas, de abajo arriba: cada una lista las columnas llenas. */
  readonly rows: readonly (readonly number[])[];
  /** Piezas que se reparten, en orden. */
  readonly queue: readonly PieceType[];
  /** Detección de giros que necesita la posición para tener sentido. */
  readonly spinDetection?: SpinDetection;
}

/** Todas las columnas salvo las indicadas. */
const allBut = (...holes: number[]): number[] => {
  const out: number[] = [];
  for (let x = 0; x < BOARD_W; x++) if (!holes.includes(x)) out.push(x);
  return out;
};

export const DRILLS: Readonly<Record<DrillId, Drill>> = {
  /** La ranura clásica: la T entra girando y limpia dos filas. */
  tspinDouble: {
    id: 'tspinDouble',
    rows: [allBut(4), allBut(3, 4, 5), [3, 5]],
    queue: ['T', 'T', 'T', 'T', 'T', 'T', 'T'],
  },

  /**
   * Pozo de tres filas con entrada lateral. Solo se resuelve usando la última
   * prueba del ajuste, que asciende el giro a completo aunque las esquinas no
   * cumplan la regla de siempre.
   */
  tspinTriple: {
    id: 'tspinTriple',
    rows: [allBut(5), allBut(5, 6), allBut(5), [], [5]],
    queue: ['T', 'T', 'T', 'T', 'T', 'T', 'T'],
  },

  /**
   * Rectángulo al que le falta una columna de cuatro: la I vertical lo cierra y
   * deja el tablero vacío, que es la forma de las configuraciones documentadas.
   */
  perfectClear: {
    id: 'perfectClear',
    rows: [allBut(9), allBut(9), allBut(9), allBut(9)],
    queue: ['I', 'I', 'I', 'I', 'I', 'I', 'I'],
  },

  /**
   * Hueco de dos por dos donde la O queda encajada sin poder moverse. Necesita
   * los giros de todas las piezas para que cuente.
   */
  immobileSpin: {
    id: 'immobileSpin',
    rows: [allBut(4, 5), allBut(4, 5), [4, 5]],
    queue: ['O', 'O', 'O', 'O', 'O', 'O', 'O'],
    spinDetection: 'all-mini',
  },
};

/** Tablero inicial de una posición, listo para usar. */
export function buildDrillBoard(drill: Drill): Uint8Array {
  const board = createBoard();
  for (const [y, columns] of drill.rows.entries()) {
    for (const x of columns) board[y * BOARD_W + x] = GARBAGE_CELL;
  }
  return board;
}
