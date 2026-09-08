import { evaluateFinesse } from '@/core/finesse';
import { Game } from '@/core/game';
import { rulesForMode, type GameMode, type ModeOptions } from '@/core/rules';
import type { ActivePiece, GameEvent, PieceType, RuleSet } from '@/core/types';
import {
  DEFAULT_HANDLING,
  GAME_ACTIONS,
  Handling,
  type HandlingSettings,
  type InputAction,
} from './handling';
import { ReplayPlayer, ReplayRecorder, type Replay } from './replay';
import { deriveStats, emptyFinesseTally, type DerivedStats, type FinesseTally } from './stats';

export type SessionStatus = 'countdown' | 'playing' | 'paused' | 'finished' | 'gameover';

export interface SessionOptions {
  readonly mode: GameMode;
  readonly modeOptions?: ModeOptions;
  readonly rules?: Partial<RuleSet>;
  readonly handling?: HandlingSettings;
  readonly seed?: number;
  readonly countdownMs?: number;
  /** Al pasar una repetición, la sesión reproduce sus entradas en vez de escuchar al jugador. */
  readonly replay?: Replay;
}

export type SessionListener = (event: GameEvent, session: Session) => void;

/** Una partida: motor + handling + cronómetro + estado de pausa/cuenta atrás. */
export class Session {
  readonly mode: GameMode;
  readonly game: Game;
  readonly handling: Handling;
  status: SessionStatus = 'countdown';
  countdownMs: number;
  /** Tiempo de juego efectivo (sin pausas ni cuenta atrás). */
  elapsedMs = 0;
  private readonly listeners = new Set<SessionListener>();
  private readonly held = new Set<InputAction>();
  /** Recuento de finesse de la partida. */
  readonly finesse: FinesseTally = emptyFinesseTally();
  /** Estado del tablero y posición al aparecer la pieza actual, para evaluar el finesse. */
  private placementStart: {
    board: Uint8Array;
    spawn: { x: number; y: number };
    type: PieceType;
  } | null = null;
  private inputsThisPiece = 0;
  private usedHoldThisPiece = false;
  /** Última colocación evaluada; el HUD la usa para avisar de un fallo. */
  lastFinesseFault = 0;
  private readonly recorder = new ReplayRecorder();
  private readonly player: ReplayPlayer | null;
  readonly seed: number;
  private readonly handlingSettings: HandlingSettings;

  constructor(options: SessionOptions) {
    const replay = options.replay;
    this.mode = replay?.mode ?? options.mode;
    const rules: RuleSet = replay
      ? replay.rules
      : { ...rulesForMode(options.mode, options.modeOptions), ...options.rules };
    this.seed = replay?.seed ?? options.seed ?? (Date.now() ^ 0x5eed) >>> 0;
    this.game = new Game({ rules, seed: this.seed });
    this.handlingSettings = replay?.handling ?? options.handling ?? DEFAULT_HANDLING;
    this.handling = new Handling(this.handlingSettings);
    this.player = replay ? new ReplayPlayer(replay.inputs) : null;
    this.countdownMs = options.countdownMs ?? 3000;
    if (this.countdownMs <= 0) this.beginPlay();
  }

  get rules(): RuleSet {
    return this.game.rules;
  }

  onEvent(listener: SessionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** true si la sesión está reproduciendo una repetición en lugar de una partida. */
  get isReplay(): boolean {
    return this.player !== null;
  }

  /** Avance de la reproducción, de 0 a 1. */
  get replayProgress(): number {
    return this.player?.progress ?? 0;
  }

  press(action: InputAction): void {
    if (this.player) return; // durante una repetición no se aceptan órdenes del jugador
    this.applyPress(action);
  }

  private applyPress(action: InputAction): void {
    if (!GAME_ACTIONS.includes(action)) return;
    if (this.held.has(action)) return;
    this.held.add(action);
    if (this.status !== 'playing') return;
    this.recorder.record(this.elapsedMs, action, true);
    // El finesse cuenta movimientos y rotaciones, nunca el hard drop.
    if (
      action === 'left' ||
      action === 'right' ||
      action === 'cw' ||
      action === 'ccw' ||
      action === 'r180'
    ) {
      this.inputsThisPiece++;
    } else if (action === 'softDrop') {
      this.inputsThisPiece++;
    } else if (action === 'hold') {
      this.usedHoldThisPiece = true;
    }
    this.handling.press(action, this.game);
  }

  release(action: InputAction): void {
    if (this.player) return;
    this.applyRelease(action);
  }

  private applyRelease(action: InputAction): void {
    if (!this.held.delete(action)) return;
    if (this.status === 'playing') this.recorder.record(this.elapsedMs, action, false);
    if (this.status === 'playing' || this.status === 'paused')
      this.handling.release(action, this.game);
  }

  releaseAll(): void {
    for (const a of [...this.held]) this.applyRelease(a);
    this.handling.reset();
  }

  pause(): void {
    if (this.status !== 'playing') return;
    this.status = 'paused';
    this.releaseAll();
  }

  resume(): void {
    if (this.status !== 'paused') return;
    this.status = 'playing';
  }

  togglePause(): void {
    if (this.status === 'playing') this.pause();
    else if (this.status === 'paused') this.resume();
  }

  step(dtMs: number): GameEvent[] {
    switch (this.status) {
      case 'countdown': {
        this.countdownMs -= dtMs;
        if (this.countdownMs <= 0) {
          this.beginPlay();
          // las teclas ya pulsadas durante la cuenta atrás se aplican al empezar
          for (const a of this.held) this.handling.press(a, this.game);
        }
        return [];
      }
      case 'playing': {
        this.elapsedMs += dtMs;
        if (this.player) {
          for (const input of this.player.drain(this.elapsedMs)) {
            if (input.down) this.applyPress(input.action);
            else this.applyRelease(input.action);
          }
        }
        this.handling.step(dtMs, this.game);
        const events = this.game.step(dtMs);
        for (const e of events) {
          this.trackFinesse(e);
          if (e.type === 'gameOver') this.status = 'gameover';
          else if (e.type === 'finished') this.status = 'finished';
          for (const l of this.listeners) l(e, this);
        }
        return events;
      }
      default:
        return [];
    }
  }

  stats(): DerivedStats {
    return deriveStats(this.game.state, this.elapsedMs, this.finesse);
  }

  /**
   * Sigue el finesse de cada colocación: guarda el tablero al aparecer la pieza y,
   * al fijarla, compara las pulsaciones usadas con el mínimo posible.
   * Las piezas colocadas tras usar hold no se evalúan, porque su punto de partida
   * no es la posición de aparición.
   */
  private trackFinesse(event: GameEvent): void {
    if (event.type === 'spawn') {
      const piece = this.game.state.active;
      if (piece) {
        this.placementStart = {
          board: this.game.state.board.slice(),
          spawn: { x: piece.x, y: piece.y },
          type: piece.type,
        };
      }
      this.inputsThisPiece = 0;
      this.usedHoldThisPiece = false;
      return;
    }
    if (event.type !== 'lock') return;
    const start = this.placementStart;
    this.placementStart = null;
    if (!start || this.usedHoldThisPiece) return;
    const placed: ActivePiece = event.piece;
    if (placed.type !== start.type) return;
    const result = evaluateFinesse(
      start.board,
      start.type,
      start.spawn,
      placed,
      this.inputsThisPiece,
      {
        rotationSystem: this.rules.rotationSystem,
        enable180: this.rules.enable180,
        allowSoftDrop: true,
      },
    );
    if (!result) return;
    this.finesse.placements++;
    this.finesse.faults += result.faults;
    if (result.faults > 0) this.finesse.faultyPlacements++;
    this.lastFinesseFault = result.faults;
  }

  /** Empaqueta la partida jugada como repetición. */
  buildReplay(appVersion: string): Replay {
    const state = this.game.state;
    return this.recorder.build({
      appVersion,
      mode: this.mode,
      seed: this.seed,
      rules: this.rules,
      handling: this.handlingSettings,
      result: {
        score: state.score,
        lines: state.lines,
        level: state.level,
        timeMs: Math.round(this.elapsedMs),
        pieces: state.stats.pieces,
        finished: this.status === 'finished',
      },
    });
  }

  private beginPlay(): void {
    this.countdownMs = 0;
    this.status = 'playing';
    this.game.start();
  }
}
