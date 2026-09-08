/** Tipos del motor. Sin dependencias del DOM. Ver docs/ARCHITECTURE.md y docs/research/01. */

export const PIECE_TYPES = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'] as const;
export type PieceType = (typeof PIECE_TYPES)[number];

/** 0 = spawn, 1 = R (horario), 2 = 180°, 3 = L (antihorario). */
export type Rotation = 0 | 1 | 2 | 3;

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface ActivePiece {
  type: PieceType;
  rotation: Rotation;
  /** Esquina inferior-izquierda de la caja de rotación (y hacia arriba). */
  x: number;
  y: number;
}

export type Phase =
  'ready' | 'spawning' | 'falling' | 'locking' | 'clearing' | 'finished' | 'gameover';

export type Command =
  'left' | 'right' | 'cw' | 'ccw' | 'r180' | 'softDropOn' | 'softDropOff' | 'hardDrop' | 'hold';

export type TSpinKind = 'none' | 'mini' | 'full';
export type GameOverReason = 'blockout' | 'lockout';
export type RotationSystem = 'srs' | 'srs-plus';
export type LockResetMode = 'move' | 'step' | 'infinite';
/**
 * Qué giros reconoce el juego. `t-spin` es lo que fija la especificación oficial;
 * las otras dos añaden los giros del resto de piezas (docs/research/11).
 */
export type SpinDetection = 't-spin' | 'all-mini' | 'all-mini-plus';

export type Goal =
  | { readonly type: 'none' }
  | { readonly type: 'lines'; readonly lines: number }
  | { readonly type: 'time'; readonly ms: number };

export interface RuleSet {
  readonly rotationSystem: RotationSystem;
  readonly enable180: boolean;
  readonly nextCount: number;
  readonly holdEnabled: boolean;
  readonly lockDelayMs: number;
  readonly lockResetLimit: number;
  readonly lockResetMode: LockResetMode;
  readonly spinDetection: SpinDetection;
  readonly areMs: number;
  readonly lineClearDelayMs: number;
  readonly startLevel: number;
  /** Nivel máximo para gravedad y visualización. */
  readonly levelCap: number;
  readonly linesPerLevel: number;
  /** 'guideline' sube con el nivel; 'fixed' usa siempre startLevel. */
  readonly gravityMode: 'guideline' | 'fixed';
  /** Multiplicador de soft drop (Infinity = instantáneo). */
  readonly softDropFactor: number;
  readonly goal: Goal;
}

export interface LineClearEvent {
  readonly type: 'lineClear';
  readonly rows: readonly number[];
  readonly count: number;
  readonly tspin: TSpinKind;
  readonly b2b: boolean;
  readonly combo: number;
  readonly perfectClear: boolean;
  readonly points: number;
}

export type GameEvent =
  | { readonly type: 'spawn'; readonly piece: PieceType }
  | { readonly type: 'move'; readonly dir: -1 | 1 }
  | { readonly type: 'rotate'; readonly kick: number }
  | { readonly type: 'rotateFail' }
  | { readonly type: 'softDrop' }
  | { readonly type: 'hardDrop'; readonly distance: number }
  | { readonly type: 'land' }
  | { readonly type: 'lock'; readonly piece: ActivePiece }
  | LineClearEvent
  | { readonly type: 'tspin'; readonly mini: boolean; readonly points: number }
  | { readonly type: 'clearDone'; readonly rows: readonly number[] }
  | { readonly type: 'levelUp'; readonly level: number }
  | { readonly type: 'hold'; readonly piece: PieceType }
  | { readonly type: 'holdFail' }
  | { readonly type: 'finished' }
  | { readonly type: 'gameOver'; readonly reason: GameOverReason };

export interface GameStats {
  pieces: number;
  tetrises: number;
  tspins: number;
  perfectClears: number;
  maxCombo: number;
  maxB2b: number;
  hardDrops: number;
  /** Puntuación por acción (sin drops), útil para estadísticas. */
  clearPoints: number;
}

export interface ClearingInfo {
  readonly rows: readonly number[];
  elapsedMs: number;
}

export interface GameState {
  /** Índice y * 10 + x; y = 0 es la fila inferior. 0 vacío, 1-7 pieza (índice en PIECE_TYPES + 1), 8 basura. */
  readonly board: Uint8Array;
  active: ActivePiece | null;
  ghostY: number;
  hold: PieceType | null;
  holdUsed: boolean;
  /** Cola completa; los renderers muestran los primeros `rules.nextCount`. */
  readonly queue: PieceType[];
  phase: Phase;
  level: number;
  lines: number;
  score: number;
  /** Combo actual (número de limpiezas consecutivas − 1; −1 si no hay combo). */
  combo: number;
  b2b: number;
  clearing: ClearingInfo | null;
  timeMs: number;
  softDropping: boolean;
  lockTimerMs: number;
  lockMovesRemaining: number;
  readonly stats: GameStats;
  gameOverReason: GameOverReason | null;
}
