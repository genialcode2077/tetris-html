import { describe, expect, it } from 'vitest';
import { stackHeight } from './board';
import { BOARD_W, VISIBLE_H } from './constants';
import { Game } from './game';
import type { ActivePiece, Command, GameEvent, RuleSet } from './types';

/**
 * Validación del motor con maniobras reales de Tetris moderno.
 * Cada caso comprueba que las tablas SRS, la detección de T-spin y la puntuación
 * producen el resultado que un jugador espera. Ver docs/research/01.
 */

const STEP = 1000 / 120;

function make(rules: Partial<RuleSet> = {}, seed = 1): Game {
  const g = new Game({ rules: { lineClearDelayMs: 0, goal: { type: 'none' }, ...rules }, seed });
  g.start();
  return g;
}

function cmd(g: Game, ...cmds: Command[]): GameEvent[] {
  for (const c of cmds) g.dispatch(c);
  return g.step(0);
}

function setActive(g: Game, piece: ActivePiece): void {
  (g.state as { active: ActivePiece | null }).active = piece;
  g.step(0);
}

/** Ocupa una celda del tablero con basura. */
function fill(g: Game, x: number, y: number): void {
  g.state.board[y * BOARD_W + x] = 8;
}

/** Llena la fila `y` salvo las columnas indicadas. */
function fillRow(g: Game, y: number, holes: readonly number[]): void {
  for (let x = 0; x < BOARD_W; x++) if (!holes.includes(x)) fill(g, x, y);
}

function lineClear(
  events: readonly GameEvent[],
): Extract<GameEvent, { type: 'lineClear' }> | undefined {
  return events.find((e): e is Extract<GameEvent, { type: 'lineClear' }> => e.type === 'lineClear');
}

describe('maniobras: T-Spin Triple', () => {
  it('la 5ª prueba del kick (-1,-2) mete la T en el pozo y limpia 3 líneas (1600 pts)', () => {
    const g = make();
    // Pozo de 3 filas con entrada lateral por la fila 1 y techo que bloquea la 4ª prueba.
    fillRow(g, 0, [5]);
    fillRow(g, 1, [5, 6]);
    fillRow(g, 2, [5]);
    fill(g, 5, 4); // overhang: invalida las pruebas 2 (-1,0) y 3 (-1,+1)
    setActive(g, { type: 'T', rotation: 0, x: 5, y: 2 });

    const rotated = cmd(g, 'cw');
    const rot = rotated.find((e) => e.type === 'rotate');
    expect(rot?.type === 'rotate' ? rot.kick : -1).toBe(4); // índice 4 = 5ª prueba
    expect(g.state.active).toMatchObject({ rotation: 1, x: 4, y: 0 });

    const ev = cmd(g, 'hardDrop');
    const lc = lineClear(ev);
    expect(lc?.count).toBe(3);
    expect(lc?.tspin).toBe('full');
    expect(lc?.points).toBe(1600);
    expect(g.state.b2b).toBe(1);
    expect(g.state.stats.tspins).toBe(1);
  });
});

describe('maniobras: T-Spin Double y back-to-back', () => {
  it('TSD encadenado tras un Tetris aplica el multiplicador 1.5', () => {
    const g = make();
    // Tetris con una I vertical en la columna 9. La celda suelta evita el perfect clear.
    for (let y = 0; y < 4; y++) fillRow(g, y, [9]);
    fill(g, 0, 6);
    setActive(g, { type: 'I', rotation: 1, x: 7, y: 0 });
    const tetris = lineClear(cmd(g, 'hardDrop'));
    expect(tetris?.count).toBe(4);
    expect(tetris?.points).toBe(800);
    expect(tetris?.b2b).toBe(false);
    expect(g.state.b2b).toBe(1);

    // Ranura de TSD: fila 0 con hueco en col 4, fila 1 con hueco en 3..5, techo en (3,2) y (5,2).
    fillRow(g, 0, [4]);
    fillRow(g, 1, [3, 4, 5]);
    fill(g, 3, 2);
    fill(g, 5, 2);
    setActive(g, { type: 'T', rotation: 1, x: 3, y: 0 });
    cmd(g, 'cw');
    const tsd = lineClear(cmd(g, 'hardDrop'));
    expect(tsd?.count).toBe(2);
    expect(tsd?.tspin).toBe('full');
    expect(tsd?.b2b).toBe(true);
    // 1200 x 1.5 (back-to-back) + 50 x 1 (combo, segunda limpieza consecutiva)
    expect(tsd?.points).toBe(Math.floor(1200 * 1.5) + 50);
    expect(tsd?.combo).toBe(1);
    expect(g.state.b2b).toBe(2);
  });

  it('un double normal rompe la cadena back-to-back', () => {
    const g = make();
    (g.state as { b2b: number }).b2b = 3;
    fillRow(g, 0, [9]);
    fillRow(g, 1, [9]);
    setActive(g, { type: 'I', rotation: 1, x: 7, y: 0 });
    const lc = lineClear(cmd(g, 'hardDrop'));
    expect(lc?.count).toBe(2);
    expect(lc?.points).toBe(300); // sin multiplicador
    expect(g.state.b2b).toBe(0);
  });
});

describe('maniobras: I-spin en pozo', () => {
  it('la I rota dentro de un pozo de 1 columna usando su tabla de kicks', () => {
    const g = make();
    // Pozo de 4 celdas en la columna 0, con la I horizontal justo encima.
    for (let y = 0; y < 4; y++) fillRow(g, y, [0]);
    fill(g, 5, 8); // evita que el Tetris sea además un perfect clear
    setActive(g, { type: 'I', rotation: 0, x: 0, y: 3 });
    const ev = cmd(g, 'ccw'); // 0 -> L
    expect(ev.some((e) => e.type === 'rotate')).toBe(true);
    expect(g.state.active?.rotation).toBe(3);
    const lc = lineClear(cmd(g, 'hardDrop'));
    expect(lc?.count).toBe(4);
    expect(lc?.points).toBe(800);
  });
});

describe('maniobras: perfect clear', () => {
  it('vaciar el tablero con un Tetris da el bono de 2000 × nivel', () => {
    const g = make();
    for (let y = 0; y < 4; y++) fillRow(g, y, [9]);
    setActive(g, { type: 'I', rotation: 1, x: 7, y: 0 });
    const lc = lineClear(cmd(g, 'hardDrop'));
    expect(lc?.perfectClear).toBe(true);
    expect(lc?.points).toBe(800 + 2000);
    expect(g.state.stats.perfectClears).toBe(1);
    for (let i = 0; i < BOARD_W * 4; i++) expect(g.state.board[i]).toBe(0);
  });

  it('perfect clear con B2B Tetris usa el bono de 3200', () => {
    const g = make();
    (g.state as { b2b: number }).b2b = 1;
    for (let y = 0; y < 4; y++) fillRow(g, y, [9]);
    setActive(g, { type: 'I', rotation: 1, x: 7, y: 0 });
    const lc = lineClear(cmd(g, 'hardDrop'));
    expect(lc?.points).toBe(Math.floor(800 * 1.5) + 3200);
  });
});

describe('maniobras: combos', () => {
  it('tres limpiezas seguidas puntúan 0, 50 y 100 de combo en nivel 1', () => {
    const g = make();
    const expected = [0, 50, 100];
    for (let i = 0; i < 3; i++) {
      fillRow(g, 0, [9]);
      setActive(g, { type: 'I', rotation: 1, x: 7, y: 0 });
      const lc = lineClear(cmd(g, 'hardDrop'));
      expect(lc?.combo).toBe(i);
      expect(lc?.points).toBe(100 + expected[i]!);
      expect(g.state.combo).toBe(i);
      // La I deja 2 celdas en la columna 8 que hay que limpiar antes de la siguiente.
      g.state.board.fill(0);
    }
    expect(g.state.stats.maxCombo).toBe(2);
  });
});

describe('maniobras: mini T-spin', () => {
  it('tres esquinas con una sola frontal y sin kick 1x2 puntua como mini (100 pts)', () => {
    const g = make();
    // Esquinas traseras (3,2) y (5,2) ocupadas, una frontal (3,0); la otra (5,0) libre.
    fill(g, 3, 2);
    fill(g, 5, 2);
    fill(g, 3, 0);
    setActive(g, { type: 'T', rotation: 1, x: 3, y: 0 });
    const rotated = cmd(g, 'cw'); // R -> 2 con la primera prueba (0,0)
    const rot = rotated.find((e) => e.type === 'rotate');
    expect(rot?.type === 'rotate' ? rot.kick : -1).toBe(0);
    expect(g.state.active?.rotation).toBe(2);

    const ev = cmd(g, 'hardDrop');
    const spin = ev.find((e) => e.type === 'tspin');
    expect(spin?.type === 'tspin' ? spin.mini : null).toBe(true);
    expect(spin?.type === 'tspin' ? spin.points : 0).toBe(100);
    expect(lineClear(ev)).toBeUndefined();
  });
});

describe('maniobras: ghost piece y gravedad', () => {
  it('el fantasma coincide con la posicion final del hard drop', () => {
    const g = make({}, 12);
    for (let i = 0; i < 20; i++) {
      const ghostY = g.state.ghostY;
      if (!g.state.active) break;
      const ev = cmd(g, 'hardDrop');
      const lock = ev.find((e) => e.type === 'lock');
      expect(lock?.type === 'lock' ? lock.piece.y : -1).toBe(ghostY);
      if (g.state.phase === 'gameover') break;
      g.step(STEP);
    }
  });

  it('la pila crece y el juego termina por block out', () => {
    const g = make({}, 4);
    let guard = 0;
    while (g.state.phase !== 'gameover' && guard++ < 300) {
      cmd(g, 'hardDrop');
      g.step(STEP);
    }
    expect(g.state.phase).toBe('gameover');
    expect(g.state.gameOverReason).toBe('blockout');
    // La pila debe llegar a la zona de aparicion (fila 20 o superior).
    expect(stackHeight(g.state.board)).toBeGreaterThanOrEqual(VISIBLE_H);
  });
});
