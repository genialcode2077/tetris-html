import { Game } from '@/core/game';
import { MODE_LABELS, type GameMode } from '@/core/rules';
import type { GameEvent, RuleSet } from '@/core/types';
import type { InputAction } from '@/game/handling';
import { GameLoop } from '@/game/loop';
import { Session } from '@/game/session';
import { formatTime } from '@/game/stats';
import { GamepadInput } from '@/input/gamepad';
import { KeyboardInput } from '@/input/keyboard';
import type { KeyMap } from '@/input/keymap';
import { TouchInput } from '@/input/touch';
import { AudioManager } from '@/audio/manager';
import { CanvasRenderer } from '@/render/canvas2d/CanvasRenderer';
import type { RenderOptions } from '@/render/types';
import type { Store } from '@/storage/store';
import { byId, byIdAs, clear, h } from '@/ui/dom';
import { Hud } from '@/ui/hud';
import { Screens, type ScreenId } from '@/ui/screens';
import { SettingsForm } from '@/ui/settingsForm';
import { APP_TITLE } from './config';
import { APP_COMMIT, APP_VERSION } from './version';

const RESULTS_DELAY_MS = 900;
const isTouchDevice = (): boolean =>
  typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
/** Solo mostramos botones en pantalla cuando el puntero principal es táctil. */
const prefersTouchButtons = (): boolean => window.matchMedia('(pointer: coarse)').matches;

export class App {
  private readonly renderer = new CanvasRenderer();
  private readonly audio: AudioManager;
  private readonly hud = new Hud();
  private readonly screens: Screens;
  private readonly keyboard: KeyboardInput;
  private readonly gamepad: GamepadInput;
  private readonly settingsForm: SettingsForm;
  private touch: TouchInput | null = null;
  private readonly loop: GameLoop;
  private session: Session | null = null;
  private readonly idle = new Game({ seed: 1 });
  private resultsTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  private lastTouchCell = 0;

  constructor(private readonly store: Store) {
    this.audio = new AudioManager(store.settings.audio);
    this.screens = new Screens((s) => {
      this.onScreenChange(s);
    });
    this.keyboard = new KeyboardInput(
      store.keymap,
      (a, p) => {
        this.onAction(a, p);
      },
      { shouldHandle: (a) => this.shouldHandleKey(a) },
    );
    this.gamepad = new GamepadInput((a, p) => {
      this.onAction(a, p);
    });
    this.settingsForm = new SettingsForm(store, {
      onChange: () => {
        this.applySettings();
      },
      onKeymapChange: (keymap: KeyMap) => {
        this.keyboard.setKeymap(keymap);
        this.buildHelp();
      },
    });
    this.loop = new GameLoop(
      (dt) => {
        this.update(dt);
      },
      (now) => {
        this.render(now);
      },
    );
  }

  start(): void {
    document.title = APP_TITLE;
    byId('version').textContent = `v${APP_VERSION} · ${APP_COMMIT}`;
    this.renderer.init(byId('board'), this.renderOptions());
    this.hud.setStyle(this.store.settings.video.palette, this.store.settings.video.patterns);
    this.hud.announce = this.store.settings.announce;
    this.keyboard.attach();
    this.setupTouch();
    this.wireScreens();
    this.settingsForm.build();
    this.buildHelp();
    this.buildModes();

    const unlock = (): void => {
      this.audio.unlock();
    };
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
    window.addEventListener(
      'keydown',
      (e) => {
        if (this.settingsForm.handleKeyDown(e)) e.stopImmediatePropagation();
      },
      { capture: true },
    );
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.autoPause();
      else this.loop.resetClock();
    });
    window.addEventListener('blur', () => {
      this.autoPause();
    });
    this.reducedMotionQuery.addEventListener('change', () => {
      this.applySettings();
    });

    this.screens.show('title');
    this.loop.start();
  }

  /** Sesión actual (solo lectura; para depuración y e2e). */
  get currentSession(): Session | null {
    return this.session;
  }

  /**
   * Avanza la simulación manualmente (depuración/e2e cuando la pestaña está oculta y rAF no corre).
   * Ejecuta pasos lógicos de 1000/120 ms y un render.
   */
  debugTick(ms: number): void {
    const step = 1000 / 120;
    let t = 0;
    while (t < ms) {
      this.update(step);
      t += step;
    }
    this.render(performance.now());
  }

  // ------------------------------------------------------------ partida

  newGame(seedOverride?: number): void {
    const st = this.store.settings;
    const mode = st.game.mode;
    const rules: Partial<RuleSet> = {
      rotationSystem: st.rules.rotationSystem,
      enable180: st.rules.enable180,
      nextCount: st.rules.nextCount,
      lockResetMode: st.rules.lockResetMode,
      softDropFactor: st.rules.softDropFactor,
      ...(mode === 'sprint' ? {} : { lineClearDelayMs: st.rules.lineClearDelayMs }),
    };
    const seed = seedOverride ?? (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    this.session?.releaseAll();
    this.session = new Session({
      mode,
      modeOptions: { startLevel: st.game.startLevel, endless: st.game.endless },
      rules,
      handling: st.handling,
      seed,
    });
    this.session.onEvent((e, s) => {
      this.onGameEvent(e, s);
    });
    if (this.resultsTimer) clearTimeout(this.resultsTimer);
    this.resultsTimer = null;
    this.hud.setMode(mode, this.session.rules);
    this.hud.hideOverlay();
    this.audio.setLevel(st.game.startLevel);
    this.audio.startMusic();
    this.screens.hide();
    byId('board-wrap').focus();
  }

  private update(dt: number): void {
    this.gamepad.poll();
    const s = this.session;
    if (!s) return;
    if (this.screens.active) return;
    s.step(dt);
    if ((s.status === 'gameover' || s.status === 'finished') && !this.resultsTimer) {
      this.resultsTimer = setTimeout(() => {
        this.showResults();
      }, RESULTS_DELAY_MS);
    }
  }

  private render(now: number): void {
    const s = this.session;
    const state = s ? s.game.state : this.idle.state;
    this.renderer.render(state, now);
    if (s) {
      this.hud.update(state, s.stats(), s.rules);
      if (!this.screens.active) this.hud.updateCountdown(s.status === 'countdown', s.countdownMs);
    }
    if (this.touch && this.renderer.cellSize !== this.lastTouchCell) {
      this.lastTouchCell = this.renderer.cellSize;
      this.touch.setOptions({ cellSize: this.lastTouchCell });
    }
  }

  private onGameEvent(event: GameEvent, s: Session): void {
    const state = s.game.state;
    this.renderer.effect(event, state);
    this.audio.handleEvent(event, state);
    this.hud.handleEvent(event, this.reducedMotion());
    if (event.type === 'gameOver') this.hud.showOverlayText('GAME OVER', 'gameover');
    if (event.type === 'finished') this.hud.showOverlayText('¡OBJETIVO!', 'finished');
  }

  private onAction(action: InputAction, pressed: boolean): void {
    if (action === 'pause') {
      if (pressed) this.togglePause();
      return;
    }
    if (action === 'restart') {
      if (pressed && this.session && (!this.screens.active || this.screens.active === 'pause')) {
        this.newGame();
      }
      return;
    }
    if (action === 'mute') {
      if (pressed) {
        this.store.updateSettings((x) => (x.audio.muted = !x.audio.muted));
        this.applySettings();
        this.settingsForm.build();
      }
      return;
    }
    if (this.screens.active || !this.session) return;
    if (pressed) this.session.press(action);
    else this.session.release(action);
  }

  private shouldHandleKey(action: InputAction): boolean {
    if (this.settingsForm.isCapturing) return false;
    if (action === 'pause') return this.session !== null && this.screens.active !== 'settings';
    if (action === 'mute') return true;
    if (action === 'restart')
      return this.session !== null && (!this.screens.active || this.screens.active === 'pause');
    return !this.screens.active && this.session !== null;
  }

  private togglePause(): void {
    const s = this.session;
    if (!s) return;
    if (this.screens.active === 'pause') {
      this.screens.hide();
      s.resume();
      this.audio.resume();
      return;
    }
    if (this.screens.active) return;
    if (s.status === 'playing' || s.status === 'countdown') {
      if (s.status === 'playing') s.pause();
      this.screens.show('pause');
      this.audio.suspend();
    }
  }

  private autoPause(): void {
    const s = this.session;
    if (!s || this.screens.active) return;
    if (s.status === 'playing' || s.status === 'countdown') this.togglePause();
  }

  private onScreenChange(screen: ScreenId | null): void {
    const s = this.session;
    if (screen && s) s.releaseAll();
    byId('game').setAttribute('aria-hidden', screen ? 'true' : 'false');
  }

  private showResults(): void {
    const s = this.session;
    if (!s) return;
    const state = s.game.state;
    const stats = s.stats();
    const won = s.status === 'finished';
    const record = won || s.mode !== 'sprint';
    let rank = 0;
    if (record) {
      rank = this.store.addHighScore(s.mode, {
        score: state.score,
        lines: state.lines,
        level: state.level,
        timeMs: s.elapsedMs,
        pps: stats.pps,
        date: new Date().toISOString().slice(0, 10),
      });
    }
    byId('results-title').textContent = won ? '¡Objetivo cumplido!' : 'Fin de la partida';
    const body = byId('results-body');
    clear(body);
    const row = (label: string, value: string): HTMLElement =>
      h('div', { className: 'result-row' }, h('span', {}, label), h('strong', {}, value));
    body.append(
      row('Modo', MODE_LABELS[s.mode]),
      row('Puntuación', state.score.toLocaleString('es-ES')),
      row('Líneas', String(state.lines)),
      row('Nivel', String(state.level)),
      row('Tiempo', formatTime(s.elapsedMs)),
      row('Piezas / s', stats.pps.toFixed(2)),
      row('Tetris rate', `${Math.round(stats.tetrisRate * 100)} %`),
      row('T-spins', String(state.stats.tspins)),
      row('Combo máx.', String(Math.max(0, state.stats.maxCombo))),
      row('B2B máx.', String(state.stats.maxB2b)),
      row('Perfect clears', String(state.stats.perfectClears)),
    );
    if (rank > 0)
      body.append(
        h(
          'p',
          { className: 'result-rank' },
          rank === 1 ? '¡Nuevo récord!' : `Puesto ${rank} en tus récords`,
        ),
      );
    this.screens.show('results');
  }

  // ------------------------------------------------------------ UI

  private wireScreens(): void {
    const on = (id: string, fn: () => void): void => {
      byId(id).addEventListener('click', () => {
        this.audio.play('menuConfirm');
        fn();
      });
    };
    on('btn-play', () => {
      this.screens.show('modes');
    });
    on('btn-settings', () => {
      this.screens.show('settings');
    });
    on('btn-records', () => {
      this.buildRecords();
      this.screens.show('records');
    });
    on('btn-help', () => {
      this.screens.show('help');
    });
    on('btn-start', () => {
      this.newGame();
    });
    for (const id of ['btn-modes-back', 'btn-settings-back', 'btn-records-back', 'btn-help-back']) {
      on(id, () => {
        if (
          this.session &&
          this.session.status !== 'gameover' &&
          this.session.status !== 'finished'
        ) {
          this.screens.show('pause');
        } else this.screens.show('title');
      });
    }
    on('btn-resume', () => {
      this.togglePause();
    });
    on('btn-pause-restart', () => {
      this.newGame();
    });
    on('btn-pause-settings', () => {
      this.screens.show('settings');
    });
    on('btn-pause-quit', () => {
      this.quitToTitle();
    });
    on('btn-results-retry', () => {
      this.newGame();
    });
    on('btn-results-title', () => {
      this.quitToTitle();
    });
    on('btn-fullscreen', () => {
      void this.toggleFullscreen();
    });
  }

  private quitToTitle(): void {
    this.session?.releaseAll();
    this.session = null;
    this.audio.stopMusic();
    this.hud.hideOverlay();
    this.screens.show('title');
  }

  private buildModes(): void {
    const st = this.store.settings;
    const list = byId('mode-list');
    clear(list);
    const modes: GameMode[] = ['marathon', 'sprint', 'ultra', 'zen'];
    const descriptions: Record<GameMode, string> = {
      marathon: '150 líneas, la velocidad sube con el nivel. Opción sin fin.',
      sprint: 'Limpia 40 líneas lo más rápido posible.',
      ultra: 'Máxima puntuación en 2 minutos.',
      zen: 'Sin fin y sin prisa: gravedad fija.',
    };
    for (const mode of modes) {
      const input = h('input', { type: 'radio', name: 'mode', value: mode });
      input.checked = st.game.mode === mode;
      input.addEventListener('change', () => {
        this.store.updateSettings((x) => (x.game.mode = mode));
      });
      list.append(
        h(
          'label',
          { className: 'mode-card' },
          input,
          h('span', { className: 'mode-name' }, MODE_LABELS[mode]),
          h('span', { className: 'mode-desc' }, descriptions[mode]),
        ),
      );
    }
    const level = byIdAs('start-level', HTMLSelectElement);
    clear(level);
    for (let i = 1; i <= 15; i++) {
      const opt = h('option', { value: i }, String(i));
      opt.selected = st.game.startLevel === i;
      level.append(opt);
    }
    level.addEventListener('change', () => {
      this.store.updateSettings((x) => (x.game.startLevel = Number(level.value)));
    });
    const endless = byIdAs('endless', HTMLInputElement);
    endless.checked = st.game.endless;
    endless.addEventListener('change', () => {
      this.store.updateSettings((x) => (x.game.endless = endless.checked));
    });
  }

  private buildRecords(): void {
    const root = byId('records-body');
    clear(root);
    const modes: GameMode[] = ['marathon', 'sprint', 'ultra', 'zen'];
    for (const mode of modes) {
      const list = this.store.highscores(mode);
      const table = h(
        'table',
        { className: 'records-table' },
        h('caption', {}, MODE_LABELS[mode]),
        h(
          'thead',
          {},
          h(
            'tr',
            {},
            h('th', {}, '#'),
            h('th', {}, mode === 'sprint' ? 'Tiempo' : 'Puntos'),
            h('th', {}, 'Líneas'),
            h('th', {}, 'Nivel'),
            h('th', {}, 'PPS'),
            h('th', {}, 'Fecha'),
          ),
        ),
        h(
          'tbody',
          {},
          ...(list.length === 0
            ? [h('tr', {}, h('td', { colspan: 6, className: 'muted' }, 'Sin partidas todavía'))]
            : list.map((r, i) =>
                h(
                  'tr',
                  {},
                  h('td', {}, String(i + 1)),
                  h(
                    'td',
                    {},
                    mode === 'sprint' ? formatTime(r.timeMs) : r.score.toLocaleString('es-ES'),
                  ),
                  h('td', {}, String(r.lines)),
                  h('td', {}, String(r.level)),
                  h('td', {}, r.pps.toFixed(2)),
                  h('td', {}, r.date),
                ),
              )),
        ),
      );
      root.append(table);
    }
  }

  private buildHelp(): void {
    const root = byId('help-keys');
    clear(root);
    const keymap = this.store.keymap;
    const rows: [string, string][] = [
      ['Mover', `${keymap.left.join('/')} · ${keymap.right.join('/')}`],
      ['Rotar', `${keymap.cw.join('/')} (horario) · ${keymap.ccw.join('/')} (antihorario)`],
      ['Soft drop / Hard drop', `${keymap.softDrop.join('/')} · ${keymap.hardDrop.join('/')}`],
      ['Hold', keymap.hold.join('/')],
      [
        'Pausa / Reiniciar / Silencio',
        `${keymap.pause.join('/')} · ${keymap.restart.join('/')} · ${keymap.mute.join('/')}`,
      ],
    ];
    for (const [k, v] of rows)
      root.append(h('div', { className: 'result-row' }, h('span', {}, k), h('strong', {}, v)));
  }

  private setupTouch(): void {
    const wrap = byId('board-wrap');
    if (!isTouchDevice()) return;
    this.touch = new TouchInput(
      wrap,
      (a, p) => {
        this.onAction(a, p);
      },
      { cellSize: this.renderer.cellSize, tapAlwaysCw: this.store.settings.touch.tapAlwaysCw },
    );
    this.touch.attach();
    const bar = byId('touch-controls');
    bar.hidden = !this.store.settings.touch.buttons || !prefersTouchButtons();
    for (const btn of bar.querySelectorAll<HTMLButtonElement>('button[data-action]')) {
      const action = btn.dataset.action as InputAction;
      const press = (e: Event): void => {
        e.preventDefault();
        this.onAction(action, true);
      };
      const release = (): void => {
        this.onAction(action, false);
      };
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
    }
  }

  private applySettings(): void {
    const st = this.store.settings;
    this.renderer.setOptions(this.renderOptions());
    this.hud.setStyle(st.video.palette, st.video.patterns);
    this.hud.announce = st.announce;
    this.audio.setSettings(st.audio);
    this.session?.handling.setSettings(st.handling);
    this.touch?.setOptions({ tapAlwaysCw: st.touch.tapAlwaysCw });
    if (this.touch) byId('touch-controls').hidden = !st.touch.buttons || !prefersTouchButtons();
    document.documentElement.dataset.palette = st.video.palette;
  }

  private reducedMotion(): boolean {
    const pref = this.store.settings.video.reducedMotion;
    return pref === 'auto' ? this.reducedMotionQuery.matches : pref === 'on';
  }

  private renderOptions(): RenderOptions {
    const v = this.store.settings.video;
    return {
      palette: v.palette,
      ghost: v.ghost,
      particles: v.particles,
      shake: v.shake,
      reducedMotion: this.reducedMotion(),
      grid: v.grid,
      patterns: v.patterns,
    };
  }

  private async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // no soportado
    }
  }
}
