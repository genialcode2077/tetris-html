import type { TSpinKind } from './types';

/** Tabla Guideline (docs/research/01 §8). Índice = líneas limpiadas. */
const BASE: Readonly<Record<TSpinKind, readonly number[]>> = {
  none: [0, 100, 300, 500, 800],
  mini: [100, 200, 400, 400],
  full: [400, 800, 1200, 1600, 1600],
};

const PERFECT_CLEAR: readonly number[] = [0, 800, 1200, 1800, 2000];
const PERFECT_CLEAR_B2B_TETRIS = 3200;
export const B2B_MULTIPLIER = 1.5;
export const COMBO_POINTS = 50;

export function isDifficult(lines: number, tspin: TSpinKind): boolean {
  return lines === 4 || (tspin !== 'none' && lines > 0);
}

export interface ClearScoreInput {
  readonly lines: number;
  readonly tspin: TSpinKind;
  readonly level: number;
  /** true si la limpieza anterior "difícil" sigue activa (cadena B2B). */
  readonly b2bActive: boolean;
  /** Combo aplicado a esta limpieza (0 = primera de la cadena). */
  readonly combo: number;
  readonly perfectClear: boolean;
}

export interface ClearScoreResult {
  readonly points: number;
  readonly b2bApplied: boolean;
  readonly difficult: boolean;
  readonly comboPoints: number;
  readonly perfectClearPoints: number;
}

export function scoreClear(input: ClearScoreInput): ClearScoreResult {
  const { lines, tspin, level, b2bActive, combo, perfectClear } = input;
  const base = BASE[tspin][Math.min(lines, 4)] ?? 0;
  const difficult = isDifficult(lines, tspin);
  const b2bApplied = difficult && b2bActive;
  let action = base * level;
  if (b2bApplied) action = Math.floor(action * B2B_MULTIPLIER);
  const comboPoints = lines > 0 ? COMBO_POINTS * Math.max(0, combo) * level : 0;
  let perfectClearPoints = 0;
  if (perfectClear && lines > 0) {
    const pc = lines === 4 && b2bActive ? PERFECT_CLEAR_B2B_TETRIS : (PERFECT_CLEAR[lines] ?? 0);
    perfectClearPoints = pc * level;
  }
  return {
    points: action + comboPoints + perfectClearPoints,
    b2bApplied,
    difficult,
    comboPoints,
    perfectClearPoints,
  };
}

export const SOFT_DROP_POINTS = 1;
export const HARD_DROP_POINTS = 2;
