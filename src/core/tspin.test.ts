import { describe, expect, it } from 'vitest';
import { createBoard } from './board';
import { cellsOf } from './pieces';
import { BOARD_W } from './constants';
import type { ActivePiece } from './types';
import { detectSpin, detectTSpin, isImmobile } from './tspin';

function set(b: Uint8Array, x: number, y: number): void {
  b[y * BOARD_W + x] = 8;
}

describe('detección de T-spin', () => {
  it('no es T-spin si la última acción no fue rotación o no es T', () => {
    const b = createBoard();
    set(b, 3, 2);
    set(b, 5, 2);
    set(b, 3, 0);
    const piece = { type: 'T' as const, rotation: 2 as const, x: 3, y: 0 };
    expect(detectTSpin(b, piece, false, null)).toBe('none');
    expect(detectTSpin(b, { ...piece, type: 'L' }, true, null)).toBe('none');
  });

  it('T apuntando abajo con dos esquinas frontales (inferiores) y una trasera → full', () => {
    const b = createBoard();
    // T en estado 2 (pico abajo), caja en (3,0): esquinas frontales (3,0) y (5,0); traseras (3,2) y (5,2)
    set(b, 3, 0);
    set(b, 5, 0);
    set(b, 3, 2);
    const piece = { type: 'T' as const, rotation: 2 as const, x: 3, y: 0 };
    expect(detectTSpin(b, piece, true, { x: 0, y: 0 })).toBe('full');
  });

  it('una frontal y dos traseras → mini, salvo kick de 1×2 → full', () => {
    const b = createBoard();
    set(b, 3, 0);
    set(b, 3, 2);
    set(b, 5, 2);
    const piece = { type: 'T' as const, rotation: 2 as const, x: 3, y: 0 };
    expect(detectTSpin(b, piece, true, { x: -1, y: 0 })).toBe('mini');
    expect(detectTSpin(b, piece, true, { x: 1, y: -2 })).toBe('full');
  });

  it('menos de 3 esquinas → none; paredes cuentan como ocupadas', () => {
    const b = createBoard();
    set(b, 3, 0);
    set(b, 5, 0);
    expect(detectTSpin(b, { type: 'T', rotation: 2, x: 3, y: 0 }, true, null)).toBe('none');
    // Contra la pared izquierda: caja en x = -1 no es válida, así que usamos el suelo: y = -1 no válido.
    // Esquinas inferiores fuera del tablero (y = -1) cuentan como ocupadas.
    const c = createBoard();
    set(c, 2, 2);
    const onFloor = { type: 'T' as const, rotation: 0 as const, x: 0, y: -1 };
    // Esquinas: (0,1) libre, (2,1) libre, (0,-1) ocupada (suelo), (2,-1) ocupada (suelo) → solo 2
    expect(detectTSpin(c, onFloor, true, null)).toBe('none');
  });
});

describe('regla del inmóvil', () => {
  /** Encierra la pieza dejándole solo el hueco que ocupa. */
  function boxIn(piece: ActivePiece): Uint8Array {
    const b = createBoard();
    for (let y = 0; y < 8; y++) for (let x = 0; x < BOARD_W; x++) b[y * BOARD_W + x] = 8;
    for (const c of cellsOf(piece.type, piece.rotation)) {
      b[(piece.y + c.y) * BOARD_W + (piece.x + c.x)] = 0;
    }
    return b;
  }

  it('una pieza encajada sin hueco alrededor es inmóvil', () => {
    const piece: ActivePiece = { type: 'S', rotation: 0, x: 3, y: 2 };
    expect(isImmobile(boxIn(piece), piece)).toBe(true);
  });

  it('una pieza con sitio a los lados o arriba no lo es', () => {
    const b = createBoard();
    const piece: ActivePiece = { type: 'S', rotation: 0, x: 3, y: 0 };
    expect(isImmobile(b, piece)).toBe(false);
  });

  it('apoyada en el suelo pero con sitio a los lados tampoco', () => {
    const b = createBoard();
    const piece: ActivePiece = { type: 'O', rotation: 0, x: 4, y: 0 };
    expect(isImmobile(b, piece)).toBe(false);
  });
});

describe('detección de giros según el ajuste', () => {
  function boxIn(piece: ActivePiece): Uint8Array {
    const b = createBoard();
    for (let y = 0; y < 8; y++) for (let x = 0; x < BOARD_W; x++) b[y * BOARD_W + x] = 8;
    for (const c of cellsOf(piece.type, piece.rotation)) {
      b[(piece.y + c.y) * BOARD_W + (piece.x + c.x)] = 0;
    }
    return b;
  }

  it('por defecto solo cuenta la T: el resto de piezas no dan giro', () => {
    const s: ActivePiece = { type: 'S', rotation: 0, x: 3, y: 2 };
    expect(detectSpin(boxIn(s), s, true, null, 't-spin')).toBe('none');
    const z: ActivePiece = { type: 'Z', rotation: 1, x: 3, y: 2 };
    expect(detectSpin(boxIn(z), z, true, null, 't-spin')).toBe('none');
  });

  it('con todas las piezas, un encaje cuenta como giro menor', () => {
    const s: ActivePiece = { type: 'S', rotation: 0, x: 3, y: 2 };
    expect(detectSpin(boxIn(s), s, true, null, 'all-mini')).toBe('mini');
    const l: ActivePiece = { type: 'L', rotation: 2, x: 4, y: 3 };
    expect(detectSpin(boxIn(l), l, true, null, 'all-mini')).toBe('mini');
  });

  it('sin rotación previa no hay giro, sea cual sea el ajuste', () => {
    const s: ActivePiece = { type: 'S', rotation: 0, x: 3, y: 2 };
    for (const mode of ['t-spin', 'all-mini', 'all-mini-plus'] as const) {
      expect(detectSpin(boxIn(s), s, false, null, mode)).toBe('none');
    }
  });

  it('la T por encaje solo se reconoce en la variante ampliada', () => {
    // Una T encajada que no cumple las tres esquinas por la geometría del hueco.
    const t: ActivePiece = { type: 'T', rotation: 0, x: 3, y: 2 };
    const board = boxIn(t);
    expect(detectSpin(board, t, true, null, 'all-mini-plus')).not.toBe('none');
  });

  it('la regla de las tres esquinas sigue mandando sobre la del inmóvil', () => {
    const b = createBoard();
    // Ranura clásica de giro completo de la T.
    for (let x = 0; x < BOARD_W; x++) {
      if (x !== 4) b[0 * BOARD_W + x] = 8;
      if (x < 3 || x > 5) b[1 * BOARD_W + x] = 8;
    }
    b[2 * BOARD_W + 3] = 8;
    b[2 * BOARD_W + 5] = 8;
    const t: ActivePiece = { type: 'T', rotation: 2, x: 3, y: 0 };
    // Con cualquier ajuste debe seguir siendo un giro completo, no uno menor.
    for (const mode of ['t-spin', 'all-mini', 'all-mini-plus'] as const) {
      expect(detectSpin(b, t, true, null, mode)).toBe('full');
    }
  });
});
