import type { GameEvent, GameState } from '@/core/types';
import { stackHeight } from '@/core/board';
import type { AudioSettings } from '@/storage/settings';
import { MusicPlayer } from './music';
import { SFX_PRESETS, type SfxName } from './sfx';
import { synthesize } from './synth';

const DANGER_ROW = 15;
const MAX_VOICES = 10;

/** Orquesta Web Audio: desbloqueo por gesto, buses, SFX por evento y música adaptativa. */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private music: MusicPlayer | null = null;
  private readonly cache = new Map<SfxName, AudioBuffer>();
  private settings: AudioSettings;
  private activeVoices = 0;
  private lastSoftDrop = 0;
  private musicWanted = false;
  private dangerOn = false;

  constructor(settings: AudioSettings) {
    this.settings = { ...settings };
  }

  get unlocked(): boolean {
    return this.ctx?.state === 'running';
  }

  /** Llamar desde un gesto de usuario (pointerdown/keydown). */
  unlock(): void {
    if (typeof AudioContext === 'undefined') return;
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: 'interactive' });
      this.master = this.ctx.createGain();
      const comp = this.ctx.createDynamicsCompressor();
      this.sfxBus = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus.connect(this.master);
      this.master.connect(comp).connect(this.ctx.destination);
      this.music = new MusicPlayer(this.ctx, this.musicBus);
      this.applyVolumes();
    }
    if (this.ctx.state !== 'running') {
      void this.ctx.resume().then(() => {
        this.applyVolumes();
        if (this.musicWanted) this.music?.start();
      });
    } else if (this.musicWanted && !this.music?.isPlaying) {
      this.music?.start();
    }
  }

  setSettings(settings: AudioSettings): void {
    this.settings = { ...settings };
    this.applyVolumes();
  }

  play(name: SfxName): void {
    const ctx = this.ctx;
    const bus = this.sfxBus;
    if (!ctx || !bus || ctx.state !== 'running' || this.settings.muted) return;
    if (this.activeVoices >= MAX_VOICES) return;
    let buffer = this.cache.get(name);
    if (!buffer) {
      const data = synthesize(SFX_PRESETS[name], { sampleRate: ctx.sampleRate });
      buffer = ctx.createBuffer(1, Math.max(1, data.length), ctx.sampleRate);
      buffer.copyToChannel(data, 0);
      this.cache.set(name, buffer);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(bus);
    this.activeVoices++;
    src.onended = () => {
      this.activeVoices--;
    };
    src.start();
  }

  startMusic(): void {
    this.musicWanted = true;
    if (this.unlocked) this.music?.start();
  }

  stopMusic(): void {
    this.musicWanted = false;
    this.music?.stop();
  }

  setLevel(level: number): void {
    this.music?.setLevel(level);
  }

  duck(ms = 250): void {
    const bus = this.musicBus;
    const ctx = this.ctx;
    if (!bus || !ctx) return;
    const target = this.settings.music * 0.35;
    const now = ctx.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(bus.gain.value, now);
    bus.gain.linearRampToValueAtTime(target, now + 0.03);
    bus.gain.linearRampToValueAtTime(this.settings.music, now + ms / 1000);
  }

  vibrate(pattern: number | number[]): void {
    if (!this.settings.vibration) return;
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {
        // no soportado
      }
    }
  }

  /** Reacciona a los eventos del motor. */
  handleEvent(event: GameEvent, state: Readonly<GameState>): void {
    switch (event.type) {
      case 'move':
        this.play('move');
        break;
      case 'rotate':
        this.play('rotate');
        break;
      case 'rotateFail':
        this.play('rotateFail');
        break;
      case 'softDrop': {
        const now = performance.now();
        if (now - this.lastSoftDrop > 45) {
          this.lastSoftDrop = now;
          this.play('softDrop');
        }
        break;
      }
      case 'hardDrop':
        this.play('hardDrop');
        this.vibrate(15);
        break;
      case 'lock':
        this.play('lock');
        break;
      case 'land':
        this.play('land');
        break;
      case 'hold':
        this.play('hold');
        break;
      case 'holdFail':
        this.play('holdFail');
        break;
      case 'lineClear':
        if (event.perfectClear) {
          this.play('perfectClear');
          this.duck(600);
          this.vibrate([20, 30, 40]);
        } else if (event.tspin !== 'none') {
          this.play(event.tspin === 'mini' ? 'tspinMini' : 'tspin');
          this.duck(300);
          this.vibrate(25);
        } else if (event.count >= 4) {
          this.play('tetris');
          this.duck(400);
          this.vibrate([20, 20, 40]);
        } else {
          this.play(event.count === 1 ? 'clear1' : event.count === 2 ? 'clear2' : 'clear3');
          this.vibrate(10 * event.count);
        }
        if (event.combo > 0) this.play('combo');
        if (event.b2b) this.play('b2b');
        break;
      case 'tspin':
        this.play(event.mini ? 'tspinMini' : 'tspin');
        break;
      case 'levelUp':
        this.play('levelUp');
        this.setLevel(event.level);
        break;
      case 'gameOver':
        this.play('gameOver');
        this.stopMusic();
        this.vibrate([60, 40, 60]);
        break;
      case 'finished':
        this.play('finished');
        this.stopMusic();
        break;
      default:
        break;
    }
    const danger = stackHeight(state.board) >= DANGER_ROW;
    if (danger !== this.dangerOn) {
      this.dangerOn = danger;
      this.music?.setDanger(danger);
    }
  }

  suspend(): void {
    void this.ctx?.suspend();
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  private applyVolumes(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.sfxBus || !this.musicBus) return;
    const now = ctx.currentTime;
    const m = this.settings.muted ? 0 : this.settings.master;
    this.master.gain.setTargetAtTime(m, now, 0.01);
    this.sfxBus.gain.setTargetAtTime(this.settings.sfx, now, 0.01);
    this.musicBus.gain.setTargetAtTime(this.settings.music, now, 0.01);
  }
}
