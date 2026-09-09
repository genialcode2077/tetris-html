import type { GameMode } from '@/core/rules';
import { DEFAULT_KEYMAP, type KeyMap } from '@/input/keymap';
import type { TipId } from '@/game/coaching';
import type { Replay } from '@/game/replay';
import { parseSavedGame, serializeSavedGame, type SavedGame } from '@/game/resume';
import { DEFAULT_SETTINGS, type Settings } from './settings';

export interface HighScore {
  score: number;
  lines: number;
  level: number;
  timeMs: number;
  pps: number;
  date: string;
  /** Tiempos en cada hito de diez líneas; ausente en marcas anteriores. */
  splits?: number[];
}

export interface PersistedV1 {
  version: 1;
  settings: Settings;
  keymap: KeyMap;
  highscores: Partial<Record<GameMode, HighScore[]>>;
  /** Repetición de la mejor partida de cada modo. */
  bestReplays: Partial<Record<GameMode, Replay>>;
  /** Consejos que el jugador ya ha visto; no vuelven a mostrarse. */
  seenTips: TipId[];
}

export const STORAGE_KEY = 'tetris-html:v1';
/**
 * La partida a medias va en su propia clave: se escribe al ocultarse la página,
 * y conviene que no dependa de serializar el resto de ajustes (docs/research/21).
 */
export const RESUME_KEY = 'tetris-html:resume';
const MAX_SCORES = 10;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Combina recursivamente valores persistidos sobre los valores por defecto (ignora claves desconocidas). */
export function mergeDefaults<T>(defaults: T, stored: unknown): T {
  if (!isObject(defaults) || Array.isArray(defaults)) {
    return stored === undefined ? defaults : (stored as T);
  }
  if (!isObject(stored)) return defaults;
  const out: Record<string, unknown> = { ...(defaults as Record<string, unknown>) };
  for (const key of Object.keys(defaults)) {
    const d = (defaults as Record<string, unknown>)[key];
    const s = stored[key];
    if (s === undefined) continue;
    if (isObject(d) && !Array.isArray(d)) out[key] = mergeDefaults(d, s);
    else if (typeof s === typeof d) out[key] = s;
  }
  return out as T;
}

export function defaultPersisted(): PersistedV1 {
  return {
    version: 1,
    settings: structuredClone(DEFAULT_SETTINGS),
    keymap: structuredClone(DEFAULT_KEYMAP),
    highscores: {},
    bestReplays: {},
    seenTips: [],
  };
}

export class Store {
  private data: PersistedV1;
  private readonly storedLocale: boolean;

  constructor(private readonly storage: StorageLike | null) {
    this.data = this.load();
    this.storedLocale = this.readStoredLocale();
  }

  private readStoredLocale(): boolean {
    if (!this.storage) return false;
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed: unknown = JSON.parse(raw);
      return isObject(parsed) && isObject(parsed.settings) && 'locale' in parsed.settings;
    } catch {
      return false;
    }
  }

  get settings(): Settings {
    return this.data.settings;
  }

  /** true si el jugador ya eligió idioma; si no, se usa el del navegador. */
  get hasStoredLocale(): boolean {
    return this.storedLocale;
  }

  get keymap(): KeyMap {
    return this.data.keymap;
  }

  highscores(mode: GameMode): HighScore[] {
    return this.data.highscores[mode] ?? [];
  }

  get seenTips(): TipId[] {
    return this.data.seenTips;
  }

  setSeenTips(tips: readonly TipId[]): void {
    this.data.seenTips = [...tips];
    this.save();
  }

  /** Tiempos parciales de la mejor marca del modo, para comparar en directo. */
  bestSplits(mode: GameMode): number[] {
    const list = this.highscores(mode);
    const best = mode === 'sprint' ? list[0] : list[0];
    return best?.splits ?? [];
  }

  /** Partida a medias guardada, si la hay y se puede leer. */
  savedGame(): SavedGame | null {
    try {
      const raw = this.storage?.getItem(RESUME_KEY);
      return raw ? parseSavedGame(raw) : null;
    } catch {
      return null;
    }
  }

  /** Guarda la partida a medias. Devuelve false si el almacén no la admite. */
  saveGame(saved: SavedGame): boolean {
    try {
      this.storage?.setItem(RESUME_KEY, serializeSavedGame(saved));
      return true;
    } catch {
      // Sin sitio o sin permiso: se pierde la partida, pero no el juego.
      return false;
    }
  }

  clearSavedGame(): void {
    try {
      this.storage?.removeItem(RESUME_KEY);
    } catch {
      // Nada que hacer.
    }
  }

  bestReplay(mode: GameMode): Replay | null {
    return this.data.bestReplays[mode] ?? null;
  }

  /** Guarda la repetición si es la mejor del modo; devuelve true si la reemplazó. */
  saveBestReplay(mode: GameMode, replay: Replay): boolean {
    const current = this.data.bestReplays[mode];
    const better =
      current === undefined ||
      (mode === 'sprint'
        ? replay.result.finished &&
          (!current.result.finished || replay.result.timeMs < current.result.timeMs)
        : replay.result.score > current.result.score);
    if (!better) return false;
    const previous = { ...this.data.bestReplays };
    this.data.bestReplays[mode] = replay;
    try {
      this.save();
    } catch {
      // Si no cabe en el almacenamiento, se prescinde de la repetición antes que
      // de los récords: se restaura lo que había y se guarda de nuevo.
      this.data.bestReplays = previous;
      this.save();
      return false;
    }
    return true;
  }

  updateSettings(patch: (s: Settings) => void): void {
    patch(this.data.settings);
    this.save();
  }

  setKeymap(keymap: KeyMap): void {
    this.data.keymap = structuredClone(keymap);
    this.save();
  }

  /** Inserta un resultado; devuelve la posición (1-based) o 0 si no entra en el top. */
  addHighScore(mode: GameMode, entry: HighScore): number {
    const list = [...this.highscores(mode), entry];
    list.sort((a, b) => (mode === 'sprint' ? a.timeMs - b.timeMs : b.score - a.score));
    const trimmed = list.slice(0, MAX_SCORES);
    this.data.highscores[mode] = trimmed;
    this.save();
    const idx = trimmed.indexOf(entry);
    return idx === -1 ? 0 : idx + 1;
  }

  reset(): void {
    this.data = defaultPersisted();
    this.save();
  }

  private load(): PersistedV1 {
    const base = defaultPersisted();
    if (!this.storage) return base;
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return base;
      const parsed: unknown = JSON.parse(raw);
      if (!isObject(parsed)) return base;
      // Migraciones futuras: switch (parsed.version) { ... }
      return {
        version: 1,
        settings: mergeDefaults(base.settings, parsed.settings),
        keymap: mergeDefaults(base.keymap, parsed.keymap),
        highscores: isObject(parsed.highscores) ? parsed.highscores : {},
        bestReplays: isObject(parsed.bestReplays) ? parsed.bestReplays : {},
        seenTips: Array.isArray(parsed.seenTips) ? (parsed.seenTips as TipId[]) : [],
      };
    } catch {
      return base;
    }
  }

  private save(): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // cuota llena o modo privado: se ignora
    }
  }
}
