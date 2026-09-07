import { describe, expect, it } from 'vitest';
import { SFX_PRESETS } from './sfx';
import { synthesize } from './synth';

describe('synth', () => {
  it('genera buffers finitos, acotados y no vacíos para todos los presets', () => {
    for (const [name, params] of Object.entries(SFX_PRESETS)) {
      const data = synthesize(params, { sampleRate: 44100, random: () => 0.5 });
      expect(data.length, name).toBeGreaterThan(100);
      let max = 0;
      let finite = true;
      for (const v of data) {
        if (!Number.isFinite(v)) finite = false;
        max = Math.max(max, Math.abs(v));
      }
      expect(finite, name).toBe(true);
      expect(max, name).toBeGreaterThan(0.001);
      expect(max, name).toBeLessThanOrEqual(1.5);
    }
  });

  it('es determinista con la misma fuente aleatoria', () => {
    const a = synthesize(SFX_PRESETS.tetris, { sampleRate: 22050, random: () => 0.3 });
    const b = synthesize(SFX_PRESETS.tetris, { sampleRate: 22050, random: () => 0.3 });
    expect(Array.from(a.slice(0, 200))).toEqual(Array.from(b.slice(0, 200)));
  });
});
