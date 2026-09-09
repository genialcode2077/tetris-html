import { describe, expect, it } from 'vitest';
import { GameLoop, LOGIC_HZ, STEP_MS } from './loop';

/** Bucle con reloj falso: los cuadros se entregan a mano. */
function harness(stepMs = STEP_MS) {
  const pending: FrameRequestCallback[] = [];
  const updates: number[] = [];
  const renders: { now: number; alpha: number }[] = [];
  const orden: string[] = [];
  const loop = new GameLoop(
    (dt) => {
      updates.push(dt);
      orden.push('update');
    },
    (now, alpha) => {
      renders.push({ now, alpha });
      orden.push('render');
    },
    stepMs,
    (cb) => {
      pending.push(cb);
      return pending.length;
    },
    () => {
      pending.length = 0;
    },
  );
  let base = 0;
  /** Arranca el bucle y alinea el reloj falso con el suyo. */
  const start = (): void => {
    loop.start();
    base = performance.now();
    loop.resetClock();
  };
  /** Vuelve a alinear el reloj falso tras un reinicio del bucle. */
  const resync = (): void => {
    loop.resetClock();
    base = performance.now();
  };
  /** Entrega un cuadro a los milisegundos indicados desde el arranque. */
  const frame = (offsetMs: number): void => {
    const due = pending.splice(0, pending.length);
    for (const cb of due) cb(base + offsetMs);
  };
  return { loop, start, resync, frame, updates, renders, orden, pending };
}

describe('bucle de juego', () => {
  it('avanza siempre con el mismo paso, pase lo que pase con el reloj', () => {
    const { start, frame, updates } = harness();
    start();
    let t = 0;
    for (const dt of [16.7, 8.1, 33.4, 4.2, 21.9]) {
      t += dt;
      frame(t);
    }
    expect(updates.every((d) => d === STEP_MS)).toBe(true);
  });

  it('no pierde tiempo: lo que sobra de un cuadro se gasta en el siguiente', () => {
    const { start, frame, updates } = harness();
    start();
    // Cuatro cuadros de 10 ms son 40 ms, que a 8,33 ms el paso son cuatro
    // pasos enteros: lo que sobra de cada cuadro se arrastra al siguiente.
    for (let i = 1; i <= 4; i++) frame(i * 10);
    expect(updates.length).toBe(Math.floor(40 / STEP_MS));
  });

  it('la lógica corre antes de dibujar, y se dibuja una vez por cuadro', () => {
    const { start, frame, orden, renders } = harness();
    start();
    frame(16.7);
    const pasos = Math.floor(16.7 / STEP_MS);
    expect(orden).toEqual([...Array<string>(pasos).fill('update'), 'render']);
    expect(renders.length).toBe(1);
  });

  it('el desfase que se pasa al dibujado dice cuánto falta para el siguiente paso', () => {
    const { start, frame, renders } = harness();
    start();
    frame(10);
    // Lo que sobra tras los pasos enteros, en fracción de paso.
    expect(renders[0]?.alpha).toBeCloseTo(((10 % STEP_MS) / STEP_MS) % 1, 3);
    expect(renders[0]?.alpha).toBeGreaterThanOrEqual(0);
    expect(renders[0]?.alpha).toBeLessThan(1);
  });

  it('un parón largo no se recupera de golpe', () => {
    const { start, frame, updates } = harness();
    start();
    // Diez segundos con la pestaña detenida: sin tope se ejecutarían 1200 pasos.
    frame(10_000);
    expect(updates.length).toBeLessThanOrEqual(Math.ceil(250 / STEP_MS));
  });

  it('reiniciar el reloj descarta lo acumulado', () => {
    const { start, resync, frame, updates } = harness();
    start();
    frame(40);
    updates.length = 0;
    // Tras reiniciar, el tiempo anterior ya no cuenta.
    resync();
    frame(4);
    expect(updates.length).toBe(0);
  });

  it('parar deja de pedir cuadros y volver a arrancar no duplica el bucle', () => {
    const { loop, start, frame, updates, pending } = harness();
    start();
    expect(loop.running).toBe(true);
    loop.start(); // idempotente
    loop.stop();
    expect(loop.running).toBe(false);
    frame(9999);
    expect(updates.length).toBe(0);
    expect(pending.length).toBe(0);
  });
});

/**
 * Presupuesto de latencia: cuánto espera una pulsación desde que entra en la
 * cola hasta que la consume un paso lógico (docs/research/18).
 */
describe('presupuesto de latencia', () => {
  /** Simula un refresco dado y mide la espera de una pulsación. */
  function medir(hz: number): { sinLogica: number; media: number; peor: number } {
    const dt = 1000 / hz;
    const CUADROS = 1200;
    const { start, frame, updates } = harness();
    start();
    const conLogica: number[] = [];
    for (let i = 1; i <= CUADROS; i++) {
      const antes = updates.length;
      frame(i * dt);
      if (updates.length > antes) conLogica.push(i * dt);
    }
    // Una pulsación que llega a mitad de cada intervalo espera al primer
    // cuadro posterior que ejecute lógica.
    let suma = 0;
    let peor = 0;
    let n = 0;
    for (let i = 1; i < CUADROS - 20; i++) {
      const llega = (i + 0.5) * dt;
      const atendida = conLogica.find((x) => x >= llega);
      if (atendida === undefined) break;
      const espera = atendida - llega;
      suma += espera;
      if (espera > peor) peor = espera;
      n++;
    }
    return { sinLogica: 1 - conLogica.length / CUADROS, media: suma / n, peor };
  }

  it('mientras la pantalla no adelante a la lógica, todos los cuadros la ejecutan', () => {
    for (const hz of [30, 60, 100, LOGIC_HZ]) {
      // Un cuadro suelto de margen por el redondeo del acumulador.
      expect(medir(hz).sinLogica, `${hz} Hz`).toBeLessThan(0.002);
    }
  });

  it('ahí la espera no pasa de un intervalo de cuadro, que es el mínimo posible', () => {
    for (const hz of [30, 60, 100, LOGIC_HZ]) {
      const dt = 1000 / hz;
      expect(medir(hz).peor, `${hz} Hz`).toBeLessThanOrEqual(dt * 1.01);
    }
  });

  it('la espera media nunca llega a un cuadro entero', () => {
    for (const hz of [30, 60, 100, 120, 144, 165, 240]) {
      const dt = 1000 / hz;
      expect(medir(hz).media, `${hz} Hz`).toBeLessThanOrEqual(dt * 1.01);
    }
  });

  it('las pantallas rápidas de uso corriente ya no dejan cuadros sin lógica', () => {
    // Era el punto flojo de la frecuencia anterior (F-033): a 120 Hz de lógica,
    // 144 Hz dejaba fuera el 17 % de los cuadros y 240 Hz la mitad.
    for (const hz of [144, 165, 240]) {
      expect(medir(hz).sinLogica, `${hz} Hz`).toBeLessThan(0.002);
      expect(medir(hz).peor, `${hz} Hz`).toBeLessThanOrEqual((1000 / hz) * 1.01);
    }
  });

  it('por encima de la frecuencia lógica el problema reaparece, como es aritmético', () => {
    // Con 240 pasos por segundo no se pueden dar 360: es matemática, no un
    // fallo. Queda fijado para que se vea si alguien mueve la frecuencia.
    const r360 = medir(360);
    expect(r360.sinLogica).toBeGreaterThan(0.1);
    expect(r360.peor).toBeGreaterThan(1000 / 360);
  });

  it('el remedio conocido funciona: con el paso igual al cuadro no queda ninguno sin lógica', () => {
    const dt = 1000 / 144;
    const { start, frame, updates } = harness(dt);
    start();
    let sin = 0;
    for (let i = 1; i <= 500; i++) {
      const antes = updates.length;
      frame(i * dt);
      if (updates.length === antes) sin++;
    }
    // A lo sumo el primero, por el desfase de arranque del reloj.
    expect(sin).toBeLessThanOrEqual(1);
  });
});

describe('resistencia a errores', () => {
  /** Bucle cuyo dibujado falla las veces indicadas. */
  function conFallos(veces: number) {
    const pending: FrameRequestCallback[] = [];
    let renders = 0;
    let updates = 0;
    const caidas: unknown[] = [];
    const loop = new GameLoop(
      () => {
        updates++;
      },
      () => {
        renders++;
        if (renders <= veces) throw new Error(`fallo ${renders}`);
      },
      STEP_MS,
      (cb) => {
        pending.push(cb);
        return pending.length;
      },
      () => {
        pending.length = 0;
      },
    );
    loop.onError = (e) => caidas.push(e);
    let base = 0;
    const start = (): void => {
      loop.start();
      base = performance.now();
      loop.resetClock();
    };
    const frame = (offsetMs: number): void => {
      const due = pending.splice(0, pending.length);
      for (const cb of due) cb(base + offsetMs);
    };
    return {
      loop,
      start,
      frame,
      caidas,
      get updates() {
        return updates;
      },
      get pending() {
        return pending.length;
      },
    };
  }

  it('un fallo suelto no mata la partida: el bucle sigue', () => {
    const h = conFallos(1);
    h.start();
    h.frame(20); // este falla
    expect(h.caidas).toHaveLength(0);
    expect(h.pending).toBe(1); // ha pedido el siguiente cuadro
    const antes = h.updates;
    h.frame(40); // este ya va bien
    expect(h.updates).toBeGreaterThan(antes);
    expect(h.loop.running).toBe(true);
  });

  it('tres fallos seguidos detienen el bucle y lo avisan', () => {
    const h = conFallos(99);
    h.start();
    h.frame(20);
    h.frame(40);
    expect(h.loop.running).toBe(true);
    h.frame(60);
    expect(h.loop.running).toBe(false);
    expect(h.caidas).toHaveLength(1);
    expect((h.caidas[0] as Error).message).toContain('fallo');
    // Y deja de pedir cuadros.
    expect(h.pending).toBe(0);
  });

  it('un cuadro bueno borra la cuenta de fallos anteriores', () => {
    const pending: FrameRequestCallback[] = [];
    let n = 0;
    const caidas: unknown[] = [];
    // Falla uno sí y uno no: nunca llega a tres seguidos.
    const loop = new GameLoop(
      () => {},
      () => {
        n++;
        if (n % 2 === 1) throw new Error('intermitente');
      },
      STEP_MS,
      (cb) => {
        pending.push(cb);
        return pending.length;
      },
      () => {
        pending.length = 0;
      },
    );
    loop.onError = (e) => caidas.push(e);
    loop.start();
    const base = performance.now();
    loop.resetClock();
    for (let i = 1; i <= 12; i++) {
      const due = pending.splice(0, pending.length);
      for (const cb of due) cb(base + i * 20);
    }
    expect(caidas).toHaveLength(0);
    expect(loop.running).toBe(true);
  });
});
