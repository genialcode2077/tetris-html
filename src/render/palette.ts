import type { PaletteName } from './types';

export interface Palette {
  readonly name: PaletteName;
  /** Índice = valor de celda (1-7 piezas, 8 basura). */
  readonly cells: readonly string[];
  readonly boardBg: string;
  readonly grid: string;
  /** Igual que `grid` pero sin canal alfa: three.js ignora el alfa de un color. */
  readonly gridSolid: string;
  readonly border: string;
  readonly ghostAlpha: number;
  readonly glow: boolean;
  readonly text: string;
}

/** docs/research/04 §4 y §6. */
export const PALETTES: Readonly<Record<PaletteName, Palette>> = {
  neon: {
    name: 'neon',
    cells: [
      '',
      '#22E5FF',
      '#4A6BFF',
      '#FF9F1C',
      '#FFE600',
      '#3BFF7A',
      '#C05CFF',
      '#FF3B5C',
      '#6B7280',
    ],
    boardBg: '#0B0F1A',
    grid: 'rgba(255,255,255,0.06)',
    gridSolid: '#ffffff',
    border: 'rgba(255,255,255,0.14)',
    ghostAlpha: 0.22,
    glow: true,
    text: '#E6EDF3',
  },
  accessible: {
    name: 'accessible',
    cells: [
      '',
      '#56B4E9',
      '#0072B2',
      '#E69F00',
      '#F0E442',
      '#009E73',
      '#CC79A7',
      '#D55E00',
      '#7A7A7A',
    ],
    boardBg: '#0B0F1A',
    grid: 'rgba(255,255,255,0.08)',
    gridSolid: '#ffffff',
    border: 'rgba(255,255,255,0.18)',
    ghostAlpha: 0.28,
    glow: false,
    text: '#F5F7FB',
  },
  highContrast: {
    name: 'highContrast',
    cells: [
      '',
      '#00FFFF',
      '#3399FF',
      '#FF9900',
      '#FFFF00',
      '#00FF00',
      '#FF66FF',
      '#FF3333',
      '#BBBBBB',
    ],
    boardBg: '#000000',
    grid: 'rgba(255,255,255,0.25)',
    gridSolid: '#ffffff',
    border: '#FFFFFF',
    ghostAlpha: 0.4,
    glow: false,
    text: '#FFFFFF',
  },
};

/** Símbolo por pieza para el modo patrones (I J L O S T Z, basura). */
export const PIECE_SYMBOLS: readonly string[] = ['', '|', 'J', 'L', '■', 'S', 'T', 'Z', '#'];
