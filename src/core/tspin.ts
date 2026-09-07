import { isOccupied } from './board';
import type { ActivePiece, Point, TSpinKind } from './types';

/**
 * Regla de 3 esquinas + "pointing side" (docs/research/01 §9).
 * @param lastKick desplazamiento del último kick aplicado (null si la última acción no fue rotación).
 */
export function detectTSpin(
  board: Uint8Array,
  piece: ActivePiece,
  lastActionWasRotation: boolean,
  lastKick: Point | null,
): TSpinKind {
  if (piece.type !== 'T' || !lastActionWasRotation) return 'none';
  const { x, y, rotation } = piece;
  const tl = isOccupied(board, x, y + 2);
  const tr = isOccupied(board, x + 2, y + 2);
  const bl = isOccupied(board, x, y);
  const br = isOccupied(board, x + 2, y);
  const occupied = [tl, tr, bl, br].filter(Boolean).length;
  if (occupied < 3) return 'none';
  const front: [boolean, boolean] =
    rotation === 0 ? [tl, tr] : rotation === 1 ? [tr, br] : rotation === 2 ? [bl, br] : [tl, bl];
  if (front[0] && front[1]) return 'full';
  if (lastKick && Math.abs(lastKick.x) === 1 && Math.abs(lastKick.y) === 2) return 'full';
  return 'mini';
}
