import type { InputAction } from '@/game/handling';
import { actionForCode, type KeyMap } from './keymap';

export type ActionHandler = (action: InputAction, pressed: boolean) => void;

export interface KeyboardOptions {
  /** Si devuelve false, la tecla no se captura (p. ej. menús abiertos). */
  readonly shouldHandle?: (action: InputAction) => boolean;
}

/** Teclado por `event.code` con supresión del auto-repeat del sistema. */
export class KeyboardInput {
  private keymap: KeyMap;
  private readonly pressed = new Set<string>();
  private attached = false;

  private readonly shouldHandle: (action: InputAction) => boolean;

  constructor(
    keymap: KeyMap,
    private readonly onAction: ActionHandler,
    options: KeyboardOptions = {},
    private readonly target: Window = window,
  ) {
    this.keymap = keymap;
    this.shouldHandle = options.shouldHandle ?? (() => true);
  }

  setKeymap(keymap: KeyMap): void {
    this.keymap = keymap;
  }

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    this.target.addEventListener('keydown', this.onKeyDown);
    this.target.addEventListener('keyup', this.onKeyUp);
    this.target.addEventListener('blur', this.releaseAll);
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.releaseAll);
    this.releaseAll();
  }

  readonly releaseAll = (): void => {
    for (const code of [...this.pressed]) {
      this.pressed.delete(code);
      const action = actionForCode(this.keymap, code);
      if (action) this.onAction(action, false);
    }
  };

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (isEditableTarget(e.target)) return;
    const action = actionForCode(this.keymap, e.code);
    if (!action || !this.shouldHandle(action)) return;
    e.preventDefault();
    if (e.repeat || this.pressed.has(e.code)) return;
    this.pressed.add(e.code);
    this.onAction(action, true);
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    if (!this.pressed.delete(e.code)) return;
    const action = actionForCode(this.keymap, e.code);
    if (action) this.onAction(action, false);
  };
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}
