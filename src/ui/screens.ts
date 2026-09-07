import { byId } from './dom';

export type ScreenId = 'title' | 'modes' | 'settings' | 'records' | 'help' | 'pause' | 'results';

/** Gestor de pantallas superpuestas con foco accesible. */
export class Screens {
  private current: ScreenId | null = null;
  private lastFocus: HTMLElement | null = null;
  private readonly onChange: (screen: ScreenId | null) => void;

  constructor(onChange: (screen: ScreenId | null) => void) {
    this.onChange = onChange;
  }

  get active(): ScreenId | null {
    return this.current;
  }

  show(id: ScreenId): void {
    if (this.current === id) return;
    if (this.current) this.element(this.current).hidden = true;
    else this.lastFocus = document.activeElement as HTMLElement | null;
    const el = this.element(id);
    el.hidden = false;
    this.current = id;
    byId('app').dataset.screen = id;
    const focusTarget = el.querySelector<HTMLElement>('[data-autofocus], button, input, select');
    focusTarget?.focus();
    this.onChange(id);
  }

  hide(): void {
    if (!this.current) return;
    this.element(this.current).hidden = true;
    this.current = null;
    byId('app').dataset.screen = 'game';
    this.lastFocus?.focus();
    this.onChange(null);
  }

  private element(id: ScreenId): HTMLElement {
    return byId(`screen-${id}`);
  }
}
