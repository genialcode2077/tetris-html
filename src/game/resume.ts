import { parseReplay, type Replay } from './replay';

/**
 * Partida a medias guardada para no perderla al cerrar la pestaña.
 *
 * No se guarda el estado del motor sino lo que hace falta para reconstruirlo:
 * la semilla y las pulsaciones. El motor es determinista, así que reproducirlas
 * devuelve exactamente la misma partida, y el archivo ocupa unos kilobytes en
 * vez de un tablero serializado (docs/research/21).
 */

export const SAVED_GAME_VERSION = 1;

export interface SavedGame {
  readonly version: typeof SAVED_GAME_VERSION;
  readonly savedAt: string;
  /** Semilla, reglas, ajustes y pulsaciones hasta el momento de guardar. */
  readonly replay: Replay;
  /** Tiempo de juego alcanzado, que es hasta dónde hay que reproducir. */
  readonly elapsedMs: number;
}

/** Modos cuya partida merece la pena guardar: los que se pueden perder. */
export function isResumable(mode: string): boolean {
  return mode !== 'daily';
}

export function serializeSavedGame(saved: SavedGame): string {
  return JSON.stringify(saved);
}

/** Lee una partida guardada, rechazando lo que no encaje. */
export function parseSavedGame(raw: string): SavedGame | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const obj = data as Record<string, unknown>;
  if (obj.version !== SAVED_GAME_VERSION) return null;
  if (typeof obj.elapsedMs !== 'number' || !Number.isFinite(obj.elapsedMs)) return null;
  if (obj.elapsedMs < 0) return null;
  if (typeof obj.savedAt !== 'string') return null;
  // La repetición se valida con su propio lector, que ya conoce sus versiones.
  const replay = parseReplay(JSON.stringify(obj.replay));
  if (!replay) return null;
  return { version: SAVED_GAME_VERSION, savedAt: obj.savedAt, replay, elapsedMs: obj.elapsedMs };
}
