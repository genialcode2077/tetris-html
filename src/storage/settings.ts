import type { LockResetMode, RotationSystem } from '@/core/types';
import type { GameMode } from '@/core/rules';
import type { HandlingSettings } from '@/game/handling';
import type { PaletteName } from '@/render/types';

export interface AudioSettings {
  master: number;
  sfx: number;
  music: number;
  muted: boolean;
  vibration: boolean;
}

export interface VideoSettings {
  renderer: 'canvas2d' | 'three';
  palette: PaletteName;
  particles: boolean;
  shake: boolean;
  ghost: boolean;
  grid: boolean;
  patterns: boolean;
  /** 'auto' respeta prefers-reduced-motion. */
  reducedMotion: 'auto' | 'on' | 'off';
}

export interface RuleSettings {
  rotationSystem: RotationSystem;
  enable180: boolean;
  nextCount: number;
  lockResetMode: LockResetMode;
  softDropFactor: number;
  lineClearDelayMs: number;
}

export interface GameSettings {
  mode: GameMode;
  startLevel: number;
  endless: boolean;
}

export interface TouchSettings {
  buttons: boolean;
  tapAlwaysCw: boolean;
}

export interface StatsSettings {
  /** Avisar en pantalla cuando una colocación gasta teclas de más. */
  showFinesseFaults: boolean;
}

export interface Settings {
  handling: HandlingSettings;
  rules: RuleSettings;
  audio: AudioSettings;
  video: VideoSettings;
  game: GameSettings;
  touch: TouchSettings;
  stats: StatsSettings;
  announce: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  handling: { dasMs: 167, arrMs: 33, dcdMs: 0 },
  rules: {
    rotationSystem: 'srs',
    enable180: false,
    nextCount: 5,
    lockResetMode: 'move',
    softDropFactor: 20,
    lineClearDelayMs: 200,
  },
  audio: { master: 0.8, sfx: 1, music: 0.5, muted: false, vibration: true },
  video: {
    renderer: 'canvas2d',
    palette: 'neon',
    particles: true,
    shake: true,
    ghost: true,
    grid: true,
    patterns: false,
    reducedMotion: 'auto',
  },
  game: { mode: 'marathon', startLevel: 1, endless: false },
  touch: { buttons: true, tapAlwaysCw: false },
  stats: { showFinesseFaults: false },
  announce: true,
};
