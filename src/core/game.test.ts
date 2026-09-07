import { describe, expect, it } from 'vitest';
import { cellAt } from './board';
import { BOARD_W, VISIBLE_H } from './constants';
import { Game } from './game';
import { cellsOf } from './pieces';
import type { ActivePiece, Command, GameEvent, RuleSet } from './types';

const STEP = 1000 / 120;

function make(rules: Partial<RuleSet> = {}, seed = 1): Game {
  const g = new Game({ rules, seed });
  g.start();
  return g;
}

function run(g: Game, ms: number): GameEvent[] {
  const out: GameEvent[] = [];
  let t = 0;
  while (t < ms) {
    out.push(...g.step(STEP));
    t += STEP;
  }
  return out;
}

function cmd(g: Game, ...cmds: Command[]): GameEvent[] {
  for (const c of cmds) g.dispatch(c);
  return g.step(0);
}

/** Rellena las filas [0, rows) dejando un hueco en la columna `hole`. */
function fillRows(g: Game, rows: number, hole: number): void {
  const b = g.state.board;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < BOARD_W; x++) if (x !== hole) b[y * BOARD_W + x] = 8;
  }
}

/** Deja caer piezas a la izquierda hasta que la activa sea una I (máx. 14 piezas). */
function untilI(g: Game, waitMs: number): void {
  let guard = 0;
  while (g.state.active?.type !== 'I' && guard++ < 14) {
    for (let i = 0; i < 5; i++) g.dispatch('left');
    cmd(g, 'hardDrop');
    if (waitMs > 0) run(g, waitMs);
  }
  expect(g.state.active?.type).toBe('I');
}

function setActive(g: Game, piece: ActivePiece): void {
  (g.state as { active: ActivePiece | null }).active = piece;
}

function setLines(g: Game, lines: number): void {
  (g.state as { lines: number }).lines = lines;
}

describe('Game: spawn y cola', () => {
  it('aparece centrada, baja una fila y la cola mantiene nextCount piezas', () => {
    const g = make();
    const s = g.state;
    expect(s.phase).toBe('falling');
    const p = s.active!;
    if (p.type === 'I') {
      expect(p.x).toBe(3);
      expect(p.y).toBe(17);
    } else if (p.type === 'O') {
      expect(p.x).toBe(4);
      expect(p.y).toBe(19);
    } else {
      expect(p.x).toBe(3);
      expect(p.y).toBe(18);
    }
    expect(s.queue.length).toBeGreaterThanOrEqual(5);
    expect(s.ghostY).toBeLessThanOrEqual(p.y);
  });

  it('es determinista para la misma semilla', () => {
    const a = make({}, 99);
    const b = make({}, 99);
    const seq: Command[] = ['left', 'cw', 'hardDrop', 'right', 'right', 'ccw', 'hardDrop', 'hold'];
    for (const c of seq) {
      a.dispatch(c);
      b.dispatch(c);
      run(a, 300);
      run(b, 300);
    }
    expect(Array.from(a.state.board)).toEqual(Array.from(b.state.board));
    expect(a.state.score).toBe(b.state.score);
    expect(a.state.queue).toEqual(b.state.queue);
  });

  it('no hace nada antes de start ni tras game over', () => {
    const g = new Game({ seed: 1 });
    expect(g.state.phase).toBe('ready');
    expect(g.step(STEP)).toEqual([]);
    g.dispatch('hardDrop');
    expect(g.state.active).toBeNull();
  });
});

describe('Game: movimiento y drops', () => {
  it('hard drop fija la pieza, puntúa 2 por celda y genera la siguiente', () => {
    const g = make();
    const p = g.state.active!;
    const dist = p.y - g.state.ghostY;
    const events = cmd(g, 'hardDrop');
    expect(events.some((e) => e.type === 'hardDrop' && e.distance === dist)).toBe(true);
    expect(events.some((e) => e.type === 'lock')).toBe(true);
    expect(g.state.score).toBe(dist * 2);
    expect(g.state.stats.pieces).toBe(1);
    expect(g.state.active).not.toBeNull();
    expect(g.state.phase).toBe('falling');
  });

  it('no atraviesa las paredes', () => {
    const g = make();
    for (let i = 0; i < 12; i++) g.dispatch('left');
    g.step(0);
    const p = g.state.active!;
    for (const c of cellsOf(p.type, p.rotation)) expect(p.x + c.x).toBeGreaterThanOrEqual(0);
    for (let i = 0; i < 20; i++) g.dispatch('right');
    g.step(0);
    const q = g.state.active!;
    for (const c of cellsOf(q.type, q.rotation)) expect(q.x + c.x).toBeLessThan(BOARD_W);
  });

  it('soft drop puntúa 1 por celda y cae a velocidad SDF', () => {
    const g = make({ softDropFactor: 20 });
    const y0 = g.state.active!.y;
    g.dispatch('softDropOn');
    run(g, 110); // 50 ms por fila → 2 filas
    expect(g.state.active!.y).toBe(y0 - 2);
    expect(g.state.score).toBe(2);
    g.dispatch('softDropOff');
    run(g, 110);
    expect(g.state.active!.y).toBe(y0 - 2);
  });

  it('SDF infinito baja hasta el suelo sin fijar', () => {
    const g = make({ softDropFactor: Number.POSITIVE_INFINITY });
    g.dispatch('softDropOn');
    g.step(STEP);
    expect(g.state.active!.y).toBe(g.state.ghostY);
    expect(g.state.phase).toBe('locking');
  });

  it('la gravedad baja una fila por segundo en nivel 1', () => {
    const g = make();
    const y0 = g.state.active!.y;
    run(g, 990);
    expect(g.state.active!.y).toBe(y0);
    run(g, 30);
    expect(g.state.active!.y).toBe(y0 - 1);
  });

  it('en 20G la pieza cae al instante', () => {
    const g = make({ startLevel: 20, levelCap: 20 });
    g.step(STEP);
    expect(g.state.active!.y).toBe(g.state.ghostY);
  });
});

describe('Game: rotación con kicks', () => {
  it('rotar pegado a la pared izquierda aplica un kick y mantiene la pieza dentro', () => {
    const g = make({}, 3);
    while (g.state.active!.type === 'O') cmd(g, 'hardDrop');
    for (let i = 0; i < 10; i++) g.dispatch('left');
    g.step(0);
    const events = cmd(g, 'cw');
    expect(events.some((e) => e.type === 'rotate')).toBe(true);
    const p = g.state.active!;
    for (const c of cellsOf(p.type, p.rotation)) expect(p.x + c.x).toBeGreaterThanOrEqual(0);
  });

  it('rotateFail cuando ningún kick es posible', () => {
    const g = make({}, 5);
    while (g.state.active!.type === 'O') cmd(g, 'hardDrop');
    const b = g.state.board;
    const p = g.state.active!;
    for (let y = 0; y < 30; y++) for (let x = 0; x < BOARD_W; x++) b[y * BOARD_W + x] = 8;
    for (const c of cellsOf(p.type, p.rotation)) b[(p.y + c.y) * BOARD_W + (p.x + c.x)] = 0;
    const events = cmd(g, 'cw');
    expect(events.some((e) => e.type === 'rotateFail')).toBe(true);
    expect(g.state.active!.rotation).toBe(p.rotation);
  });

  it('r180 se ignora si está deshabilitado y funciona si está habilitado', () => {
    const g = make({ enable180: false }, 5);
    while (g.state.active!.type === 'O') cmd(g, 'hardDrop');
    let ev = cmd(g, 'r180');
    expect(ev.some((e) => e.type === 'rotate' || e.type === 'rotateFail')).toBe(false);
    const h = make({ enable180: true }, 5);
    while (h.state.active!.type === 'O') cmd(h, 'hardDrop');
    ev = cmd(h, 'r180');
    expect(ev.some((e) => e.type === 'rotate')).toBe(true);
    expect(h.state.active!.rotation).toBe(2);
  });
});

describe('Game: hold', () => {
  it('guarda, intercambia y falla si se usa dos veces', () => {
    const g = make({}, 11);
    const first = g.state.active!.type;
    let ev = cmd(g, 'hold');
    expect(ev.some((e) => e.type === 'hold')).toBe(true);
    expect(g.state.hold).toBe(first);
    expect(g.state.holdUsed).toBe(true);
    ev = cmd(g, 'hold');
    expect(ev.some((e) => e.type === 'holdFail')).toBe(true);
    cmd(g, 'hardDrop');
    expect(g.state.holdUsed).toBe(false);
    const second = g.state.active!.type;
    cmd(g, 'hold');
    expect(g.state.hold).toBe(second);
    expect(g.state.active!.type).toBe(first);
  });

  it('hold deshabilitado → holdFail', () => {
    const g = make({ holdEnabled: false }, 11);
    const ev = cmd(g, 'hold');
    expect(ev.some((e) => e.type === 'holdFail')).toBe(true);
  });
});

describe('Game: lock delay', () => {
  function toFloor(g: Game): void {
    g.dispatch('softDropOn');
    g.step(STEP);
    g.dispatch('softDropOff');
    expect(g.state.phase).toBe('locking');
  }

  it('fija tras 500 ms en el suelo; mover reinicia el temporizador', () => {
    const g = make({ softDropFactor: Number.POSITIVE_INFINITY }, 2);
    toFloor(g);
    run(g, 400);
    expect(g.state.stats.pieces).toBe(0);
    g.dispatch('left');
    g.dispatch('right');
    g.step(0);
    expect(g.state.lockTimerMs).toBe(0);
    expect(g.state.lockMovesRemaining).toBe(13);
    run(g, 400);
    expect(g.state.stats.pieces).toBe(0);
    run(g, 150);
    expect(g.state.stats.pieces).toBe(1);
  });

  it('agota los 15 resets y fija aunque se siga moviendo', () => {
    const g = make({ softDropFactor: Number.POSITIVE_INFINITY }, 2);
    toFloor(g);
    for (let i = 0; i < 40; i++) {
      g.dispatch(i % 2 === 0 ? 'left' : 'right');
      run(g, 100);
    }
    expect(g.state.stats.pieces).toBe(1);
  });

  it('modo step: mover no reinicia; modo infinite: siempre reinicia', () => {
    const g = make({ softDropFactor: Number.POSITIVE_INFINITY, lockResetMode: 'step' }, 2);
    toFloor(g);
    run(g, 300);
    g.dispatch('left');
    g.step(0);
    expect(g.state.lockTimerMs).toBeGreaterThan(250);
    const h = make({ softDropFactor: Number.POSITIVE_INFINITY, lockResetMode: 'infinite' }, 2);
    toFloor(h);
    for (let i = 0; i < 40; i++) {
      h.dispatch(i % 2 === 0 ? 'left' : 'right');
      run(h, 100);
    }
    expect(h.state.stats.pieces).toBe(0);
  });
});

describe('Game: líneas, puntuación y nivel', () => {
  it('limpia una línea con delay, puntúa 100 × nivel y emite clearDone', () => {
    const g = make({ lineClearDelayMs: 200 }, 7);
    fillRows(g, 1, 9);
    untilI(g, 250);
    cmd(g, 'cw');
    for (let i = 0; i < 6; i++) g.dispatch('right');
    g.step(0);
    const ev = cmd(g, 'hardDrop');
    const lc = ev.find((e) => e.type === 'lineClear');
    expect(lc).toBeDefined();
    if (lc?.type === 'lineClear') {
      expect(lc.count).toBe(1);
      expect(lc.points).toBe(100);
      expect(lc.combo).toBe(0);
    }
    expect(g.state.phase).toBe('clearing');
    const ev2 = run(g, 210);
    expect(ev2.some((e) => e.type === 'clearDone')).toBe(true);
    expect(g.state.lines).toBe(1);
    expect(g.state.phase).toBe('falling');
  });

  it('nivel = max(startLevel, 1 + floor(lines/10)) con tope', () => {
    const g = make({ startLevel: 5, lineClearDelayMs: 0 }, 1);
    expect(g.state.level).toBe(5);
    setLines(g, 55);
    fillRows(g, 1, 9);
    untilI(g, 0);
    cmd(g, 'cw');
    for (let i = 0; i < 6; i++) g.dispatch('right');
    g.step(0);
    const ev = cmd(g, 'hardDrop');
    expect(g.state.lines).toBe(56);
    expect(g.state.level).toBe(6);
    expect(ev.some((e) => e.type === 'levelUp' && e.level === 6)).toBe(true);
  });

  it('Sprint termina al llegar a 40 líneas', () => {
    const g = make({ goal: { type: 'lines', lines: 40 }, lineClearDelayMs: 0 }, 1);
    setLines(g, 39);
    fillRows(g, 1, 9);
    untilI(g, 0);
    cmd(g, 'cw');
    for (let i = 0; i < 6; i++) g.dispatch('right');
    g.step(0);
    const ev = cmd(g, 'hardDrop');
    expect(ev.some((e) => e.type === 'finished')).toBe(true);
    expect(g.state.phase).toBe('finished');
    expect(g.step(STEP)).toEqual([]);
  });

  it('Ultra termina por tiempo', () => {
    const g = make({ goal: { type: 'time', ms: 1000 } }, 1);
    const ev = run(g, 1100);
    expect(ev.some((e) => e.type === 'finished')).toBe(true);
  });

  it('T-spin double: puntúa 1200, activa B2B y limpia el hueco', () => {
    const g = make({ lineClearDelayMs: 0 }, 1);
    const b = g.state.board;
    // Ranura clásica: fila 0 llena salvo x=4; fila 1 llena salvo x=3..5; techo en (3,2) y (5,2).
    for (let x = 0; x < BOARD_W; x++) {
      if (x !== 4) b[0 * BOARD_W + x] = 8;
      if (x < 3 || x > 5) b[1 * BOARD_W + x] = 8;
    }
    b[2 * BOARD_W + 3] = 8;
    b[2 * BOARD_W + 5] = 8;
    // T vertical (estado R, pico a la derecha) bajada por la columna 4 hasta el fondo.
    setActive(g, { type: 'T', rotation: 1, x: 3, y: 0 });
    let ev = cmd(g, 'cw');
    expect(ev.some((e) => e.type === 'rotate')).toBe(true);
    expect(g.state.active!.rotation).toBe(2);
    ev = cmd(g, 'hardDrop');
    const lc = ev.find((e) => e.type === 'lineClear');
    expect(lc).toBeDefined();
    if (lc?.type === 'lineClear') {
      expect(lc.count).toBe(2);
      expect(lc.tspin).toBe('full');
      expect(lc.points).toBe(1200);
      expect(lc.b2b).toBe(false);
    }
    expect(g.state.b2b).toBe(1);
    expect(g.state.stats.tspins).toBe(1);
    expect(cellAt(b, 4, 0)).toBe(0);
  });

  it('T-spin sin líneas puntúa 400 y no rompe el B2B', () => {
    const g = make({ lineClearDelayMs: 0 }, 1);
    const b = g.state.board;
    (g.state as { b2b: number }).b2b = 1;
    // Misma ranura pero fila 0 con un hueco extra en x=8 para que no se complete.
    for (let x = 0; x < BOARD_W; x++) {
      if (x !== 4 && x !== 8) b[0 * BOARD_W + x] = 8;
      if ((x < 3 || x > 5) && x !== 8) b[1 * BOARD_W + x] = 8;
    }
    b[2 * BOARD_W + 3] = 8;
    b[2 * BOARD_W + 5] = 8;
    setActive(g, { type: 'T', rotation: 1, x: 3, y: 0 });
    cmd(g, 'cw');
    const ev = cmd(g, 'hardDrop');
    const ts = ev.find((e) => e.type === 'tspin');
    expect(ts).toBeDefined();
    if (ts?.type === 'tspin') {
      expect(ts.mini).toBe(false);
      expect(ts.points).toBe(400);
    }
    expect(g.state.b2b).toBe(1);
  });

  it('combo: dos limpiezas seguidas suman 50 × combo × nivel', () => {
    const g = make({ lineClearDelayMs: 0 }, 7);
    fillRows(g, 2, 9);
    setActive(g, { type: 'I', rotation: 1, x: 7, y: 0 });
    let ev = cmd(g, 'hardDrop');
    let lc = ev.find((e) => e.type === 'lineClear');
    expect(lc?.type === 'lineClear' ? lc.count : 0).toBe(2);
    expect(lc?.type === 'lineClear' ? lc.points : 0).toBe(300);
    expect(g.state.combo).toBe(0);
    // Los restos de la I (2 celdas) bajan a las filas 0-1 de la columna 9.
    expect(cellAt(g.state.board, 9, 0)).toBe(1);
    fillRows(g, 1, 5);
    setActive(g, { type: 'I', rotation: 1, x: 3, y: 0 });
    ev = cmd(g, 'hardDrop');
    lc = ev.find((e) => e.type === 'lineClear');
    expect(lc?.type === 'lineClear' ? lc.count : 0).toBe(1);
    expect(lc?.type === 'lineClear' ? lc.combo : -1).toBe(1);
    expect(lc?.type === 'lineClear' ? lc.points : 0).toBe(150);
    expect(g.state.combo).toBe(1);
    expect(g.state.stats.maxCombo).toBe(1);
    // Una pieza sin limpieza rompe el combo.
    cmd(g, 'hardDrop');
    expect(g.state.combo).toBe(-1);
  });
});

describe('Game: fin de partida', () => {
  it('block out cuando la pieza nueva solapa la pila', () => {
    const g = make({}, 1);
    fillRows(g, VISIBLE_H + 2, 0);
    const ev = cmd(g, 'hardDrop');
    expect(ev.some((e) => e.type === 'gameOver' && e.reason === 'blockout')).toBe(true);
    expect(g.state.phase).toBe('gameover');
    expect(g.state.gameOverReason).toBe('blockout');
    expect(g.step(STEP)).toEqual([]);
  });

  it('lock out cuando la pieza se fija totalmente sobre la zona visible', () => {
    const g = make({}, 1);
    fillRows(g, VISIBLE_H, 0);
    const p = g.state.active!;
    p.y = 20;
    const ev = cmd(g, 'hardDrop');
    expect(ev.some((e) => e.type === 'gameOver' && e.reason === 'lockout')).toBe(true);
  });
});
