import type { BoardLayout, BurnSegment, ExplosionFlash, FlameEvent, Particle } from "../game/Types";

export class EffectRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    layout: BoardLayout,
    flame: FlameEvent | null,
    burns: BurnSegment[],
    flashes: ExplosionFlash[],
    particles: Particle[]
  ): void {
    this.drawBurns(ctx, layout, burns);
    this.drawFlameLine(ctx, layout, flame);
    this.drawFlashes(ctx, flashes);
    this.drawParticles(ctx, particles);
  }

  private drawFlameShape(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, color: string, time: number): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + scale);
    ctx.quadraticCurveTo(x + scale, y + scale, x + scale, y);
    const flickerX = Math.sin(time * 40) * (scale * 0.4);
    ctx.quadraticCurveTo(x + scale, y - scale * 1.5, x + flickerX, y - scale * 2);
    ctx.quadraticCurveTo(x - scale, y - scale * 1.5, x - scale, y);
    ctx.quadraticCurveTo(x - scale, y + scale, x, y + scale);
    ctx.fill();
  }

  private drawFlameLine(ctx: CanvasRenderingContext2D, layout: BoardLayout, flame: FlameEvent | null): void {
    if (!flame) {
      return;
    }

    const startY = layout.y - 12;
    const endY = layout.y + flame.row * layout.cellSize + layout.cellSize / 2;
    const y = startY + (endY - startY) * flame.progress;
    const x = flame.side === "left" ? 32 : 208;

    const time = performance.now() / 1000;
    const size = 6 + Math.sin(time * 20) * 1.5;

    // Draw simple retro spark particle dots
    ctx.fillStyle = "#ff8c22";
    ctx.fillRect(x - 2, y - 2, 2, 2);
    ctx.fillRect(x - 4 + Math.sin(time * 30) * 3, y + 4, 2, 2);
    ctx.fillRect(x + 3, y - 5 + Math.cos(time * 25) * 3, 2, 2);

    this.drawFlameShape(ctx, x, y + 2, size * 1.2, "#f02f19", time); // Outer red
    this.drawFlameShape(ctx, x, y + 2, size * 0.8, "#ffbc1b", time + 1); // Inner yellow
    this.drawFlameShape(ctx, x, y + 2, size * 0.4, "#ffffff", time + 2); // Core white
  }

  private drawBurns(ctx: CanvasRenderingContext2D, layout: BoardLayout, burns: BurnSegment[]): void {
    const time = performance.now() / 1000;
    for (const burn of burns) {
      const progress = Math.min(1, burn.age / burn.duration);
      const from = cellCenter(layout, burn.fromRow, burn.fromCol);
      const to = cellCenter(layout, burn.toRow, burn.toCol);
      const x = from.x + (to.x - from.x) * progress;
      const y = from.y + (to.y - from.y) * progress;

      ctx.strokeStyle = "#ff8b18";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(x, y);
      ctx.stroke();

      const size = 4 + Math.sin(time * 25 + burn.age * 10) * 1;
      this.drawFlameShape(ctx, x, y + 1, size * 1.1, "#f02f19", time + burn.age);
      this.drawFlameShape(ctx, x, y + 1, size * 0.7, "#ffbc1b", time + burn.age * 2);
      this.drawFlameShape(ctx, x, y + 1, size * 0.35, "#ffffff", time + burn.age * 3);
    }
  }

  private drawFlashes(ctx: CanvasRenderingContext2D, flashes: ExplosionFlash[]): void {
    for (const flash of flashes) {
      const progress = flash.age / flash.duration;
      const alpha = Math.max(0, 1 - progress);
      const radius = flash.radius * (0.6 + progress * 0.9);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#fff4b4";
      ctx.beginPath();
      ctx.arc(flash.x, flash.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
    for (const particle of particles) {
      const alpha = Math.max(0, 1 - particle.age / particle.lifetime);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.fillRect(
        Math.round(particle.x - particle.size / 2),
        Math.round(particle.y - particle.size / 2),
        particle.size,
        particle.size
      );
    }

    ctx.globalAlpha = 1;
  }
}

function cellCenter(layout: BoardLayout, row: number, col: number): { x: number; y: number } {
  return {
    x: layout.x + col * layout.cellSize + layout.cellSize / 2,
    y: layout.y + row * layout.cellSize + layout.cellSize / 2
  };
}
