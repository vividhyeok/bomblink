export class ScreenShake {
  private time = 0;
  private duration = 0;
  private strength = 0;

  trigger(count: number): void {
    if (count < 4) {
      return;
    }

    this.duration = count >= 10 ? 0.16 : count >= 6 ? 0.13 : 0.1;
    this.time = this.duration;
    this.strength = count >= 10 ? 4 : count >= 6 ? 3 : 2;
  }

  update(dt: number): { x: number; y: number } {
    if (this.time <= 0) {
      return { x: 0, y: 0 };
    }

    this.time = Math.max(0, this.time - dt);
    const power = this.time / this.duration;
    const n = Math.sin(this.time * 220) * this.strength * power;
    const m = Math.cos(this.time * 170) * this.strength * power;

    return {
      x: Math.round(n),
      y: Math.round(m)
    };
  }
}
