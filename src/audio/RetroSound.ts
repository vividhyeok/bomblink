export class RetroSound {
  muted = false;

  private context: AudioContext | null = null;

  bindUnlock(unlock: (callback: () => void) => void): void {
    unlock(() => {
      void this.ensureContext()?.resume();
    });
  }

  toggleMute(): void {
    this.muted = !this.muted;
  }

  move(): void {
    this.beep(660, 0.025, "square", 0.04);
  }

  rotate(): void {
    this.beep(880, 0.04, "square", 0.045);
    this.beep(1180, 0.025, "square", 0.03, 0.028);
  }

  deny(): void {
    this.beep(160, 0.07, "sawtooth", 0.05);
  }

  flame(): void {
    this.noise(0.09, 0.035);
  }

  ignite(): void {
    this.beep(1320, 0.035, "square", 0.05);
  }

  explode(count: number): void {
    this.noise(0.08 + Math.min(count, 10) * 0.006, 0.09);
    this.beep(120 - Math.min(count, 8) * 6, 0.06, "sawtooth", 0.055);
  }

  land(): void {
    this.beep(230, 0.05, "square", 0.035);
  }

  clear(): void {
    this.beep(740, 0.08, "square", 0.05);
    this.beep(960, 0.08, "square", 0.05, 0.08);
    this.beep(1240, 0.12, "square", 0.05, 0.16);
  }

  gameOver(): void {
    this.beep(220, 0.12, "sawtooth", 0.05);
    this.beep(150, 0.18, "sawtooth", 0.05, 0.12);
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) {
      return null;
    }

    if (!this.context) {
      this.context = new AudioContext();
    }

    return this.context;
  }

  private beep(frequency: number, duration: number, type: OscillatorType, volume: number, delay = 0): void {
    const context = this.ensureContext();

    if (!context) {
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    const end = start + duration;

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(end + 0.01);
  }

  private noise(duration: number, volume: number): void {
    const context = this.ensureContext();

    if (!context) {
      return;
    }

    const bufferSize = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = context.createBufferSource();
    const gain = context.createGain();
    const start = context.currentTime;

    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(context.destination);
    source.start(start);
    source.stop(start + duration);
  }
}
