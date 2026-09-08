import { describe, expect, it } from 'vitest';
import { createBoard } from '@/core/board';
import { BOARD_W } from '@/core/constants';
import type { ActivePiece, GameEvent, GameState } from '@/core/types';
import { Coach, MIN_GAP_MS, TIP_IDS, type TipId } from './coaching';

/** Estado mínimo: solo se consulta el tablero. */
function stateWithHeight(rows: number): GameState {
  const board = createBoard();
  for (let y = 0; y < rows; y++) board[y * BOARD_W] = 8;
  return { board } as unknown as GameState;
}

const EMPTY = stateWithHeight(0);
const piece: ActivePiece = { type: 'T', rotation: 0, x: 3, y: 0 };
const lock: GameEvent = { type: 'lock', piece };

/** Reloj manual, para controlar la separación entre consejos. */
function clock(): { now: () => number; advance: (ms: number) => void } {
  let t = 0;
  return { now: () => t, advance: (ms) => (t += ms) };
}

function coach(seen: TipId[] = []): Coach {
  return new Coach({ seen, now: clock().now });
}

describe('consejos contextuales', () => {
  it('sugiere la caída rápida tras varias piezas sin usarla', () => {
    const c = coach();
    const tips: (TipId | null)[] = [];
    for (let i = 0; i < 12; i++) tips.push(c.observe(lock, EMPTY));
    expect(tips.filter(Boolean)).toEqual(['hardDrop']);
  });

  it('no la sugiere si el jugador ya la usa', () => {
    const c = coach();
    c.observe({ type: 'hardDrop', distance: 5 }, EMPTY);
    for (let i = 0; i < 12; i++) expect(c.observe(lock, EMPTY)).toBeNull();
  });

  it('sugiere la reserva más tarde que la caída rápida, y solo si no se usa', () => {
    const time = clock();
    const c = new Coach({ seen: ['hardDrop'], now: time.now });
    let holdTip: TipId | null = null;
    for (let i = 0; i < 16; i++) {
      const tip = c.observe(lock, EMPTY);
      if (tip) holdTip = tip;
      time.advance(MIN_GAP_MS);
    }
    expect(holdTip).toBe('hold');

    const used = new Coach({ seen: ['hardDrop'], now: clock().now });
    used.observe({ type: 'hold', piece: 'T' }, EMPTY);
    for (let i = 0; i < 16; i++) expect(used.observe(lock, EMPTY)).toBeNull();
  });

  it('explica el giro de la T la primera vez que ocurre', () => {
    const c = coach();
    const clear: GameEvent = {
      type: 'lineClear',
      rows: [0, 1],
      count: 2,
      tspin: 'full',
      b2b: false,
      combo: 0,
      perfectClear: false,
      points: 1200,
    };
    expect(c.observe(clear, EMPTY)).toBe('tspin');
    // Ya visto: no se repite.
    expect(c.observe(clear, EMPTY)).toBeNull();
  });

  it('el tablero vacío tiene prioridad sobre encadenar o combinar', () => {
    const c = coach();
    const pc: GameEvent = {
      type: 'lineClear',
      rows: [0],
      count: 1,
      tspin: 'none',
      b2b: true,
      combo: 3,
      perfectClear: true,
      points: 900,
    };
    expect(c.observe(pc, EMPTY)).toBe('perfectClear');
  });

  it('avisa cuando la pila entra en zona de peligro', () => {
    const c = coach();
    expect(c.observe(lock, stateWithHeight(15))).toBe('danger');
  });

  it('nunca repite un consejo ya visto en partidas anteriores', () => {
    const c = coach([...TIP_IDS]);
    const events: GameEvent[] = [
      lock,
      { type: 'tspin', mini: false, points: 400 },
      {
        type: 'lineClear',
        rows: [0],
        count: 1,
        tspin: 'none',
        b2b: true,
        combo: 2,
        perfectClear: true,
        points: 900,
      },
    ];
    for (const e of events) expect(c.observe(e, stateWithHeight(18))).toBeNull();
  });

  it('deja pasar un tiempo mínimo entre consejos', () => {
    const time = clock();
    const c = new Coach({ seen: [], now: time.now });
    expect(c.observe(lock, stateWithHeight(16))).toBe('danger');
    // Inmediatamente después, otro consejo distinto no sale todavía.
    expect(c.observe({ type: 'tspin', mini: false, points: 400 }, EMPTY)).toBeNull();
    time.advance(MIN_GAP_MS);
    expect(c.observe({ type: 'tspin', mini: false, points: 400 }, EMPTY)).toBe('tspin');
  });

  it('recuerda lo aprendido al empezar otra partida', () => {
    const time = clock();
    const c = new Coach({ seen: [], now: time.now });
    for (let i = 0; i < 12; i++) c.observe(lock, EMPTY);
    expect(c.seenTips).toContain('hardDrop');
    c.resetForNewGame();
    for (let i = 0; i < 12; i++) expect(c.observe(lock, EMPTY)).toBeNull();
    expect(c.seenTips).toContain('hardDrop');
  });
});
