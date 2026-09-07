import type { InputAction } from '@/game/handling';
import type { ActionHandler } from './keyboard';

/** Mapeo estándar (W3C "standard" gamepad). */
const BUTTONS: Readonly<Record<number, InputAction>> = {
  0: 'cw', // A / Cross
  1: 'ccw', // B / Circle
  2: 'r180', // X / Square
  3: 'hold', // Y / Triangle
  4: 'hold', // LB
  5: 'hold', // RB
  9: 'pause', // Start
  12: 'hardDrop', // D-pad up
  13: 'softDrop', // D-pad down
  14: 'left',
  15: 'right',
};

const DEADZONE = 0.5;

/** Sondeo por paso lógico; emite transiciones pulsado/soltado. */
export class GamepadInput {
  private readonly state = new Map<InputAction, boolean>();
  private available = false;

  constructor(private readonly onAction: ActionHandler) {}

  get connected(): boolean {
    return this.available;
  }

  poll(): void {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return;
    const pads = navigator.getGamepads();
    const next = new Map<InputAction, boolean>();
    this.available = false;
    for (const pad of pads) {
      if (!pad) continue;
      this.available = true;
      for (const [index, action] of Object.entries(BUTTONS)) {
        const b = pad.buttons[Number(index)];
        if (b?.pressed) next.set(action, true);
      }
      const ax = pad.axes[0] ?? 0;
      const ay = pad.axes[1] ?? 0;
      if (ax < -DEADZONE) next.set('left', true);
      if (ax > DEADZONE) next.set('right', true);
      if (ay > DEADZONE) next.set('softDrop', true);
    }
    for (const [action, pressed] of next) {
      if (!this.state.get(action)) this.onAction(action, true);
      this.state.set(action, pressed);
    }
    for (const [action, pressed] of this.state) {
      if (pressed && !next.get(action)) {
        this.state.set(action, false);
        this.onAction(action, false);
      }
    }
  }
}
