/** Secuenciador de pasos (16avos) con tema chiptune original y capa de "peligro". ADR-0006. */

const midiToFreq = (m: number): number => 440 * 2 ** ((m - 69) / 12);

/** 0 = silencio, -1 = ligadura (mantener). 4 compases × 16 pasos. Progresión Am · G · F · E. */
const LEAD: readonly number[] = [
  69, -1, 72, -1, 71, -1, 69, -1, 64, -1, 67, -1, 69, -1, -1, 0, 71, -1, 74, -1, 72, -1, 71, -1, 67,
  -1, 69, 71, -1, -1, 0, 0, 72, -1, 76, -1, 74, -1, 72, -1, 69, -1, 71, -1, 72, -1, -1, 0, 71, -1,
  69, -1, 67, -1, 64, -1, 65, -1, 67, -1, 64, -1, -1, 0,
];
const BASS: readonly number[] = [
  45, 0, 45, 0, 45, 0, 52, 0, 45, 0, 45, 0, 52, 0, 55, 0, 43, 0, 43, 0, 43, 0, 50, 0, 43, 0, 43, 0,
  50, 0, 47, 0, 41, 0, 41, 0, 41, 0, 48, 0, 41, 0, 41, 0, 48, 0, 45, 0, 40, 0, 40, 0, 40, 0, 47, 0,
  40, 0, 40, 0, 47, 0, 52, 0,
];
const CHORDS: readonly (readonly number[])[] = [
  [69, 72, 76],
  [67, 71, 74],
  [65, 69, 72],
  [64, 68, 71],
];
const KICK_STEPS = new Set([0, 6, 8, 14]);
const SNARE_STEPS = new Set([4, 12]);

export class MusicPlayer {
  private bpm = 128;
  private step = 0;
  private nextNoteTime = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private playing = false;
  private danger = false;
  private noiseBuffer: AudioBuffer | null = null;
  private readonly lookaheadMs = 30;
  private readonly scheduleAheadS = 0.12;

  constructor(
    private readonly ctx: AudioContext,
    private readonly out: AudioNode,
  ) {}

  get isPlaying(): boolean {
    return this.playing;
  }

  setLevel(level: number): void {
    this.bpm = Math.min(176, 128 + Math.max(0, level - 1) * 4);
  }

  setDanger(on: boolean): void {
    this.danger = on;
  }

  start(): void {
    if (this.playing) return;
    this.playing = true;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.timer = setInterval(() => {
      this.schedule();
    }, this.lookaheadMs);
  }

  stop(): void {
    this.playing = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private schedule(): void {
    const stepS = 60 / this.bpm / 4;
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadS) {
      this.playStep(this.step, this.nextNoteTime, stepS);
      this.nextNoteTime += stepS;
      this.step = (this.step + 1) % LEAD.length;
    }
  }

  private playStep(step: number, time: number, stepS: number): void {
    const lead = LEAD[step] ?? 0;
    if (lead > 0) {
      let len = 1;
      while (LEAD[(step + len) % LEAD.length] === -1) len++;
      this.tone(midiToFreq(lead), time, stepS * len * 0.9, 'square', 0.09, 2200);
    }
    const bass = BASS[step] ?? 0;
    if (bass > 0) this.tone(midiToFreq(bass), time, stepS * 0.8, 'triangle', 0.16, 900);
    if (KICK_STEPS.has(step % 16)) this.kick(time);
    if (SNARE_STEPS.has(step % 16)) this.noise(time, 0.08, 0.12, 1800);
    if (step % 2 === 1) this.noise(time, 0.03, 0.035, 7000);
    if (this.danger) {
      const chord = CHORDS[Math.floor(step / 16) % CHORDS.length] ?? CHORDS[0] ?? [];
      const note = chord[step % chord.length];
      if (note !== undefined)
        this.tone(midiToFreq(note + 12), time, stepS * 0.5, 'sawtooth', 0.045, 1600);
    }
  }

  private tone(
    freq: number,
    time: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    cutoff: number,
  ): void {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(cutoff, time);
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(gain, time + 0.005);
    g.gain.setTargetAtTime(0, time + dur, 0.02);
    osc.connect(f).connect(g).connect(this.out);
    osc.start(time);
    osc.stop(time + dur + 0.1);
  }

  private kick(time: number): void {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
    g.gain.setValueAtTime(0.35, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    osc.connect(g).connect(this.out);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  private noise(time: number, dur: number, gain: number, cutoff: number): void {
    if (!this.noiseBuffer) {
      const len = Math.floor(this.ctx.sampleRate * 0.25);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buf;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.setValueAtTime(cutoff, time);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    src.connect(f).connect(g).connect(this.out);
    src.start(time);
    src.stop(time + dur + 0.02);
  }
}
