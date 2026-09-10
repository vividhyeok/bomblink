import type { GameSnapshot } from "../game/Types";

export class HudRenderer {
  render(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot): void {
    this.drawLevelBurst(ctx, snapshot.level);
    this.drawModeReadout(ctx, snapshot);
    this.drawScoreRibbon(ctx, snapshot.score);

    if (snapshot.debugMode) {
      const fireSeconds = Math.max(0, Math.ceil(snapshot.nextFlameIn));
      const pressureTicks = Math.max(0, Math.ceil(snapshot.pressureIn));
      const side = snapshot.nextFlameSide === "left" ? "L" : "R";
      this.pixelText(ctx, `UP ${pressureTicks.toString().padStart(2, "0")}`, 137, 34, "#edf8ff", 8);
      this.pixelText(ctx, `F ${fireSeconds.toString().padStart(2, "0")} ${side}`, 183, 34, "#fff0a3", 8);
    }

    if (snapshot.muted) {
      this.pixelText(ctx, "MUTE", 207, 58, "#7b3f25", 7);
    }
  }

  private drawLevelBurst(ctx: CanvasRenderingContext2D, level: number): void {
    ctx.save();
    ctx.translate(37, 26);
    ctx.fillStyle = "#f6e883";
    ctx.strokeStyle = "#d6be4f";
    ctx.lineWidth = 1;

    const points = 14;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i += 1) {
      const angle = -Math.PI / 2 + (Math.PI * i) / points;
      const radius = i % 2 === 0 ? 33 : 25;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    this.pixelText(ctx, "LV.", -24, -11, "#315377", 11);
    this.pixelText(ctx, level.toString().padStart(2, "0"), -6, -8, "#25476d", 19);
    ctx.restore();
  }

  private drawModeReadout(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot): void {
    const label = snapshot.mode === "endless" ? "ENDLESS" : "FLAMES";
    const value = snapshot.mode === "endless" ? "" : `(${snapshot.flamesRemaining.toString().padStart(3, "0")})`;

    ctx.fillStyle = "rgba(244,251,255,0.64)";
    ctx.fillRect(109, 8, 126, 24);
    ctx.strokeStyle = "rgba(61,103,140,0.58)";
    ctx.lineWidth = 1;
    ctx.strokeRect(109.5, 8.5, 125, 23);

    this.pixelText(ctx, label, 116, 11, "#55728d", 9);
    if (value) this.pixelText(ctx, value, 173, 10, "#354c65", 13);
  }

  private drawScoreRibbon(ctx: CanvasRenderingContext2D, score: number): void {
    ctx.fillStyle = "#d88c37";
    ctx.fillRect(43, 44, 157, 25);
    ctx.fillStyle = "#f3b85d";
    ctx.fillRect(46, 46, 151, 20);
    ctx.fillStyle = "rgba(255,245,185,0.56)";
    ctx.fillRect(48, 47, 147, 5);

    this.pixelText(ctx, "TOTAL", 110, 35, "#7b5a32", 8);
    this.pixelText(ctx, score.toString().padStart(8, "0"), 73, 48, "#fff8d2", 15);
  }

  private pixelText(
    ctx: CanvasRenderingContext2D,
    value: string,
    x: number,
    y: number,
    color: string,
    size: number
  ): void {
    ctx.font = `bold ${size}px "Courier New", monospace`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(35,57,76,0.55)";
    ctx.fillText(value, x + 1, y + 1);
    ctx.fillStyle = color;
    ctx.fillText(value, x, y);
  }
}
