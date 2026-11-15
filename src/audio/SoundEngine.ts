export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  private rainGain: GainNode | null = null;
  private rainSource: AudioBufferSourceNode | null = null;

  private muted = false;
  private started = false;
  private signalTimer = 0;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.75, this.ctx.currentTime, 0.05);
    }
  }

  public init(): void {
    if (this.started) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.75;
    this.masterGain.connect(this.ctx.destination);

    // Engine synthesizer
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.value = 58;

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.value = 116;

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 260;
    this.engineFilter.Q.value = 2.5;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.04;

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();

    // Rain noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.04 * white) / 1.04;
      lastOut = data[i];
      data[i] *= 2.5;
    }
    this.rainSource = this.ctx.createBufferSource();
    this.rainSource.buffer = noiseBuffer;
    this.rainSource.loop = true;

    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1100;
    rainFilter.Q.value = 0.7;

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0;

    this.rainSource.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.masterGain);
    this.rainSource.start();

    this.started = true;
  }

  public updateEngine(
    speedKmh: number,
    rpmRatio: number,
    throttle: number,
    isElectric: boolean,
    isRaining: boolean,
    signalActive: boolean,
    dt: number
  ): void {
    if (!this.ctx || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter || !this.engineGain) return;
    if (this.ctx.state === 'suspended') return;

    const now = this.ctx.currentTime;
    const absSpeed = Math.abs(speedKmh);

    if (isElectric) {
      // Futuristic smooth EV hum
      this.engineOsc1.type = 'sine';
      this.engineOsc2.type = 'triangle';
      const baseFreq = 90 + absSpeed * 2.8 + throttle * 35;
      this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.06);
      this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.01, now, 0.06);
      this.engineFilter.frequency.setTargetAtTime(450 + absSpeed * 8, now, 0.08);
      const vol = 0.015 + Math.min(0.065, absSpeed * 0.0005 + throttle * 0.025);
      this.engineGain.gain.setTargetAtTime(vol, now, 0.06);
    } else {
      // Internal combustion engine rumble
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc2.type = 'triangle';
      const baseFreq = 46 + rpmRatio * 95 + absSpeed * 0.35;
      this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
      this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.98, now, 0.05);
      this.engineFilter.frequency.setTargetAtTime(190 + rpmRatio * 550 + throttle * 260, now, 0.06);
      const vol = 0.035 + throttle * 0.045 + rpmRatio * 0.04;
      this.engineGain.gain.setTargetAtTime(vol, now, 0.06);
    }

    // Rain ambience
    if (this.rainGain) {
      this.rainGain.gain.setTargetAtTime(isRaining ? 0.14 : 0, now, 0.4);
    }

    // Turn signal tick
    if (signalActive) {
      this.signalTimer += dt;
      if (this.signalTimer >= 0.48) {
        this.signalTimer = 0;
        this.playSignalTick();
      }
    } else {
      this.signalTimer = 0.4;
    }
  }

  private playSignalTick(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.025);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.035);
  }

  public playSignalCancelClick(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.022);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.026);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  public playHorn(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    this.init();
    const now = this.ctx.currentTime;
    [392, 493.88].forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1400;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.11, now + 0.02);
      gain.gain.setValueAtTime(0.11, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 0.26);
    });
  }

  public playCollision(intensity = 1): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.24);
    gain.gain.setValueAtTime(Math.min(0.45, 0.22 * intensity), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playPoliceSiren(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.linearRampToValueAtTime(1120, now + 0.25);
    osc.frequency.linearRampToValueAtTime(640, now + 0.5);
    osc.frequency.linearRampToValueAtTime(1120, now + 0.75);
    osc.frequency.linearRampToValueAtTime(640, now + 1.0);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1800;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.05);
    gain.gain.setValueAtTime(0.14, now + 0.85);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 1.1);
  }

  public playPhoneChime(type: 'offer' | 'message' | 'cash' | 'warning'): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const notes =
      type === 'offer'
        ? [587.33, 880, 1174.66]
        : type === 'cash'
        ? [523.25, 659.25, 783.99, 1046.5]
        : type === 'warning'
        ? [440, 311.13]
        : [783.99, 987.77];

    notes.forEach((freq, idx) => {
      const start = now + idx * 0.085;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  }

  public dispose(): void {
    try {
      this.engineOsc1?.stop();
      this.engineOsc2?.stop();
      this.rainSource?.stop();
      this.ctx?.close();
    } catch {
      // ignore dispose errors
    }
    this.started = false;
  }
}
