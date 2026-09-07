/**
 * Sintetizador de SFX procedurales (algoritmo estilo ZzFX, reimplementado en TypeScript).
 * Parámetros en el orden clásico de ZzFX para poder pegar presets del diseñador.
 */
export type ZzfxParams = readonly (number | undefined)[];

export interface SynthOptions {
  readonly sampleRate: number;
  readonly random?: () => number;
}

const PI2 = Math.PI * 2;
const MASTER = 0.3;

export function synthesize(params: ZzfxParams, opts: SynthOptions): Float32Array<ArrayBuffer> {
  const sr = opts.sampleRate;
  const rnd = opts.random ?? Math.random;
  const [
    volume0 = 1,
    randomness = 0.05,
    frequency0 = 220,
    attack0 = 0,
    sustain0 = 0,
    release0 = 0.1,
    shape = 0,
    shapeCurve = 1,
    slide0 = 0,
    deltaSlide0 = 0,
    pitchJump0 = 0,
    pitchJumpTime0 = 0,
    repeatTime0 = 0,
    noise = 0,
    modulation0 = 0,
    bitCrush = 0,
    delay0 = 0,
    sustainVolume = 1,
    decay0 = 0,
    tremolo = 0,
  ] = params;

  const sign = (v: number): number => (v < 0 ? -1 : 1);
  let slide = (slide0 * 500 * PI2) / sr / sr;
  const startSlide = slide;
  let frequency = frequency0 * (((1 + randomness * 2 * rnd() - randomness) * PI2) / sr);
  let startFrequency = frequency;
  const attack = attack0 * sr + 9;
  const decay = decay0 * sr;
  const sustain = sustain0 * sr;
  const release = release0 * sr;
  const delay = delay0 * sr;
  const deltaSlide = (deltaSlide0 * 500 * PI2) / sr ** 3;
  const modulation = (modulation0 * PI2) / sr;
  const pitchJump = (pitchJump0 * PI2) / sr;
  const pitchJumpTime = pitchJumpTime0 * sr;
  const repeatTime = Math.floor(repeatTime0 * sr);
  const volume = volume0 * MASTER;
  const length = Math.floor(attack + decay + sustain + release + delay);
  const b = new Float32Array(Math.max(0, length));
  let t = 0;
  let tm = 0;
  let j = 1;
  let r = 0;
  let c = 0;
  let s = 0;
  const crush = Math.floor(bitCrush * 100);
  for (let i = 0; i < length; i++) {
    if (crush === 0 || ++c % crush === 0) {
      s =
        shape > 3
          ? Math.sin(t * t)
          : shape > 2
            ? Math.max(Math.min(Math.tan(t), 1), -1)
            : shape > 1
              ? 1 - (((((2 * t) / PI2) % 2) + 2) % 2)
              : shape > 0
                ? 1 - 4 * Math.abs(Math.round(t / PI2) - t / PI2)
                : Math.sin(t);
      const env =
        i < attack
          ? i / attack
          : i < attack + decay
            ? 1 - ((i - attack) / decay) * (1 - sustainVolume)
            : i < attack + decay + sustain
              ? sustainVolume
              : i < length - delay
                ? ((length - i - delay) / release) * sustainVolume
                : 0;
      s =
        (repeatTime ? 1 - tremolo + tremolo * Math.sin((PI2 * i) / repeatTime) : 1) *
        sign(s) *
        Math.abs(s) ** shapeCurve *
        env;
      if (delay) {
        const back = b[Math.floor(i - delay)] ?? 0;
        s =
          s / 2 +
          (delay > i ? 0 : ((i < length - delay ? 1 : (length - i) / delay) * back) / 2 / volume);
      }
    }
    const f = (frequency += slide += deltaSlide) * Math.cos(modulation * tm++);
    t += f + f * noise * Math.sin(i ** 5);
    if (j && ++j > pitchJumpTime) {
      frequency += pitchJump;
      startFrequency += pitchJump;
      j = 0;
    }
    if (repeatTime && !(++r % repeatTime)) {
      frequency = startFrequency;
      slide = startSlide;
      j = j || 1;
    }
    b[i] = s * volume;
  }
  return b;
}
