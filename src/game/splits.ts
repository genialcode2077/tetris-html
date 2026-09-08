import type { GameMode } from '@/core/rules';

/**
 * Comparación con el récord por hitos, como hacen las carreras contrarreloj:
 * se toma el tiempo en puntos intermedios y se enseña cuánto se va por delante
 * o por detrás de la mejor marca (docs/research/14).
 */

/** Cada cuántas líneas se toma un tiempo intermedio. */
export const SPLIT_EVERY_LINES = 10;

/** Modos donde el tiempo es el objetivo y la comparación tiene sentido. */
export function hasSplits(mode: GameMode, goalLines: number | null): boolean {
  if (mode !== 'sprint' && mode !== 'daily') return false;
  return goalLines !== null && goalLines >= SPLIT_EVERY_LINES;
}

/** Hitos de un objetivo dado: 10, 20, 30 y 40 para una carrera de cuarenta líneas. */
export function splitTargets(goalLines: number): number[] {
  const out: number[] = [];
  for (let lines = SPLIT_EVERY_LINES; lines <= goalLines; lines += SPLIT_EVERY_LINES) {
    out.push(lines);
  }
  return out;
}

export interface SplitComparison {
  /** Líneas del hito recién cruzado. */
  readonly lines: number;
  /** Tiempo en el que se cruzó, en milisegundos. */
  readonly timeMs: number;
  /** Diferencia contra el récord: negativa si se va por delante. Null si no hay con qué comparar. */
  readonly deltaMs: number | null;
}

/**
 * Registra los tiempos de los hitos que se van cruzando y los compara con los de
 * una marca anterior.
 */
export class SplitTracker {
  private readonly targets: number[];
  private readonly times: number[] = [];
  private nextIndex = 0;

  constructor(
    goalLines: number,
    /** Tiempos del récord en cada hito; vacío si no hay marca previa. */
    private readonly reference: readonly number[] = [],
  ) {
    this.targets = splitTargets(goalLines);
  }

  /** Tiempos tomados hasta ahora, para guardarlos con el récord. */
  get recorded(): number[] {
    return [...this.times];
  }

  /** Hitos que quedan por cruzar. */
  get remaining(): number {
    return this.targets.length - this.nextIndex;
  }

  /**
   * Comprueba si se acaba de cruzar un hito.
   * @returns la comparación si se cruzó uno, o null.
   */
  update(lines: number, timeMs: number): SplitComparison | null {
    const target = this.targets[this.nextIndex];
    if (target === undefined || lines < target) return null;
    this.nextIndex++;
    this.times.push(timeMs);
    const previous = this.reference[this.times.length - 1];
    return {
      lines: target,
      timeMs,
      deltaMs: previous === undefined ? null : timeMs - previous,
    };
  }
}

/** Formatea una diferencia con su signo, en segundos y con una decimal. */
export function formatDelta(deltaMs: number): string {
  const seconds = deltaMs / 1000;
  const sign = seconds >= 0 ? '+' : '−';
  return `${sign}${Math.abs(seconds).toFixed(1)} s`;
}
