import { stackHeight } from '@/core/board';
import { BOARD_W, VISIBLE_H } from '@/core/constants';
import { PIECE_VALUE, cellsOf } from '@/core/pieces';
import type { GameEvent, GameState } from '@/core/types';
import { PALETTES, type Palette } from '../palette';
import { t } from '@/ui/i18n';
import { DEFAULT_RENDER_OPTIONS, type RenderOptions, type Renderer } from '../types';
import { drawCell, drawGhostCell } from './cells';
import {
  ParticleSystem,
  Shake,
  easeInQuad,
  easeOutCubic,
  type DropTrail,
  type PieceFlash,
} from './effects';

/** Filas dibujadas: 20 visibles + media fila de la 21 (Guideline). */
const ROWS_DRAWN = VISIBLE_H + 0.5;
const DANGER_ROW = 15;
const MAX_SHAKE_PX = 6;
/** A partir de aquí se considera que dibujar va lento (un cuadro a 60 por segundo son 16,7 ms). */
const FRAME_BUDGET_MS = 6;

export class CanvasRenderer implements Renderer {
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private options: RenderOptions = { ...DEFAULT_RENDER_OPTIONS };
  private palette: Palette = PALETTES.neon;
  private observer: ResizeObserver | null = null;
  private dpr = 1;
  private _cellSize = 24;
  private lastNow = 0;
  private readonly particles = new ParticleSystem();
  private readonly shake = new Shake();
  private pieceFlashes: PieceFlash[] = [];
  private trails: DropTrail[] = [];
  private levelPulseStart = -1;
  private hitStopUntil = 0;

  get cellSize(): number {
    return this._cellSize;
  }

  get element(): HTMLCanvasElement | null {
    return this.canvas;
  }

  init(container: HTMLElement, options: RenderOptions): void {
    this.container = container;
    this.options = { ...options };
    this.palette = PALETTES[this.options.palette];
    const canvas = document.createElement('canvas');
    canvas.className = 'board-canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', t('a11y.board'));
    container.appendChild(canvas);
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.observer = new ResizeObserver(() => {
      this.resize();
    });
    this.observer.observe(container);
    this.resize();
  }

  setOptions(options: Partial<RenderOptions>): void {
    this.options = { ...this.options, ...options };
    this.palette = PALETTES[this.options.palette];
    if (!this.options.particles) this.particles.clear();
    if (!this.options.shake || this.options.reducedMotion) this.shake.clear();
  }

  resize(): void {
    const container = this.container;
    const canvas = this.canvas;
    const ctx = this.ctx;
    if (!container || !canvas || !ctx) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    const cell = Math.max(8, Math.floor(Math.min(w / BOARD_W, h / ROWS_DRAWN)));
    this._cellSize = cell;
    const cssW = cell * BOARD_W;
    const cssH = Math.round(cell * ROWS_DRAWN);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.round(cssW * this.dpr);
    canvas.height = Math.round(cssH * this.dpr);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  render(state: Readonly<GameState>, nowMs: number): void {
    const ctx = this.ctx;
    const canvas = this.canvas;
    if (!ctx || !canvas) return;
    const started = performance.now();
    const dt = this.lastNow === 0 ? 16 : Math.min(nowMs - this.lastNow, 100);
    this.lastNow = nowMs;
    if (nowMs < this.hitStopUntil) return;

    const cell = this._cellSize;
    const W = cell * BOARD_W;
    const H = Math.round(cell * ROWS_DRAWN);
    const top = (y: number): number => H - (y + 1) * cell;
    const style = { palette: this.palette, patterns: this.options.patterns };
    const motion = !this.options.reducedMotion;

    if (motion && this.options.shake) {
      this.shake.update(dt, MAX_SHAKE_PX);
      canvas.style.transform = `translate(${this.shake.offsetX.toFixed(1)}px, ${this.shake.offsetY.toFixed(1)}px) rotate(${this.shake.angle.toFixed(4)}rad)`;
    } else if (canvas.style.transform !== '') {
      canvas.style.transform = '';
    }

    // fondo
    ctx.fillStyle = this.palette.boardBg;
    ctx.fillRect(0, 0, W, H);
    if (this.levelPulseStart >= 0 && motion) {
      const t = (nowMs - this.levelPulseStart) / 600;
      if (t < 1) {
        ctx.fillStyle = `rgba(255,255,255,${(0.18 * (1 - t)).toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);
      } else this.levelPulseStart = -1;
    }
    if (this.options.grid) {
      ctx.strokeStyle = this.palette.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 1; x < BOARD_W; x++) {
        ctx.moveTo(x * cell + 0.5, 0);
        ctx.lineTo(x * cell + 0.5, H);
      }
      for (let y = 0; y <= VISIBLE_H; y++) {
        const py = top(y) + cell + 0.5;
        ctx.moveTo(0, py);
        ctx.lineTo(W, py);
      }
      ctx.stroke();
    }

    // celdas fijadas
    const board = state.board;
    const clearingRows = state.clearing ? new Set(state.clearing.rows) : null;
    for (let y = 0; y <= VISIBLE_H; y++) {
      for (let x = 0; x < BOARD_W; x++) {
        const v = board[y * BOARD_W + x] ?? 0;
        if (v === 0) continue;
        drawCell(ctx, x * cell, top(y), cell, v, style);
      }
    }

    // animación de limpieza
    if (state.clearing && clearingRows) {
      const delay = Math.max(1, state.clearing.elapsedMs > 0 ? 200 : 200);
      const t = Math.min(1, state.clearing.elapsedMs / delay);
      for (const y of clearingRows) {
        const py = top(y);
        if (t < 0.4) {
          ctx.fillStyle = `rgba(255,255,255,${(0.9 * (1 - t / 0.4)).toFixed(3)})`;
          ctx.fillRect(0, py, W, cell);
        } else {
          const k = easeInQuad((t - 0.4) / 0.6);
          const cw = W * k;
          ctx.fillStyle = this.palette.boardBg;
          ctx.fillRect(W / 2 - cw / 2, py, cw, cell);
        }
      }
    }

    // fantasma y pieza activa
    const p = state.active;
    if (p && (state.phase === 'falling' || state.phase === 'locking')) {
      const value = PIECE_VALUE[p.type];
      const cells = cellsOf(p.type, p.rotation);
      if (this.options.ghost && state.ghostY !== p.y) {
        for (const c of cells) {
          const y = state.ghostY + c.y;
          if (y > VISIBLE_H) continue;
          drawGhostCell(ctx, (p.x + c.x) * cell, top(y), cell, value, style);
        }
      }
      const lockAlpha =
        state.phase === 'locking' ? 0.75 + 0.25 * Math.abs(Math.sin(nowMs / 90)) : 1;
      for (const c of cells) {
        const y = p.y + c.y;
        if (y > VISIBLE_H) continue;
        drawCell(ctx, (p.x + c.x) * cell, top(y), cell, value, style, lockAlpha, true);
      }
    }

    // efectos
    if (motion) {
      this.trails = this.trails.filter((tr) => nowMs - tr.startMs < tr.durationMs);
      for (const tr of this.trails) {
        const t = (nowMs - tr.startMs) / tr.durationMs;
        ctx.globalAlpha = 0.35 * (1 - easeOutCubic(t));
        const g = ctx.createLinearGradient(0, top(tr.fromY), 0, top(tr.toY));
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(1, tr.color);
        ctx.fillStyle = g;
        ctx.fillRect(tr.x * cell, top(tr.fromY), tr.width * cell, top(tr.toY) - top(tr.fromY));
        ctx.globalAlpha = 1;
      }
      this.pieceFlashes = this.pieceFlashes.filter((f) => nowMs - f.startMs < f.durationMs);
      for (const f of this.pieceFlashes) {
        const t = (nowMs - f.startMs) / f.durationMs;
        ctx.fillStyle = `rgba(255,255,255,${(0.7 * (1 - t)).toFixed(3)})`;
        for (const c of f.cells) {
          if (c.y > VISIBLE_H) continue;
          ctx.fillRect(c.x * cell + 1, top(c.y) + 1, cell - 2, cell - 2);
        }
      }
      if (this.options.particles) {
        this.particles.update(dt);
        this.particles.draw(ctx);
      }
    }

    // peligro
    const height = stackHeight(board);
    if (height >= DANGER_ROW && state.phase !== 'gameover') {
      const pulse = motion ? 0.12 + 0.12 * (0.5 + 0.5 * Math.sin(nowMs / 160)) : 0.15;
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.8);
      g.addColorStop(0, 'rgba(255,40,60,0)');
      g.addColorStop(1, `rgba(255,40,60,${pulse.toFixed(3)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    // borde
    ctx.strokeStyle = this.palette.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    // Si dibujar sale caro de forma sostenida, se reducen las partículas antes de
    // perder cuadros (docs/research/12).
    this.particles.reportFrameCost(performance.now() - started, FRAME_BUDGET_MS);
  }

  /** Presupuesto de partículas vigente; se consulta desde las pruebas. */
  get particleBudget(): number {
    return this.particles.currentBudget;
  }

  /** Devuelve el presupuesto al máximo al empezar una partida. */
  resetBudget(): void {
    this.particles.resetBudget();
  }

  effect(event: GameEvent, state: Readonly<GameState>): void {
    const motion = !this.options.reducedMotion;
    const cell = this._cellSize;
    const H = Math.round(cell * ROWS_DRAWN);
    const now = performance.now();
    switch (event.type) {
      case 'hardDrop': {
        const p = state.active;
        if (!motion) break;
        if (this.options.shake) this.shake.add(0.2 + Math.min(0.2, event.distance * 0.01));
        if (p && event.distance > 0) {
          const cells = cellsOf(p.type, p.rotation);
          let minX = Infinity;
          let maxX = -Infinity;
          let minY = Infinity;
          for (const c of cells) {
            minX = Math.min(minX, c.x);
            maxX = Math.max(maxX, c.x);
            minY = Math.min(minY, c.y);
          }
          this.trails.push({
            x: p.x + minX,
            width: maxX - minX + 1,
            fromY: Math.min(VISIBLE_H, p.y + minY + event.distance + 2),
            toY: p.y + minY - 1,
            startMs: now,
            durationMs: 160,
            color: this.palette.cells[PIECE_VALUE[p.type]] ?? '#fff',
          });
        }
        break;
      }
      case 'lock': {
        if (!motion) break;
        const p = event.piece;
        this.pieceFlashes.push({
          cells: cellsOf(p.type, p.rotation).map((c) => ({ x: p.x + c.x, y: p.y + c.y })),
          startMs: now,
          durationMs: 90,
        });
        break;
      }
      case 'lineClear': {
        if (!motion) break;
        if (this.options.shake)
          this.shake.add(event.count >= 4 || event.tspin !== 'none' ? 0.35 : 0.12);
        if (this.options.particles) {
          for (const y of event.rows) {
            for (let x = 0; x < BOARD_W; x++) {
              const v = state.board[y * BOARD_W + x] ?? 0;
              const color = this.palette.cells[v] ?? '#fff';
              this.particles.burst(
                x * cell + cell / 2,
                H - (y + 0.5) * cell,
                event.count >= 4 ? 4 : 2,
                color,
                event.count >= 4 ? 260 : 170,
                cell * 0.22,
              );
            }
          }
        }
        if (event.perfectClear || event.count === 4) this.hitStopUntil = now + 50;
        break;
      }
      case 'levelUp':
        this.levelPulseStart = now;
        break;
      case 'gameOver':
        if (motion && this.options.shake) this.shake.add(0.6);
        break;
      default:
        break;
    }
  }

  dispose(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.canvas?.remove();
    this.canvas = null;
    this.ctx = null;
    this.container = null;
    this.particles.clear();
    this.shake.clear();
  }
}
