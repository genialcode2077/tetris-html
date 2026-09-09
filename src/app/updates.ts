import type { SessionStatus } from '@/game/session';

/**
 * Cuándo aplicar una versión nueva de la aplicación instalada.
 *
 * El service worker no se adelanta solo (ADR-0010): se queda esperando y la
 * aplicación decide el momento. Recargar a mitad de una partida la perdería, y
 * una partida de maratón son diez minutos de trabajo del jugador.
 */

/** Situación de la aplicación en el momento de decidir. */
export interface UpdateContext {
  /** Estado de la partida, o nulo si no hay ninguna abierta. */
  readonly session: SessionStatus | null;
  /** Pantalla superpuesta visible, si la hay. */
  readonly screen: string | null;
}

export type UpdateDecision = 'apply' | 'wait';

/**
 * Solo se aplica cuando no hay nada que perder: sin partida abierta, o con una
 * ya terminada. Con una partida en curso, incluso en pausa, se espera.
 */
export function decideUpdate(ctx: UpdateContext): UpdateDecision {
  if (ctx.session === null) return 'apply';
  if (ctx.session === 'finished' || ctx.session === 'gameover') return 'apply';
  return 'wait';
}

/**
 * Vigila si hay una versión esperando y la aplica en cuanto es seguro. Se
 * consulta al terminar cada partida y al volver al menú, no con un temporizador.
 */
export class UpdateGate {
  private pending = false;
  private applied = false;

  constructor(
    private readonly apply: () => void,
    private readonly context: () => UpdateContext,
  ) {}

  /** Hay una versión nueva lista para entrar. */
  notifyReady(): void {
    if (this.pending || this.applied) return;
    this.pending = true;
    this.maybeApply();
  }

  /** Momento en que puede haber cambiado la situación. */
  maybeApply(): void {
    if (!this.pending) return;
    if (decideUpdate(this.context()) !== 'apply') return;
    this.pending = false;
    // Aplicar recarga la página: solo puede ocurrir una vez.
    this.applied = true;
    this.apply();
  }

  /** Para el aviso en la interfaz. */
  get waiting(): boolean {
    return this.pending;
  }
}
