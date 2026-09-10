import { BoardRenderer } from "./BoardRenderer";
import { EffectRenderer } from "./EffectRenderer";
import { HudRenderer } from "./HudRenderer";
import type { GameSnapshot } from "../game/Types";

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly hud = new HudRenderer();
  private readonly board = new BoardRenderer();
  private readonly effects = new EffectRenderer();

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  render(snapshot: GameSnapshot): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    this.clear(snapshot);
    this.drawBackground(snapshot);
    this.hud.render(ctx, snapshot);

    ctx.save();
    ctx.translate(snapshot.shakeX, snapshot.shakeY);
    this.board.render(
      ctx,
      snapshot.layout,
      snapshot.cells,
      snapshot.cursor,
      snapshot.dangerRow,
      snapshot.dangerWarning,
      snapshot.phase,
      snapshot.nextFlameRow,
      snapshot.nextFlameSide,
      snapshot.fireWarning
    );
    this.effects.render(ctx, snapshot.layout, snapshot.flame, snapshot.burns, snapshot.flashes, snapshot.particles);
    ctx.restore();

    this.drawOverlay(snapshot);

    if (snapshot.combo >= 4 && (snapshot.phase === "exploding" || snapshot.phase === "falling" || snapshot.phase === "fuseBurning")) {
      this.drawComboPopup(snapshot);
    }

    ctx.restore();
  }

  private drawComboPopup(snapshot: GameSnapshot): void {
    const ctx = this.ctx;
    const cx = snapshot.canvasWidth / 2;
    const cy = snapshot.layout.y + 64;
    const bounce = Math.sin(performance.now() / 95) * 2;

    ctx.save();
    ctx.translate(cx, cy + bounce);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 11px 'Courier New', monospace";
    ctx.fillStyle = "#fff4bd";
    ctx.strokeStyle = "rgba(64,39,32,0.82)";
    ctx.lineWidth = 3;
    ctx.strokeText(`${snapshot.combo} COMBO`, 0, 0);
    ctx.fillText(`${snapshot.combo} COMBO`, 0, 0);
    ctx.restore();
  }

  private clear(snapshot: GameSnapshot): void {
    this.ctx.clearRect(0, 0, snapshot.canvasWidth, snapshot.canvasHeight);
  }

  /**
   * A low-resolution blue LCD-style backdrop inspired by the feature-phone game.
   * It intentionally avoids copying the original background image.
   */
  private drawBackground(snapshot: GameSnapshot): void {
    const ctx = this.ctx;
    const { canvasWidth, canvasHeight } = snapshot;
    const grad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    grad.addColorStop(0, "#d4edf8");
    grad.addColorStop(0.22, "#8dc8e9");
    grad.addColorStop(1, "#58a4d7");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const blocks = [
      [6, 75, 28, 64], [2, 156, 20, 74], [219, 88, 17, 88], [217, 208, 20, 68],
      [72, 5, 46, 17], [129, 15, 34, 12], [8, 286, 27, 43], [207, 293, 29, 38]
    ] as const;
    for (let i = 0; i < blocks.length; i += 1) {
      const [x, y, w, h] = blocks[i];
      ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.10)" : "rgba(36,111,166,0.09)";
      ctx.fillRect(x, y, w, h);
    }

    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    for (let y = 8; y < canvasHeight; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }
  }

  private drawOverlay(snapshot: GameSnapshot): void {
    if (!snapshot.message) return;

    const ctx = this.ctx;
    const isBanner = snapshot.phase === "banner" || snapshot.phase === "ready";
    const isResult = snapshot.phase === "result" || snapshot.phase === "gameOver";
    const y = isResult ? 116 : 134;
    const h = isResult ? 86 : 48;

    ctx.fillStyle = "rgba(28,67,99,0.84)";
    ctx.fillRect(32, y, 176, h);
    ctx.strokeStyle = "#f1d176";
    ctx.lineWidth = 2;
    ctx.strokeRect(34, y + 2, 172, h - 4);
    ctx.fillStyle = "#fff5bb";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    if (isResult) {
      ctx.font = "bold 14px \"Courier New\", monospace";
      ctx.fillText(snapshot.message, 120, y + 17);
      ctx.fillStyle = "#e5f6ff";
      ctx.font = "bold 8px \"Courier New\", monospace";
      ctx.fillText(`LV ${snapshot.level.toString().padStart(2, "0")}`, 120, y + 38);
      ctx.fillText(`SCORE ${snapshot.score.toString().padStart(8, "0")}`, 120, y + 51);
      ctx.fillText(`BEST ${snapshot.bestCombo.toString().padStart(2, "0")}  BOMBS ${snapshot.totalExploded.toString().padStart(3, "0")}`, 120, y + 65);
      ctx.textAlign = "left";
      return;
    }

    ctx.font = `bold ${isBanner ? 16 : 14}px "Courier New", monospace`;
    ctx.fillText(snapshot.message, 120, y + 20);

    if (isBanner) {
      ctx.fillStyle = "#d9effa";
      ctx.font = "bold 8px \"Courier New\", monospace";
      ctx.fillText(snapshot.mode === "endless" ? "ENDLESS" : "100 ATTACK", 120, y + 36);
    }

    ctx.textAlign = "left";
  }
}
