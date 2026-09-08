import { describe, expect, it } from 'vitest';
import { BOARD_W } from './constants';
import { DRILLS, DRILL_IDS, buildDrillBoard, type Drill } from './drills';
import { Game } from './game';
import type { ActivePiece, Command, GameEvent } from './types';

const STEP = 1000 / 120;

/** Arranca una partida con la posición ya montada. */
function start(drill: Drill): Game {
  const g = new Game({
    seed: 1,
    rules: {
      goal: { type: 'none' },
      lineClearDelayMs: 0,
      gravityMode: 'fixed',
      startLevel: 1,
      ...(drill.spinDetection ? { spinDetection: drill.spinDetection } : {}),
    },
    initialBoard: buildDrillBoard(drill),
    initialQueue: drill.queue,
  });
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

function lineClear(
  events: readonly GameEvent[],
): Extract<GameEvent, { type: 'lineClear' }> | undefined {
  return events.find((e): e is Extract<GameEvent, { type: 'lineClear' }> => e.type === 'lineClear');
}

describe('posiciones preparadas', () => {
  it('todas se montan con su cola y el tablero no queda vacío', () => {
    for (const id of DRILL_IDS) {
      const drill = DRILLS[id];
      const g = start(drill);
      expect(g.state.active?.type, id).toBe(drill.queue[0]);
      expect(
        [...g.state.board].some((v) => v !== 0),
        id,
      ).toBe(true);
      // Ninguna posición puede empezar ya perdida.
      expect(g.state.phase, id).not.toBe('gameover');
    }
  });

  it('el giro doble de la T limpia dos filas y puntúa como giro completo', () => {
    const g = start(DRILLS.tspinDouble);
    setActive(g, { type: 'T', rotation: 1, x: 3, y: 0 });
    cmd(g, 'cw');
    const lc = lineClear(cmd(g, 'hardDrop'));
    expect(lc?.count).toBe(2);
    expect(lc?.tspin).toBe('full');
    expect(lc?.points).toBe(1200);
  });

  it('el giro triple usa la última prueba del ajuste y limpia tres filas', () => {
    const g = start(DRILLS.tspinTriple);
    setActive(g, { type: 'T', rotation: 0, x: 5, y: 2 });
    const rotated = cmd(g, 'cw');
    const rot = rotated.find((e) => e.type === 'rotate');
    // El índice cuatro es la quinta prueba, la que asciende el giro a completo.
    expect(rot?.type === 'rotate' ? rot.kick : -1).toBe(4);
    const lc = lineClear(cmd(g, 'hardDrop'));
    expect(lc?.count).toBe(3);
    expect(lc?.tspin).toBe('full');
    expect(lc?.points).toBe(1600);
  });

  it('la de vaciar el tablero lo deja limpio con la I vertical', () => {
    const g = start(DRILLS.perfectClear);
    setActive(g, { type: 'I', rotation: 1, x: 7, y: 0 });
    const lc = lineClear(cmd(g, 'hardDrop'));
    expect(lc?.count).toBe(4);
    expect(lc?.perfectClear).toBe(true);
    for (let i = 0; i < BOARD_W * 6; i++) expect(g.state.board[i]).toBe(0);
  });

  it('la del encaje solo cuenta con los giros de todas las piezas', () => {
    const drill = DRILLS.immobileSpin;
    expect(drill.spinDetection).toBe('all-mini');

    const conRegla = start(drill);
    setActive(conRegla, { type: 'O', rotation: 0, x: 4, y: 0 });
    cmd(conRegla, 'cw');
    const conGiro = lineClear(cmd(conRegla, 'hardDrop'));
    expect(conGiro?.count).toBe(2);
    expect(conGiro?.tspin).toBe('mini');

    // Con las reglas de siempre, la misma jugada no da giro.
    const sinRegla = new Game({
      seed: 1,
      rules: { goal: { type: 'none' }, lineClearDelayMs: 0, gravityMode: 'fixed' },
      initialBoard: buildDrillBoard(drill),
      initialQueue: drill.queue,
    });
    sinRegla.start();
    setActive(sinRegla, { type: 'O', rotation: 0, x: 4, y: 0 });
    cmd(sinRegla, 'cw');
    expect(lineClear(cmd(sinRegla, 'hardDrop'))?.tspin).toBe('none');
  });

  it('la cola fija se agota y sigue con piezas normales', () => {
    const g = start(DRILLS.tspinDouble);
    const vistas: string[] = [];
    for (let i = 0; i < 10 && g.state.phase !== 'gameover'; i++) {
      const t = g.state.active?.type;
      if (t) vistas.push(t);
      cmd(g, 'hardDrop');
      g.step(STEP);
    }
    // Las primeras son las de la posición; luego el juego continúa con normalidad.
    expect(vistas.slice(0, 3)).toEqual(['T', 'T', 'T']);
    expect(g.state.queue.length).toBeGreaterThanOrEqual(5);
  });

  it('el tablero de cada posición coincide con lo declarado', () => {
    for (const id of DRILL_IDS) {
      const drill = DRILLS[id];
      const board = buildDrillBoard(drill);
      for (const [y, columns] of drill.rows.entries()) {
        for (let x = 0; x < BOARD_W; x++) {
          const esperado = columns.includes(x);
          expect(board[y * BOARD_W + x] !== 0, `${id} fila ${y} columna ${x}`).toBe(esperado);
        }
      }
    }
  });
});
