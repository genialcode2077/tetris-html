import { describe, expect, it } from 'vitest';
import { createBoard, stackHeight } from './board';
import { BOARD_W, GARBAGE_CELL } from './constants';
import {
  GarbageQueue,
  PERFECT_CLEAR_ROWS,
  attackFor,
  attackRows,
  backToBackBonusRows,
} from './garbage';
import { Game } from './game';
import { mulberry32 } from './rng';
import type { Command } from './types';

const STEP = 1000 / 120;

describe('tabla de ataque', () => {
  it('coincide con la tabla oficial para limpiezas normales', () => {
    expect(attackRows(1, 'none')).toBe(0);
    expect(attackRows(2, 'none')).toBe(1);
    expect(attackRows(3, 'none')).toBe(2);
    expect(attackRows(4, 'none')).toBe(4);
  });

  it('los giros envían el doble de filas que líneas limpian', () => {
    expect(attackRows(1, 'full')).toBe(2);
    expect(attackRows(2, 'full')).toBe(4);
    expect(attackRows(3, 'full')).toBe(6);
  });

  it('el giro menor simple no envía nada y el doble envía una fila', () => {
    expect(attackRows(1, 'mini')).toBe(0);
    expect(attackRows(2, 'mini')).toBe(1);
  });

  it('sin líneas no hay ataque', () => {
    expect(attackRows(0, 'full')).toBe(0);
    expect(attackFor({ lines: 0, spin: 'full', backToBack: true, perfectClear: true })).toBe(0);
  });

  it('encadenar añade una, dos o tres filas según la jugada', () => {
    expect(backToBackBonusRows(1, 'full')).toBe(1);
    expect(backToBackBonusRows(2, 'full')).toBe(2);
    expect(backToBackBonusRows(3, 'full')).toBe(3);
    expect(backToBackBonusRows(4, 'none')).toBe(2);
    expect(backToBackBonusRows(1, 'mini')).toBe(1);
    // Un doble normal no es jugada difícil, así que no encadena.
    expect(backToBackBonusRows(2, 'none')).toBe(0);
  });

  it('vaciar el tablero suma diez filas a lo que corresponda', () => {
    expect(attackFor({ lines: 4, spin: 'none', backToBack: false, perfectClear: true })).toBe(
      4 + PERFECT_CLEAR_ROWS,
    );
    expect(attackFor({ lines: 4, spin: 'none', backToBack: true, perfectClear: true })).toBe(
      4 + 2 + PERFECT_CLEAR_ROWS,
    );
  });
});

describe('cola de basura', () => {
  const rules = { everyPieces: 3, holeChangeChance: 0 };

  it('encola una fila cada tantas piezas sin limpiar', () => {
    const q = new GarbageQueue(rules, mulberry32(1));
    q.onPieceLocked(0);
    q.onPieceLocked(0);
    expect(q.pendingRows).toBe(0);
    q.onPieceLocked(0);
    expect(q.pendingRows).toBe(1);
  });

  it('limpiar líneas da un respiro y reinicia la cuenta', () => {
    const q = new GarbageQueue(rules, mulberry32(1));
    q.onPieceLocked(0);
    q.onPieceLocked(0);
    q.onPieceLocked(2); // limpieza
    q.onPieceLocked(0);
    expect(q.pendingRows).toBe(0);
  });

  it('un ataque cancela lo pendiente y solo el sobrante sale', () => {
    const q = new GarbageQueue({ everyPieces: 1, holeChangeChance: 0 }, mulberry32(1));
    q.onPieceLocked(0);
    q.onPieceLocked(0);
    expect(q.pendingRows).toBe(2);
    expect(q.cancel(1)).toBe(0); // cancela una, no sobra nada
    expect(q.pendingRows).toBe(1);
    expect(q.cancel(4)).toBe(3); // cancela la última, sobran tres
    expect(q.pendingRows).toBe(0);
    expect(q.cancel(0)).toBe(0);
  });

  it('las filas entran por abajo y empujan la pila hacia arriba', () => {
    const q = new GarbageQueue({ everyPieces: 1, holeChangeChance: 0 }, mulberry32(1));
    const board = createBoard();
    board[0] = 5; // una celda de pieza en la esquina inferior izquierda
    q.onPieceLocked(0);
    q.onPieceLocked(0);
    const rows = q.applyTo(board);
    expect(rows).toBe(2);
    // La celda original subió dos filas.
    expect(board[2 * BOARD_W]).toBe(5);
    // Las dos primeras filas son basura con un hueco cada una.
    for (let y = 0; y < 2; y++) {
      const row = [...board.slice(y * BOARD_W, (y + 1) * BOARD_W)];
      expect(row.filter((v) => v === GARBAGE_CELL)).toHaveLength(BOARD_W - 1);
      expect(row.filter((v) => v === 0)).toHaveLength(1);
    }
    expect(q.pendingRows).toBe(0);
  });

  it('sin nada pendiente no toca el tablero', () => {
    const q = new GarbageQueue(rules, mulberry32(1));
    const board = createBoard();
    expect(q.applyTo(board)).toBe(0);
    expect(stackHeight(board)).toBe(0);
  });

  it('el hueco se queda quieto o cambia según la probabilidad', () => {
    const fijo = new GarbageQueue({ everyPieces: 1, holeChangeChance: 0 }, mulberry32(7));
    const board = createBoard();
    const hole = fijo.currentHole;
    for (let i = 0; i < 5; i++) fijo.onPieceLocked(0);
    fijo.applyTo(board);
    expect(fijo.currentHole).toBe(hole);
    // Todas las filas comparten la misma columna de hueco.
    for (let y = 0; y < 5; y++) expect(board[y * BOARD_W + hole]).toBe(0);

    const cambiante = new GarbageQueue({ everyPieces: 1, holeChangeChance: 1 }, mulberry32(7));
    const columnas = new Set<number>();
    for (let i = 0; i < 40; i++) {
      cambiante.onPieceLocked(0);
      cambiante.applyTo(createBoard());
      columnas.add(cambiante.currentHole);
    }
    expect(columnas.size).toBeGreaterThan(1);
  });
});

describe('basura dentro de una partida', () => {
  function run(g: Game, ms: number): void {
    for (let t = 0; t < ms; t += STEP) g.step(STEP);
  }

  it('sube una fila cada tantas piezas y el juego sigue jugable', () => {
    const g = new Game({
      seed: 42,
      rules: {
        goal: { type: 'none' },
        lineClearDelayMs: 0,
        garbage: { everyPieces: 2, holeChangeChance: 0.3 },
      },
    });
    g.start();
    for (let i = 0; i < 6; i++) {
      g.dispatch('hardDrop');
      run(g, 60);
    }
    // Con seis piezas y una fila cada dos, deben haber entrado varias.
    const basura = [...g.state.board].filter((v) => v === GARBAGE_CELL).length;
    expect(basura).toBeGreaterThan(0);
    expect(basura % (BOARD_W - 1)).toBe(0);
    expect(g.state.phase).not.toBe('gameover');
  });

  it('sin la regla activada no aparece basura nunca', () => {
    const g = new Game({ seed: 42, rules: { goal: { type: 'none' }, lineClearDelayMs: 0 } });
    g.start();
    for (let i = 0; i < 12; i++) {
      g.dispatch('hardDrop');
      run(g, 60);
      if (g.state.phase === 'gameover') break;
    }
    expect([...g.state.board].filter((v) => v === GARBAGE_CELL)).toHaveLength(0);
    expect(g.pendingGarbage).toBe(0);
  });

  it('la misma semilla produce exactamente la misma basura', () => {
    const play = (): number[] => {
      const g = new Game({
        seed: 99,
        rules: {
          goal: { type: 'none' },
          lineClearDelayMs: 0,
          garbage: { everyPieces: 1, holeChangeChance: 0.5 },
        },
      });
      g.start();
      const script: Command[] = ['left', 'cw', 'hardDrop', 'right', 'hardDrop', 'hardDrop'];
      for (const c of script) {
        g.dispatch(c);
        run(g, 80);
      }
      return [...g.state.board];
    };
    expect(play()).toEqual(play());
  });

  it('emite un evento al entrar basura, con las filas y la columna del hueco', () => {
    const g = new Game({
      seed: 5,
      rules: {
        goal: { type: 'none' },
        lineClearDelayMs: 0,
        garbage: { everyPieces: 1, holeChangeChance: 0 },
      },
    });
    g.start();
    g.dispatch('hardDrop');
    const events = g.step(STEP);
    const garbage = events.find((e) => e.type === 'garbage');
    expect(garbage).toBeDefined();
    if (garbage?.type === 'garbage') {
      expect(garbage.rows).toBe(1);
      expect(garbage.hole).toBeGreaterThanOrEqual(0);
      expect(garbage.hole).toBeLessThan(BOARD_W);
    }
  });
});
