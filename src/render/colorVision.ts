/**
 * Simulación de daltonismo y distancia perceptual entre colores.
 *
 * Sirve para comprobar que las siete piezas siguen siendo distinguibles entre sí
 * para quien no percibe algún canal de color. Las pruebas automáticas lo usan
 * para que una paleta nueva no pueda empeorar la accesibilidad sin que salte
 * una alarma (docs/research/09).
 */

export type ColorVision = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia';

export const COLOR_VISION_TYPES: readonly ColorVision[] = [
  'normal',
  'protanopia',
  'deuteranopia',
  'tritanopia',
];

export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/**
 * Matrices de Machado, Oliveira y Fernandes con severidad 1, es decir dicromacia
 * completa. Operan sobre RGB lineal, no sobre el valor con corrección de gamma.
 */
const MATRICES: Readonly<Record<Exclude<ColorVision, 'normal'>, readonly number[]>> = {
  protanopia: [
    0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998,
  ],
  deuteranopia: [
    0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881,
  ],
  tritanopia: [
    1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039,
  ],
};

export function parseHex(hex: string): Rgb {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

const toLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number): number => {
  const v = Math.min(1, Math.max(0, c));
  return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
};

/** Cómo vería ese color alguien con la deficiencia indicada. */
export function simulate(color: Rgb, vision: ColorVision): Rgb {
  if (vision === 'normal') return color;
  const m = MATRICES[vision];
  const lr = toLinear(color.r);
  const lg = toLinear(color.g);
  const lb = toLinear(color.b);
  const row = (i: number): number =>
    toSrgb((m[i * 3] ?? 0) * lr + (m[i * 3 + 1] ?? 0) * lg + (m[i * 3 + 2] ?? 0) * lb);
  return { r: row(0), g: row(1), b: row(2) };
}

/** Trío de coordenadas CIELAB: claridad, eje verde-rojo y eje azul-amarillo. */
export type Lab = readonly [number, number, number];

/** Convierte a CIELAB con punto blanco D65, que es donde la distancia tiene sentido perceptual. */
export function toLab(color: Rgb): Lab {
  const r = toLinear(color.r);
  const g = toLinear(color.g);
  const b = toLinear(color.b);
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t: number): number => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

const rad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Diferencia de color CIEDE2000. Un valor de 1 es el mínimo que el ojo distingue
 * en condiciones ideales; para reconocer una pieza de un vistazo en pleno juego
 * hace falta bastante más.
 */
export function deltaE2000(lab1: Lab, lab2: Lab): number {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;
  const c1 = Math.hypot(a1, b1);
  const c2 = Math.hypot(a2, b2);
  const cBar = (c1 + c2) / 2;
  const g = cBar > 0 ? 0.5 * (1 - Math.sqrt(cBar ** 7 / (cBar ** 7 + 25 ** 7))) : 0.5;
  const a1p = (1 + g) * a1;
  const a2p = (1 + g) * a2;
  const c1p = Math.hypot(a1p, b1);
  const c2p = Math.hypot(a2p, b2);
  const h1p = a1p === 0 && b1 === 0 ? 0 : ((Math.atan2(b1, a1p) * 180) / Math.PI + 360) % 360;
  const h2p = a2p === 0 && b2 === 0 ? 0 : ((Math.atan2(b2, a2p) * 180) / Math.PI + 360) % 360;

  const dLp = L2 - L1;
  const dCp = c2p - c1p;
  let dhp = 0;
  if (c1p * c2p !== 0) {
    const diff = h2p - h1p;
    dhp = Math.abs(diff) <= 180 ? diff : diff > 180 ? diff - 360 : diff + 360;
  }
  const dHp = 2 * Math.sqrt(c1p * c2p) * Math.sin(rad(dhp) / 2);

  const lBar = (L1 + L2) / 2;
  const cBarP = (c1p + c2p) / 2;
  let hBar = h1p + h2p;
  if (c1p * c2p !== 0) {
    if (Math.abs(h1p - h2p) <= 180) hBar = (h1p + h2p) / 2;
    else hBar = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;
  }
  const t =
    1 -
    0.17 * Math.cos(rad(hBar - 30)) +
    0.24 * Math.cos(rad(2 * hBar)) +
    0.32 * Math.cos(rad(3 * hBar + 6)) -
    0.2 * Math.cos(rad(4 * hBar - 63));
  const dTheta = 30 * Math.exp(-(((hBar - 275) / 25) ** 2));
  const rc = cBarP > 0 ? 2 * Math.sqrt(cBarP ** 7 / (cBarP ** 7 + 25 ** 7)) : 0;
  const sl = 1 + (0.015 * (lBar - 50) ** 2) / Math.sqrt(20 + (lBar - 50) ** 2);
  const sc = 1 + 0.045 * cBarP;
  const sh = 1 + 0.015 * cBarP * t;
  const rt = -Math.sin(rad(2 * dTheta)) * rc;

  return Math.sqrt(
    (dLp / sl) ** 2 + (dCp / sc) ** 2 + (dHp / sh) ** 2 + rt * (dCp / sc) * (dHp / sh),
  );
}

export interface PairDistance {
  readonly a: number;
  readonly b: number;
  readonly delta: number;
}

/**
 * Par de colores más parecido de la lista, tal y como los vería alguien con la
 * deficiencia indicada. Es el cuello de botella de una paleta.
 */
export function closestPair(hexColors: readonly string[], vision: ColorVision): PairDistance {
  const labs = hexColors.map((hex) => toLab(simulate(parseHex(hex), vision)));
  let worst: PairDistance = { a: 0, b: 1, delta: Number.POSITIVE_INFINITY };
  for (const [i, labI] of labs.entries()) {
    for (const [j, labJ] of labs.entries()) {
      if (j <= i) continue;
      const delta = deltaE2000(labI, labJ);
      if (delta < worst.delta) worst = { a: i, b: j, delta };
    }
  }
  return worst;
}
