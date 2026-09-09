/**
 * Frecuencia de la simulación. Es una constante del juego, no del monitor: si
 * dependiera del refresco, la misma semilla daría partidas distintas en cada
 * pantalla (ADR-0009).
 */
export const LOGIC_HZ = 240;
export const STEP_MS = 1000 / LOGIC_HZ;
const MAX_FRAME_MS = 250;

/** Bucle rAF con paso lógico fijo y acumulador (docs/research/02 §3). */
export class GameLoop {
  private rafId = 0;
  private last = 0;
  private acc = 0;
  private _running = false;
  private stepMs: number;
  private readonly raf: (cb: FrameRequestCallback) => number;
  private readonly caf: (id: number) => void;
  /** Tiempo de la última lógica+render en ms (para overlay de debug). */
  frameCostMs = 0;

  constructor(
    private readonly update: (dtMs: number) => void,
    private readonly render: (nowMs: number, alpha: number) => void,
    stepMs = STEP_MS,
    raf: (cb: FrameRequestCallback) => number = (cb) => window.requestAnimationFrame(cb),
    caf: (id: number) => void = (id) => {
      window.cancelAnimationFrame(id);
    },
  ) {
    this.stepMs = stepMs;
    this.raf = raf;
    this.caf = caf;
  }

  /**
   * Cambia el tamaño del paso lógico. Solo para reproducir una repetición con
   * el reloj que tenía la versión con la que se grabó (ADR-0009).
   */
  setStep(ms: number): void {
    if (ms <= 0 || this.stepMs === ms) return;
    this.stepMs = ms;
    this.resetClock();
  }

  get running(): boolean {
    return this._running;
  }

  start(): void {
    if (this._running) return;
    this._running = true;
    this.last = performance.now();
    this.acc = 0;
    this.rafId = this.raf(this.frame);
  }

  stop(): void {
    if (!this._running) return;
    this._running = false;
    this.caf(this.rafId);
  }

  /** Descarta el tiempo acumulado (p. ej. al volver de una pestaña oculta). */
  resetClock(): void {
    this.last = performance.now();
    this.acc = 0;
  }

  private readonly frame = (now: number): void => {
    if (!this._running) return;
    const t0 = performance.now();
    this.acc += Math.min(now - this.last, MAX_FRAME_MS);
    this.last = now;
    while (this.acc >= this.stepMs) {
      this.update(this.stepMs);
      this.acc -= this.stepMs;
    }
    this.render(now, this.acc / this.stepMs);
    this.frameCostMs = performance.now() - t0;
    this.rafId = this.raf(this.frame);
  };
}
