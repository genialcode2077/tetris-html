import type { GameEvent, GameState } from '@/core/types';

export type PaletteName = 'neon' | 'accessible' | 'highContrast';

export interface RenderOptions {
  palette: PaletteName;
  ghost: boolean;
  particles: boolean;
  shake: boolean;
  reducedMotion: boolean;
  grid: boolean;
  /** Símbolos por pieza (accesibilidad). */
  patterns: boolean;
}

export const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  palette: 'neon',
  ghost: true,
  particles: true,
  shake: true,
  reducedMotion: false,
  grid: true,
  patterns: false,
};

export interface Renderer {
  init(container: HTMLElement, options: RenderOptions): void;
  setOptions(options: Partial<RenderOptions>): void;
  resize(): void;
  render(state: Readonly<GameState>, nowMs: number): void;
  effect(event: GameEvent, state: Readonly<GameState>): void;
  dispose(): void;
}
