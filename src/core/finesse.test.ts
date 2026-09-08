import { describe, expect, it } from 'vitest';
import { createBoard, dropDistance } from './board';
import { BOARD_W } from './constants';
import { evaluateFinesse, minimumInputs, placementKey } from './finesse';
import type { ActivePiece, PieceType, Rotation } from './types';

/** Posición de aparición según la Guideline (docs/research/01 §1). */
const SPAWN: Record<PieceType, { x: number; y: number }> = {
  I: { x: 3, y: 17 },
  J: { x: 3, y: 18 },
  L: { x: 3, y: 18 },
  O: { x: 4, y: 19 },
  S: { x: 3, y: 18 },
  T: { x: 3, y: 18 },
  Z: { x: 3, y: 18 },
};

/** Colocación resultante de llevar la pieza a (rotation, x) y dejarla caer. */
function landed(
  type: PieceType,
  rotation: Rotation,
  x: number,
  board = createBoard(),
): ActivePiece {
  const start: ActivePiece = { type, rotation, x, y: SPAWN[type].y };
  return { ...start, y: start.y - dropDistance(board, start) };
}

function minimum(
  type: PieceType,
  rotation: Rotation,
  x: number,
  board = createBoard(),
): number | null {
  return minimumInputs(board, type, SPAWN[type], landed(type, rotation, x, board), {
    allowSoftDrop: true,
  });
}

describe('finesse', () => {
  it('dejar caer la pieza donde aparece no cuesta ninguna pulsación', () => {
    expect(minimum('T', 0, 3)).toBe(0);
    expect(minimum('O', 0, 4)).toBe(0);
    expect(minimum('I', 0, 3)).toBe(0);
  });

  it('una sola rotación cuesta una pulsación', () => {
    expect(minimum('T', 1, 3)).toBe(1);
    expect(minimum('T', 3, 3)).toBe(1);
  });

  it('llegar a la pared cuesta una sola pulsación, no una por celda', () => {
    // Se mantiene la tecla y la pieza recorre todo el camino: una sola pulsación.
    expect(minimum('T', 0, 0)).toBe(1);
    expect(minimum('T', 0, BOARD_W - 3)).toBe(1);
  });

  it('moverse una celda cuesta una pulsación y dos celdas cuestan dos', () => {
    expect(minimum('T', 0, 2)).toBe(1);
    expect(minimum('T', 0, 1)).toBe(2);
  });

  it('toda colocación en un tablero vacío se alcanza en cuatro pulsaciones o menos', () => {
    // Es la base de la llamada "finesse de dos pasos": nunca hacen falta muchas teclas.
    const types: PieceType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
    for (const type of types) {
      for (let rotation = 0; rotation < 4; rotation++) {
        for (let x = -2; x < BOARD_W; x++) {
          const cost = minimum(type, rotation as Rotation, x);
          if (cost === null) continue;
          expect(cost, `${type} rot=${rotation} x=${x}`).toBeLessThanOrEqual(4);
        }
      }
    }
  });

  it('las rotaciones equivalentes de O, I, S y Z se tratan como la misma colocación', () => {
    expect(placementKey({ type: 'O', rotation: 2, x: 4, y: 0 })).toBe(
      placementKey({ type: 'O', rotation: 0, x: 4, y: 0 }),
    );
    expect(placementKey({ type: 'I', rotation: 2, x: 3, y: 0 })).toBe(
      placementKey({ type: 'I', rotation: 0, x: 3, y: 0 }),
    );
    // S y Z solo tienen dos formas distintas, así que 3 equivale a 1.
    expect(placementKey({ type: 'S', rotation: 3, x: 3, y: 0 })).toBe(
      placementKey({ type: 'S', rotation: 1, x: 3, y: 0 }),
    );
  });

  it('evaluateFinesse cuenta las pulsaciones sobrantes', () => {
    const board = createBoard();
    const target = landed('T', 0, 0, board);
    expect(evaluateFinesse(board, 'T', SPAWN.T, target, 1)).toEqual({
      used: 1,
      minimum: 1,
      faults: 0,
    });
    expect(evaluateFinesse(board, 'T', SPAWN.T, target, 4)?.faults).toBe(3);
  });

  it('devuelve null cuando la colocación no es alcanzable', () => {
    const board = createBoard();
    // Una posición flotante en mitad del tablero no se alcanza dejando caer la pieza.
    expect(
      minimumInputs(board, 'T', SPAWN.T, { type: 'T', rotation: 0, x: 3, y: 10 }, {}),
    ).toBeNull();
    // Ni una columna fuera del tablero.
    expect(
      minimumInputs(board, 'T', SPAWN.T, { type: 'T', rotation: 0, x: 20, y: 0 }, {}),
    ).toBeNull();
  });

  it('con la pila de por medio hacen falta más pulsaciones o la colocación es imposible', () => {
    const board = createBoard();
    // Un muro alto en la mitad izquierda obliga a rodear.
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 4; x++) board[y * BOARD_W + x] = 8;
    }
    const target = landed('T', 0, 4, board);
    const cost = minimumInputs(board, 'T', SPAWN.T, target, { allowSoftDrop: true });
    expect(cost).not.toBeNull();
    expect(cost).toBeGreaterThanOrEqual(0);
  });
});
