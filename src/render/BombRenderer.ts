import type { Bomb, Direction } from "../game/Types";

const CONNECTOR_COLOR = "#fff0d8";
const CONNECTOR_SHADOW = "#d62d29";
const IGNITED_COLOR = "#ffe14a";

export class BombRenderer {
  render(ctx: CanvasRenderingContext2D, bomb: Bomb, cellSize: number): void {
    const radius = cellSize * 0.34;
    const pulse = bomb.state === "ignited" ? Math.sin(bomb.stateAge * 35) * 1.5 : 0;
    const explode = bomb.state === "exploding" ? Math.min(1, bomb.stateAge / 0.12) : 0;
    const x = Math.round(bomb.visualX);
    const y = Math.round(bomb.visualY);

    this.drawConnectors(ctx, bomb, cellSize, bomb.state === "ignited");

    ctx.save();
    ctx.translate(x, y);

    if (bomb.state === "exploding") {
      // Draw a harsh, bright silhouette flash instead of the soft fade
      ctx.scale(1.2, 1.2);
      ctx.fillStyle = explode > 0.5 ? "#ffffff" : "#ffe83b";
      ctx.beginPath();
      ctx.arc(0, 0, radius + pulse, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Normal Bomb Rendering
      // Create a beautiful glossy blue radial gradient
      const gradient = ctx.createRadialGradient(
        -radius * 0.3, -radius * 0.3, 0,
        0, 0, radius + pulse
      );
      gradient.addColorStop(0, "#60a5fa"); // Light blue reflection center
      gradient.addColorStop(0.3, "#2563eb"); // Royal blue midtone
      gradient.addColorStop(0.8, "#1d4ed8"); // Rich blue base
      gradient.addColorStop(1, "#0f172a");   // Dark border shadow

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, radius + pulse, 0, Math.PI * 2);
      ctx.fill();

      // Specular highlight dot (gloss reflection) on top-left
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.beginPath();
      ctx.arc(-radius * 0.3, -radius * 0.3, radius * 0.22, 0, Math.PI * 2);
      ctx.fill();

      if (bomb.state === "ignited") {
        // Glow spark for ignited state
        ctx.fillStyle = "#ff8a20";
        ctx.fillRect(radius - 2, -radius - 3, 4, 4);
        ctx.fillStyle = "#fff38a";
        ctx.fillRect(radius - 1, -radius - 5, 2, 2);
      }
    }

    ctx.restore();
  }

  private drawConnectors(ctx: CanvasRenderingContext2D, bomb: Bomb, cellSize: number, ignited: boolean): void {
    const x = Math.round(bomb.visualX);
    const y = Math.round(bomb.visualY);
    const inner = Math.floor(cellSize * 0.18);
    const outer = Math.floor(cellSize * 0.49);

    for (const direction of bomb.connectors) {
      const end = endpoint(direction, outer);
      const start = endpoint(direction, inner);

      ctx.strokeStyle = CONNECTOR_SHADOW;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x + start.x, y + start.y);
      ctx.lineTo(x + end.x, y + end.y);
      ctx.stroke();

      ctx.strokeStyle = ignited ? IGNITED_COLOR : CONNECTOR_COLOR;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + start.x, y + start.y);
      ctx.lineTo(x + end.x, y + end.y);
      ctx.stroke();

      ctx.fillStyle = ignited ? "#ff9b22" : "#e5362f";
      const knot = endpoint(direction, Math.floor((inner + outer) / 2));
      ctx.fillRect(x + knot.x - 2, y + knot.y - 2, 4, 4);
    }
  }
}

function endpoint(direction: Direction, distance: number): { x: number; y: number } {
  switch (direction) {
    case "up":
      return { x: 0, y: -distance };
    case "right":
      return { x: distance, y: 0 };
    case "down":
      return { x: 0, y: distance };
    case "left":
      return { x: -distance, y: 0 };
  }
}
