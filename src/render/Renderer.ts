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

    this.drawFooter(snapshot);
    this.drawOverlay(snapshot);
    
    // Draw COMBO popup during exploding/falling phases
    if (snapshot.combo >= 2 && (snapshot.phase === "exploding" || snapshot.phase === "falling" || snapshot.phase === "fuseBurning")) {
      this.drawComboPopup(snapshot);
    }
    
    ctx.restore();
  }

  private drawComboPopup(snapshot: GameSnapshot): void {
    const ctx = this.ctx;
    const cx = snapshot.canvasWidth / 2;
    const cy = snapshot.layout.y + snapshot.layout.rows * snapshot.layout.cellSize * 0.4; // Slightly above center

    // Add a slight bounce based on time
    const bounce = Math.sin(performance.now() / 80) * 3;

    ctx.save();
    ctx.translate(cx, cy + bounce);
    
    // Text styling
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 24px 'Trebuchet MS', Arial, sans-serif";
    
    // COMBO !!
    ctx.fillStyle = "#ffe23e";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;
    ctx.strokeText("COMBO !!", 0, -15);
    ctx.fillText("COMBO !!", 0, -15);

    // Number
    ctx.font = "bold 36px 'Trebuchet MS', Arial, sans-serif";
    ctx.fillStyle = "#ff6b3e";
    ctx.strokeText(snapshot.combo.toString(), 0, 15);
    ctx.fillText(snapshot.combo.toString(), 0, 15);

    ctx.restore();
  }

  private clear(snapshot: GameSnapshot): void {
    this.ctx.clearRect(0, 0, snapshot.canvasWidth, snapshot.canvasHeight);
  }

  private drawBackground(snapshot: GameSnapshot): void {
    const ctx = this.ctx;
    const { canvasWidth, canvasHeight } = snapshot;

    // Bright cyan/blue background for the entire canvas
    ctx.fillStyle = "#1ba1e2";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Faint vertical and horizontal grid lines for texture
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    for (let x = 0; x < canvasWidth; x += 16) {
      ctx.fillRect(x, 0, 1, canvasHeight);
    }
    for (let y = 0; y < canvasHeight; y += 16) {
      ctx.fillRect(0, y, canvasWidth, 1);
    }
  }

  private drawFooter(snapshot: GameSnapshot): void {
    // Intentionally empty, footer removed to prevent obstructing the play area.
  }

  private drawOverlay(snapshot: GameSnapshot): void {
    if (!snapshot.message) {
      return;
    }

    const ctx = this.ctx;
    const isBanner = snapshot.phase === "banner" || snapshot.phase === "ready";
    const isResult = snapshot.phase === "result" || snapshot.phase === "gameOver";
    ctx.fillStyle = isBanner ? "rgb(6 12 24 / 0.86)" : "rgb(6 12 24 / 0.76)";
    ctx.fillRect(24, isResult ? 112 : 128, 192, isResult ? 94 : 58);
    ctx.strokeStyle = "#ffcd5a";
    ctx.lineWidth = 2;
    ctx.strokeRect(28, isResult ? 116 : 132, 184, isResult ? 86 : 50);
    ctx.fillStyle = "#fff6a8";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    if (isResult) {
      ctx.font = "16px \"Courier New\", monospace";
      ctx.fillText(snapshot.message, 120, 132);
      ctx.fillStyle = "#c9f4ff";
      ctx.font = "9px \"Courier New\", monospace";
      ctx.fillText(`LV ${snapshot.level.toString().padStart(2, "0")}`, 120, 151);
      ctx.fillText(`SCORE ${snapshot.score.toString().padStart(5, "0")}`, 120, 164);
      ctx.fillText(`BEST COMBO ${snapshot.bestCombo.toString().padStart(2, "0")}`, 120, 177);
      ctx.fillText(`BOMBS ${snapshot.totalExploded.toString().padStart(3, "0")}`, 120, 190);
      ctx.textAlign = "left";
      return;
    }

    ctx.font = `${isBanner ? 18 : 16}px "Courier New", monospace`;
    ctx.fillText(snapshot.message, 120, 153);

    if (isBanner) {
      ctx.fillStyle = "#c9f4ff";
      ctx.font = "9px \"Courier New\", monospace";
      ctx.fillText("100 FLAMES", 120, 171);
    }

    ctx.textAlign = "left";
  }
}
