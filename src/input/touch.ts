import type { InputAction } from '@/game/handling';
import type { ActionHandler } from './keyboard';

export interface TouchOptions {
  /** Píxeles por celda (para el arrastre horizontal). */
  cellSize: number;
  /** true: tap en cualquier sitio rota horario; false: mitad izquierda antihorario. */
  tapAlwaysCw: boolean;
}

const TAP_MAX_MS = 220;
const TAP_MAX_PX = 12;
const HOLD_SWIPE_PX = 40;
const HARD_DROP_MIN_PX = 60;
const HARD_DROP_MIN_VELOCITY = 1.2; // px/ms
const SOFT_DROP_START_CELLS = 0.6;

/** Gestos sobre el tablero (docs/research/04 §3). */
export class TouchInput {
  private options: TouchOptions;
  private pointerId: number | null = null;
  private startX = 0;
  private startY = 0;
  private lastX = 0;
  private startTime = 0;
  private accX = 0;
  private softDropping = false;
  private moved = false;
  private attached = false;

  constructor(
    private readonly element: HTMLElement,
    private readonly onAction: ActionHandler,
    options: TouchOptions,
  ) {
    this.options = { ...options };
  }

  setOptions(options: Partial<TouchOptions>): void {
    this.options = { ...this.options, ...options };
  }

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    const el = this.element;
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointercancel', this.onCancel);
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    const el = this.element;
    el.removeEventListener('pointerdown', this.onDown);
    el.removeEventListener('pointermove', this.onMove);
    el.removeEventListener('pointerup', this.onUp);
    el.removeEventListener('pointercancel', this.onCancel);
    this.endSoftDrop();
  }

  private tap(action: InputAction): void {
    this.onAction(action, true);
    this.onAction(action, false);
  }

  private endSoftDrop(): void {
    if (this.softDropping) {
      this.softDropping = false;
      this.onAction('softDrop', false);
    }
  }

  private readonly onDown = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (this.pointerId !== null) return;
    this.pointerId = e.pointerId;
    this.element.setPointerCapture(e.pointerId);
    this.startX = this.lastX = e.clientX;
    this.startY = e.clientY;
    this.startTime = e.timeStamp;
    this.accX = 0;
    this.moved = false;
    e.preventDefault();
  };

  private readonly onMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.startY;
    this.lastX = e.clientX;
    const cell = Math.max(8, this.options.cellSize);
    if (!this.softDropping) {
      this.accX += dx;
      while (this.accX >= cell) {
        this.accX -= cell;
        this.moved = true;
        this.tap('right');
      }
      while (this.accX <= -cell) {
        this.accX += cell;
        this.moved = true;
        this.tap('left');
      }
    }
    const horizontal = Math.abs(e.clientX - this.startX);
    if (!this.softDropping && dy > cell * SOFT_DROP_START_CELLS && dy > horizontal * 1.5) {
      // arrastre lento hacia abajo → soft drop (el flick se decide al soltar)
      const elapsed = e.timeStamp - this.startTime;
      if (dy / Math.max(1, elapsed) < HARD_DROP_MIN_VELOCITY) {
        this.softDropping = true;
        this.moved = true;
        this.onAction('softDrop', true);
      }
    }
    e.preventDefault();
  };

  private readonly onUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    const elapsed = Math.max(1, e.timeStamp - this.startTime);
    const wasSoft = this.softDropping;
    this.endSoftDrop();
    const velocityY = dy / elapsed;
    if (
      !wasSoft &&
      dy > HARD_DROP_MIN_PX &&
      velocityY > HARD_DROP_MIN_VELOCITY &&
      Math.abs(dx) < dy
    ) {
      this.tap('hardDrop');
      return;
    }
    if (dy < -HOLD_SWIPE_PX && Math.abs(dx) < -dy) {
      this.tap('hold');
      return;
    }
    if (!this.moved && elapsed < TAP_MAX_MS && Math.hypot(dx, dy) < TAP_MAX_PX) {
      const rect = this.element.getBoundingClientRect();
      const leftHalf = e.clientX < rect.left + rect.width / 2;
      this.tap(!this.options.tapAlwaysCw && leftHalf ? 'ccw' : 'cw');
    }
  };

  private readonly onCancel = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.endSoftDrop();
  };
}
