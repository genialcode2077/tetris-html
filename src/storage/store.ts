import type { GameMode } from '@/core/rules';
import { DEFAULT_KEYMAP, type KeyMap } from '@/input/keymap';
import { DEFAULT_SETTINGS, type Settings } from './settings';

export interface HighScore {
  score: number;
  lines: number;
  level: number;
  timeMs: number;
  pps: number;
  date: string;
}

export interface PersistedV1 {
  version: 1;
  settings: Settings;
  keymap: KeyMap;
  highscores: Partial<Record<GameMode, HighScore[]>>;
}

export const STORAGE_KEY = 'tetris-html:v1';
const MAX_SCORES = 10;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
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
  };
}

export class Store {
  private data: PersistedV1;

  constructor(private readonly storage: StorageLike | null) {
    this.data = this.load();
  }

  get settings(): Settings {
    return this.data.settings;
  }

  get keymap(): KeyMap {
    return this.data.keymap;
  }

  highscores(mode: GameMode): HighScore[] {
    return this.data.highscores[mode] ?? [];
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
