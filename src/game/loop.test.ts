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
    expect(orden).toEqual(['update', 'update', 'render']);
    expect(renders.length).toBe(1);
  });

  it('el desfase que se pasa al dibujado dice cuánto falta para el siguiente paso', () => {
    const { start, frame, renders } = harness();
    start();
    frame(10);
    // 10 ms dan un paso y sobran 1,67, es decir un quinto de paso.
    expect(renders[0]?.alpha).toBeCloseTo((10 - STEP_MS) / STEP_MS, 3);
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

  it('deja constancia del punto flojo: por encima de la frecuencia lógica hay cuadros sin lógica', () => {
    // No se corrige sin subir la frecuencia lógica, y eso invalidaría las
    // repeticiones guardadas (F-033, informe 18). La prueba fija la magnitud
    // para que se vea si alguien la cambia.
    const r144 = medir(144);
    expect(r144.sinLogica).toBeGreaterThan(0.1);
    // El peor caso pasa de un intervalo de cuadro, justo lo que no ocurre por
    // debajo de la frecuencia lógica.
    expect(r144.peor).toBeGreaterThan(1000 / 144);
    expect(medir(240).sinLogica).toBeGreaterThan(0.45);
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
