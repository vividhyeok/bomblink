import type { Bomb } from "../game/Types";

export class BombRenderer {
  render(ctx: CanvasRenderingContext2D, bomb: Bomb, cellSize: number): void {
    const x = Math.round(bomb.visualX);
    const y = Math.round(bomb.visualY);
    const pulse = bomb.state === "ignited" ? Math.sin(bomb.stateAge * 35) * 1.2 : 0;
    const explode = bomb.state === "exploding" ? Math.min(1, bomb.stateAge / 0.12) : 0;

    ctx.save();
    ctx.translate(x, y);

    if (bomb.state === "exploding") {
      this.drawExplosionSilhouette(ctx, bomb, cellSize, explode);
      ctx.restore();
      return;
    }

    if (bomb.kind === "obstruction") {
      this.drawObstruction(ctx, cellSize, pulse, bomb.state === "ignited");
    } else if (bomb.kind === "bonus") {
      this.drawBonusSegment(ctx, bomb, cellSize, pulse, bomb.state === "ignited");
    } else {
      this.drawNormal(ctx, cellSize, pulse, bomb.state === "ignited");
    }

    ctx.restore();
  }

  private drawNormal(ctx: CanvasRenderingContext2D, cellSize: number, pulse: number, ignited: boolean): void {
    const radius = cellSize * 0.31 + pulse;
    const gradient = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, 0, 0, 0, radius);
    gradient.addColorStop(0, ignited ? "#ffe873" : "#72b8ff");
    gradient.addColorStop(0.28, ignited ? "#ff9d2e" : "#2869c7");
    gradient.addColorStop(0.78, ignited ? "#d7471f" : "#183f88");
    gradient.addColorStop(1, "#08162d");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#061227";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.arc(-radius * 0.34, -radius * 0.34, radius * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawObstruction(ctx: CanvasRenderingContext2D, cellSize: number, pulse: number, ignited: boolean): void {
    const half = cellSize * 0.31 + pulse;
    ctx.fillStyle = ignited ? "#f59e0b" : "#42677b";
    ctx.fillRect(-half, -half, half * 2, half * 2);
    ctx.strokeStyle = "#102633";
    ctx.lineWidth = 3;
    ctx.strokeRect(-half, -half, half * 2, half * 2);

    ctx.fillStyle = ignited ? "#fff1a8" : "#a8cbd9";
    ctx.fillRect(-half * 0.56, -half * 0.58, half * 1.12, half * 0.28);
    ctx.fillStyle = "#203a48";
    ctx.fillRect(-half * 0.17, -half * 0.86, half * 0.34, half * 0.25);

    // Fixed-orientation mark. The square bomb is intentionally non-rotatable;
    // its fuse can still change vertically when the whole bomb falls a cell.
    ctx.strokeStyle = "rgba(255,255,255,0.88)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-half * 0.42, half * 0.18);
    ctx.lineTo(half * 0.42, half * 0.7);
    ctx.moveTo(half * 0.42, half * 0.18);
    ctx.lineTo(-half * 0.42, half * 0.7);
    ctx.stroke();
  }

  /**
   * A B2/B3/B4 is one horizontal rigid bomb. Each logical cell draws one segment
   * of the same orange body; only the anchor segment carries the external fuse and
   * label, so the player does not mistake the piece for several independent bombs.
   */
  private drawBonusSegment(ctx: CanvasRenderingContext2D, bomb: Bomb, cellSize: number, pulse: number, ignited: boolean): void {
    const halfH = cellSize * 0.285 + pulse * 0.35;
    const halfW = cellSize * 0.5 + 0.8;
    const first = bomb.pieceIndex === 0;
    const last = bomb.pieceIndex === bomb.bonusSize - 1;

    ctx.fillStyle = ignited ? "#fff06a" : "#ffb329";
    ctx.fillRect(-halfW, -halfH, halfW * 2, halfH * 2);

    // Rounded end caps make adjacent segments read as one long capsule.
    if (first) {
      ctx.beginPath();
      ctx.arc(-halfW + halfH, 0, halfH, Math.PI / 2, Math.PI * 1.5);
      ctx.lineTo(-halfW + halfH, -halfH);
      ctx.lineTo(0, -halfH);
      ctx.lineTo(0, halfH);
      ctx.closePath();
      ctx.fill();
    }
    if (last) {
      ctx.beginPath();
      ctx.arc(halfW - halfH, 0, halfH, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(halfW - halfH, halfH);
      ctx.lineTo(0, halfH);
      ctx.lineTo(0, -halfH);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = "#7a2e0c";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-halfW, -halfH);
    ctx.lineTo(halfW, -halfH);
    ctx.moveTo(-halfW, halfH);
    ctx.lineTo(halfW, halfH);
    if (first) {
      ctx.moveTo(-halfW, -halfH * 0.68);
      ctx.lineTo(-halfW, halfH * 0.68);
    }
    if (last) {
      ctx.moveTo(halfW, -halfH * 0.68);
      ctx.lineTo(halfW, halfH * 0.68);
    }
    ctx.stroke();

    // A subtle divider shows cell occupancy without implying separate bombs.
    if (!last) {
      ctx.strokeStyle = "rgba(122,46,12,0.42)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(halfW - 1, -halfH * 0.72);
      ctx.lineTo(halfW - 1, halfH * 0.72);
      ctx.stroke();
    }

    if (bomb.fuseActive) {
      ctx.fillStyle = "#6c2408";
      ctx.font = `bold ${Math.floor(cellSize * 0.25)}px "Courier New", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`B${bomb.bonusSize}`, 0, 1);
    } else {
      ctx.fillStyle = "rgba(108,36,8,0.32)";
      ctx.beginPath();
      ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawExplosionSilhouette(ctx: CanvasRenderingContext2D, bomb: Bomb, cellSize: number, explode: number): void {
    ctx.scale(1.12 + explode * 0.18, 1.12 + explode * 0.18);
    ctx.fillStyle = explode > 0.5 ? "#ffffff" : "#ffe83b";

    if (bomb.kind === "obstruction") {
      const radius = cellSize * 0.33;
      ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
      return;
    }

    if (bomb.kind === "bonus") {
      const halfH = cellSize * 0.29;
      ctx.fillRect(-cellSize * 0.5, -halfH, cellSize, halfH * 2);
      return;
    }

    const radius = cellSize * 0.33;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
