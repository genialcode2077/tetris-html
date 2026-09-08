import type { GameState } from '@/core/types';

export interface DerivedStats {
  readonly pps: number;
  readonly lpm: number;
  readonly tetrisRate: number;
  readonly elapsedMs: number;
  /** Colocaciones con pulsaciones de más. */
  readonly finesseFaults: number;
  /** Porcentaje de colocaciones perfectas, de 0 a 1. */
  readonly finesseRate: number;
}

export interface FinesseTally {
  /** Colocaciones evaluadas (las que se hicieron sin usar hold). */
  placements: number;
  /** Colocaciones con al menos una pulsación de más. */
  faultyPlacements: number;
  /** Pulsaciones de más acumuladas. */
  faults: number;
}

export function emptyFinesseTally(): FinesseTally {
  return { placements: 0, faultyPlacements: 0, faults: 0 };
}

export function deriveStats(
  state: Readonly<GameState>,
  elapsedMs: number,
  finesse: Readonly<FinesseTally> = emptyFinesseTally(),
): DerivedStats {
  const seconds = Math.max(elapsedMs / 1000, 0.001);
  return {
    pps: state.stats.pieces / seconds,
    lpm: (state.lines / seconds) * 60,
    tetrisRate: state.lines > 0 ? (state.stats.tetrises * 4) / state.lines : 0,
    elapsedMs,
    finesseFaults: finesse.faults,
    finesseRate:
      finesse.placements > 0
        ? (finesse.placements - finesse.faultyPlacements) / finesse.placements
        : 1,
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
