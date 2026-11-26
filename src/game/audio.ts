// Procedural Web Audio API music & sound effects engine (zero external audio files)
import { CafeMusicMood } from './types';

interface MoodConfig {
  stepMs: number;
  chords: number[][]; // 4-bar chord notes in Hz
  bass: number[];
  melodyScale: number[];
  leadWave: OscillatorType;
  chordWave: OscillatorType;
  isWaltz?: boolean;
}

const MOOD_CONFIGS: Record<CafeMusicMood, MoodConfig> = {
  bistro: {
    stepMs: 280,
    chords: [
      [293.66, 349.23, 440.0, 523.25], // Dm7
      [392.0, 493.88, 587.33, 659.25], // G13
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 261.63, 329.63, 392.0], // Am7
    ],
    bass: [146.83, 196.0, 130.81, 110.0],
    melodyScale: [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5],
    leadWave: 'triangle',
    chordWave: 'sine',
  },
  waltz: {
    stepMs: 310,
    isWaltz: true,
    chords: [
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 261.63, 329.63, 392.0], // Am7
      [349.23, 440.0, 523.25, 659.25], // Fmaj7
      [392.0, 493.88, 587.33, 698.46], // G7
    ],
    bass: [130.81, 110.0, 174.61, 196.0],
    melodyScale: [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77],
    leadWave: 'sine',
    chordWave: 'triangle',
  },
  tea: {
    stepMs: 330,
    chords: [
      [349.23, 440.0, 523.25, 659.25], // Fmaj7
      [293.66, 349.23, 440.0, 523.25], // Dm7
      [233.08, 293.66, 349.23, 440.0], // Bbmaj7
      [261.63, 329.63, 392.0, 466.16], // C7
    ],
    bass: [174.61, 146.83, 116.54, 130.81],
    melodyScale: [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5],
    leadWave: 'sine',
    chordWave: 'sine',
  },
  lofi: {
    stepMs: 340,
    chords: [
      [246.94, 293.66, 369.99, 440.0], // Bm7
      [329.63, 392.0, 493.88, 587.33], // Em9
      [220.0, 277.18, 329.63, 415.3], // Amaj7
      [293.66, 369.99, 440.0, 554.37], // Dmaj7
    ],
    bass: [123.47, 164.81, 110.0, 146.83],
    melodyScale: [440.0, 493.88, 554.37, 659.25, 739.99, 880.0],
    leadWave: 'sine',
    chordWave: 'triangle',
  },
  royal: {
    stepMs: 300,
    chords: [
      [293.66, 369.99, 440.0, 554.37], // Dmaj7
      [246.94, 293.66, 369.99, 440.0], // Bm7
      [392.0, 493.88, 587.33, 739.99], // Gmaj7
      [440.0, 554.37, 659.25, 783.99], // A7
    ],
    bass: [146.83, 123.47, 196.0, 220.0],
    melodyScale: [587.33, 659.25, 739.99, 880.0, 987.77, 1174.66],
    leadWave: 'triangle',
    chordWave: 'sine',
  },
  // Trattoria: lively tarantella-style 6/8 in A minor
  italian: {
    stepMs: 230,
    isWaltz: true,
    chords: [
      [220.0, 261.63, 329.63, 440.0], // Am
      [293.66, 349.23, 440.0, 587.33], // Dm
      [329.63, 415.3, 493.88, 587.33], // E7
      [220.0, 261.63, 329.63, 440.0], // Am
    ],
    bass: [110.0, 146.83, 164.81, 110.0],
    melodyScale: [440.0, 493.88, 523.25, 587.33, 659.25, 698.46, 830.61, 880.0],
    leadWave: 'triangle',
    chordWave: 'triangle',
  },
  // Ramen house: calm hirajoshi pentatonic
  japanese: {
    stepMs: 380,
    chords: [
      [293.66, 440.0, 587.33, 698.46], // D5 add m3
      [233.08, 349.23, 466.16, 587.33], // Bb
      [220.0, 329.63, 440.0, 523.25], // Am
      [293.66, 440.0, 587.33, 659.25], // D sus
    ],
    bass: [146.83, 116.54, 110.0, 146.83],
    melodyScale: [587.33, 659.25, 698.46, 880.0, 932.33, 1174.66],
    leadWave: 'sine',
    chordWave: 'sine',
  },
  // Taqueria: bright mariachi-style waltz in C
  mexican: {
    stepMs: 250,
    isWaltz: true,
    chords: [
      [261.63, 329.63, 392.0, 523.25], // C
      [349.23, 440.0, 523.25, 698.46], // F
      [392.0, 493.88, 587.33, 698.46], // G7
      [261.63, 329.63, 392.0, 523.25], // C
    ],
    bass: [130.81, 174.61, 196.0, 130.81],
    melodyScale: [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 1046.5],
    leadWave: 'triangle',
    chordWave: 'triangle',
  },
  // Caravanserai: Shur/Segah-flavoured mode with an augmented second
  azeri: {
    stepMs: 300,
    chords: [
      [293.66, 349.23, 440.0, 587.33], // Dm
      [196.0, 233.08, 293.66, 392.0], // Gm
      [220.0, 277.18, 329.63, 392.0], // A7
      [293.66, 349.23, 440.0, 587.33], // Dm
    ],
    bass: [146.83, 98.0, 110.0, 146.83],
    melodyScale: [587.33, 622.25, 739.99, 783.99, 880.0, 932.33, 1046.5, 1174.66],
    leadWave: 'triangle',
    chordWave: 'sine',
  },
};

const MELODY_PATTERNS: number[][] = [
  [0, 2, 4, 2, 3, 1, 2, -1],
  [2, 4, 5, 4, 2, 3, 1, -1],
  [0, 1, 2, 4, 5, 4, 2, 0],
  [4, 2, 1, 2, 3, 2, 0, -1],
];

class SoundManager {
  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private muted = false;
  private musicMuted = false;
  private musicActive = false;
  private musicMood: CafeMusicMood = 'bistro';
  private schedulerId: number | null = null;
  private nextStepTime = 0;
  private stepCounter = 0;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx || !this.musicGain) return;
        const target = document.hidden || this.muted || this.musicMuted || !this.musicActive ? 0 : 0.24;
        this.musicGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
      });
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    this.syncGainLevels();
  }

  public setMusicMuted(muted: boolean) {
    this.musicMuted = muted;
    this.syncGainLevels();
    if (!muted && this.musicActive) {
      this.startMusic();
    }
  }

  public setMusicTheme(mood: CafeMusicMood) {
    this.musicMood = mood;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private syncGainLevels() {
    if (!this.ctx || !this.sfxGain || !this.musicGain) return;
    const now = this.ctx.currentTime;
    this.sfxGain.gain.setTargetAtTime(this.muted ? 0 : 0.9, now, 0.03);
    const playMusic = !this.muted && !this.musicMuted && this.musicActive && !document.hidden;
    this.musicGain.gain.setTargetAtTime(playMusic ? 0.24 : 0, now, 0.08);
  }

  private ensureContext(allowWhenMuted = false): AudioContext | null {
    if (this.muted && !allowWhenMuted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-16, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.muted ? 0 : 0.9, this.ctx.currentTime);
      this.sfxGain.connect(this.compressor);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.musicGain.connect(this.compressor);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock() {
    this.ensureContext(true);
    this.syncGainLevels();
  }

  public startMusic() {
    this.musicActive = true;
    const ctx = this.ensureContext(true);
    if (!ctx) return;
    this.syncGainLevels();

    if (this.schedulerId !== null) return;
    this.nextStepTime = ctx.currentTime + 0.08;
    this.schedulerId = window.setInterval(() => this.scheduleMusicStep(), 120);
  }

  public stopMusic() {
    this.musicActive = false;
    this.syncGainLevels();
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
  }

  private scheduleMusicStep() {
    if (!this.ctx || !this.musicGain) return;
    if (this.muted || this.musicMuted || !this.musicActive || document.hidden) {
      this.nextStepTime = this.ctx.currentTime + 0.1;
      return;
    }

    const cfg = MOOD_CONFIGS[this.musicMood];
    const stepSec = cfg.stepMs / 1000;
    const lookahead = this.ctx.currentTime + 0.3;

    if (this.nextStepTime < this.ctx.currentTime - 0.5) {
      this.nextStepTime = this.ctx.currentTime + 0.05;
    }

    while (this.nextStepTime < lookahead) {
      const stepsPerBar = cfg.isWaltz ? 6 : 8;
      const barIndex = Math.floor(this.stepCounter / stepsPerBar) % cfg.chords.length;
      const stepInBar = this.stepCounter % stepsPerBar;

      this.triggerMusicNotes(this.nextStepTime, barIndex, stepInBar, stepsPerBar, stepSec, cfg);
      this.nextStepTime += stepSec;
      this.stepCounter++;
    }
  }

  private triggerMusicNotes(
    time: number,
    barIdx: number,
    stepInBar: number,
    stepsPerBar: number,
    stepSec: number,
    cfg: MoodConfig
  ) {
    if (!this.ctx || !this.musicGain) return;
    const chord = cfg.chords[barIdx];
    const bassFreq = cfg.bass[barIdx];

    // Warm chord pad on beat 1 and light comp on off-beat
    if (stepInBar === 0 || (cfg.isWaltz ? stepInBar === 2 || stepInBar === 4 : stepInBar === 3 || stepInBar === 6)) {
      const isAccent = stepInBar === 0;
      const dur = isAccent ? stepSec * 2.8 : stepSec * 1.1;
      const vol = isAccent ? 0.055 : 0.032;

      chord.forEach((freq, idx) => {
        if (!this.ctx || !this.musicGain) return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        osc.type = cfg.chordWave;
        osc.frequency.setValueAtTime(freq, time + idx * 0.015);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, time);

        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(vol, time + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0005, time + dur);

        osc.connect(filter).connect(gain).connect(this.musicGain);
        osc.start(time + idx * 0.015);
        osc.stop(time + dur + 0.05);
      });
    }

    // Warm plucked bass on root & fifth
    if (stepInBar === 0 || (!cfg.isWaltz && stepInBar === 4)) {
      const freq = stepInBar === 0 ? bassFreq : bassFreq * 1.498;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, time);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.14, time + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.001, time + stepSec * 1.8);
      osc.connect(filter).connect(gain).connect(this.musicGain);
      osc.start(time);
      osc.stop(time + stepSec * 1.9);
    }

    // Gentle acoustic cafe melody
    const phraseIdx = Math.floor(this.stepCounter / (stepsPerBar * 4)) % MELODY_PATTERNS.length;
    const pattern = MELODY_PATTERNS[(phraseIdx + barIdx) % MELODY_PATTERNS.length];
    const scaleIdx = pattern[stepInBar % pattern.length];
    if (scaleIdx >= 0 && stepInBar % 2 === 0) {
      const mFreq = cfg.melodyScale[scaleIdx % cfg.melodyScale.length];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = cfg.leadWave;
      osc.frequency.setValueAtTime(mFreq, time);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.065, time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0005, time + stepSec * 1.45);
      osc.connect(gain).connect(this.musicGain);
      osc.start(time);
      osc.stop(time + stepSec * 1.5);
    }

    // Subtle soft woodblock / brush tap
    if (stepInBar % 2 === 1) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(stepInBar === 3 ? 980 : 760, time);
      osc.frequency.exponentialRampToValueAtTime(340, time + 0.028);
      gain.gain.setValueAtTime(0.016, time);
      gain.gain.exponentialRampToValueAtTime(0.0005, time + 0.03);
      osc.connect(gain).connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.035);
    }
  }

  public playClick() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.055);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain).connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  public playSizzle() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 0.24);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.45));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.Q.setValueAtTime(1.4, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    noise.connect(filter).connect(gain).connect(this.sfxGain);
    noise.start(now);
  }

  public playBell() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    [1318.5, 1760].forEach((freq, idx) => {
      if (!this.sfxGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      gain.gain.setValueAtTime(0.1, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.35);
      osc.connect(gain).connect(this.sfxGain);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.36);
    });
  }

  public playOrderArrive() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    [783.99, 1046.5].forEach((freq, idx) => {
      if (!this.sfxGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.07;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(gain).connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }

  public playPerfectCook() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    [880, 1174.66, 1760].forEach((freq, idx) => {
      if (!this.sfxGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.05;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain).connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  public playCash() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const notes = [880, 1174.66, 1567.98];
    notes.forEach((freq, i) => {
      if (!this.sfxGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.055;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain).connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  public playClean() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.14);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain).connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playUnlock() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    [587.33, 739.99, 880, 1174.66].forEach((freq, i) => {
      if (!this.sfxGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.055;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain).connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  /** Locked machine turning real: a soft rising shimmer, then a bright two-note chime. */
  public playMaterialize() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const sweep = ctx.createOscillator();
    const sg = ctx.createGain();
    sweep.type = 'triangle';
    sweep.frequency.setValueAtTime(320, now);
    sweep.frequency.exponentialRampToValueAtTime(1400, now + 0.75);
    sg.gain.setValueAtTime(0.0001, now);
    sg.gain.exponentialRampToValueAtTime(0.05, now + 0.12);
    sg.gain.exponentialRampToValueAtTime(0.0008, now + 0.8);
    sweep.connect(sg).connect(this.sfxGain);
    sweep.start(now);
    sweep.stop(now + 0.82);
    [1046.5, 1568].forEach((freq, i) => {
      if (!this.sfxGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + 0.78 + i * 0.09;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain).connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }

  public playThemeApply() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 987.77, 1318.5].forEach((freq, i) => {
      if (!this.sfxGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.06;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      osc.connect(gain).connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }

  public playCustomerUnhappy() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    [392.0, 311.13].forEach((freq, i) => {
      if (!this.sfxGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.1;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain).connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  public playLevelUp() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      if (!this.sfxGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.08;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.13, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain).connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.37);
    });
  }

  public playEngineStart() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(65, now);
    osc.frequency.exponentialRampToValueAtTime(145, now + 0.24);
    osc.frequency.exponentialRampToValueAtTime(92, now + 0.45);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, now);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    osc.connect(filter).connect(gain).connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.5);
  }
}

export const sound = new SoundManager();

