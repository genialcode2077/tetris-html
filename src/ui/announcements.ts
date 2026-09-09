/**
 * Política de anuncios para lector de pantalla (docs/research/25).
 *
 * La región viva no puede recibir un mensaje por cuadro: sería ruido. Pero
 * limitar por tiempo sin mirar qué se anuncia pierde justo lo que más importa,
 * porque el fin de la partida llega pegado a la jugada que lo provoca.
 */

/** Cuánta importancia tiene un aviso. */
export type Priority = 'normal' | 'high';

/** Silencio mínimo entre avisos corrientes, en milisegundos. */
export const QUIET_MS = 900;

export interface Announcement {
  readonly text: string;
  readonly priority: Priority;
}

/**
 * Decide qué se anuncia. Mantiene el último aviso corriente que llegó durante
 * el silencio, para soltarlo cuando toque en vez de perderlo.
 */
export class Announcer {
  private lastAt = -Infinity;
  private pending: string | null = null;
  private lastText: string | null = null;

  /**
   * Registra un aviso. Devuelve el texto que hay que publicar, o null si toca
   * esperar.
   */
  push(a: Announcement, nowMs: number): string | null {
    // Lo importante no espera ni se pierde: el fin de la partida llega en el
    // mismo paso que la jugada que lo provoca.
    if (a.priority === 'high') {
      this.pending = null;
      this.lastAt = nowMs;
      return this.publish(a.text);
    }
    if (nowMs - this.lastAt < QUIET_MS) {
      // Se guarda el más reciente: dos jugadas seguidas y el jugador oye la
      // segunda, que es la que describe el tablero que tiene delante.
      this.pending = a.text;
      return null;
    }
    this.lastAt = nowMs;
    return this.publish(a.text);
  }

  /** Suelta lo que quedó esperando, si ya ha pasado el silencio. */
  flush(nowMs: number): string | null {
    if (this.pending === null || nowMs - this.lastAt < QUIET_MS) return null;
    const text = this.pending;
    this.pending = null;
    this.lastAt = nowMs;
    return this.publish(text);
  }

  /**
   * Dos avisos idénticos seguidos no se distinguen en la región viva, así que
   * el segundo pasaría desapercibido. Se le añade un espacio al final para que
   * el texto cambie sin que cambie lo que se lee en voz alta.
   */
  private publish(text: string): string {
    const salida = text === this.lastText ? `${text} ` : text;
    this.lastText = salida;
    return salida;
  }

  reset(): void {
    this.lastAt = -Infinity;
    this.pending = null;
    this.lastText = null;
  }
}
