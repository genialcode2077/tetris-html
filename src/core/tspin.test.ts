import { describe, expect, it } from 'vitest';
import { createBoard } from './board';
import { BOARD_W } from './constants';
import { detectTSpin } from './tspin';

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
