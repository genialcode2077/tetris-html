import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { BagRandomizer } from './randomizer';
import { mulberry32, seedFromString } from './rng';
import { PIECE_TYPES } from './types';

describe('7-bag', () => {
  it('cada bolsa de 7 contiene exactamente una pieza de cada tipo (propiedad)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.integer({ min: 1, max: 20 }),
        (seed, bags) => {
          const r = new BagRandomizer(mulberry32(seed));
          for (let b = 0; b < bags; b++) {
            const drawn = new Set<string>();
            for (let i = 0; i < 7; i++) drawn.add(r.next());
            expect(drawn.size).toBe(7);
            for (const t of PIECE_TYPES) expect(drawn.has(t)).toBe(true);
          }
        },
      ),
    );
  });

  it('misma semilla → misma secuencia; semillas distintas → secuencias distintas', () => {
    const a = new BagRandomizer(mulberry32(42));
    const b = new BagRandomizer(mulberry32(42));
    const c = new BagRandomizer(mulberry32(43));
    const sa = Array.from({ length: 21 }, () => a.next()).join('');
    const sb = Array.from({ length: 21 }, () => b.next()).join('');
    const sc = Array.from({ length: 21 }, () => c.next()).join('');
    expect(sa).toBe(sb);
    expect(sa).not.toBe(sc);
  });

  it('seedFromString es estable', () => {
    expect(seedFromString('blockfall')).toBe(seedFromString('blockfall'));
    expect(seedFromString('a')).not.toBe(seedFromString('b'));
  });

  it('mulberry32 produce valores en [0, 1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
