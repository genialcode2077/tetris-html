import { RenderPipeline, WebGPURenderer } from 'three/webgpu';
import { mrt, output, pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { stackHeight } from '@/core/board';
import { BOARD_W, VISIBLE_H } from '@/core/constants';
import { PIECE_VALUE, cellsOf } from '@/core/pieces';
import type { GameEvent, GameState } from '@/core/types';
import { t } from '@/ui/i18n';
import { PALETTES, type Palette } from '../palette';
import { DEFAULT_RENDER_OPTIONS, type RenderOptions, type Renderer } from '../types';
import {
  MAX_PARTICLES,
  ROWS_DRAWN,
  buildScene,
  cellPosition,
  dummy,
  fitCamera,
  scratchColor,
  scratchVector,
  type SceneParts,
} from './scene';

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  colorHex: number;
}

const MAX_SHAKE = 0.55;
const DANGER_ROW = 15;

/**
 * Renderer 3D. Solo lee el estado del juego; ninguna regla depende de él (ADR-0008).
 * Usa WebGPU cuando está disponible y cae a WebGL2 automáticamente.
 */
export class ThreeRenderer implements Renderer {
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private renderer: WebGPURenderer | null = null;
  private post: RenderPipeline | null = null;
  private parts: SceneParts | null = null;
  private observer: ResizeObserver | null = null;
  private options: RenderOptions = { ...DEFAULT_RENDER_OPTIONS };
  private palette: Palette = PALETTES.neon;
  private ready = false;
  private disposed = false;
  private lastNow = 0;
  private trauma = 0;
  private levelPulse = 0;
  private dangerPulse = 0;
  private readonly particles: Particle[] = [];
  /** Aviso al anfitrión cuando el dispositivo no puede con el modo 3D. */
  onFallback: ((reason: string) => void) | null = null;
  private slowFrames = 0;
  private postError: string | null = null;

  get isReady(): boolean {
    return this.ready;
  }

  /** Estado interno, para diagnóstico y pruebas automáticas. */
  get diagnostics(): { ready: boolean; bloom: boolean; postError: string | null; backend: string } {
    const backend = this.renderer?.backend.constructor.name ?? 'desconocido';
    return { ready: this.ready, bloom: this.post !== null, postError: this.postError, backend };
  }

  init(container: HTMLElement, options: RenderOptions): void {
    this.container = container;
    this.options = { ...options };
    this.palette = PALETTES[this.options.palette];

    const canvas = document.createElement('canvas');
    canvas.className = 'board-canvas board-canvas-3d';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', t('a11y.board3d'));
    container.appendChild(canvas);
    this.canvas = canvas;

    const parts = buildScene(this.palette);
    this.parts = parts;

    const renderer = new WebGPURenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer = renderer;

    void renderer
      .init()
      .then(() => {
        if (this.disposed) return;
        this.setupPostProcessing();
        this.ready = true;
        this.resize();
      })
      .catch((error: unknown) => {
        this.onFallback?.(`no se pudo iniciar el renderer 3D: ${String(error)}`);
      });

    this.observer = new ResizeObserver(() => {
      this.resize();
    });
    this.observer.observe(container);
  }

  private setupPostProcessing(): void {
    const renderer = this.renderer;
    const parts = this.parts;
    if (!renderer || !parts) return;
    if (!this.options.particles || this.options.reducedMotion || !this.palette.glow) {
      this.post = null;
      return;
    }
    try {
      const scenePass = pass(parts.scene, parts.camera);
      scenePass.setMRT(mrt({ output }));
      const color = scenePass.getTextureNode('output');
      const post = new RenderPipeline(renderer);
      post.outputNode = color.add(bloom(color, 0.55, 0.35, 0.42));
      this.post = post;
    } catch (error) {
      // Sin post-proceso el juego sigue siendo perfectamente jugable.
      this.post = null;
      this.postError = String(error);
    }
  }

  setOptions(options: Partial<RenderOptions>): void {
    const previousGlow = this.palette.glow;
    const previousReduced = this.options.reducedMotion;
    const previousParticles = this.options.particles;
    this.options = { ...this.options, ...options };
    this.palette = PALETTES[this.options.palette];
    const parts = this.parts;
    if (parts) {
      parts.scene.background = scratchColor.set(this.palette.boardBg).clone();
      parts.glow.value = this.palette.glow ? 0.85 : 0.15;
      const cellMaterial = parts.cells.material;
      if (!Array.isArray(cellMaterial) && 'emissive' in cellMaterial) {
        (cellMaterial as { emissive: { setHex(v: number): void } }).emissive.setHex(
          this.palette.glow ? 0x121820 : 0x000000,
        );
      }
      const gridMaterial = parts.grid.material;
      if (!Array.isArray(gridMaterial) && 'color' in gridMaterial) {
        (gridMaterial as { color: { set(v: string): void } }).color.set(this.palette.gridSolid);
      }
      const wellMaterial = parts.well.material;
      if (!Array.isArray(wellMaterial) && 'color' in wellMaterial) {
        (wellMaterial as { color: { set(v: string): void } }).color.set(this.palette.boardBg);
      }
    }
    if (
      this.ready &&
      (previousGlow !== this.palette.glow ||
        previousReduced !== this.options.reducedMotion ||
        previousParticles !== this.options.particles)
    ) {
      this.setupPostProcessing();
    }
    if (this.options.reducedMotion) {
      this.trauma = 0;
      this.particles.length = 0;
    }
  }

  resize(): void {
    const container = this.container;
    const renderer = this.renderer;
    const parts = this.parts;
    if (!container || !renderer || !parts) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    if (this.canvas) {
      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;
    }
    fitCamera(parts.camera, w, h);
  }

  render(state: Readonly<GameState>, nowMs: number): void {
    const renderer = this.renderer;
    const parts = this.parts;
    if (!this.ready || !renderer || !parts) return;
    const dt = this.lastNow === 0 ? 16 : Math.min(nowMs - this.lastNow, 100);
    this.lastNow = nowMs;

    this.updateCells(state);
    this.updateGhost(state);
    this.updateParticles(dt);
    this.updateCamera(dt, nowMs, state);

    const t0 = performance.now();
    try {
      if (this.post) this.post.render();
      else renderer.render(parts.scene, parts.camera);
    } catch (error) {
      this.onFallback?.(`fallo al dibujar en 3D: ${String(error)}`);
      return;
    }

    // Si el post-proceso se vuelve caro de forma sostenida, se desactiva solo.
    if (performance.now() - t0 > 12) {
      this.slowFrames++;
      if (this.slowFrames > 90 && this.post) {
        this.post = null;
        this.slowFrames = 0;
      }
    } else if (this.slowFrames > 0) {
      this.slowFrames--;
    }
  }

  private updateCells(state: Readonly<GameState>): void {
    const parts = this.parts;
    if (!parts) return;
    const mesh = parts.cells;
    const board = state.board;
    const clearing = state.clearing;
    const clearingRows = clearing ? new Set(clearing.rows) : null;
    const clearProgress = clearing ? Math.min(1, clearing.elapsedMs / 200) : 0;
    let i = 0;

    for (let y = 0; y < ROWS_DRAWN; y++) {
      const rowClearing = clearingRows?.has(y) ?? false;
      for (let x = 0; x < BOARD_W; x++) {
        const value = board[y * BOARD_W + x] ?? 0;
        if (value === 0) continue;
        cellPosition(x, y, scratchVector);
        dummy.position.copy(scratchVector);
        dummy.position.z = -0.12;
        if (rowClearing) {
          // La fila se encoge y se aleja mientras desaparece.
          const s = Math.max(0.001, 1 - clearProgress);
          dummy.scale.setScalar(s);
          dummy.position.z = -clearProgress * 3;
          dummy.rotation.z = clearProgress * 1.2;
        } else {
          dummy.scale.setScalar(1);
          dummy.rotation.set(0, 0, 0);
        }
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        scratchColor.set(this.palette.cells[value] ?? '#888888');
        if (this.palette.glow) scratchColor.multiplyScalar(1.2);
        mesh.setColorAt(i, scratchColor);
        i++;
      }
    }

    const piece = state.active;
    if (piece && (state.phase === 'falling' || state.phase === 'locking')) {
      const value = PIECE_VALUE[piece.type];
      const locking = state.phase === 'locking';
      for (const c of cellsOf(piece.type, piece.rotation)) {
        const y = piece.y + c.y;
        if (y >= ROWS_DRAWN) continue;
        cellPosition(piece.x + c.x, y, scratchVector);
        dummy.position.copy(scratchVector);
        dummy.position.z = 0.16;
        dummy.scale.setScalar(locking ? 1.04 : 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        scratchColor.set(this.palette.cells[value] ?? '#ffffff');
        if (this.palette.glow) scratchColor.multiplyScalar(locking ? 1.7 : 1.5);
        else if (locking) scratchColor.offsetHSL(0, 0, 0.12);
        mesh.setColorAt(i, scratchColor);
        i++;
      }
    }

    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  private updateGhost(state: Readonly<GameState>): void {
    const parts = this.parts;
    if (!parts) return;
    const mesh = parts.ghost;
    const piece = state.active;
    if (!this.options.ghost || !piece || state.ghostY === piece.y) {
      mesh.count = 0;
      return;
    }
    let i = 0;
    const value = PIECE_VALUE[piece.type];
    for (const c of cellsOf(piece.type, piece.rotation)) {
      const y = state.ghostY + c.y;
      if (y >= ROWS_DRAWN) continue;
      cellPosition(piece.x + c.x, y, scratchVector);
      dummy.position.copy(scratchVector);
      dummy.scale.setScalar(0.92);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, scratchColor.set(this.palette.cells[value] ?? '#ffffff'));
      i++;
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  private updateParticles(dtMs: number): void {
    const parts = this.parts;
    if (!parts) return;
    const mesh = parts.particles;
    if (this.particles.length === 0) {
      mesh.count = 0;
      return;
    }
    const dt = dtMs / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p) continue;
      p.life -= dtMs;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy -= 22 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
    }
    let i = 0;
    for (const p of this.particles) {
      const t = p.life / p.maxLife;
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.setScalar(Math.max(0.01, t * 1.4));
      dummy.rotation.set(p.x, p.y, p.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, scratchColor.setHex(p.colorHex));
      i++;
      if (i >= MAX_PARTICLES) break;
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  private updateCamera(dtMs: number, nowMs: number, state: Readonly<GameState>): void {
    const parts = this.parts;
    if (!parts) return;
    const motion = !this.options.reducedMotion;
    const camera = parts.camera;

    if (motion && this.options.shake && this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - (dtMs / 1000) * 1.5);
      const s = this.trauma * this.trauma;
      camera.position.x = (Math.random() * 2 - 1) * MAX_SHAKE * s;
      camera.position.y = (Math.random() * 2 - 1) * MAX_SHAKE * s;
      camera.rotation.z = (Math.random() * 2 - 1) * 0.02 * s;
    } else {
      camera.position.x = 0;
      camera.position.y = 0;
      camera.rotation.z = 0;
    }

    // Balanceo lento que da sensación de espacio sin marear.
    if (motion) {
      parts.board.rotation.y = Math.sin(nowMs / 4200) * 0.05;
      parts.board.rotation.x = 0.05 + Math.cos(nowMs / 5600) * 0.022;
    } else {
      parts.board.rotation.set(0.05, 0, 0);
    }

    // La luz de relleno se enciende con el nivel y avisa cuando la pila sube.
    const danger = stackHeight(state.board) >= DANGER_ROW && state.phase !== 'gameover';
    this.dangerPulse += ((danger ? 1 : 0) - this.dangerPulse) * Math.min(1, dtMs / 220);
    const pulse = motion ? 0.5 + 0.5 * Math.sin(nowMs / 180) : 1;
    parts.lights.fill.color.setHex(danger ? 0xff3b5c : 0x66ccff);
    parts.lights.fill.intensity = 40 + this.dangerPulse * 90 * pulse;

    if (this.levelPulse > 0) {
      this.levelPulse = Math.max(0, this.levelPulse - dtMs / 600);
      parts.lights.key.intensity = 1.5 + this.levelPulse * 2.5;
    } else {
      parts.lights.key.intensity = 1.5;
    }
  }

  effect(event: GameEvent, state: Readonly<GameState>): void {
    if (this.options.reducedMotion) return;
    switch (event.type) {
      case 'hardDrop':
        if (this.options.shake)
          this.trauma = Math.min(1, this.trauma + 0.2 + event.distance * 0.008);
        break;
      case 'lineClear': {
        if (this.options.shake) {
          this.trauma = Math.min(
            1,
            this.trauma + (event.count >= 4 || event.tspin !== 'none' ? 0.5 : 0.2),
          );
        }
        if (!this.options.particles) break;
        const perCell = event.count >= 4 ? 3 : 2;
        for (const y of event.rows) {
          for (let x = 0; x < BOARD_W; x++) {
            const value = state.board[y * BOARD_W + x] ?? 0;
            const colorHex = scratchColor.set(this.palette.cells[value] ?? '#ffffff').getHex();
            cellPosition(x, y, scratchVector);
            for (let n = 0; n < perCell; n++) {
              if (this.particles.length >= MAX_PARTICLES) break;
              const life = 500 + Math.random() * 400;
              this.particles.push({
                x: scratchVector.x + (Math.random() - 0.5) * 0.6,
                y: scratchVector.y + (Math.random() - 0.5) * 0.6,
                z: (Math.random() - 0.5) * 0.6,
                vx: (Math.random() - 0.5) * 9,
                vy: 3 + Math.random() * 8,
                vz: (Math.random() - 0.2) * 7,
                life,
                maxLife: life,
                colorHex,
              });
            }
          }
        }
        break;
      }
      case 'levelUp':
        this.levelPulse = 1;
        break;
      case 'gameOver':
        if (this.options.shake) this.trauma = 1;
        break;
      default:
        break;
    }
  }

  dispose(): void {
    this.disposed = true;
    this.ready = false;
    this.observer?.disconnect();
    this.observer = null;
    const parts = this.parts;
    if (parts) {
      parts.cells.geometry.dispose();
      parts.particles.geometry.dispose();
      for (const mesh of [parts.cells, parts.ghost, parts.particles]) {
        const m = mesh.material;
        if (Array.isArray(m)) for (const one of m) one.dispose();
        else m.dispose();
        mesh.dispose();
      }
      for (const object of [parts.well, parts.grid, ...parts.walls]) {
        object.geometry.dispose();
        const m = object.material;
        if (Array.isArray(m)) for (const one of m) one.dispose();
        else m.dispose();
      }
    }
    this.post = null;
    this.renderer?.dispose();
    this.renderer = null;
    this.parts = null;
    this.canvas?.remove();
    this.canvas = null;
    this.container = null;
    this.particles.length = 0;
  }
}

/** Comprueba si el dispositivo puede con el modo 3D antes de descargar three.js. */
export function supports3d(): boolean {
  if (typeof navigator === 'undefined' || typeof document === 'undefined') return false;
  if ('gpu' in navigator) return true;
  try {
    const canvas = document.createElement('canvas');
    return canvas.getContext('webgl2') !== null;
  } catch {
    return false;
  }
}

/** Filas dibujadas, expuesto para las pruebas. */
export { ROWS_DRAWN, VISIBLE_H };
