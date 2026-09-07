import type { PieceType, Point, Rotation, RotationSystem } from './types';

/**
 * Tablas de wall kicks SRS. Convención: +x derecha, +y arriba; relativas a la rotación básica.
 * Fuente: docs/research/01 §3 (tetris.wiki/Super_Rotation_System).
 */
type KickTable = Readonly<Record<string, readonly Point[]>>;

const P = (x: number, y: number): Point => ({ x, y });

const JLSTZ: KickTable = {
  '0>1': [P(0, 0), P(-1, 0), P(-1, 1), P(0, -2), P(-1, -2)],
  '1>0': [P(0, 0), P(1, 0), P(1, -1), P(0, 2), P(1, 2)],
  '1>2': [P(0, 0), P(1, 0), P(1, -1), P(0, 2), P(1, 2)],
  '2>1': [P(0, 0), P(-1, 0), P(-1, 1), P(0, -2), P(-1, -2)],
  '2>3': [P(0, 0), P(1, 0), P(1, 1), P(0, -2), P(1, -2)],
  '3>2': [P(0, 0), P(-1, 0), P(-1, -1), P(0, 2), P(-1, 2)],
  '3>0': [P(0, 0), P(-1, 0), P(-1, -1), P(0, 2), P(-1, 2)],
  '0>3': [P(0, 0), P(1, 0), P(1, 1), P(0, -2), P(1, -2)],
};

const I_GUIDELINE: KickTable = {
  '0>1': [P(0, 0), P(-2, 0), P(1, 0), P(-2, -1), P(1, 2)],
  '1>0': [P(0, 0), P(2, 0), P(-1, 0), P(2, 1), P(-1, -2)],
  '1>2': [P(0, 0), P(-1, 0), P(2, 0), P(-1, 2), P(2, -1)],
  '2>1': [P(0, 0), P(1, 0), P(-2, 0), P(1, -2), P(-2, 1)],
  '2>3': [P(0, 0), P(2, 0), P(-1, 0), P(2, 1), P(-1, -2)],
  '3>2': [P(0, 0), P(-2, 0), P(1, 0), P(-2, -1), P(1, 2)],
  '3>0': [P(0, 0), P(1, 0), P(-2, 0), P(1, -2), P(-2, 1)],
  '0>3': [P(0, 0), P(-1, 0), P(2, 0), P(-1, 2), P(2, -1)],
};

/** I simétrica (Arika/TGM3), base de SRS+ de TETR.IO. */
const I_SYMMETRIC: KickTable = {
  '0>1': [P(0, 0), P(-2, 0), P(1, 0), P(1, 2), P(-2, -1)],
  '1>0': [P(0, 0), P(2, 0), P(-1, 0), P(2, 1), P(-1, -2)],
  '1>2': [P(0, 0), P(-1, 0), P(2, 0), P(-1, 2), P(2, -1)],
  '2>1': [P(0, 0), P(-2, 0), P(1, 0), P(-2, 1), P(1, -1)],
  '2>3': [P(0, 0), P(2, 0), P(-1, 0), P(2, 1), P(-1, -1)],
  '3>2': [P(0, 0), P(1, 0), P(-2, 0), P(1, 2), P(-2, -1)],
  '3>0': [P(0, 0), P(-2, 0), P(1, 0), P(-2, 1), P(1, -2)],
  '0>3': [P(0, 0), P(2, 0), P(-1, 0), P(-1, 2), P(2, -1)],
};

/** Kicks 180 (reproducción común de la tabla de TETR.IO; pendiente de verificación, F-001). */
const JLSTZ_180: KickTable = {
  '0>2': [P(0, 0), P(0, 1), P(1, 1), P(-1, 1), P(1, 0), P(-1, 0)],
  '2>0': [P(0, 0), P(0, -1), P(-1, -1), P(1, -1), P(-1, 0), P(1, 0)],
  '1>3': [P(0, 0), P(1, 0), P(1, 2), P(1, 1), P(0, 2), P(0, 1)],
  '3>1': [P(0, 0), P(-1, 0), P(-1, 2), P(-1, 1), P(0, 2), P(0, 1)],
};

const I_180: KickTable = {
  '0>2': [P(0, 0)],
  '2>0': [P(0, 0)],
  '1>3': [P(0, 0)],
  '3>1': [P(0, 0)],
};

const NONE: readonly Point[] = [P(0, 0)];

export function kicksFor(
  type: PieceType,
  from: Rotation,
  to: Rotation,
  system: RotationSystem,
): readonly Point[] {
  if (type === 'O') return NONE;
  const key = `${from}>${to}`;
  const is180 = ((from + 2) & 3) === to;
  if (type === 'I') {
    if (is180) return I_180[key] ?? NONE;
    const table = system === 'srs-plus' ? I_SYMMETRIC : I_GUIDELINE;
    return table[key] ?? NONE;
  }
  if (is180) return JLSTZ_180[key] ?? NONE;
  return JLSTZ[key] ?? NONE;
}

export const SRS_TABLES = { JLSTZ, I_GUIDELINE, I_SYMMETRIC, JLSTZ_180, I_180 } as const;
