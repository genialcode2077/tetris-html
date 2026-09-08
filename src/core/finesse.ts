import { collides, dropDistance } from './board';
import { BOARD_W } from './constants';
import { cellsOf } from './pieces';
import { kicksFor } from './srs';
import type { ActivePiece, PieceType, Rotation, RotationSystem } from './types';

/**
 * Finesse: número mínimo de pulsaciones para llevar una pieza desde su aparición
 * hasta la colocación final, sin contar el hard drop.
 * Fuente: docs/research/01 y https://harddrop.com/wiki/Finesse
 *
 * Se resuelve con una búsqueda en anchura sobre los estados alcanzables. El coste
 * está acotado porque el espacio es pequeño: 10 columnas × 4 rotaciones × 21 filas.
 */

export type FinesseKey = string;

export interface FinesseOptions {
  readonly rotationSystem: RotationSystem;
  readonly enable180: boolean;
  /** Con soft drop infinito o gravedad alta, bajar cuesta una pulsación más. */
  readonly allowSoftDrop: boolean;
}

const DEFAULT_OPTIONS: FinesseOptions = {
  rotationSystem: 'srs',
  enable180: false,
  allowSoftDrop: true,
};

/** Identifica una colocación por su posición y rotación finales. */
export function placementKey(piece: ActivePiece): FinesseKey {
  // Las piezas con simetría tienen rotaciones equivalentes: se normalizan para no
  // penalizar al jugador que llega por el camino corto.
  const rotation = normalizeRotation(piece.type, piece.rotation);
  const cells = cellsOf(piece.type, rotation);
  let minX = Infinity;
  let minY = Infinity;
  for (const c of cells) {
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
  }
  return `${piece.type}:${rotation}:${piece.x + minX}:${piece.y + minY}`;
}

function normalizeRotation(type: PieceType, rotation: Rotation): Rotation {
  if (type === 'O') return 0;
  if (type === 'I' || type === 'S' || type === 'Z') return (rotation % 2) as Rotation;
  return rotation;
}

interface Node {
  readonly x: number;
  readonly y: number;
  readonly rotation: Rotation;
  readonly cost: number;
}

const MAX_COST = 6;

/**
 * Estados alcanzables y su coste mínimo en pulsaciones.
 *
 * Los movimientos no cuestan todos lo mismo (llegar a la pared es una sola pulsación
 * mantenida, mover tres celdas sueltas son tres), así que una búsqueda en anchura no
 * daría el mínimo: se usa Dijkstra con una cola ordenada por coste.
 */
function explore(
  board: Uint8Array,
  type: PieceType,
  spawn: { x: number; y: number },
  options: FinesseOptions,
): Map<FinesseKey, number> {
  const best = new Map<FinesseKey, number>();
  const settled = new Set<string>();
  const queue: Node[] = [{ x: spawn.x, y: spawn.y, rotation: 0, cost: 0 }];
  const rotations: Rotation[] = options.enable180 ? [1, 3, 2] : [1, 3];

  const push = (node: Node): void => {
    if (node.cost > MAX_COST) return;
    // Inserción ordenada: la cola nunca pasa de unos pocos cientos de elementos.
    let lo = 0;
    let hi = queue.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((queue[mid]?.cost ?? 0) <= node.cost) lo = mid + 1;
      else hi = mid;
    }
    queue.splice(lo, 0, node);
  };

  const record = (node: Node): void => {
    // La colocación real es donde queda la pieza al dejarla caer desde ese estado.
    const piece: ActivePiece = { type, rotation: node.rotation, x: node.x, y: node.y };
    const drop = dropDistance(board, piece);
    const key = placementKey({ ...piece, y: node.y - drop });
    const previous = best.get(key);
    if (previous === undefined || node.cost < previous) best.set(key, node.cost);
  };

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) break;
    const id = `${node.x}:${node.y}:${node.rotation}`;
    if (settled.has(id)) continue;
    settled.add(id);
    record(node);
    if (node.cost >= MAX_COST) continue;

    // Desplazamiento lateral. Cada celda suelta es una pulsación; llegar hasta el
    // tope de ese lado cuesta una sola porque el jugador mantiene la tecla.
    for (const dir of [-1, 1] as const) {
      let x = node.x;
      let steps = 0;
      while (steps <= BOARD_W && !collides(board, type, node.rotation, x + dir, node.y)) {
        x += dir;
        steps++;
        const atWall = collides(board, type, node.rotation, x + dir, node.y);
        push({
          x,
          y: node.y,
          rotation: node.rotation,
          cost: node.cost + (atWall ? 1 : steps),
        });
      }
    }

    // Rotaciones, con sus kicks: se toma la primera prueba que encaje.
    for (const delta of rotations) {
      const to = ((node.rotation + delta) & 3) as Rotation;
      for (const kick of kicksFor(type, node.rotation, to, options.rotationSystem)) {
        const nx = node.x + kick.x;
        const ny = node.y + kick.y;
        if (!collides(board, type, to, nx, ny)) {
          push({ x: nx, y: ny, rotation: to, cost: node.cost + 1 });
          break;
        }
      }
    }

    // Soft drop: sirve para meter piezas bajo un saliente antes de girarlas.
    if (options.allowSoftDrop) {
      const drop = dropDistance(board, { type, rotation: node.rotation, x: node.x, y: node.y });
      if (drop > 0)
        push({ x: node.x, y: node.y - drop, rotation: node.rotation, cost: node.cost + 1 });
    }
  }
  return best;
}

/**
 * Pulsaciones mínimas para llegar a la colocación indicada. Devuelve `null` si la
 * colocación no es alcanzable desde la aparición (por ejemplo tras usar hold).
 */
export function minimumInputs(
  board: Uint8Array,
  type: PieceType,
  spawn: { x: number; y: number },
  target: ActivePiece,
  options: Partial<FinesseOptions> = {},
): number | null {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const reachable = explore(board, type, spawn, opts);
  return reachable.get(placementKey(target)) ?? null;
}

export interface FinesseResult {
  /** Pulsaciones que hizo el jugador, sin contar el hard drop. */
  readonly used: number;
  /** Pulsaciones mínimas necesarias. */
  readonly minimum: number;
  /** Pulsaciones de más; 0 significa colocación perfecta. */
  readonly faults: number;
}

export function evaluateFinesse(
  board: Uint8Array,
  type: PieceType,
  spawn: { x: number; y: number },
  target: ActivePiece,
  used: number,
  options: Partial<FinesseOptions> = {},
): FinesseResult | null {
  const minimum = minimumInputs(board, type, spawn, target, options);
  if (minimum === null) return null;
  return { used, minimum, faults: Math.max(0, used - minimum) };
}
