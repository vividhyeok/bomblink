import type { GameSnapshot } from "../game/Types";

export class HudRenderer {
  render(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot): void {
    // 1. FLAMES banner (top right)
    ctx.fillStyle = "#236ca9"; // dark blue border/shadow
    ctx.fillRect(100, 10, 140, 26);
    ctx.fillStyle = "#4eaae3"; // light blue fill
    ctx.fillRect(102, 12, 136, 22);
    this.text(ctx, `FLAMES ( ${snapshot.flamesRemaining.toString().padStart(3, "0")} )`, 110, 17, "#ffffff", 12);

    // 2. LV Badge (top left, circular)
    ctx.fillStyle = "#19568f"; // dark shadow border
    ctx.beginPath();
    ctx.arc(38, 26, 32, 0, Math.PI * 2);
    ctx.fill();
    
    // Bottom triangle for the LV badge teardrop shape
    ctx.beginPath();
    ctx.moveTo(22, 48);
    ctx.lineTo(54, 48);
    ctx.lineTo(38, 62);
    ctx.fill();

    ctx.fillStyle = "#7ad4f4"; // light cyan inner
    ctx.beginPath();
    ctx.arc(36, 24, 32, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(20, 46);
    ctx.lineTo(52, 46);
    ctx.lineTo(36, 60);
    ctx.fill();

    // "LV" text
    this.text(ctx, "LV", 16, 17, "#17488a", 16);
    
    // White oval/circle for level number
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(55, 24, 11, 0, Math.PI * 2);
    ctx.fill();
    this.text(ctx, snapshot.level.toString().padStart(2, "0"), 48, 19, "#17488a", 11);

    // 3. SCORE Banner (just above play area)
    ctx.fillStyle = "#cf8729"; // shadow/border
    ctx.fillRect(40, 46, 160, 26);
    ctx.fillStyle = "#fab656"; // gold base
    ctx.fillRect(42, 48, 156, 22);
    
    // Score string (e.g. 00031500)
    const scoreStr = snapshot.score.toString().padStart(8, "0");
    this.text(ctx, scoreStr, 50, 52, "#ffffff", 14);

    if (snapshot.debugMode) {
      const fireSeconds = Math.max(0, Math.ceil(snapshot.nextFlameIn));
      const pressureTicks = Math.max(0, Math.ceil(snapshot.pressureIn));
      const side = snapshot.nextFlameSide === "left" ? "L" : "R";
      this.text(ctx, `P${pressureTicks.toString().padStart(2, "0")}`, 154, 76, snapshot.dangerWarning ? "#ffdf70" : "#c9f4ff", 9);
      this.text(ctx, `F${fireSeconds.toString().padStart(2, "0")}`, 174, 76, snapshot.fireWarning ? "#ffdf70" : "#ffe36a", 9);
      this.text(ctx, `S${side}`, 194, 76, snapshot.fireWarning ? "#ffdf70" : "#ffe36a", 9);
    }

    if (snapshot.muted) {
      this.text(ctx, "MUTE", 210, 38, "#ffdf70", 8);
    }
  }

  private text(
    ctx: CanvasRenderingContext2D,
    value: string,
    x: number,
    y: number,
    color: string,
    size: number
  ): void {
    ctx.font = `${size}px "Courier New", monospace`;
    ctx.textBaseline = "top";
    // Drop shadow
    ctx.fillStyle = "#10335e";
    ctx.fillText(value, x + 1, y + 1);
    // Main text
    ctx.fillStyle = color;
    ctx.fillText(value, x, y);
  }
}
