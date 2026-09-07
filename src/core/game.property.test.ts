import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { collides, fullRows } from './board';
import { Game } from './game';
import { PIECE_TYPES, type Command } from './types';

const STEP = 1000 / 120;
const COMMANDS: Command[] = [
  'left',
  'right',
  'cw',
  'ccw',
  'hardDrop',
  'hold',
  'softDropOn',
  'softDropOff',
];

describe('Game: invariantes (property-based)', () => {
  it('nunca hay solapamiento, filas completas persistentes ni puntuación decreciente', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffff }),
        fc.array(fc.tuple(fc.constantFrom(...COMMANDS), fc.integer({ min: 0, max: 40 })), {
          minLength: 1,
          maxLength: 400,
        }),
        fc.constantFrom(1, 5, 12, 20),
        (seed, script, startLevel) => {
          const g = new Game({ seed, rules: { startLevel, levelCap: 20, goal: { type: 'none' } } });
          g.start();
          let lastScore = 0;
          let lastLines = 0;
          for (const [command, steps] of script) {
            g.dispatch(command);
            for (let i = 0; i < steps; i++) g.step(STEP);
            const s = g.state;
            if (s.active && (s.phase === 'falling' || s.phase === 'locking')) {
              expect(
                collides(s.board, s.active.type, s.active.rotation, s.active.x, s.active.y),
              ).toBe(false);
              expect(s.ghostY).toBeLessThanOrEqual(s.active.y);
            }
            if (s.phase === 'falling' || s.phase === 'locking' || s.phase === 'spawning') {
              expect(fullRows(s.board)).toEqual([]);
            }
            expect(s.score).toBeGreaterThanOrEqual(lastScore);
            expect(s.lines).toBeGreaterThanOrEqual(lastLines);
            expect(s.queue.length).toBeGreaterThanOrEqual(g.rules.nextCount);
            expect(s.level).toBeLessThanOrEqual(20);
            expect(s.lockMovesRemaining).toBeGreaterThanOrEqual(0);
            for (const q of s.queue) expect(PIECE_TYPES).toContain(q);
            lastScore = s.score;
            lastLines = s.lines;
            if (s.phase === 'gameover') break;
          }
        },
      ),
      { numRuns: 60 },
    );
  });

  it('cada 7 piezas generadas contienen los 7 tipos (cola + hold)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0xffff }), (seed) => {
        const g = new Game({ seed, rules: { goal: { type: 'none' }, lineClearDelayMs: 0 } });
        g.start();
        const seen: string[] = [];
        for (let i = 0; i < 28; i++) {
          const t = g.state.active?.type;
          if (!t) break;
          seen.push(t);
          g.dispatch('hardDrop');
          g.step(STEP);
          if (g.state.phase === 'gameover') break;
        }
        for (let b = 0; b + 7 <= seen.length; b += 7) {
          expect(new Set(seen.slice(b, b + 7)).size).toBe(7);
        }
      }),
      { numRuns: 40 },
    );
  });
});
