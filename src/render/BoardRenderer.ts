import type { Phase } from "../game/Phase";
import { canConnect } from "../game/Rules";
import type { BoardLayout, Cell, Cursor, Direction, FlameSide } from "../game/Types";
import { BombRenderer } from "./BombRenderer";

export class BoardRenderer {
  private readonly bombRenderer = new BombRenderer();

  render(
    ctx: CanvasRenderingContext2D,
    layout: BoardLayout,
    cells: Cell[][],
    cursor: Cursor,
    dangerRow: number,
    dangerWarning: boolean,
    phase: Phase,
    nextFlameRow: number | null,
    nextFlameSide: FlameSide,
    fireWarning: boolean
  ): void {
    this.drawFrame(ctx, layout);
    this.drawCells(ctx, layout);
    this.drawDangerLine(ctx, layout, dangerRow, dangerWarning && Math.sin(cursor.blink * 9) > 0);
    this.drawNextFlameMarker(ctx, layout, nextFlameRow, nextFlameSide, phase, fireWarning);
    this.drawFuseBridges(ctx, layout, cells);

    for (const row of cells) {
      for (const bomb of row) {
        if (bomb) {
          this.bombRenderer.render(ctx, bomb, layout.cellSize);
        }
      }
    }

    if (phase !== "banner" && phase !== "ready" && phase !== "gameOver") {
      this.drawCursor(ctx, layout, cursor);
    }
  }

  private drawFrame(ctx: CanvasRenderingContext2D, layout: BoardLayout): void {
    // Top inner shadow/border
    ctx.fillStyle = "#1177b9";
    ctx.fillRect(layout.x - 2, layout.y - 2, layout.cols * layout.cellSize + 4, layout.rows * layout.cellSize + 4);
    
    // Play area background
    ctx.fillStyle = "#1ba1e2";
    ctx.fillRect(layout.x, layout.y, layout.cols * layout.cellSize, layout.rows * layout.cellSize);

    // Draw Side Columns (Left & Right)
    const colY = layout.y - 8;
    const colH = layout.rows * layout.cellSize + 16;

    // Left Column (x = 24 to 40)
    ctx.fillStyle = "#fadb98";
    ctx.fillRect(24, colY, 16, colH);
    ctx.strokeStyle = "#c08038";
    ctx.lineWidth = 1;
    ctx.strokeRect(24, colY, 16, colH);

    // Right Column (x = 200 to 216)
    ctx.fillStyle = "#fadb98";
    ctx.fillRect(200, colY, 16, colH);
    ctx.strokeRect(200, colY, 16, colH);

    // Draw Notches on Left and Right Columns corresponding to each row
    ctx.fillStyle = "#d2974b";
    for (let r = 0; r < layout.rows; r += 1) {
      const centerY = layout.y + r * layout.cellSize + layout.cellSize / 2;
      // Left notch
      ctx.fillRect(26, centerY - 1, 12, 2);
      // Right notch
      ctx.fillRect(202, centerY - 1, 12, 2);
    }
    
    // Bottom border/base
    ctx.fillStyle = "#e09033";
    ctx.fillRect(24, colY + colH, 192, 16);
    ctx.fillStyle = "#c06b18";
    ctx.fillRect(24, colY + colH + 16, 192, 8);
  }

  private drawCells(ctx: CanvasRenderingContext2D, layout: BoardLayout): void {
    // The original game has a very subtle dot pattern or no visible grid.
    // Let's just draw very faint lines to separate cells slightly.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;

    for (let col = 1; col < layout.cols; col += 1) {
      const x = layout.x + col * layout.cellSize;
      ctx.beginPath();
      ctx.moveTo(x, layout.y);
      ctx.lineTo(x, layout.y + layout.rows * layout.cellSize);
      ctx.stroke();
    }

    for (let row = 1; row < layout.rows; row += 1) {
      const y = layout.y + row * layout.cellSize;
      ctx.beginPath();
      ctx.moveTo(layout.x, y);
      ctx.lineTo(layout.x + layout.cols * layout.cellSize, y);
      ctx.stroke();
    }
  }

  private drawCursor(ctx: CanvasRenderingContext2D, layout: BoardLayout, cursor: Cursor): void {
    const x = layout.x + cursor.col * layout.cellSize + layout.cellSize / 2;
    const y = layout.y + cursor.row * layout.cellSize + layout.cellSize / 2;
    const radius = layout.cellSize * 0.48;
    const flash = Math.sin(cursor.blink * 11) > 0 ? "#ffd97d" : "#ffffff";

    // Draw dark shadow outer circle
    ctx.strokeStyle = "#1e1b18";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw main cream-white/yellow inner circle
    ctx.strokeStyle = flash;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw small notches/dots around the circle to give it a rope/lasso texture
    ctx.fillStyle = flash;
    const dots = 8;
    for (let i = 0; i < dots; i += 1) {
      const angle = (i / dots) * Math.PI * 2 + (cursor.blink ?? 0) * 1.5;
      const dotX = x + Math.cos(angle) * radius;
      const dotY = y + Math.sin(angle) * radius;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawDangerLine(
    ctx: CanvasRenderingContext2D,
    layout: BoardLayout,
    dangerRow: number,
    blink: boolean
  ): void {
    const y = layout.y + dangerRow * layout.cellSize + 1;

    ctx.strokeStyle = blink ? "#ffec62" : "rgb(255 96 72 / 0.65)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(layout.x + 2, y);
    ctx.lineTo(layout.x + layout.cols * layout.cellSize - 2, y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawNextFlameMarker(
    ctx: CanvasRenderingContext2D,
    layout: BoardLayout,
    nextFlameRow: number | null,
    nextFlameSide: FlameSide,
    phase: Phase,
    fireWarning: boolean
  ): void {
    if (phase === "banner" || phase === "ready" || phase === "flamePassing") {
      return;
    }

    const x = nextFlameSide === "left" ? 32 : 208;
    const topY = layout.y - 14;
    const time = performance.now() / 1000;
    const blink = fireWarning ? Math.floor(time * 16) % 2 === 0 : true;

    if (!blink) {
      return;
    }

    ctx.fillStyle = fireWarning ? "#ff3b30" : "#ff9500";
    ctx.beginPath();
    // Triangle pointing down at the top of the column
    ctx.moveTo(x - 6, topY);
    ctx.lineTo(x + 6, topY);
    ctx.lineTo(x, topY + 8);
    ctx.closePath();
    ctx.fill();
  }

  private drawFuseBridges(ctx: CanvasRenderingContext2D, layout: BoardLayout, cells: Cell[][]): void {
    for (let row = 0; row < layout.rows; row += 1) {
      for (let col = 0; col < layout.cols; col += 1) {
        const bomb = cells[row][col];

        if (!bomb) {
          continue;
        }

        const right = cells[row]?.[col + 1] ?? null;
        const down = cells[row + 1]?.[col] ?? null;

        if (right && canConnect(bomb, right, "right")) {
          this.drawFuseBridge(ctx, layout, row, col, "right");
        }

        if (down && canConnect(bomb, down, "down")) {
          this.drawFuseBridge(ctx, layout, row, col, "down");
        }
      }
    }
  }

  private drawFuseBridge(
    ctx: CanvasRenderingContext2D,
    layout: BoardLayout,
    row: number,
    col: number,
    direction: Extract<Direction, "right" | "down">
  ): void {
    const fromX = layout.x + col * layout.cellSize + layout.cellSize / 2;
    const fromY = layout.y + row * layout.cellSize + layout.cellSize / 2;
    const half = Math.floor(layout.cellSize * 0.34);
    const toX = direction === "right" ? fromX + layout.cellSize : fromX;
    const toY = direction === "down" ? fromY + layout.cellSize : fromY;
    const startX = direction === "right" ? fromX + half : fromX;
    const startY = direction === "down" ? fromY + half : fromY;
    const endX = direction === "right" ? toX - half : toX;
    const endY = direction === "down" ? toY - half : toY;

    ctx.strokeStyle = "#a81d22";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.strokeStyle = "#fff0d8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.fillStyle = "#e5362f";
    const steps = 3;
    for (let i = 1; i <= steps; i += 1) {
      const t = i / (steps + 1);
      const x = Math.round(startX + (endX - startX) * t);
      const y = Math.round(startY + (endY - startY) * t);
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
  }
}
