/** Curva Guideline (Tetris Worlds): segundos por fila = (0.8 − (nivel − 1) × 0.007) ^ (nivel − 1). */
export function gravityMsPerRow(level: number): number {
  const l = Math.max(1, Math.floor(level));
  if (l >= 20) return 0; // 20G: caída instantánea
  return Math.pow(0.8 - (l - 1) * 0.007, l - 1) * 1000;
}

/** Ms por fila con soft drop activo (0 = instantáneo). Nunca más lento que la gravedad. */
export function softDropMsPerRow(level: number, softDropFactor: number): number {
  const g = gravityMsPerRow(level);
  if (!Number.isFinite(softDropFactor) || softDropFactor <= 0) return 0;
  return Math.min(g, g / softDropFactor);
}
