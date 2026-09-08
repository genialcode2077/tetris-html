import { collides, isOccupied } from './board';
import type { ActivePiece, Point, SpinDetection, TSpinKind } from './types';

/**
 * Regla de las tres esquinas con lado que apunta, tal y como la fija la
 * especificación oficial (docs/research/01 §9). Solo se aplica a la pieza T.
 *
 * @param lastKick desplazamiento del último ajuste aplicado al girar; null si la
 * última acción no fue una rotación.
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

/**
 * Regla del inmóvil: la pieza queda encajada, sin poder moverse a la izquierda, a
 * la derecha ni hacia arriba. Vale para las siete piezas por igual, porque no mira
 * esquinas sino si hay hueco alrededor (docs/research/11).
 *
 * Hacia abajo no se comprueba: al fijarse la pieza ya está apoyada.
 */
export function isImmobile(board: Uint8Array, piece: ActivePiece): boolean {
  const { type, rotation, x, y } = piece;
  return (
    collides(board, type, rotation, x - 1, y) &&
    collides(board, type, rotation, x + 1, y) &&
    collides(board, type, rotation, x, y + 1)
  );
}

/**
 * Detección de giros según el ajuste elegido.
 *
 * - `t-spin`: solo la T, con la regla de las tres esquinas. Es lo predeterminado.
 * - `all-mini`: la T por tres esquinas y el resto de piezas por inmóvil, contando
 *   como giro menor. Equivale a la variante All-Mini de TETR.IO.
 * - `all-mini-plus`: además, la T también puede reconocerse por inmóvil.
 */
export function detectSpin(
  board: Uint8Array,
  piece: ActivePiece,
  lastActionWasRotation: boolean,
  lastKick: Point | null,
  mode: SpinDetection,
): TSpinKind {
  const classic = detectTSpin(board, piece, lastActionWasRotation, lastKick);
  if (mode === 't-spin' || classic !== 'none') return classic;
  if (!lastActionWasRotation) return 'none';
  // Con la T, la regla del inmóvil solo entra en la variante ampliada.
  if (piece.type === 'T' && mode !== 'all-mini-plus') return 'none';
  return isImmobile(board, piece) ? 'mini' : 'none';
}
