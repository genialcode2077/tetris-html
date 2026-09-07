import { cellsOf } from '@/core/pieces';
import type { PieceType } from '@/core/types';
import { PIECE_SYMBOLS, type Palette } from '../palette';

export interface CellStyle {
  readonly palette: Palette;
  readonly patterns: boolean;
}

/** Dibuja una celda con relieve suave. (x, y) = esquina superior-izquierda en px. */
export function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  value: number,
  style: CellStyle,
  alpha = 1,
  glow = false,
): void {
  const color = style.palette.cells[value] ?? '#888';
  const r = Math.max(2, size * 0.18);
  const inset = Math.max(1, size * 0.06);
  ctx.save();
  ctx.globalAlpha = alpha;
  if (glow && style.palette.glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 0.6;
  }
  ctx.fillStyle = color;
  roundRect(ctx, x + inset, y + inset, size - inset * 2, size - inset * 2, r);
  ctx.fill();
  ctx.shadowBlur = 0;
  // brillo superior
  const g = ctx.createLinearGradient(x, y, x, y + size);
  g.addColorStop(0, 'rgba(255,255,255,0.35)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  g.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = g;
  roundRect(ctx, x + inset, y + inset, size - inset * 2, size - inset * 2, r);
  ctx.fill();
  if (style.patterns && size >= 14) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.font = `bold ${Math.floor(size * 0.55)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(PIECE_SYMBOLS[value] ?? '', x + size / 2, y + size / 2 + 1);
  }
  ctx.restore();
}

export function drawGhostCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  value: number,
  style: CellStyle,
): void {
  const color = style.palette.cells[value] ?? '#888';
  const inset = Math.max(1, size * 0.08);
  ctx.save();
  ctx.globalAlpha = style.palette.ghostAlpha;
  ctx.fillStyle = color;
  roundRect(ctx, x + inset, y + inset, size - inset * 2, size - inset * 2, size * 0.18);
  ctx.fill();
  ctx.globalAlpha = Math.min(1, style.palette.ghostAlpha + 0.35);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, size * 0.07);
  roundRect(ctx, x + inset, y + inset, size - inset * 2, size - inset * 2, size * 0.18);
  ctx.stroke();
  ctx.restore();
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/** Dibuja una pieza centrada en un canvas de previsualización (hold/next). */
export function drawPiecePreview(
  canvas: HTMLCanvasElement,
  type: PieceType | null,
  style: CellStyle,
  dim = false,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = canvas.clientWidth || 96;
  const cssH = canvas.clientHeight || 56;
  const w = Math.round(cssW * dpr);
  const h = Math.round(cssH * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  if (!type) return;
  const cells = cellsOf(type, 0);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const c of cells) {
    minX = Math.min(minX, c.x);
    maxX = Math.max(maxX, c.x);
    minY = Math.min(minY, c.y);
    maxY = Math.max(maxY, c.y);
  }
  const pw = maxX - minX + 1;
  const ph = maxY - minY + 1;
  const size = Math.floor(Math.min(cssW / 4.5, cssH / 2.6));
  const ox = (cssW - pw * size) / 2;
  const oy = (cssH - ph * size) / 2;
  const value = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'].indexOf(type) + 1;
  for (const c of cells) {
    const px = ox + (c.x - minX) * size;
    const py = oy + (maxY - c.y) * size;
    drawCell(ctx, px, py, size, value, style, dim ? 0.35 : 1, false);
  }
}
