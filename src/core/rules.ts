import type { RuleSet } from './types';

export const DEFAULT_RULES: RuleSet = {
  rotationSystem: 'srs',
  enable180: false,
  nextCount: 5,
  holdEnabled: true,
  lockDelayMs: 500,
  lockResetLimit: 15,
  lockResetMode: 'move',
  areMs: 0,
  lineClearDelayMs: 200,
  startLevel: 1,
  levelCap: 15,
  linesPerLevel: 10,
  gravityMode: 'guideline',
  softDropFactor: 20,
  goal: { type: 'lines', lines: 150 },
};

export type GameMode = 'marathon' | 'sprint' | 'ultra' | 'zen';

export interface ModeOptions {
  readonly startLevel?: number;
  readonly endless?: boolean;
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
  }
}

export const MODE_LABELS: Readonly<Record<GameMode, string>> = {
  marathon: 'Marathon',
  sprint: 'Sprint 40L',
  ultra: 'Ultra 2:00',
  zen: 'Zen',
};
