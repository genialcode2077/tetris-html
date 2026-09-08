import { describe, expect, it } from 'vitest';
import { PALETTES } from './palette';
import {
  COLOR_VISION_TYPES,
  closestPair,
  deltaE2000,
  parseHex,
  simulate,
  toLab,
} from './colorVision';
import { PIECE_TYPES } from '@/core/types';

/** Los siete colores de pieza de una paleta, sin el hueco ni la basura. */
function pieceColors(name: keyof typeof PALETTES): string[] {
  return PALETTES[name].cells.slice(1, 8);
}

const label = (index: number): string => PIECE_TYPES[index] ?? '?';

describe('simulación de daltonismo', () => {
  it('no altera los colores de una vista normal', () => {
    const color = parseHex('#22E5FF');
    expect(simulate(color, 'normal')).toEqual(color);
  });

  it('un rojo y un verde se acercan mucho con protanopia', () => {
    const rojo = toLab(simulate(parseHex('#FF0000'), 'protanopia'));
    const verde = toLab(simulate(parseHex('#00FF00'), 'protanopia'));
    const rojoNormal = toLab(parseHex('#FF0000'));
    const verdeNormal = toLab(parseHex('#00FF00'));
    expect(deltaE2000(rojo, verde)).toBeLessThan(deltaE2000(rojoNormal, verdeNormal) / 2);
  });

  it('los grises no cambian, porque no dependen del canal perdido', () => {
    for (const vision of COLOR_VISION_TYPES) {
      const gris = parseHex('#808080');
      const visto = simulate(gris, vision);
      expect(deltaE2000(toLab(gris), toLab(visto))).toBeLessThan(2);
    }
  });

  it('la distancia entre un color y sí mismo es cero', () => {
    const lab = toLab(parseHex('#4A6BFF'));
    expect(deltaE2000(lab, lab)).toBeCloseTo(0, 6);
  });
});

/**
 * Cada paleta tiene un compromiso distinto entre estética y distinguibilidad.
 * Los mínimos vigilan que ninguna empeore: la de daltonismo es la más exigente,
 * la de alto contraste debe cumplir lo que su nombre promete, y la de neón es la
 * opción estética, con un mínimo laxo pero que no puede volver a caer.
 * Medidas y justificación en docs/research/09.
 */
const MINIMUMS: Record<keyof typeof PALETTES, number> = {
  accessible: 10,
  highContrast: 8,
  neon: 6,
};

describe('distinguibilidad de las piezas', () => {
  for (const name of Object.keys(MINIMUMS) as (keyof typeof PALETTES)[]) {
    it(`la paleta ${name} mantiene sus piezas separadas`, () => {
      const colors = pieceColors(name);
      expect(colors).toHaveLength(7);
      for (const vision of COLOR_VISION_TYPES) {
        const { a, b, delta } = closestPair(colors, vision);
        expect(
          delta,
          `${name} con ${vision}: el par más parecido es ${label(a)}-${label(b)} (${delta.toFixed(1)})`,
        ).toBeGreaterThanOrEqual(MINIMUMS[name]);
      }
    });
  }

  it('la paleta de daltonismo es la más segura de las tres', () => {
    const peor = (name: keyof typeof PALETTES): number =>
      Math.min(...COLOR_VISION_TYPES.map((v) => closestPair(pieceColors(name), v).delta));
    expect(peor('accessible')).toBeGreaterThan(peor('neon'));
    expect(peor('accessible')).toBeGreaterThan(peor('highContrast'));
  });

  it('la de alto contraste supera a la de neón, que es solo estética', () => {
    const peor = (name: keyof typeof PALETTES): number =>
      Math.min(...COLOR_VISION_TYPES.map((v) => closestPair(pieceColors(name), v).delta));
    expect(peor('highContrast')).toBeGreaterThan(peor('neon'));
  });
});
