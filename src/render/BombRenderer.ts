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
      this.drawBonus(ctx, cellSize, pulse, bomb.bonusSize, bomb.state === "ignited");
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

    // Fixed-piece mark: visually explains why rotation input is rejected.
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-half * 0.42, half * 0.18);
    ctx.lineTo(half * 0.42, half * 0.7);
    ctx.moveTo(half * 0.42, half * 0.18);
    ctx.lineTo(-half * 0.42, half * 0.7);
    ctx.stroke();
  }

  private drawBonus(
    ctx: CanvasRenderingContext2D,
    cellSize: number,
    pulse: number,
    size: number,
    ignited: boolean
  ): void {
    const radius = cellSize * 0.36 + pulse;
    ctx.fillStyle = ignited ? "#fff06a" : "#ffb329";
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7a2e0c";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#6c2408";
    ctx.font = `bold ${Math.floor(cellSize * 0.28)}px "Courier New", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`B${size}`, 0, 1);
  }

  private drawExplosionSilhouette(
    ctx: CanvasRenderingContext2D,
    bomb: Bomb,
    cellSize: number,
    explode: number
  ): void {
    const radius = cellSize * (bomb.kind === "bonus" ? 0.38 : 0.33);
    ctx.scale(1.12 + explode * 0.18, 1.12 + explode * 0.18);
    ctx.fillStyle = explode > 0.5 ? "#ffffff" : "#ffe83b";

    if (bomb.kind === "obstruction") {
      ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
      return;
    }

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
