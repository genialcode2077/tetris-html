import type { RuleSet } from './types';

export const DEFAULT_RULES: RuleSet = {
  rotationSystem: 'srs',
  enable180: false,
  nextCount: 5,
  holdEnabled: true,
  lockDelayMs: 500,
  lockResetLimit: 15,
  lockResetMode: 'move',
  spinDetection: 't-spin',
  areMs: 0,
  lineClearDelayMs: 200,
  startLevel: 1,
  levelCap: 15,
  linesPerLevel: 10,
  gravityMode: 'guideline',
  softDropFactor: 20,
  goal: { type: 'lines', lines: 150 },
  garbage: null,
};

export type GameMode = 'marathon' | 'sprint' | 'ultra' | 'zen' | 'daily' | 'practice';

export interface ModeOptions {
  readonly startLevel?: number;
  readonly endless?: boolean;
  /** Solo en el modo práctica: cada cuántas piezas sube una fila de basura. */
  readonly garbageEveryPieces?: number;
  /** Solo en el modo práctica: probabilidad de que el hueco cambie de columna. */
  readonly garbageHoleChange?: number;
}

export function rulesForMode(mode: GameMode, options: ModeOptions = {}): RuleSet {
  const startLevel = Math.min(Math.max(options.startLevel ?? 1, 1), 20);
  switch (mode) {
    case 'marathon':
      return {
        ...DEFAULT_RULES,
        startLevel,
        levelCap: options.endless ? 20 : 15,
        goal: options.endless ? { type: 'none' } : { type: 'lines', lines: 150 },
      };
    case 'sprint':
      return {
        ...DEFAULT_RULES,
        startLevel,
        gravityMode: 'fixed',
        lineClearDelayMs: 0,
        goal: { type: 'lines', lines: 40 },
      };
    case 'ultra':
      return {
        ...DEFAULT_RULES,
        startLevel,
        levelCap: 20,
        goal: { type: 'time', ms: 120_000 },
      };
    case 'zen':
      return {
        ...DEFAULT_RULES,
        startLevel,
        gravityMode: 'fixed',
        goal: { type: 'none' },
      };
    case 'daily':
      // Mismo reto para todo el mundo cada día: 40 líneas con la semilla de la fecha.
      return {
        ...DEFAULT_RULES,
        startLevel: 1,
        levelCap: 15,
        lineClearDelayMs: 0,
        goal: { type: 'lines', lines: 40 },
      };
    case 'practice': {
      // Para entrenar sin presión de tiempo, con basura opcional y nivel libre.
      const every = options.garbageEveryPieces ?? 0;
      return {
        ...DEFAULT_RULES,
        startLevel,
        gravityMode: 'fixed',
        levelCap: 20,
        goal: { type: 'none' },
        garbage:
          every > 0
            ? { everyPieces: every, holeChangeChance: options.garbageHoleChange ?? 0.3 }
            : null,
      };
    }
  }
}

export const MODE_LABELS: Readonly<Record<GameMode, string>> = {
  marathon: 'Marathon',
  sprint: 'Sprint 40L',
  ultra: 'Ultra 2:00',
  zen: 'Zen',
  daily: 'Reto diario',
  practice: 'Práctica',
};

export const ALL_MODES: readonly GameMode[] = [
  'marathon',
  'sprint',
  'ultra',
  'zen',
  'daily',
  'practice',
];

/**
 * Semilla del reto diario: la misma para todo el mundo en la misma fecha local.
 * Se deriva del día para que no haga falta ningún servidor.
 */
export function dailySeed(date = new Date()): number {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Etiqueta legible de la fecha del reto diario. */
export function dailyLabel(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}
