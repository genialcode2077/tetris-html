import { byId } from './dom';

export type ScreenId = 'title' | 'modes' | 'settings' | 'records' | 'help' | 'pause' | 'results';

/** Elementos que pueden recibir el foco con el tabulador. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Gestor de pantallas superpuestas.
 *
 * Sigue el patrón de diálogo modal del W3C (docs/research/23): el foco no sale
 * del diálogo mientras está abierto, la tecla de escape lo cierra, y al cerrarse
 * el foco vuelve a donde estaba.
 */
export class Screens {
  private current: ScreenId | null = null;
  private lastFocus: HTMLElement | null = null;
  private readonly onChange: (screen: ScreenId | null) => void;

  /**
   * @param onChange Aviso de cambio de pantalla.
   * @param isBusy Si devuelve true, la tecla de escape se deja pasar: hay algo
   *   que la necesita antes, como la captura de una tecla en Ajustes.
   */
  constructor(
    onChange: (screen: ScreenId | null) => void,
    private readonly isBusy: () => boolean = () => false,
  ) {
    this.onChange = onChange;
    document.addEventListener('keydown', this.onKeyDown, true);
  }

  get active(): ScreenId | null {
    return this.current;
  }

  show(id: ScreenId): void {
    if (this.current === id) return;
    if (this.current) this.close(this.current);
    else this.lastFocus = document.activeElement as HTMLElement | null;
    const el = this.element(id);
    el.hidden = false;
    // Solo se marca como modal lo que de verdad lo es: el foco queda dentro y
    // el fondo está oscurecido, que es lo que pide la guía del W3C.
    el.setAttribute('aria-modal', 'true');
    this.current = id;
    byId('app').dataset.screen = id;
    const focusTarget = el.querySelector<HTMLElement>(`[data-autofocus], ${FOCUSABLE}`);
    focusTarget?.focus();
    this.onChange(id);
  }

  hide(): void {
    if (!this.current) return;
    this.close(this.current);
    this.current = null;
    byId('app').dataset.screen = 'game';
    this.lastFocus?.focus();
    this.onChange(null);
  }

  private close(id: ScreenId): void {
    const el = this.element(id);
    el.hidden = true;
    el.removeAttribute('aria-modal');
  }

  /** Elementos enfocables del diálogo abierto, en orden de tabulación. */
  private focusables(): HTMLElement[] {
    if (!this.current) return [];
    return [...this.element(this.current).querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (!this.current) return;

    if (e.key === 'Escape') {
      if (this.isBusy()) return;
      // Cerrar es lo que ya hace el botón de volver de cada pantalla: se
      // reutiliza en vez de repetir aquí a dónde va cada una.
      const dismiss = this.element(this.current).querySelector<HTMLElement>('[data-dismiss]');
      if (dismiss) {
        e.preventDefault();
        e.stopPropagation();
        dismiss.click();
      }
      return;
    }

    if (e.key !== 'Tab') return;
    const items = this.focusables();
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    const activo = document.activeElement;
    // Fuera del diálogo, o dando la vuelta por cualquiera de los dos extremos.
    const dentro = items.includes(activo as HTMLElement);
    if (!dentro) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    } else if (e.shiftKey && activo === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && activo === last) {
      e.preventDefault();
      first.focus();
    }
  };

  private element(id: ScreenId): HTMLElement {
    return byId(`screen-${id}`);
  }
}
