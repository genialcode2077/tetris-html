import type { GameMode } from '@/core/rules';
import type { GameEvent, GameState, PieceType, RuleSet } from '@/core/types';
import { formatTime, type DerivedStats } from '@/game/stats';
import { drawPiecePreview, type CellStyle } from '@/render/canvas2d/cells';
import { PALETTES } from '@/render/palette';
import type { PaletteName } from '@/render/types';
import { Announcer, QUIET_MS, type Priority } from './announcements';
import { byId, byIdAs, clear, h } from './dom';
import { getLocale, t } from './i18n';

const modeLabel = (mode: GameMode): string => t(`modes.${mode}`);

/** HUD en DOM: marcadores, hold/next, popups y anuncios accesibles. */
export class Hud {
  private readonly score = byId('score');
  private readonly level = byId('level');
  private readonly lines = byId('lines');
  private readonly time = byId('time');
  private readonly pps = byId('pps');
  private readonly finesse = byId('finesse');
  private readonly modeLabel = byId('mode-label');
  private readonly goalLabel = byId('goal-label');
  private readonly holdCanvas = byIdAs('hold', HTMLCanvasElement);
  private readonly nextList = byId('next');
  private readonly overlay = byId('board-overlay');
  private readonly badges = byId('badges');
  private readonly announcer = byId('announcer');
  private nextCanvases: HTMLCanvasElement[] = [];
  private style: CellStyle = { palette: PALETTES.neon, patterns: false };
  private lastHold: PieceType | null | undefined;
  private lastHoldUsed: boolean | undefined;
  private lastQueue = '';
  private readonly announcerPolicy = new Announcer();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownShown = -1;
  announce = true;
  /** Avisar en pantalla cuando una colocación gasta teclas de más. */
  showFinesseFaults = false;
  /** Fallos de la colocación que está a punto de anunciarse. */
  pendingFinesseFault = 0;

  setStyle(palette: PaletteName, patterns: boolean): void {
    this.style = { palette: PALETTES[palette], patterns };
    this.lastQueue = '';
    this.lastHold = undefined;
  }

  /** Muestra la mejor marca del modo como referencia mientras se juega. */
  setRecord(timeMs: number | null, score: number | null): void {
    const el = byId('record-label');
    if (timeMs === null && score === null) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.textContent =
      timeMs !== null
        ? `${t('hud.record')}: ${formatTime(timeMs)}`
        : `${t('hud.record')}: ${(score ?? 0).toLocaleString(getLocale())}`;
  }

  setMode(mode: GameMode, rules: RuleSet): void {
    // Partida nueva: no arrastrar avisos pendientes de la anterior.
    this.announcerPolicy.reset();
    this.modeLabel.textContent = modeLabel(mode);
    const goal = rules.goal;
    this.goalLabel.textContent =
      goal.type === 'lines'
        ? t('hud.goalLines', { n: goal.lines })
        : goal.type === 'time'
          ? t('hud.goalTime', { t: formatTime(goal.ms, false) })
          : t('hud.goalNone');
    this.ensureNext(rules.nextCount);
  }

  update(state: Readonly<GameState>, stats: DerivedStats, rules: RuleSet): void {
    this.score.textContent = state.score.toLocaleString(getLocale());
    this.level.textContent = String(state.level);
    const goal = rules.goal;
    this.lines.textContent =
      goal.type === 'lines' ? `${state.lines} / ${goal.lines}` : String(state.lines);
    const remaining = goal.type === 'time' ? Math.max(0, goal.ms - state.timeMs) : stats.elapsedMs;
    this.time.textContent = formatTime(remaining, goal.type !== 'time');
    this.pps.textContent = stats.pps.toFixed(2);
    this.finesse.textContent =
      stats.finesseFaults === 0
        ? '100 %'
        : `${Math.round(stats.finesseRate * 100)} % · ${stats.finesseFaults}`;
    this.finesse.classList.toggle('warn', stats.finesseRate < 0.9);
    if (state.hold !== this.lastHold || state.holdUsed !== this.lastHoldUsed) {
      drawPiecePreview(this.holdCanvas, state.hold, this.style, state.holdUsed);
      this.lastHold = state.hold;
      this.lastHoldUsed = state.holdUsed;
    }
    const key = state.queue.slice(0, rules.nextCount).join('');
    if (key !== this.lastQueue) {
      this.lastQueue = key;
      this.ensureNext(rules.nextCount);
      for (let i = 0; i < rules.nextCount; i++) {
        const c = this.nextCanvases[i];
        if (c) drawPiecePreview(c, state.queue[i] ?? null, this.style);
      }
    }
  }

  /** Llamar cada frame: muestra 3·2·1 durante la cuenta atrás y "¡YA!" al empezar. */
  updateCountdown(inCountdown: boolean, ms: number): void {
    if (inCountdown) {
      const n = Math.max(1, Math.ceil(ms / 1000));
      if (n === this.countdownShown) return;
      this.countdownShown = n;
      this.overlay.textContent = String(n);
      this.overlay.className = 'board-overlay countdown';
      this.overlay.hidden = false;
      return;
    }
    if (this.countdownShown > 0) {
      this.countdownShown = 0;
      this.overlay.textContent = t('countdown.go');
      this.overlay.className = 'board-overlay countdown';
      this.overlay.hidden = false;
      setTimeout(() => {
        if (this.countdownShown === 0) this.hideOverlay();
      }, 500);
    }
  }

  showOverlayText(text: string, className = ''): void {
    this.overlay.textContent = text;
    this.overlay.className = `board-overlay ${className}`.trim();
    this.overlay.hidden = false;
  }

  /** Muestra un aviso breve al jugador y lo anuncia al lector de pantalla. */
  notify(text: string, tone: 'neutral' | 'ahead' | 'behind' = 'neutral'): void {
    const el = h(
      'div',
      { className: `badge notice${tone === 'neutral' ? '' : ` ${tone}`}` },
      h('span', { className: 'badge-extra' }, text),
    );
    this.badges.append(el);
    setTimeout(() => {
      el.remove();
    }, 4000);
    this.announcer.textContent = text;
  }

  hideOverlay(): void {
    this.overlay.hidden = true;
    this.countdownShown = -1;
  }

  /** Popups de acción (T-spin, Tetris, combo, B2B…) y anuncios ARIA. */
  handleEvent(event: GameEvent, reducedMotion: boolean): void {
    switch (event.type) {
      case 'lineClear': {
        const parts: string[] = [];
        if (event.tspin !== 'none') {
          parts.push(t(event.tspin === 'mini' ? 'action.tspinMini' : 'action.tspin'));
        }
        const names = [
          '',
          'action.single',
          'action.double',
          'action.triple',
          'action.tetris',
        ] as const;
        const clearKey = names[event.count];
        if (clearKey) parts.push(t(clearKey));
        const main = parts.join(' ');
        const extras: string[] = [];
        if (event.b2b) extras.push(t('action.b2b'));
        if (event.combo > 0) extras.push(t('action.combo', { n: event.combo }));
        if (event.perfectClear) extras.push(t('action.perfectClear'));
        this.popup(
          main,
          extras,
          event.count >= 4 || event.tspin !== 'none' ? 'big' : '',
          reducedMotion,
        );
        this.say(
          t('a11y.points', {
            action: `${main.toLowerCase()}${extras.length ? ', ' + extras.join(', ').toLowerCase() : ''}`,
            n: event.points,
          }),
        );
        break;
      }
      case 'tspin':
        this.popup(t(event.mini ? 'action.tspinMini' : 'action.tspin'), [], '', reducedMotion);
        break;
      case 'levelUp':
        this.popup(t('action.level', { n: event.level }), [], 'level', reducedMotion);
        this.say(t('a11y.levelUp', { n: event.level }));
        break;
      case 'lock':
        if (this.showFinesseFaults && this.pendingFinesseFault > 0) {
          this.popup(
            `+${this.pendingFinesseFault} TECLA${this.pendingFinesseFault > 1 ? 'S' : ''}`,
            [],
            'fault',
            reducedMotion,
          );
        }
        this.pendingFinesseFault = 0;
        break;
      case 'gameOver':
        this.say(t('a11y.gameOver'), 'high');
        break;
      case 'finished':
        this.say(t('a11y.finished'), 'high');
        break;
      default:
        break;
    }
  }

  private popup(main: string, extras: string[], className: string, reducedMotion: boolean): void {
    const el = h(
      'div',
      { className: `badge ${className}`.trim() },
      h('span', { className: 'badge-main' }, main),
      ...extras.map((x) => h('span', { className: 'badge-extra' }, x)),
    );
    if (reducedMotion) el.classList.add('no-motion');
    this.badges.append(el);
    while (this.badges.childElementCount > 3) this.badges.firstElementChild?.remove();
    setTimeout(() => {
      el.remove();
    }, 1100);
  }

  private say(text: string, priority: Priority = 'normal'): void {
    if (!this.announce) return;
    const out = this.announcerPolicy.push({ text, priority }, performance.now());
    if (out !== null) this.announcer.textContent = out;
    // Lo que quede esperando se suelta al terminar el silencio, en vez de
    // perderse como antes (docs/research/25).
    if (this.flushTimer !== null) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      const pend = this.announcerPolicy.flush(performance.now());
      if (pend !== null) this.announcer.textContent = pend;
    }, QUIET_MS + 20);
  }

  private ensureNext(count: number): void {
    if (this.nextCanvases.length === count) return;
    clear(this.nextList);
    this.nextCanvases = [];
    for (let i = 0; i < count; i++) {
      const c = h('canvas', {
        className: i === 0 ? 'next-item first' : 'next-item',
        width: 96,
        height: 56,
      });
      this.nextList.append(c);
      this.nextCanvases.push(c);
    }
    this.lastQueue = '';
  }
}
