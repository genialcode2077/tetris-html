import { stackHeight } from '@/core/board';
import type { GameEvent, GameState } from '@/core/types';

/**
 * Consejos que aparecen en el momento en que la mecánica importa, en lugar de un
 * tutorial al arrancar que casi nadie lee (docs/research/10).
 *
 * Cada consejo se muestra una sola vez en la vida del jugador. El módulo no toca
 * el navegador: recibe eventos y devuelve el identificador del consejo que toca,
 * si es que toca alguno.
 */

export type TipId =
  'hold' | 'hardDrop' | 'tspin' | 'backToBack' | 'combo' | 'danger' | 'perfectClear';

export const TIP_IDS: readonly TipId[] = [
  'hold',
  'hardDrop',
  'tspin',
  'backToBack',
  'combo',
  'danger',
  'perfectClear',
];

/** Piezas colocadas sin usar la reserva antes de mencionarla. */
const PIECES_BEFORE_HOLD_TIP = 14;
/** Piezas colocadas sin usar la caída rápida antes de mencionarla. */
const PIECES_BEFORE_HARD_DROP_TIP = 10;
/** Fila a partir de la cual la pila se considera en zona de peligro. */
const DANGER_ROW = 15;
/** Separación mínima entre consejos, para que no se solapen ni agobien. */
export const MIN_GAP_MS = 15_000;

export interface CoachOptions {
  /** Consejos ya vistos en partidas anteriores; no vuelven a salir. */
  readonly seen: Iterable<TipId>;
  /** Reloj inyectable para poder probar los tiempos. */
  readonly now?: () => number;
}

export class Coach {
  private readonly seen: Set<TipId>;
  private readonly now: () => number;
  private lastTipAt = Number.NEGATIVE_INFINITY;
  private usedHold = false;
  private usedHardDrop = false;
  private pieces = 0;

  constructor(options: CoachOptions) {
    this.seen = new Set(options.seen);
    this.now = options.now ?? ((): number => performance.now());
  }

  /** Consejos vistos, para guardarlos. */
  get seenTips(): TipId[] {
    return [...this.seen];
  }

  /** Se llama al empezar una partida nueva; lo aprendido no se olvida. */
  resetForNewGame(): void {
    this.usedHold = false;
    this.usedHardDrop = false;
    this.pieces = 0;
    this.lastTipAt = Number.NEGATIVE_INFINITY;
  }

  /**
   * Procesa un evento del juego y devuelve el consejo que toca mostrar, o null.
   * Marca el consejo como visto, así que solo lo devuelve una vez.
   */
  observe(event: GameEvent, state: Readonly<GameState>): TipId | null {
    this.track(event);
    // Se recorren por prioridad: si el primero ya se vio, se pasa al siguiente.
    const candidate = this.candidates(event, state).find((tip) => !this.seen.has(tip));
    if (candidate === undefined) return null;
    const now = this.now();
    if (now - this.lastTipAt < MIN_GAP_MS) return null;
    this.seen.add(candidate);
    this.lastTipAt = now;
    return candidate;
  }

  private track(event: GameEvent): void {
    if (event.type === 'hold') this.usedHold = true;
    else if (event.type === 'hardDrop') this.usedHardDrop = true;
    else if (event.type === 'lock') this.pieces++;
  }

  /** Consejos que encajan con lo que acaba de pasar, del más al menos oportuno. */
  private candidates(event: GameEvent, state: Readonly<GameState>): TipId[] {
    switch (event.type) {
      case 'lineClear': {
        const out: TipId[] = [];
        if (event.perfectClear) out.push('perfectClear');
        if (event.tspin !== 'none') out.push('tspin');
        if (event.b2b) out.push('backToBack');
        if (event.combo >= 1) out.push('combo');
        return out;
      }
      case 'tspin':
        return ['tspin'];
      case 'lock': {
        const out: TipId[] = [];
        // La pila alta preocupa más que cualquier consejo sobre teclas.
        if (stackHeight(state.board) >= DANGER_ROW) out.push('danger');
        if (!this.usedHardDrop && this.pieces >= PIECES_BEFORE_HARD_DROP_TIP) out.push('hardDrop');
        if (!this.usedHold && this.pieces >= PIECES_BEFORE_HOLD_TIP) out.push('hold');
        return out;
      }
      default:
        return [];
    }
  }
}
