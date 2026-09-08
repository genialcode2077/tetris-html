import { BOARD_H, BOARD_W, GARBAGE_CELL } from './constants';
import type { Rng } from './rng';
import type { TSpinKind } from './types';

/**
 * Basura: filas con un hueco que suben desde abajo y empujan la pila.
 * Tabla y mecánica según la especificación oficial (docs/research/13).
 */

export interface GarbageRules {
  /** Cada cuántas piezas colocadas sube una fila. */
  readonly everyPieces: number;
  /** Probabilidad de que el hueco cambie de columna al subir una fila nueva. */
  readonly holeChangeChance: number;
}

/**
 * Filas que envía cada jugada, sin contar el bono por encadenar.
 * Fuente: https://tetris.wiki/Garbage
 */
export function attackRows(lines: number, spin: TSpinKind): number {
  if (lines <= 0) return 0;
  if (spin === 'full') {
    // Giro simple envía 2, doble 4 y triple 6.
    return lines * 2;
  }
  if (spin === 'mini') {
    // Giro menor simple no envía nada; el doble envía una fila.
    return lines >= 2 ? 1 : 0;
  }
  switch (lines) {
    case 1:
      return 0;
    case 2:
      return 1;
    case 3:
      return 2;
    default:
      return 4;
  }
}

/** Filas de más por encadenar jugadas difíciles, según el tipo de limpieza. */
export function backToBackBonusRows(lines: number, spin: TSpinKind): number {
  if (spin === 'full') return lines >= 3 ? 3 : lines === 2 ? 2 : 1;
  if (spin === 'mini') return 1;
  return lines >= 4 ? 2 : 0;
}

/** Bonificación por dejar el tablero vacío, que se suma a lo anterior. */
export const PERFECT_CLEAR_ROWS = 10;

export interface AttackInput {
  readonly lines: number;
  readonly spin: TSpinKind;
  readonly backToBack: boolean;
  readonly perfectClear: boolean;
}

/** Filas totales que genera una limpieza. */
export function attackFor(input: AttackInput): number {
  if (input.lines <= 0) return 0;
  let rows = attackRows(input.lines, input.spin);
  if (input.backToBack) rows += backToBackBonusRows(input.lines, input.spin);
  if (input.perfectClear) rows += PERFECT_CLEAR_ROWS;
  return rows;
}

/**
 * Cola de basura pendiente. Al limpiar líneas, lo que se enviaría se descuenta de
 * lo que está por entrar antes de salir hacia fuera: defenderse y atacar son la
 * misma acción.
 */
export class GarbageQueue {
  private pending = 0;
  private piecesSinceRise = 0;
  private holeColumn: number;

  constructor(
    private readonly rules: GarbageRules,
    private readonly rng: Rng,
  ) {
    this.holeColumn = Math.floor(rng() * BOARD_W);
  }

  /** Filas esperando entrar. */
  get pendingRows(): number {
    return this.pending;
  }

  /** Columna donde caerá el hueco de la próxima fila. */
  get currentHole(): number {
    return this.holeColumn;
  }

  /**
   * Descuenta de lo pendiente lo que generaría esta limpieza.
   * @returns lo que sobra tras cancelar, que en un juego contra otra persona se enviaría.
   */
  cancel(attack: number): number {
    if (attack <= 0) return 0;
    const used = Math.min(this.pending, attack);
    this.pending -= used;
    return attack - used;
  }

  /** Se llama al fijar una pieza; encola una fila cada tantas piezas. */
  onPieceLocked(clearedLines: number): void {
    if (clearedLines > 0) {
      // Limpiar da un respiro: se reinicia la cuenta hacia la siguiente subida.
      this.piecesSinceRise = 0;
      return;
    }
    this.piecesSinceRise++;
    if (this.piecesSinceRise >= this.rules.everyPieces) {
      this.piecesSinceRise = 0;
      this.pending++;
    }
  }

  /**
   * Mete en el tablero las filas pendientes, empujando todo hacia arriba.
   * @returns cuántas filas entraron.
   */
  applyTo(board: Uint8Array): number {
    const rows = this.pending;
    if (rows <= 0) return 0;
    this.pending = 0;
    for (let i = 0; i < rows; i++) {
      board.copyWithin(BOARD_W, 0, (BOARD_H - 1) * BOARD_W);
      for (let x = 0; x < BOARD_W; x++) {
        board[x] = x === this.holeColumn ? 0 : GARBAGE_CELL;
      }
      if (this.rng() < this.rules.holeChangeChance) {
        this.holeColumn = Math.floor(this.rng() * BOARD_W);
      }
    }
    return rows;
  }
}
