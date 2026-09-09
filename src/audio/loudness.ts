/**
 * Medidor de sonoridad según la Recomendación UIT-R BS.1770-5, "Algorithms to
 * measure audio programme loudness and true-peak audio level".
 *
 * Sirve para comparar efectos entre sí sin escucharlos: el oído no pesa igual
 * todas las frecuencias, así que el valor cuadrático medio en crudo miente. El
 * filtro K corrige eso antes de medir la energía.
 *
 * Alcance: los efectos del juego duran entre 26 y 1310 milisegundos, y el
 * recorte por bloques que describe la recomendación usa bloques de 400 ms y
 * descarta los incompletos, así que no se aplica a sonidos tan cortos. Aquí se
 * usa la parte que sí aplica: el filtro previo de dos etapas y la media
 * cuadrática sobre toda la duración (ecuación 1), con la fórmula de sonoridad.
 */

/** Tasa de muestreo de los coeficientes publicados. */
export const BS1770_SAMPLE_RATE = 48000;

/** Coeficientes de la etapa 1, que modela la cabeza esférica (tabla 1). */
const HEAD = {
  b0: 1.53512485958697,
  b1: -2.69169618940638,
  b2: 1.19839281085285,
  a1: -1.69065929318241,
  a2: 0.73248077421585,
} as const;

/** Coeficientes de la etapa 2, el paso alto (tabla 2). */
const HIGHPASS = {
  b0: 1.0,
  b1: -2.0,
  b2: 1.0,
  a1: -1.99004745483398,
  a2: 0.99007225036621,
} as const;

interface Biquad {
  readonly b0: number;
  readonly b1: number;
  readonly b2: number;
  readonly a1: number;
  readonly a2: number;
}

/** Filtro de segundo orden en forma directa I. */
function biquad(input: Float32Array, c: Biquad): Float32Array {
  const out = new Float32Array(input.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x0 = input[i] ?? 0;
    const y0 = c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    out[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }
  return out;
}

/** Aplica el filtro previo de dos etapas descrito en la recomendación. */
export function kWeight(samples: Float32Array): Float32Array {
  return biquad(biquad(samples, HEAD), HIGHPASS);
}

/**
 * Sonoridad de un canal en LKFS, sin recorte por bloques.
 * `LK = -0.691 + 10 log10(z)`, donde `z` es la media cuadrática de la señal
 * filtrada. Devuelve `-Infinity` para el silencio.
 */
export function loudnessLkfs(samples: Float32Array): number {
  if (samples.length === 0) return -Infinity;
  const y = kWeight(samples);
  let sum = 0;
  for (const s of y) sum += s * s;
  const z = sum / y.length;
  if (z <= 0) return -Infinity;
  return -0.691 + 10 * Math.log10(z);
}

/** Pico de muestra en dBFS. Devuelve `-Infinity` para el silencio. */
export function peakDbfs(samples: Float32Array): number {
  let peak = 0;
  for (const s of samples) {
    const a = Math.abs(s);
    if (a > peak) peak = a;
  }
  return peak > 0 ? 20 * Math.log10(peak) : -Infinity;
}
