import { Game } from '@/core/game';
import { ALL_MODES, dailyLabel, dailySeed, type GameMode } from '@/core/rules';
import type { GameEvent, GameState, RuleSet } from '@/core/types';
import type { InputAction } from '@/game/handling';
import { DRILL_IDS, type DrillId } from '@/core/drills';
import { Coach } from '@/game/coaching';
import { GameLoop } from '@/game/loop';
import { parseReplay, serializeReplay, type Replay } from '@/game/replay';
import { Session } from '@/game/session';
import { formatDelta } from '@/game/splits';
import { formatTime } from '@/game/stats';
import { GamepadInput } from '@/input/gamepad';
import { KeyboardInput } from '@/input/keyboard';
import type { KeyMap } from '@/input/keymap';
import { TouchInput } from '@/input/touch';
import { AudioManager } from '@/audio/manager';
import { createRenderer, type RendererHandle, type RendererKind } from '@/render/factory';
import type { RenderOptions, Renderer } from '@/render/types';
import type { Store } from '@/storage/store';
import { byId, byIdAs, clear, h } from '@/ui/dom';
import { Hud } from '@/ui/hud';
import { Screens, type ScreenId } from '@/ui/screens';
import {
  applyTranslations,
  detectLocale,
  getLocale,
  setLocale,
  t,
  type MessageKey,
} from '@/ui/i18n';
import { SettingsForm } from '@/ui/settingsForm';
import { APP_TITLE } from './config';
import { APP_COMMIT, APP_VERSION } from './version';

const RESULTS_DELAY_MS = 900;
const isTouchDevice = (): boolean =>
  typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
/** Solo mostramos botones en pantalla cuando el puntero principal es táctil. */
const prefersTouchButtons = (): boolean => window.matchMedia('(pointer: coarse)').matches;

export class App {
  private rendererHandle: RendererHandle | null = null;
  private rendererSwitching = false;
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
  private lastReplay: Replay | null = null;
  private shownSplit: unknown = null;
  /** Velocidades disponibles al ver una repetición, dentro del rango accesible. */
  private static readonly REPLAY_RATES = [0.5, 0.75, 1, 1.5, 2] as const;
  private replayRateIndex = 2;
  private readonly coach: Coach;
  private readonly reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  private lastTouchCell = 0;

  constructor(private readonly store: Store) {
    this.audio = new AudioManager(store.settings.audio);
    this.coach = new Coach({ seen: store.seenTips });
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

  /** Renderer activo; nulo mientras se está creando el primero. */
  private get renderer(): Renderer | null {
    return this.rendererHandle?.renderer ?? null;
  }

  get rendererKind(): RendererKind {
    return this.rendererHandle?.kind ?? 'canvas2d';
  }

  /** Diagnóstico del renderer activo, para pruebas automáticas. */
  get rendererDiagnostics(): unknown {
    const r = this.rendererHandle?.renderer as
      { diagnostics?: unknown; particleBudget?: number } | undefined;
    if (r?.diagnostics !== undefined) return r.diagnostics;
    return { kind: this.rendererKind, particleBudget: r?.particleBudget };
  }

  start(): void {
    document.title = APP_TITLE;
    // Si el jugador nunca eligió idioma, se usa el del navegador.
    if (!this.store.hasStoredLocale) {
      this.store.updateSettings((x) => (x.locale = detectLocale()));
    }
    setLocale(this.store.settings.locale);
    applyTranslations();
    byId('version').textContent = `v${APP_VERSION} · ${APP_COMMIT}`;
    void this.mountRenderer(this.store.settings.video.renderer);
    this.hud.setStyle(this.store.settings.video.palette, this.store.settings.video.patterns);
    this.hud.announce = this.store.settings.announce;
    this.hud.showFinesseFaults = this.store.settings.stats.showFinesseFaults;
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
      spinDetection: st.rules.spinDetection,
      softDropFactor: st.rules.softDropFactor,
      ...(mode === 'sprint' ? {} : { lineClearDelayMs: st.rules.lineClearDelayMs }),
    };
    const seed =
      seedOverride ??
      (mode === 'daily'
        ? dailySeed()
        : (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    this.session?.releaseAll();
    this.session = new Session({
      mode,
      modeOptions: {
        startLevel: st.game.startLevel,
        endless: st.game.endless,
        garbageEveryPieces: st.game.garbageEveryPieces,
      },
      ...(mode === 'practice' && st.game.drill ? { drill: st.game.drill } : {}),
      rules,
      handling: st.handling,
      seed,
      referenceSplits: this.store.bestSplits(mode),
    });
    this.session.onEvent((e, s) => {
      this.onGameEvent(e, s);
    });
    if (this.resultsTimer) clearTimeout(this.resultsTimer);
    this.resultsTimer = null;
    this.coach.resetForNewGame();
    this.currentReplay = null;
    byId('replay-bar').hidden = true;
    this.shownSplit = null;
    (this.rendererHandle?.renderer as { resetBudget?: () => void } | undefined)?.resetBudget?.();
    this.hud.setMode(mode, this.session.rules);
    const best = this.store.highscores(mode)[0];
    this.hud.setRecord(
      mode === 'sprint' || mode === 'daily' ? (best?.timeMs ?? null) : null,
      mode === 'sprint' || mode === 'daily' ? null : (best?.score ?? null),
    );
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
    // Al cruzar un hito se enseña cuánto se va por delante o por detrás del récord.
    const split = s.lastSplit;
    if (split && split !== this.shownSplit) {
      this.shownSplit = split;
      this.hud.notify(
        split.deltaMs === null
          ? t('split.first', { n: split.lines, t: formatTime(split.timeMs) })
          : t(split.deltaMs <= 0 ? 'split.ahead' : 'split.behind', {
              n: split.lines,
              d: formatDelta(split.deltaMs),
            }),
        split.deltaMs !== null && split.deltaMs <= 0 ? 'ahead' : 'behind',
      );
    }
    if ((s.status === 'gameover' || s.status === 'finished') && !this.resultsTimer) {
      this.resultsTimer = setTimeout(() => {
        this.showResults();
      }, RESULTS_DELAY_MS);
    }
  }

  /** Crea el renderer pedido, retirando el anterior. Si el 3D falla, vuelve a Canvas 2D. */
  private async mountRenderer(kind: RendererKind): Promise<void> {
    if (this.rendererSwitching) return;
    this.rendererSwitching = true;
    const container = byId('board');
    try {
      this.rendererHandle?.renderer.dispose();
      this.rendererHandle = null;
      const handle = await createRenderer({
        kind,
        container,
        options: this.renderOptions(),
        onFallback: (reason) => {
          this.handleRendererFallback(reason);
        },
      });
      this.rendererHandle = handle;
      if (handle.kind !== kind) {
        this.store.updateSettings((x) => (x.video.renderer = handle.kind));
      }
    } finally {
      this.rendererSwitching = false;
    }
  }

  private handleRendererFallback(reason: string): void {
    if (this.rendererKind === 'canvas2d') return;
    console.warn(`[render] volviendo a Canvas 2D: ${reason}`);
    this.store.updateSettings((x) => (x.video.renderer = 'canvas2d'));
    this.hud.notify(t('notice.no3d'));
    void this.mountRenderer('canvas2d');
    this.settingsForm.build();
  }

  private render(now: number): void {
    const s = this.session;
    const state = s ? s.game.state : this.idle.state;
    this.renderer?.render(state, now);
    if (s) {
      this.hud.update(state, s.stats(), s.rules);
      if (s.isReplay) this.updateReplayBar();
      if (!this.screens.active) this.hud.updateCountdown(s.status === 'countdown', s.countdownMs);
    }
    const cellSize = this.currentCellSize();
    if (this.touch && cellSize !== this.lastTouchCell) {
      this.lastTouchCell = cellSize;
      this.touch.setOptions({ cellSize });
    }
  }

  /** Tamaño de celda en píxeles; el modo 3D lo deduce del ancho del contenedor. */
  private currentCellSize(): number {
    const handle = this.rendererHandle;
    if (handle?.kind === 'canvas2d') {
      return (handle.renderer as unknown as { cellSize: number }).cellSize;
    }
    return Math.max(8, Math.floor(byId('board').clientWidth / 10));
  }

  private onGameEvent(event: GameEvent, s: Session): void {
    const state = s.game.state;
    if (event.type === 'lock') this.hud.pendingFinesseFault = s.lastFinesseFault;
    this.renderer?.effect(event, state);
    this.audio.handleEvent(event, state);
    this.hud.handleEvent(event, this.reducedMotion());
    this.maybeCoach(event, state);
    if (event.type === 'gameOver') this.hud.showOverlayText(t('results.gameover'), 'gameover');
    if (event.type === 'finished') this.hud.showOverlayText(t('results.finished'), 'finished');
  }

  /**
   * Muestra un consejo la primera vez que aparece cada mecánica, en lugar de un
   * tutorial al arrancar que casi nadie lee (docs/research/10).
   */
  private maybeCoach(event: GameEvent, state: Readonly<GameState>): void {
    if (!this.store.settings.coaching.enabled) return;
    if (this.session?.isReplay) return;
    const tip = this.coach.observe(event, state);
    if (!tip) return;
    this.hud.notify(t(`tip.${tip}` as MessageKey));
    this.store.setSeenTips(this.coach.seenTips);
  }

  private onAction(action: InputAction, pressed: boolean): void {
    if (action === 'pause') {
      if (pressed) this.togglePause();
      return;
    }
    // Al ver una repetición las teclas del juego no hacen nada, así que se
    // reutilizan para manejar la reproducción (docs/research/15).
    if (this.session?.isReplay === true && !this.screens.active) {
      if (!pressed) return;
      if (action === 'hardDrop') {
        this.session.togglePause();
        this.updateReplayBar();
      } else if (action === 'right' || action === 'left') {
        const step = action === 'right' ? 1 : -1;
        const count = App.REPLAY_RATES.length;
        this.replayRateIndex = (this.replayRateIndex + step + count) % count;
        this.session.setPlaybackRate(App.REPLAY_RATES[this.replayRateIndex] ?? 1);
        this.updateReplayBar();
      } else if (action === 'hold') {
        this.watchReplay(this.currentReplay);
      }
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
        ...(s.recordedSplits.length > 0 ? { splits: s.recordedSplits } : {}),
      });
    }
    byId('results-title').textContent = t(won ? 'results.finished' : 'results.gameover');
    const body = byId('results-body');
    clear(body);
    const row = (label: string, value: string): HTMLElement =>
      h('div', { className: 'result-row' }, h('span', {}, label), h('strong', {}, value));
    body.append(
      row(t('results.mode'), t(`modes.${s.mode}`)),
      row(t('records.points'), state.score.toLocaleString(getLocale())),
      row(t('records.lines'), String(state.lines)),
      row(t('records.level'), String(state.level)),
      row(t('records.time'), formatTime(s.elapsedMs)),
      row(t('results.pieces'), stats.pps.toFixed(2)),
      row(t('results.tetrisRate'), `${Math.round(stats.tetrisRate * 100)} %`),
      row(
        t('results.finesse'),
        s.finesse.placements > 0
          ? t('results.finesseValue', {
              p: Math.round(stats.finesseRate * 100),
              n: stats.finesseFaults,
            })
          : t('results.noData'),
      ),
      row(t('results.tspins'), String(state.stats.tspins)),
      row(t('results.maxCombo'), String(Math.max(0, state.stats.maxCombo))),
      row(t('results.maxB2b'), String(state.stats.maxB2b)),
      row(t('results.perfectClears'), String(state.stats.perfectClears)),
    );
    if (rank > 0)
      body.append(
        h(
          'p',
          { className: 'result-rank' },
          rank === 1 ? t('results.newRecord') : t('results.rank', { n: rank }),
        ),
      );

    // La repetición solo se guarda si mejora la mejor partida del modo.
    if (!s.isReplay) {
      const replay = s.buildReplay(APP_VERSION);
      this.lastReplay = replay;
      if (this.store.saveBestReplay(s.mode, replay)) {
        body.append(h('p', { className: 'muted small' }, t('results.replaySaved')));
      }
    }
    const watchable = s.isReplay ? null : (this.store.bestReplay(s.mode) ?? this.lastReplay);
    const actions = byId('results-actions');
    clear(actions);
    if (watchable) {
      actions.append(
        h(
          'button',
          {
            type: 'button',
            className: 'btn ghost small',
            onClick: () => {
              this.watchReplay(watchable);
            },
          },
          t('results.watchReplay'),
        ),
        h(
          'button',
          {
            type: 'button',
            className: 'btn ghost small',
            onClick: () => {
              this.downloadReplay(watchable);
            },
          },
          t('results.download'),
        ),
      );
    }
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
    on('btn-open-replay', () => {
      this.openReplayFile();
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
    // Controles de la repetición (docs/research/15).
    on('replay-restart', () => {
      const current = this.session;
      if (current?.isReplay) this.watchReplay(this.currentReplay ?? this.lastReplay ?? null);
    });
    on('replay-toggle', () => {
      this.session?.togglePause();
      this.updateReplayBar();
    });
    on('replay-speed', () => {
      this.replayRateIndex = (this.replayRateIndex + 1) % App.REPLAY_RATES.length;
      this.session?.setPlaybackRate(App.REPLAY_RATES[this.replayRateIndex] ?? 1);
      this.updateReplayBar();
    });
    on('replay-exit', () => {
      this.quitToTitle();
    });
    on('btn-fullscreen', () => {
      void this.toggleFullscreen();
    });
  }

  /** Repetición que se está viendo, para poder reiniciarla. */
  private currentReplay: Replay | null = null;

  /** Actualiza los botones y la barra de avance de la repetición. */
  private updateReplayBar(): void {
    const bar = byId('replay-bar');
    const s = this.session;
    if (!s?.isReplay) {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    const toggle = byId('replay-toggle');
    const paused = s.status === 'paused';
    toggle.textContent = paused ? '▶' : '⏸';
    toggle.title = t(paused ? 'replay.resume' : 'replay.pause');
    toggle.setAttribute('aria-label', toggle.title);
    const speed = byId('replay-speed');
    speed.textContent = `${s.playbackRate}×`;
    speed.title = `${t('replay.speed')}: ${s.playbackRate}×`;
    speed.setAttribute('aria-label', speed.title);
    byId('replay-restart').setAttribute('aria-label', t('replay.restart'));
    byId('replay-exit').setAttribute('aria-label', t('replay.exit'));
    const fill = byId('replay-progress');
    const percent = Math.round(s.replayProgress * 100);
    fill.style.width = `${percent}%`;
    fill.parentElement?.setAttribute('aria-label', t('replay.progress', { n: percent }));
  }

  /** Reproduce una repetición: el jugador solo mira. */
  watchReplay(replay: Replay | null): void {
    if (!replay) return;
    this.currentReplay = replay;
    this.session?.releaseAll();
    this.session = new Session({ mode: replay.mode, countdownMs: 1200, replay });
    this.session.onEvent((e, s) => {
      this.onGameEvent(e, s);
    });
    if (this.resultsTimer) clearTimeout(this.resultsTimer);
    this.resultsTimer = null;
    this.hud.setMode(replay.mode, this.session.rules);
    this.hud.hideOverlay();
    this.audio.startMusic();
    this.screens.hide();
    this.session.setPlaybackRate(App.REPLAY_RATES[this.replayRateIndex] ?? 1);
    this.updateReplayBar();
    this.hud.notify(t('notice.replayPlaying'));
    byId('board-wrap').focus();
  }

  private downloadReplay(replay: Replay): void {
    const blob = new Blob([serializeReplay(replay)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = h('a', {
      href: url,
      download: `blockfall-${replay.mode}-${replay.result.score}.json`,
    });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  /** Carga una repetición desde un archivo elegido por el jugador. */
  private openReplayFile(): void {
    const input = h('input', { type: 'file', accept: 'application/json,.json' });
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      void file.text().then((text) => {
        const replay = parseReplay(text);
        if (!replay) {
          this.hud.notify(t('notice.replayInvalid'));
          return;
        }
        this.watchReplay(replay);
      });
    });
    input.click();
  }

  private quitToTitle(): void {
    this.session?.releaseAll();
    this.session = null;
    this.currentReplay = null;
    byId('replay-bar').hidden = true;
    this.audio.stopMusic();
    this.hud.hideOverlay();
    this.screens.show('title');
  }

  private buildModes(): void {
    const st = this.store.settings;
    const list = byId('mode-list');
    clear(list);
    const modes = ALL_MODES;
    const describe = (mode: GameMode): string =>
      mode === 'daily'
        ? `${t('modes.daily.desc')} ${t('daily.today', { d: dailyLabel() })}`
        : t(`modes.${mode}.desc`);
    for (const mode of modes) {
      const input = h('input', { type: 'radio', name: 'mode', value: mode });
      input.checked = st.game.mode === mode;
      input.addEventListener('change', () => {
        this.store.updateSettings((x) => (x.game.mode = mode));
        this.updateModeOptions();
      });
      list.append(
        h(
          'label',
          { className: 'mode-card' },
          input,
          h('span', { className: 'mode-name' }, t(`modes.${mode}`)),
          h('span', { className: 'mode-desc' }, describe(mode)),
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
    const garbage = byIdAs('garbage-rate', HTMLSelectElement);
    clear(garbage);
    for (const value of [0, 4, 8, 12, 20]) {
      const label = value === 0 ? t('modes.garbageOff') : t('modes.garbagePieces', { n: value });
      const opt = h('option', { value }, label);
      opt.selected = st.game.garbageEveryPieces === value;
      garbage.append(opt);
    }
    garbage.addEventListener('change', () => {
      this.store.updateSettings((x) => (x.game.garbageEveryPieces = Number(garbage.value)));
    });

    // En práctica el nivel llega hasta veinte, que es la gravedad máxima: la pieza
    // aparece ya en el suelo (docs/research/13).
    const practiceLevel = byIdAs('practice-level', HTMLSelectElement);
    clear(practiceLevel);
    for (let i = 1; i <= 20; i++) {
      const opt = h('option', { value: i }, i === 20 ? `20 (${t('modes.maxGravity')})` : String(i));
      opt.selected = st.game.startLevel === i;
      practiceLevel.append(opt);
    }
    practiceLevel.addEventListener('change', () => {
      this.store.updateSettings((x) => (x.game.startLevel = Number(practiceLevel.value)));
    });

    // Posiciones preparadas para entrenar jugadas concretas (docs/research/16).
    const drill = byIdAs('drill-select', HTMLSelectElement);
    clear(drill);
    for (const value of ['', ...DRILL_IDS]) {
      const label = value === '' ? t('drill.none') : t(`drill.${value}` as MessageKey);
      const opt = h('option', { value }, label);
      opt.selected = st.game.drill === value;
      drill.append(opt);
    }
    drill.addEventListener('change', () => {
      this.store.updateSettings((x) => (x.game.drill = drill.value as DrillId | ''));
    });

    this.updateModeOptions();
  }

  /** Cada modo enseña solo las opciones que le afectan. */
  private updateModeOptions(): void {
    const mode = this.store.settings.game.mode;
    byId('mode-options').hidden = mode === 'daily' || mode === 'practice';
    byId('practice-options').hidden = mode !== 'practice';
  }

  private buildRecords(): void {
    const root = byId('records-body');
    clear(root);
    for (const mode of ALL_MODES) {
      const list = this.store.highscores(mode);
      const table = h(
        'table',
        { className: 'records-table' },
        h('caption', {}, t(`modes.${mode}`)),
        h(
          'thead',
          {},
          h(
            'tr',
            {},
            h('th', {}, '#'),
            h('th', {}, mode === 'sprint' ? t('records.time') : t('records.points')),
            h('th', {}, t('records.lines')),
            h('th', {}, t('records.level')),
            h('th', {}, 'PPS'),
            h('th', {}, t('records.date')),
          ),
        ),
        h(
          'tbody',
          {},
          ...(list.length === 0
            ? [h('tr', {}, h('td', { colspan: 6, className: 'muted' }, t('records.empty')))]
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
      [t('help.move'), `${keymap.left.join('/')} · ${keymap.right.join('/')}`],
      [t('help.rotate'), `${keymap.cw.join('/')} · ${keymap.ccw.join('/')}`],
      [t('help.drops'), `${keymap.softDrop.join('/')} · ${keymap.hardDrop.join('/')}`],
      [t('help.hold'), keymap.hold.join('/')],
      [
        t('help.system'),
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
      { cellSize: this.currentCellSize(), tapAlwaysCw: this.store.settings.touch.tapAlwaysCw },
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

  /** Vuelve a aplicar los ajustes; el formulario y las pruebas lo usan tras cambiarlos. */
  refreshSettings(): void {
    this.applySettings();
  }

  private applySettings(): void {
    const st = this.store.settings;
    if (st.locale !== getLocale()) {
      setLocale(st.locale);
      applyTranslations();
      this.buildModes();
      this.buildHelp();
      this.settingsForm.build();
    }
    this.renderer?.setOptions(this.renderOptions());
    if (st.video.renderer !== this.rendererKind && !this.rendererSwitching) {
      void this.mountRenderer(st.video.renderer);
    }
    this.hud.setStyle(st.video.palette, st.video.patterns);
    this.hud.announce = st.announce;
    this.hud.showFinesseFaults = st.stats.showFinesseFaults;
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
