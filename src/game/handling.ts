import type { Game } from '@/core/game';

export interface HandlingSettings {
  /** Delayed Auto Shift en ms (Guideline ≈ 167). */
  dasMs: number;
  /** Auto Repeat Rate en ms (Guideline ≈ 33; 0 = instantáneo). */
  arrMs: number;
  /** DAS cut delay en ms tras rotación/hard drop (0 = desactivado). */
  dcdMs: number;
}

export const DEFAULT_HANDLING: HandlingSettings = { dasMs: 167, arrMs: 33, dcdMs: 0 };

export type InputAction =
  | 'left'
  | 'right'
  | 'softDrop'
  | 'hardDrop'
  | 'cw'
  | 'ccw'
  | 'r180'
  | 'hold'
  | 'pause'
  | 'restart'
  | 'mute';

/** Acciones que llegan al motor (el resto las gestiona la sesión/app). */
export const GAME_ACTIONS: readonly InputAction[] = [
  'left',
  'right',
  'softDrop',
  'hardDrop',
  'cw',
  'ccw',
  'r180',
  'hold',
];

const MAX_ARR_MOVES = 10;

/** Convierte teclas mantenidas en comandos con DAS/ARR en milisegundos (paso lógico fijo). */
export class Handling {
  private settings: HandlingSettings;
  private leftHeld = false;
  private rightHeld = false;
  private dasDir: -1 | 0 | 1 = 0;
  private dasTimer = 0;
  private dasCharged = false;
  private arrTimer = 0;
  private dcdTimer = 0;

  constructor(settings: HandlingSettings = DEFAULT_HANDLING) {
    this.settings = { ...settings };
  }

  setSettings(settings: HandlingSettings): void {
    this.settings = { ...settings };
  }

  reset(): void {
    this.leftHeld = false;
    this.rightHeld = false;
    this.dasDir = 0;
    this.dasTimer = 0;
    this.dasCharged = false;
    this.arrTimer = 0;
    this.dcdTimer = 0;
  }

  press(action: InputAction, game: Game): void {
    switch (action) {
      case 'left':
        this.leftHeld = true;
        this.startDas(-1, game);
        break;
      case 'right':
        this.rightHeld = true;
        this.startDas(1, game);
        break;
      case 'softDrop':
        game.dispatch('softDropOn');
        break;
      case 'hardDrop':
        game.dispatch('hardDrop');
        this.dcdTimer = this.settings.dcdMs;
        break;
      case 'cw':
      case 'ccw':
      case 'r180':
      case 'hold':
        game.dispatch(action);
        this.dcdTimer = this.settings.dcdMs;
        break;
      default:
        break;
    }
  }

  release(action: InputAction, game: Game): void {
    switch (action) {
      case 'left':
        this.leftHeld = false;
        if (this.dasDir === -1) this.switchTo(this.rightHeld ? 1 : 0);
        break;
      case 'right':
        this.rightHeld = false;
        if (this.dasDir === 1) this.switchTo(this.leftHeld ? -1 : 0);
        break;
      case 'softDrop':
        game.dispatch('softDropOff');
        break;
      default:
        break;
    }
  }

  step(dtMs: number, game: Game): void {
    if (this.dasDir === 0) return;
    if (this.dcdTimer > 0) {
      this.dcdTimer -= dtMs;
      return;
    }
    this.dasTimer += dtMs;
    if (!this.dasCharged) {
      if (this.dasTimer < this.settings.dasMs) return;
      this.dasCharged = true;
      this.arrTimer = this.settings.arrMs; // primer auto-shift inmediato
    } else {
      this.arrTimer += dtMs;
    }
    const cmd = this.dasDir === -1 ? 'left' : 'right';
    if (this.settings.arrMs <= 0) {
      for (let i = 0; i < MAX_ARR_MOVES; i++) game.dispatch(cmd);
      this.arrTimer = 0;
      return;
    }
    let moves = 0;
    while (this.arrTimer >= this.settings.arrMs && moves < MAX_ARR_MOVES) {
      this.arrTimer -= this.settings.arrMs;
      game.dispatch(cmd);
      moves++;
    }
  }

  private startDas(dir: -1 | 1, game: Game): void {
    game.dispatch(dir === -1 ? 'left' : 'right');
    this.dasDir = dir;
    this.dasTimer = 0;
    this.dasCharged = false;
    this.arrTimer = 0;
  }

  private switchTo(dir: -1 | 0 | 1): void {
    this.dasDir = dir;
    this.dasTimer = 0;
    this.dasCharged = false;
    this.arrTimer = 0;
  }
}
