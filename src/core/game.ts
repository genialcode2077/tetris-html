import {
  clearRows,
  collides,
  createBoard,
  dropDistance,
  fullRows,
  isEmptyExcept,
  lockPiece,
} from './board';
import { BOARD_W, VISIBLE_H } from './constants';
import { GarbageQueue, attackFor } from './garbage';
import { gravityMsPerRow, softDropMsPerRow } from './gravity';
import { PIECE_BOX, cellsOf } from './pieces';
import { BagRandomizer } from './randomizer';
import { mulberry32 } from './rng';
import { DEFAULT_RULES } from './rules';
import { HARD_DROP_POINTS, SOFT_DROP_POINTS, scoreClear } from './scoring';
import { kicksFor } from './srs';
import { detectSpin } from './tspin';
import type {
  ActivePiece,
  Command,
  GameEvent,
  GameOverReason,
  GameState,
  PieceType,
  Point,
  Rotation,
  RuleSet,
} from './types';

export interface GameOptions {
  readonly rules?: Partial<RuleSet>;
  readonly seed?: number;
  /** Tablero de partida; se usa en las posiciones de entrenamiento. */
  readonly initialBoard?: Uint8Array;
  /** Piezas fijas al principio de la cola, antes de las que salen de la bolsa. */
  readonly initialQueue?: readonly PieceType[];
}

const ZERO: Point = { x: 0, y: 0 };

/** Fila (0-index, desde abajo) en la que aparece la celda más baja de una pieza: la fila 21 (1-index). */
const SPAWN_ROW = VISIBLE_H;

function spawnPosition(type: PieceType): { x: number; y: number } {
  const box = PIECE_BOX[type];
  const cells = cellsOf(type, 0);
  let minY = Number.POSITIVE_INFINITY;
  for (const c of cells) minY = Math.min(minY, c.y);
  return { x: Math.floor((BOARD_W - box) / 2), y: SPAWN_ROW - minY };
}

/**
 * Motor determinista. API: `start()`, `dispatch(cmd)`, `step(dtMs)` → eventos.
 * No usa DOM ni tiempo real. Ver docs/ARCHITECTURE.md.
 */
export class Game {
  readonly rules: RuleSet;
  readonly seed: number;
  private readonly s: GameState;
  private readonly bag: BagRandomizer;
  private events: GameEvent[] = [];
  private gravityAcc = 0;
  private areTimer = 0;
  private lowestY = 0;
  private lastActionRotation = false;
  private lastKick: Point | null = null;
  private comboCount = 0;
  private buffered: Command[] = [];
  /** Cola de basura pendiente; null si el modo no la usa (docs/research/13). */
  private readonly garbage: GarbageQueue | null;
  /** Filas de ataque que sobraron tras cancelar; en solitario solo informan. */
  private pendingOutgoing = 0;

  constructor(options: GameOptions = {}) {
    this.rules = { ...DEFAULT_RULES, ...options.rules };
    this.seed = options.seed ?? 0x5eed;
    const rng = mulberry32(this.seed);
    this.bag = new BagRandomizer(rng);
    // La basura usa el mismo generador que las piezas, así una repetición
    // reproduce exactamente las mismas filas.
    this.garbage = this.rules.garbage ? new GarbageQueue(this.rules.garbage, rng) : null;
    this.s = {
      board: createBoard(),
      active: null,
      ghostY: 0,
      hold: null,
      holdUsed: false,
      queue: [],
      phase: 'ready',
      level: this.rules.startLevel,
      lines: 0,
      score: 0,
      combo: -1,
      b2b: 0,
      clearing: null,
      timeMs: 0,
      softDropping: false,
      lockTimerMs: 0,
      lockMovesRemaining: this.rules.lockResetLimit,
      stats: {
        pieces: 0,
        tetrises: 0,
        tspins: 0,
        perfectClears: 0,
        maxCombo: 0,
        maxB2b: 0,
        hardDrops: 0,
        clearPoints: 0,
      },
      gameOverReason: null,
    };
    if (options.initialBoard) this.s.board.set(options.initialBoard);
    if (options.initialQueue) this.s.queue.push(...options.initialQueue);
    this.ensureQueue();
  }

  /** Estado interno (solo lectura para consumidores). */
  get state(): Readonly<GameState> {
    return this.s;
  }

  /** Filas de basura esperando entrar. */
  get pendingGarbage(): number {
    return this.garbage?.pendingRows ?? 0;
  }

  /** Filas de ataque que sobraron tras cancelar la basura entrante. */
  get outgoingAttack(): number {
    return this.pendingOutgoing;
  }

  start(): void {
    if (this.s.phase !== 'ready') return;
    this.spawnFromQueue();
  }

  /** Nivel usado para la gravedad. */
  get gravityLevel(): number {
    return this.rules.gravityMode === 'fixed' ? this.rules.startLevel : this.s.level;
  }

  isGrounded(): boolean {
    const p = this.s.active;
    if (!p) return false;
    return collides(this.s.board, p.type, p.rotation, p.x, p.y - 1);
  }

  dispatch(cmd: Command): void {
    const s = this.s;
    if (cmd === 'softDropOn') {
      s.softDropping = true;
      return;
    }
    if (cmd === 'softDropOff') {
      s.softDropping = false;
      return;
    }
    if (s.phase === 'clearing' || s.phase === 'spawning') {
      if (cmd === 'cw' || cmd === 'ccw' || cmd === 'r180' || cmd === 'hold') {
        this.buffered = this.buffered.filter((c) => c !== cmd);
        this.buffered.push(cmd);
      }
      return;
    }
    if (s.phase !== 'falling' && s.phase !== 'locking') return;
    this.applyCommand(cmd);
  }

  step(dtMs: number): GameEvent[] {
    const s = this.s;
    const r = this.rules;
    if (s.phase === 'ready' || s.phase === 'gameover' || s.phase === 'finished') {
      return this.flush();
    }
    s.timeMs += dtMs;
    if (r.goal.type === 'time' && s.timeMs >= r.goal.ms) {
      this.finish();
      return this.flush();
    }
    switch (s.phase) {
      case 'clearing': {
        const c = s.clearing;
        if (c) {
          c.elapsedMs += dtMs;
          if (c.elapsedMs >= r.lineClearDelayMs) this.finishClearing();
        }
        break;
      }
      case 'spawning': {
        this.areTimer += dtMs;
        if (this.areTimer >= r.areMs) this.spawnFromQueue();
        break;
      }
      case 'falling':
      case 'locking':
        this.updateFalling(dtMs);
        break;
      default:
        break;
    }
    return this.flush();
  }

  // ---------------------------------------------------------------- internos

  private flush(): GameEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  private emit(e: GameEvent): void {
    this.events.push(e);
  }

  private ensureQueue(): void {
    while (this.s.queue.length < this.rules.nextCount + 1) this.s.queue.push(this.bag.next());
  }

  private computeLevel(): number {
    const r = this.rules;
    const byLines = 1 + Math.floor(this.s.lines / r.linesPerLevel);
    return Math.min(Math.max(r.startLevel, byLines), r.levelCap);
  }

  private updateGhost(): void {
    const p = this.s.active;
    this.s.ghostY = p ? p.y - dropDistance(this.s.board, p) : 0;
  }

  /** Mete la basura pendiente antes de que aparezca la pieza siguiente. */
  private applyPendingGarbage(): void {
    const queue = this.garbage;
    if (!queue || queue.pendingRows === 0) return;
    const hole = queue.currentHole;
    const rows = queue.applyTo(this.s.board);
    if (rows > 0) this.emit({ type: 'garbage', rows, hole });
  }

  private enterSpawning(): void {
    this.applyPendingGarbage();
    this.s.phase = 'spawning';
    this.areTimer = 0;
    if (this.rules.areMs <= 0) this.spawnFromQueue();
  }

  private spawnFromQueue(): void {
    this.ensureQueue();
    const type = this.s.queue.shift();
    if (type === undefined) throw new Error('cola vacía');
    this.ensureQueue();
    this.spawnPiece(type);
  }

  private spawnPiece(type: PieceType): void {
    const s = this.s;
    const pos = spawnPosition(type);
    const piece: ActivePiece = { type, rotation: 0, x: pos.x, y: pos.y };
    if (collides(s.board, type, 0, piece.x, piece.y)) {
      s.active = piece;
      this.gameOver('blockout');
      return;
    }
    s.active = piece;
    s.phase = 'falling';
    s.lockTimerMs = 0;
    s.lockMovesRemaining = this.rules.lockResetLimit;
    this.gravityAcc = 0;
    this.lastActionRotation = false;
    this.lastKick = null;
    this.lowestY = piece.y;
    this.emit({ type: 'spawn', piece: type });
    // Guideline: la pieza baja una fila inmediatamente al aparecer.
    if (!collides(s.board, type, 0, piece.x, piece.y - 1)) {
      piece.y -= 1;
      this.lowestY = piece.y;
    }
    const buffered = this.buffered;
    this.buffered = [];
    for (const cmd of buffered) this.applyCommand(cmd);
    if (this.isActive()) this.updateGhost();
  }

  private isActive(): boolean {
    const phase = this.s.phase;
    return phase === 'falling' || phase === 'locking';
  }

  private applyCommand(cmd: Command): void {
    switch (cmd) {
      case 'left':
        this.tryMove(-1);
        break;
      case 'right':
        this.tryMove(1);
        break;
      case 'cw':
        this.tryRotate(1);
        break;
      case 'ccw':
        this.tryRotate(3);
        break;
      case 'r180':
        if (this.rules.enable180) this.tryRotate(2);
        break;
      case 'hardDrop':
        this.hardDrop();
        break;
      case 'hold':
        this.hold();
        break;
      default:
        break;
    }
  }

  private tryMove(dx: -1 | 1): void {
    const s = this.s;
    const p = s.active;
    if (!p) return;
    if (collides(s.board, p.type, p.rotation, p.x + dx, p.y)) return;
    p.x += dx;
    this.lastActionRotation = false;
    this.emit({ type: 'move', dir: dx });
    this.afterAction();
  }

  private tryRotate(delta: 1 | 2 | 3): void {
    const s = this.s;
    const p = s.active;
    if (!p) return;
    const from = p.rotation;
    const to = ((from + delta) & 3) as Rotation;
    const kicks = kicksFor(p.type, from, to, this.rules.rotationSystem);
    for (let i = 0; i < kicks.length; i++) {
      const k = kicks[i] ?? ZERO;
      if (!collides(s.board, p.type, to, p.x + k.x, p.y + k.y)) {
        p.rotation = to;
        p.x += k.x;
        p.y += k.y;
        this.lastActionRotation = true;
        this.lastKick = k;
        this.emit({ type: 'rotate', kick: i });
        this.afterAction();
        return;
      }
    }
    this.emit({ type: 'rotateFail' });
  }

  /** Tras un movimiento/rotación con éxito: fantasma y reset de lock delay según modo. */
  private afterAction(): void {
    const s = this.s;
    this.updateGhost();
    const p = s.active;
    if (p && p.y < this.lowestY) {
      this.lowestY = p.y;
      s.lockTimerMs = 0;
      s.lockMovesRemaining = this.rules.lockResetLimit;
      return;
    }
    if (!this.isGrounded()) return;
    switch (this.rules.lockResetMode) {
      case 'infinite':
        s.lockTimerMs = 0;
        break;
      case 'move':
        if (s.lockMovesRemaining > 0) {
          s.lockMovesRemaining -= 1;
          s.lockTimerMs = 0;
        }
        break;
      case 'step':
        break;
    }
  }

  private onMovedDown(): void {
    const s = this.s;
    const p = s.active;
    if (!p) return;
    this.lastActionRotation = false;
    if (p.y < this.lowestY) {
      this.lowestY = p.y;
      s.lockTimerMs = 0;
      s.lockMovesRemaining = this.rules.lockResetLimit;
    }
  }

  private hardDrop(): void {
    const s = this.s;
    const p = s.active;
    if (!p) return;
    const d = dropDistance(s.board, p);
    if (d > 0) {
      p.y -= d;
      s.score += d * HARD_DROP_POINTS;
      this.lastActionRotation = false;
    }
    s.stats.hardDrops += 1;
    this.emit({ type: 'hardDrop', distance: d });
    this.lock();
  }

  private hold(): void {
    const s = this.s;
    const p = s.active;
    if (!p) return;
    if (!this.rules.holdEnabled || s.holdUsed) {
      this.emit({ type: 'holdFail' });
      return;
    }
    const current = p.type;
    s.active = null;
    s.holdUsed = true;
    this.emit({ type: 'hold', piece: current });
    if (s.hold === null) {
      s.hold = current;
      this.spawnFromQueue();
    } else {
      const swapped = s.hold;
      s.hold = current;
      this.spawnPiece(swapped);
    }
  }

  private updateFalling(dtMs: number): void {
    const s = this.s;
    const p = s.active;
    if (!p) return;
    const wasGrounded = this.isGrounded();
    const level = this.gravityLevel;
    const ms = s.softDropping
      ? softDropMsPerRow(level, this.rules.softDropFactor)
      : gravityMsPerRow(level);
    if (ms <= 0) {
      const d = dropDistance(s.board, p);
      if (d > 0) {
        p.y -= d;
        if (s.softDropping) {
          s.score += d * SOFT_DROP_POINTS;
          this.emit({ type: 'softDrop' });
        }
        this.onMovedDown();
      }
      this.gravityAcc = 0;
    } else {
      this.gravityAcc += dtMs;
      while (this.gravityAcc >= ms) {
        this.gravityAcc -= ms;
        if (collides(s.board, p.type, p.rotation, p.x, p.y - 1)) {
          this.gravityAcc = 0;
          break;
        }
        p.y -= 1;
        if (s.softDropping) {
          s.score += SOFT_DROP_POINTS;
          this.emit({ type: 'softDrop' });
        }
        this.onMovedDown();
      }
    }
    if (this.isGrounded()) {
      if (s.phase !== 'locking') {
        s.phase = 'locking';
        this.emit({ type: 'land' });
      }
      if (wasGrounded) s.lockTimerMs += dtMs;
      if (s.lockTimerMs >= this.rules.lockDelayMs) this.lock();
    } else {
      s.phase = 'falling';
    }
    if (s.active) this.updateGhost();
  }

  private lock(): void {
    const s = this.s;
    const r = this.rules;
    const p = s.active;
    if (!p) return;
    const tspin = detectSpin(s.board, p, this.lastActionRotation, this.lastKick, r.spinDetection);
    lockPiece(s.board, p);
    s.stats.pieces += 1;
    this.emit({ type: 'lock', piece: { ...p } });
    const cells = cellsOf(p.type, p.rotation);
    const lockedOut = cells.every((c) => p.y + c.y >= VISIBLE_H);
    s.active = null;
    s.holdUsed = false;
    if (lockedOut) {
      this.gameOver('lockout');
      return;
    }
    const rows = fullRows(s.board);
    const n = rows.length;
    const level = s.level;
    if (n > 0) {
      const perfectClear = isEmptyExcept(s.board, rows);
      const combo = this.comboCount;
      const result = scoreClear({
        lines: n,
        tspin,
        level,
        b2bActive: s.b2b >= 1,
        combo,
        perfectClear,
      });
      s.score += result.points;
      s.stats.clearPoints += result.points;
      this.comboCount += 1;
      s.combo = combo;
      s.stats.maxCombo = Math.max(s.stats.maxCombo, combo);
      s.b2b = result.difficult ? s.b2b + 1 : 0;
      s.stats.maxB2b = Math.max(s.stats.maxB2b, s.b2b);
      if (n === 4) s.stats.tetrises += 1;
      if (tspin !== 'none') s.stats.tspins += 1;
      if (perfectClear) s.stats.perfectClears += 1;
      s.lines += n;
      if (this.garbage) {
        const attack = attackFor({
          lines: n,
          spin: tspin,
          backToBack: result.b2bApplied,
          perfectClear,
        });
        this.pendingOutgoing += this.garbage.cancel(attack);
      }
      this.emit({
        type: 'lineClear',
        rows,
        count: n,
        tspin,
        b2b: result.b2bApplied,
        combo,
        perfectClear,
        points: result.points,
      });
      const newLevel = this.computeLevel();
      if (newLevel > s.level) {
        s.level = newLevel;
        this.emit({ type: 'levelUp', level: newLevel });
      }
    } else {
      this.comboCount = 0;
      s.combo = -1;
      if (tspin !== 'none') {
        const result = scoreClear({
          lines: 0,
          tspin,
          level,
          b2bActive: s.b2b >= 1,
          combo: 0,
          perfectClear: false,
        });
        s.score += result.points;
        s.stats.clearPoints += result.points;
        s.stats.tspins += 1;
        this.emit({ type: 'tspin', mini: tspin === 'mini', points: result.points });
      }
    }
    this.garbage?.onPieceLocked(n);
    if (r.goal.type === 'lines' && s.lines >= r.goal.lines) {
      if (n > 0) {
        clearRows(s.board, rows);
        this.emit({ type: 'clearDone', rows });
      }
      this.finish();
      return;
    }
    if (n > 0) {
      if (r.lineClearDelayMs > 0) {
        s.phase = 'clearing';
        s.clearing = { rows, elapsedMs: 0 };
      } else {
        clearRows(s.board, rows);
        this.emit({ type: 'clearDone', rows });
        this.enterSpawning();
      }
    } else {
      this.enterSpawning();
    }
  }

  private finishClearing(): void {
    const s = this.s;
    const c = s.clearing;
    if (!c) return;
    clearRows(s.board, c.rows);
    s.clearing = null;
    this.emit({ type: 'clearDone', rows: c.rows });
    this.enterSpawning();
  }

  private finish(): void {
    this.s.phase = 'finished';
    this.s.active = null;
    this.emit({ type: 'finished' });
  }

  private gameOver(reason: GameOverReason): void {
    this.s.phase = 'gameover';
    this.s.gameOverReason = reason;
    this.emit({ type: 'gameOver', reason });
  }
}
