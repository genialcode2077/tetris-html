import type { GameMode } from '@/core/rules';
import type { RuleSet } from '@/core/types';
import type { HandlingSettings, InputAction } from './handling';

/**
 * Repetición de una partida. Como el motor es determinista (misma semilla y mismas
 * entradas dan el mismo resultado), basta con guardar la configuración inicial y la
 * lista de pulsaciones con su marca de tiempo. Un archivo pesa unos pocos kilobytes.
 */
export const REPLAY_VERSION = 2;

/**
 * Frecuencia lógica de las repeticiones de la versión 1, que no la guardaban.
 * Reproducirlas con este reloj las mantiene fieles al original (ADR-0009).
 */
export const LEGACY_LOGIC_HZ = 120;

export interface ReplayInput {
  /** Milisegundos de juego transcurridos, sin contar pausas ni cuenta atrás. */
  readonly t: number;
  readonly action: InputAction;
  /** true al pulsar, false al soltar. */
  readonly down: boolean;
}

export interface ReplayResult {
  readonly score: number;
  readonly lines: number;
  readonly level: number;
  readonly timeMs: number;
  readonly pieces: number;
  readonly finished: boolean;
}

export interface Replay {
  readonly version: 1 | typeof REPLAY_VERSION;
  readonly createdAt: string;
  readonly appVersion: string;
  readonly mode: GameMode;
  readonly seed: number;
  readonly rules: RuleSet;
  readonly handling: HandlingSettings;
  /**
   * Pasos por segundo con los que se jugó. Decide en qué instante se aplica
   * cada pulsación, así que reproducir con otro reloj da otra partida.
   */
  readonly logicHz: number;
  readonly inputs: readonly ReplayInput[];
  readonly result: ReplayResult;
}

/** Va anotando las pulsaciones de una partida en curso. */
export class ReplayRecorder {
  private readonly inputs: ReplayInput[] = [];

  record(timeMs: number, action: InputAction, down: boolean): void {
    // El tiempo se redondea al milisegundo: el paso lógico es de 8,33 ms, así que
    // no se pierde precisión y el archivo queda más pequeño.
    this.inputs.push({ t: Math.round(timeMs), action, down });
  }

  get count(): number {
    return this.inputs.length;
  }

  clear(): void {
    this.inputs.length = 0;
  }

  build(meta: Omit<Replay, 'version' | 'inputs' | 'createdAt'> & { createdAt?: string }): Replay {
    return {
      version: REPLAY_VERSION,
      createdAt: meta.createdAt ?? new Date().toISOString(),
      appVersion: meta.appVersion,
      mode: meta.mode,
      seed: meta.seed,
      rules: meta.rules,
      handling: meta.handling,
      logicHz: meta.logicHz,
      inputs: [...this.inputs],
      result: meta.result,
    };
  }
}

/** Reproduce las entradas de una repetición en orden, según avanza el reloj. */
export class ReplayPlayer {
  private index = 0;

  constructor(private readonly inputs: readonly ReplayInput[]) {}

  get finished(): boolean {
    return this.index >= this.inputs.length;
  }

  get progress(): number {
    return this.inputs.length === 0 ? 1 : this.index / this.inputs.length;
  }

  /** Entradas que corresponden al tiempo indicado y que aún no se han aplicado. */
  drain(timeMs: number): ReplayInput[] {
    const out: ReplayInput[] = [];
    while (this.index < this.inputs.length) {
      const input = this.inputs[this.index];
      if (!input || input.t > timeMs) break;
      out.push(input);
      this.index++;
    }
    return out;
  }

  reset(): void {
    this.index = 0;
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Lee una repetición desde JSON, rechazando lo que no encaje con el formato. */
export function parseReplay(raw: string): Replay | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(data)) return null;
  if (data.version !== REPLAY_VERSION && data.version !== 1) return null;
  if (typeof data.seed !== 'number' || !isObject(data.rules)) return null;
  const inputs = data.inputs;
  if (!Array.isArray(inputs)) return null;
  for (const input of inputs) {
    if (!isObject(input) || typeof input.t !== 'number' || typeof input.down !== 'boolean') {
      return null;
    }
    if (typeof input.action !== 'string') return null;
  }
  // Las de la versión 1 no guardaban el reloj: era 120 Hz.
  const logicHz = data.version === 1 ? LEGACY_LOGIC_HZ : data.logicHz;
  if (typeof logicHz !== 'number' || !(logicHz > 0)) return null;
  return { ...data, logicHz } as unknown as Replay;
}

export function serializeReplay(replay: Replay): string {
  return JSON.stringify(replay);
}
