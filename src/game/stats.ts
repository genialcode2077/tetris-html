import type { GameState } from '@/core/types';

export interface DerivedStats {
  readonly pps: number;
  readonly lpm: number;
  readonly tetrisRate: number;
  readonly elapsedMs: number;
}

export function deriveStats(state: Readonly<GameState>, elapsedMs: number): DerivedStats {
  const seconds = Math.max(elapsedMs / 1000, 0.001);
  return {
    pps: state.stats.pieces / seconds,
    lpm: (state.lines / seconds) * 60,
    tetrisRate: state.lines > 0 ? (state.stats.tetrises * 4) / state.lines : 0,
    elapsedMs,
  };
}

export function formatTime(ms: number, showMillis = true): string {
  const total = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(total / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  const millis = total % 1000;
  const base = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  return showMillis ? `${base}.${millis.toString().padStart(3, '0')}` : base;
}
