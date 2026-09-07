/** Efectos visuales no deterministas (solo render): partículas, shake, flashes. */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export class ParticleSystem {
  readonly particles: Particle[] = [];
  private readonly max: number;

  constructor(max = 600) {
    this.max = max;
  }

  burst(x: number, y: number, count: number, color: string, speed: number, size: number): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.max) return;
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      const life = 400 + Math.random() * 300;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - speed * 0.6,
        life,
        maxLife: life,
        size: size * (0.5 + Math.random() * 0.8),
        color,
      });
    }
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p) continue;
      p.life -= dtMs;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += 900 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const t = p.life / p.maxLife;
      ctx.globalAlpha = Math.max(0, t);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    this.particles.length = 0;
  }
}

/** Screen shake basado en "trauma" (docs/research/04 §5). */
export class Shake {
  private trauma = 0;
  offsetX = 0;
  offsetY = 0;
  angle = 0;

  add(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  update(dtMs: number, maxOffset: number): void {
    if (this.trauma <= 0) {
      this.offsetX = 0;
      this.offsetY = 0;
      this.angle = 0;
      return;
    }
    this.trauma = Math.max(0, this.trauma - (dtMs / 1000) * 1.5);
    const s = this.trauma * this.trauma;
    this.offsetX = (Math.random() * 2 - 1) * maxOffset * s;
    this.offsetY = (Math.random() * 2 - 1) * maxOffset * s;
    this.angle = (Math.random() * 2 - 1) * 0.5 * (Math.PI / 180) * s;
  }

  clear(): void {
    this.trauma = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.angle = 0;
  }
}

export interface Flash {
  rows: readonly number[];
  startMs: number;
  durationMs: number;
}

export interface PieceFlash {
  cells: readonly { x: number; y: number }[];
  startMs: number;
  durationMs: number;
}

export interface DropTrail {
  x: number;
  width: number;
  fromY: number;
  toY: number;
  startMs: number;
  durationMs: number;
  color: string;
}

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
export const easeInQuad = (t: number): number => t * t;
