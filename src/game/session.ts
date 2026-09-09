import { DRILLS, buildDrillBoard, type DrillId } from '@/core/drills';
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
import { LOGIC_HZ } from './loop';
import type { SavedGame } from './resume';
import { ReplayPlayer, ReplayRecorder, type Replay } from './replay';
import { SplitTracker, hasSplits, type SplitComparison } from './splits';
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
  /** Tiempos de la mejor marca, para comparar hito a hito (docs/research/14). */
  readonly referenceSplits?: readonly number[];
  /** Posición preparada con la que empezar (docs/research/16). */
  readonly drill?: DrillId;
  /** Partida a medias que hay que reconstruir y devolver al jugador (docs/research/21). */
  readonly resume?: SavedGame;
}

/** Tope de tiempo de juego que se acepta reconstruir: seis horas. */
const MAX_RESUME_MS = 6 * 60 * 60 * 1000;

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
  private player: ReplayPlayer | null;
  private replaySource: Replay | null;
  readonly seed: number;
  private readonly handlingSettings: HandlingSettings;
  /** Seguimiento de hitos; null en los modos donde el tiempo no es el objetivo. */
  private readonly splits: SplitTracker | null;
  /** Último hito cruzado, para que el marcador lo muestre. */
  lastSplit: SplitComparison | null = null;
  /**
   * Velocidad al ver una repetición. Multiplica cuántos pasos se dan por segundo,
   * nunca el tamaño del paso, para que el resultado no cambie (docs/research/15).
   */
  private rate = 1;
  private rateCarry = 0;

  constructor(options: SessionOptions) {
    // Una partida guardada trae su configuración dentro, igual que una
    // repetición: sin ella se reconstruiría con otra semilla y otra partida.
    const replay = options.replay ?? options.resume?.replay;
    this.mode = replay?.mode ?? options.mode;
    const rules: RuleSet = replay
      ? replay.rules
      : { ...rulesForMode(options.mode, options.modeOptions), ...options.rules };
    this.seed = replay?.seed ?? options.seed ?? (Date.now() ^ 0x5eed) >>> 0;
    const drill = options.drill ? DRILLS[options.drill] : null;
    // Una posición preparada monta el tablero y fija las primeras piezas, y puede
    // exigir su propia detección de giros para que la jugada cuente.
    const finalRules: RuleSet = drill?.spinDetection
      ? { ...rules, spinDetection: drill.spinDetection }
      : rules;
    this.game = new Game({
      rules: finalRules,
      seed: this.seed,
      ...(drill ? { initialBoard: buildDrillBoard(drill), initialQueue: drill.queue } : {}),
    });
    this.handlingSettings = replay?.handling ?? options.handling ?? DEFAULT_HANDLING;
    this.handling = new Handling(this.handlingSettings);
    this.replaySource = options.replay ?? null;
    this.player = options.replay ? new ReplayPlayer(options.replay.inputs) : null;
    const goalLines = rules.goal.type === 'lines' ? rules.goal.lines : null;
    this.splits = hasSplits(this.mode, goalLines)
      ? new SplitTracker(goalLines ?? 0, options.referenceSplits ?? [])
      : null;
    this.countdownMs = options.countdownMs ?? 3000;
    if (this.countdownMs <= 0) this.beginPlay();
    if (options.resume) this.restoreFrom(options.resume);
  }

  /**
   * Rehace una partida guardada reproduciendo sus pulsaciones a toda velocidad
   * y devuelve el control al jugador, en pausa. Reproducir un maratón entero
   * son unas décimas de segundo, porque cada paso cuesta menos de un microsegundo.
   */
  private restoreFrom(saved: SavedGame): void {
    if (this.status === 'countdown') this.beginPlay();
    this.player = new ReplayPlayer(saved.replay.inputs);
    this.replaySource = saved.replay;
    const step = 1000 / saved.replay.logicHz;
    // Se cuentan pasos enteros, no milisegundos: sumar el mismo tiempo en dos
    // tramos no da el mismo número en coma flotante, y un paso de diferencia
    // es una fila de caída. El tope evita que un archivo manipulado cuelgue
    // el arranque.
    const steps = Math.min(Math.round(saved.elapsedMs / step), Math.ceil(MAX_RESUME_MS / step));
    for (let i = 0; i < steps && this.status === 'playing'; i++) this.step(step);
    this.player = null;
    this.replaySource = null;
    // El grabador ya se ha quedado con lo reproducido, así que la partida se
    // puede volver a guardar sin perder lo anterior.
    if (this.status === 'playing') this.pause();
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
  /**
   * Pasos por segundo con los que hay que hacer avanzar esta sesión. Al ver una
   * repetición manda el reloj con el que se grabó, porque decide en qué instante
   * se aplica cada pulsación (ADR-0009).
   */
  get logicHz(): number {
    return this.player ? (this.replaySource?.logicHz ?? LOGIC_HZ) : LOGIC_HZ;
  }

  get replayProgress(): number {
    return this.player?.progress ?? 0;
  }

  /** Velocidad de reproducción vigente. */
  get playbackRate(): number {
    return this.rate;
  }

  /** Ajusta la velocidad, dentro del rango que admiten los reproductores accesibles. */
  setPlaybackRate(rate: number): void {
    this.rate = Math.min(2.5, Math.max(0.5, rate));
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
    // Soltar las teclas se anota antes de cambiar de estado: la partida sigue
    // sin ellas, y quien la reproduzca o la continúe tiene que ver lo mismo.
    for (const action of [...this.held]) this.release(action);
    this.status = 'paused';
    this.handling.reset();
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
        // Al ver una repetición, la velocidad decide cuánto tiempo de juego avanza
        // en este cuadro. El paso que recibe el motor no cambia de tamaño.
        if (this.player && this.rate !== 1) return this.stepAtRate(dtMs);
        this.elapsedMs += dtMs;
        if (this.player) {
          for (const input of this.player.drain(this.elapsedMs)) {
            if (input.down) this.applyPress(input.action);
            else this.applyRelease(input.action);
          }
        }
        this.handling.step(dtMs, this.game);
        const events = this.game.step(dtMs);
        const split = this.splits?.update(this.game.state.lines, this.elapsedMs);
        if (split) this.lastSplit = split;
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

  /** Tiempos de los hitos cruzados, para guardarlos con el récord. */
  get recordedSplits(): number[] {
    return this.splits?.recorded ?? [];
  }

  /**
   * Da varios pasos seguidos para reproducir más rápido o más lento. El paso que
   * recibe el motor nunca cambia de tamaño, solo cuántos se dan (docs/research/15).
   */
  private stepAtRate(dtMs: number): GameEvent[] {
    this.rateCarry += dtMs * this.rate;
    const steps = Math.floor(this.rateCarry / dtMs);
    this.rateCarry -= steps * dtMs;
    const saved = this.rate;
    this.rate = 1;
    const out: GameEvent[] = [];
    for (let i = 0; i < steps && this.status === 'playing'; i++) {
      out.push(...this.step(dtMs));
    }
    this.rate = saved;
    return out;
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
      logicHz: this.logicHz,
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
