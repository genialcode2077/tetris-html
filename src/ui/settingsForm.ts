import type { GameMode } from '@/core/rules';
import type { InputAction } from '@/game/handling';
import { ACTION_LABELS, DEFAULT_KEYMAP, keyLabel, type KeyMap } from '@/input/keymap';
import type { Settings } from '@/storage/settings';
import type { Store } from '@/storage/store';
import { byId, clear, h } from './dom';
import { LOCALES, LOCALE_NAMES, t, type Locale } from './i18n';

export interface SettingsFormCallbacks {
  onChange(): void;
  onKeymapChange(keymap: KeyMap): void;
}

const ACTIONS: readonly InputAction[] = [
  'left',
  'right',
  'softDrop',
  'hardDrop',
  'cw',
  'ccw',
  'r180',
  'hold',
  'pause',
  'restart',
  'mute',
];

const MODES: readonly GameMode[] = ['marathon', 'sprint', 'ultra', 'zen'];

/** Construye el formulario de ajustes a partir del Store y persiste cada cambio. */
export class SettingsForm {
  private readonly root = byId('settings-form');
  private capturing: InputAction | null = null;

  constructor(
    private readonly store: Store,
    private readonly callbacks: SettingsFormCallbacks,
  ) {}

  build(): void {
    clear(this.root);
    const s = this.store.settings;
    const set = (fn: (s: Settings) => void): void => {
      this.store.updateSettings(fn);
      this.callbacks.onChange();
    };
    this.root.append(
      this.section(
        'Juego',
        this.select(
          'Idioma / Language',
          s.locale,
          LOCALES.map((l) => [l, LOCALE_NAMES[l]] as [string, string]),
          (v) => {
            set((x) => (x.locale = v as Locale));
          },
        ),
        this.select(
          'Sistema de rotación',
          s.rules.rotationSystem,
          [
            ['srs', 'SRS (Guideline)'],
            ['srs-plus', 'SRS+ (I simétrica, TETR.IO)'],
          ],
          (v) => {
            set((x) => (x.rules.rotationSystem = v as Settings['rules']['rotationSystem']));
          },
        ),
        this.check('Rotación 180° (tecla A)', s.rules.enable180, (v) => {
          set((x) => (x.rules.enable180 = v));
        }),
        this.range('Piezas siguientes', s.rules.nextCount, 1, 6, 1, (v) => {
          set((x) => (x.rules.nextCount = v));
        }),
        this.select(
          'Reinicio del lock delay',
          s.rules.lockResetMode,
          [
            ['move', 'Move reset (15 movimientos, Guideline)'],
            ['step', 'Step reset (solo al bajar)'],
            ['infinite', 'Infinito'],
          ],
          (v) => {
            set((x) => (x.rules.lockResetMode = v as Settings['rules']['lockResetMode']));
          },
        ),
        this.select(
          t('settings.spin'),
          s.rules.spinDetection,
          [
            ['t-spin', t('settings.spin.tspin')],
            ['all-mini', t('settings.spin.allMini')],
            ['all-mini-plus', t('settings.spin.allMiniPlus')],
          ],
          (v) => {
            set((x) => (x.rules.spinDetection = v as Settings['rules']['spinDetection']));
          },
        ),
        this.select(
          'Velocidad de soft drop (SDF)',
          String(s.rules.softDropFactor),
          [
            ['6', '6×'],
            ['10', '10×'],
            ['20', '20× (por defecto)'],
            ['40', '40×'],
            ['Infinity', '∞ (instantáneo)'],
          ],
          (v) => {
            set(
              (x) =>
                (x.rules.softDropFactor = v === 'Infinity' ? Number.POSITIVE_INFINITY : Number(v)),
            );
          },
        ),
        this.range('Pausa al limpiar líneas (ms)', s.rules.lineClearDelayMs, 0, 400, 50, (v) => {
          set((x) => (x.rules.lineClearDelayMs = v));
        }),
      ),
      this.section(
        'Handling',
        this.range(
          'DAS (ms)',
          s.handling.dasMs,
          0,
          333,
          1,
          (v) => {
            set((x) => (x.handling.dasMs = v));
          },
          (v) => `${v} ms · ${(v / (1000 / 60)).toFixed(1)} F`,
        ),
        this.range(
          'ARR (ms)',
          s.handling.arrMs,
          0,
          83,
          1,
          (v) => {
            set((x) => (x.handling.arrMs = v));
          },
          (v) => (v === 0 ? 'instantáneo' : `${v} ms · ${(v / (1000 / 60)).toFixed(1)} F`),
        ),
        this.range('DCD (ms)', s.handling.dcdMs, 0, 50, 1, (v) => {
          set((x) => (x.handling.dcdMs = v));
        }),
      ),
      this.section(
        'Controles',
        this.keymapEditor(),
        this.check('Tap siempre rota horario (táctil)', s.touch.tapAlwaysCw, (v) => {
          set((x) => (x.touch.tapAlwaysCw = v));
        }),
        this.check('Botones en pantalla (táctil)', s.touch.buttons, (v) => {
          set((x) => (x.touch.buttons = v));
        }),
      ),
      this.section(
        'Audio',
        this.range(
          'Volumen general',
          s.audio.master,
          0,
          1,
          0.05,
          (v) => {
            set((x) => (x.audio.master = v));
          },
          pct,
        ),
        this.range(
          'Efectos',
          s.audio.sfx,
          0,
          1,
          0.05,
          (v) => {
            set((x) => (x.audio.sfx = v));
          },
          pct,
        ),
        this.range(
          'Música',
          s.audio.music,
          0,
          1,
          0.05,
          (v) => {
            set((x) => (x.audio.music = v));
          },
          pct,
        ),
        this.check('Silenciar (M)', s.audio.muted, (v) => {
          set((x) => (x.audio.muted = v));
        }),
        this.check('Vibración (móvil)', s.audio.vibration, (v) => {
          set((x) => (x.audio.vibration = v));
        }),
      ),
      this.section(
        'Vídeo y accesibilidad',
        this.select(
          'Paleta',
          s.video.palette,
          [
            ['neon', t('settings.palette.neon')],
            ['accessible', t('settings.palette.accessible')],
            ['highContrast', t('settings.palette.highContrast')],
          ],
          (v) => {
            set((x) => (x.video.palette = v as Settings['video']['palette']));
          },
        ),
        this.check('Símbolos en las piezas', s.video.patterns, (v) => {
          set((x) => (x.video.patterns = v));
        }),
        this.check('Pieza fantasma', s.video.ghost, (v) => {
          set((x) => (x.video.ghost = v));
        }),
        this.check('Rejilla', s.video.grid, (v) => {
          set((x) => (x.video.grid = v));
        }),
        this.check('Partículas', s.video.particles, (v) => {
          set((x) => (x.video.particles = v));
        }),
        this.check('Vibración de pantalla', s.video.shake, (v) => {
          set((x) => (x.video.shake = v));
        }),
        this.select(
          'Reducir movimiento',
          s.video.reducedMotion,
          [
            ['auto', 'Según el sistema'],
            ['on', 'Sí'],
            ['off', 'No'],
          ],
          (v) => {
            set((x) => (x.video.reducedMotion = v as Settings['video']['reducedMotion']));
          },
        ),
        this.check('Anuncios para lector de pantalla', s.announce, (v) => {
          set((x) => (x.announce = v));
        }),
        this.check(t('settings.tips'), s.coaching.enabled, (v) => {
          set((x) => (x.coaching.enabled = v));
        }),
        this.check('Avisar de teclas de más (finesse)', s.stats.showFinesseFaults, (v) => {
          set((x) => (x.stats.showFinesseFaults = v));
        }),
      ),
      h(
        'div',
        { className: 'form-actions' },
        h(
          'button',
          {
            type: 'button',
            className: 'btn ghost',
            onClick: () => {
              this.store.reset();
              this.callbacks.onKeymapChange(this.store.keymap);
              this.callbacks.onChange();
              this.build();
            },
          },
          'Restablecer todo',
        ),
      ),
    );
  }

  /** Captura la siguiente tecla para la acción en edición. Devuelve true si consumió el evento. */
  handleKeyDown(e: KeyboardEvent): boolean {
    if (!this.capturing) return false;
    e.preventDefault();
    const action = this.capturing;
    this.capturing = null;
    if (e.code !== 'Escape') {
      const keymap = structuredClone(this.store.keymap);
      for (const a of ACTIONS) keymap[a] = keymap[a].filter((c) => c !== e.code);
      keymap[action] = [e.code, ...keymap[action]].slice(0, 2);
      this.store.setKeymap(keymap);
      this.callbacks.onKeymapChange(keymap);
    }
    this.build();
    return true;
  }

  get isCapturing(): boolean {
    return this.capturing !== null;
  }

  private keymapEditor(): HTMLElement {
    const keymap = this.store.keymap;
    const rows = ACTIONS.map((action) =>
      h(
        'div',
        { className: 'key-row' },
        h('span', { className: 'key-label' }, ACTION_LABELS[action]),
        h(
          'button',
          {
            type: 'button',
            className: `key-btn${this.capturing === action ? ' capturing' : ''}`,
            onClick: () => {
              this.capturing = action;
              this.build();
              this.root.querySelector<HTMLElement>('.key-btn.capturing')?.focus();
            },
          },
          this.capturing === action ? 'Pulsa una tecla…' : keymap[action].map(keyLabel).join(' / '),
        ),
      ),
    );
    return h(
      'div',
      { className: 'keymap' },
      ...rows,
      h(
        'button',
        {
          type: 'button',
          className: 'btn ghost small',
          onClick: () => {
            this.store.setKeymap(DEFAULT_KEYMAP);
            this.callbacks.onKeymapChange(this.store.keymap);
            this.build();
          },
        },
        'Teclas por defecto',
      ),
    );
  }

  private section(title: string, ...fields: HTMLElement[]): HTMLElement {
    return h('fieldset', { className: 'settings-section' }, h('legend', {}, title), ...fields);
  }

  private range(
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (v: number) => void,
    format: (v: number) => string = (v) => String(v),
  ): HTMLElement {
    const out = h('output', {}, format(value));
    const input = h('input', { type: 'range', min, max, step, value });
    input.addEventListener('input', () => {
      const v = Number(input.value);
      out.textContent = format(v);
      onChange(v);
    });
    return h('label', { className: 'field' }, h('span', {}, label), input, out);
  }

  private select(
    label: string,
    value: string,
    options: readonly [string, string][],
    onChange: (v: string) => void,
  ): HTMLElement {
    const select = h('select', {});
    for (const [v, text] of options) {
      const opt = h('option', { value: v }, text);
      if (v === value) opt.selected = true;
      select.append(opt);
    }
    select.addEventListener('change', () => {
      onChange(select.value);
    });
    return h('label', { className: 'field' }, h('span', {}, label), select);
  }

  private check(label: string, value: boolean, onChange: (v: boolean) => void): HTMLElement {
    const input = h('input', { type: 'checkbox' });
    input.checked = value;
    input.addEventListener('change', () => {
      onChange(input.checked);
    });
    return h('label', { className: 'field check' }, input, h('span', {}, label));
  }
}

const pct = (v: number): string => `${Math.round(v * 100)} %`;

export { MODES };
