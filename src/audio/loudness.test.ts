import { describe, expect, it } from 'vitest';
import { BS1770_SAMPLE_RATE as SR, loudnessLkfs, peakDbfs } from './loudness';
import { SFX_PRESETS, type SfxName } from './sfx';
import { synthesize } from './synth';

/** Semilla fija: algunos presets tienen componente aleatoria. */
const measure = (name: SfxName): { lkfs: number; peak: number } => {
  const b = synthesize(SFX_PRESETS[name], { sampleRate: SR, random: () => 0.5 });
  return { lkfs: loudnessLkfs(b), peak: peakDbfs(b) };
};

const lkfs = (name: SfxName): number => measure(name).lkfs;

/** Escalón mínimo para que un peldaño se note; el diseño deja ~1,5 dB. */
const STEP_DB = 1;

describe('medidor de sonoridad', () => {
  it('cumple la comprobación de la recomendación: 1 kHz a plena escala da -3,01 LKFS', () => {
    const tone = new Float32Array(SR);
    for (let i = 0; i < SR; i++) tone[i] = Math.sin((2 * Math.PI * 1000 * i) / SR);
    expect(loudnessLkfs(tone)).toBeCloseTo(-3.01, 1);
  });

  it('el silencio no tiene sonoridad y una señal más fuerte mide más', () => {
    expect(loudnessLkfs(new Float32Array(1000))).toBe(-Infinity);
    expect(peakDbfs(new Float32Array(1000))).toBe(-Infinity);

    const tone = (amp: number): Float32Array => {
      const b = new Float32Array(SR);
      for (let i = 0; i < SR; i++) b[i] = amp * Math.sin((2 * Math.PI * 1000 * i) / SR);
      return b;
    };
    // La mitad de amplitud son seis decibelios menos.
    expect(loudnessLkfs(tone(0.5))).toBeCloseTo(loudnessLkfs(tone(1)) - 6.02, 1);
  });
});

describe('mezcla de los efectos', () => {
  it('ninguno satura', () => {
    for (const name of Object.keys(SFX_PRESETS) as SfxName[]) {
      // Margen sobre el fondo de escala: el pico real entre muestras es mayor
      // que el mayor valor muestreado.
      expect(measure(name).peak, name).toBeLessThan(-3);
    }
  });

  it('la recompensa crece con la jugada', () => {
    const peldanos: readonly (readonly [SfxName, SfxName])[] = [
      ['clear1', 'clear2'],
      ['clear2', 'clear3'],
      ['clear3', 'tetris'],
      ['tetris', 'perfectClear'],
    ];
    for (const [antes, ahora] of peldanos) {
      expect(lkfs(ahora), `${ahora} debe sonar más que ${antes}`).toBeGreaterThan(
        lkfs(antes) + STEP_DB,
      );
    }
  });

  it('el giro completo suena más que el mini, y el mini más que un simple', () => {
    expect(lkfs('tspin')).toBeGreaterThan(lkfs('tspinMini') + STEP_DB);
    expect(lkfs('tspinMini')).toBeGreaterThan(lkfs('clear1'));
  });

  it('vaciar el tablero es lo más sonoro del juego', () => {
    for (const name of Object.keys(SFX_PRESETS) as SfxName[]) {
      if (name === 'perfectClear') continue;
      expect(lkfs('perfectClear'), `frente a ${name}`).toBeGreaterThan(lkfs(name));
    }
  });

  it('los sonidos de cada pieza no compiten con los de recompensa', () => {
    const porPieza: SfxName[] = [
      'move',
      'rotate',
      'rotateFail',
      'softDrop',
      'hardDrop',
      'lock',
      'land',
    ];
    // El más flojo de los premios marca el techo de lo que suena todo el rato.
    const techo = lkfs('clear1');
    for (const name of porPieza) {
      expect(lkfs(name), name).toBeLessThan(techo - STEP_DB);
    }
  });
});
