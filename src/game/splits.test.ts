import { describe, expect, it } from 'vitest';
import { SPLIT_EVERY_LINES, SplitTracker, formatDelta, hasSplits, splitTargets } from './splits';

describe('hitos', () => {
  it('una carrera de cuarenta líneas tiene cuatro', () => {
    expect(splitTargets(40)).toEqual([10, 20, 30, 40]);
    expect(splitTargets(150)).toHaveLength(15);
  });

  it('un objetivo menor que el primer hito no tiene ninguno', () => {
    expect(splitTargets(5)).toEqual([]);
    expect(splitTargets(SPLIT_EVERY_LINES)).toEqual([10]);
  });

  it('solo los modos donde el tiempo es el objetivo se comparan', () => {
    expect(hasSplits('sprint', 40)).toBe(true);
    expect(hasSplits('daily', 40)).toBe(true);
    expect(hasSplits('marathon', 150)).toBe(false);
    expect(hasSplits('ultra', null)).toBe(false);
    expect(hasSplits('zen', null)).toBe(false);
    expect(hasSplits('sprint', null)).toBe(false);
    expect(hasSplits('sprint', 5)).toBe(false);
  });
});

describe('comparación con el récord', () => {
  it('no avisa hasta cruzar un hito, y solo una vez por hito', () => {
    const t = new SplitTracker(40);
    expect(t.update(9, 5000)).toBeNull();
    const first = t.update(10, 6000);
    expect(first?.lines).toBe(10);
    expect(first?.timeMs).toBe(6000);
    expect(t.update(10, 6100)).toBeNull();
    expect(t.update(11, 6200)).toBeNull();
    expect(t.update(20, 12000)?.lines).toBe(20);
  });

  it('sin récord previo no hay diferencia que mostrar', () => {
    const t = new SplitTracker(40);
    expect(t.update(10, 6000)?.deltaMs).toBeNull();
  });

  it('la diferencia es negativa cuando se va por delante', () => {
    const t = new SplitTracker(40, [7000, 14000, 21000, 28000]);
    expect(t.update(10, 6000)?.deltaMs).toBe(-1000);
    expect(t.update(20, 15000)?.deltaMs).toBe(1000);
    expect(t.update(30, 21000)?.deltaMs).toBe(0);
  });

  it('un récord con menos parciales que hitos no rompe nada', () => {
    // Marcas guardadas antes de que existieran los parciales.
    const t = new SplitTracker(40, [7000]);
    expect(t.update(10, 6000)?.deltaMs).toBe(-1000);
    expect(t.update(20, 12000)?.deltaMs).toBeNull();
    expect(t.update(30, 18000)?.deltaMs).toBeNull();
  });

  it('guarda los tiempos para el próximo récord y sabe cuántos quedan', () => {
    const t = new SplitTracker(40);
    expect(t.remaining).toBe(4);
    t.update(10, 6000);
    t.update(20, 12500);
    expect(t.recorded).toEqual([6000, 12500]);
    expect(t.remaining).toBe(2);
  });

  it('saltarse varios hitos de golpe solo cuenta el primero pendiente', () => {
    // Una limpieza de cuatro líneas puede cruzar un hito justo.
    const t = new SplitTracker(40);
    expect(t.update(24, 9000)?.lines).toBe(10);
    expect(t.update(24, 9000)?.lines).toBe(20);
    expect(t.update(24, 9000)).toBeNull();
  });
});

describe('formato de la diferencia', () => {
  it('lleva signo y una decimal', () => {
    expect(formatDelta(2340)).toBe('+2.3 s');
    expect(formatDelta(-1100)).toBe('−1.1 s');
    expect(formatDelta(0)).toBe('+0.0 s');
  });
});
