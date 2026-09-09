import type { Phase } from "../game/Phase";
import { DELTA } from "../game/Rules";
import type { BoardLayout, Bomb, Cell, Cursor, Direction, FlameSide } from "../game/Types";
import { BombRenderer } from "./BombRenderer";

const LINKED_FUSE = "#fff7bd";
const LINKED_OUTLINE = "#a72429";
const FIRE_FUSE = "#ffd24f";
const FIRE_OUTLINE = "#c34a17";
const OPEN_FUSE = "#7d4249";
const OPEN_OUTLINE = "#3b2025";

export class BoardRenderer {
  private readonly bombRenderer = new BombRenderer();

  render(ctx: CanvasRenderingContext2D, layout: BoardLayout, cells: Cell[][], cursor: Cursor, dangerRow: number, dangerWarning: boolean, phase: Phase, nextFlameRow: number | null, nextFlameSide: FlameSide, fireWarning: boolean): void {
    this.drawFrame(ctx, layout);
    this.drawCells(ctx, layout);
    this.drawPreviewRow(ctx, layout);
    this.drawDangerLine(ctx, layout, dangerRow, dangerWarning && Math.sin(cursor.blink * 9) > 0);
    this.drawNextFlameMarker(ctx, layout, nextFlameRow, nextFlameSide, phase, fireWarning);
    this.drawFuseNetwork(ctx, layout, cells);
    for (const row of cells) for (const bomb of row) if (bomb) this.bombRenderer.render(ctx, bomb, layout.cellSize);
    if (phase !== "banner" && phase !== "ready" && phase !== "gameOver") this.drawCursor(ctx, layout, cursor, cells);
  }

  private drawFrame(ctx: CanvasRenderingContext2D, layout: BoardLayout): void {
    ctx.fillStyle = "#1177b9";
    ctx.fillRect(layout.x - 2, layout.y - 2, layout.cols * layout.cellSize + 4, layout.rows * layout.cellSize + 4);
    ctx.fillStyle = "#1ba1e2";
    ctx.fillRect(layout.x, layout.y, layout.cols * layout.cellSize, layout.rows * layout.cellSize);
    const colY = layout.y - 8;
    const colH = layout.rows * layout.cellSize + 16;
    ctx.fillStyle = "#fadb98";
    ctx.fillRect(24, colY, 16, colH);
    ctx.strokeStyle = "#c08038";
    ctx.lineWidth = 1;
    ctx.strokeRect(24, colY, 16, colH);
    ctx.fillStyle = "#fadb98";
    ctx.fillRect(200, colY, 16, colH);
    ctx.strokeRect(200, colY, 16, colH);
    ctx.fillStyle = "#d2974b";
    for (let r = 0; r < layout.rows; r += 1) {
      const centerY = layout.y + r * layout.cellSize + layout.cellSize / 2;
      ctx.fillRect(26, centerY - 1, 12, 2);
      ctx.fillRect(202, centerY - 1, 12, 2);
    }
    ctx.fillStyle = "#e09033";
    ctx.fillRect(24, colY + colH, 192, 16);
    ctx.fillStyle = "#c06b18";
    ctx.fillRect(24, colY + colH + 16, 192, 8);
  }

  private drawCells(ctx: CanvasRenderingContext2D, layout: BoardLayout): void {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;
    for (let col = 1; col < layout.cols; col += 1) {
      const x = layout.x + col * layout.cellSize;
      ctx.beginPath(); ctx.moveTo(x, layout.y); ctx.lineTo(x, layout.y + layout.rows * layout.cellSize); ctx.stroke();
    }
    for (let row = 1; row < layout.rows; row += 1) {
      const y = layout.y + row * layout.cellSize;
      ctx.beginPath(); ctx.moveTo(layout.x, y); ctx.lineTo(layout.x + layout.cols * layout.cellSize, y); ctx.stroke();
    }
  }

  private drawPreviewRow(ctx: CanvasRenderingContext2D, layout: BoardLayout): void {
    const y = layout.y + (layout.rows - 1) * layout.cellSize;
    ctx.fillStyle = "rgba(3, 34, 61, 0.34)";
    ctx.fillRect(layout.x, y, layout.cols * layout.cellSize, layout.cellSize);
    ctx.strokeStyle = "rgba(255, 236, 150, 0.95)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(layout.x, y); ctx.lineTo(layout.x + layout.cols * layout.cellSize, y); ctx.stroke();
    ctx.fillStyle = "rgba(255, 246, 184, 0.82)";
    ctx.font = 'bold 7px "Courier New", monospace';
    ctx.textAlign = "right"; ctx.textBaseline = "bottom";
    ctx.fillText("NEXT", layout.x + layout.cols * layout.cellSize - 3, y + layout.cellSize - 2);
    ctx.textAlign = "left";
  }

  private drawFuseNetwork(ctx: CanvasRenderingContext2D, layout: BoardLayout, cells: Cell[][]): void {
    const previewRow = layout.rows - 1;
    for (let row = 0; row < layout.rows; row += 1) for (let col = 0; col < layout.cols; col += 1) {
      const bomb = cells[row]?.[col] ?? null;
      const direction = bomb?.connectors[0];
      if (bomb && direction) this.drawDirectionalFuse(ctx, layout, cells, bomb, direction, row < previewRow);
    }
  }

  private drawDirectionalFuse(ctx: CanvasRenderingContext2D, layout: BoardLayout, cells: Cell[][], bomb: Bomb, direction: Direction, active: boolean): void {
    const delta = DELTA[direction];
    const startRadius = layout.cellSize * (bomb.kind === "bonus" ? 0.35 : 0.31);
    const start = offsetPoint(bomb.visualX, bomb.visualY, direction, startRadius);
    const previewRow = layout.rows - 1;
    const targetRow = bomb.row + delta.row;
    const targetCol = bomb.col + delta.col;
    let status: "linked" | "fire" | "open" = "open";
    let end = offsetPoint(bomb.visualX, bomb.visualY, direction, layout.cellSize * 0.48);

    if (active && targetRow >= 0 && targetRow < previewRow && targetCol >= 0 && targetCol < layout.cols) {
      const target = cells[targetRow]?.[targetCol] ?? null;
      if (target) {
        status = "linked";
        const targetRadius = layout.cellSize * (target.kind === "bonus" ? 0.36 : 0.32);
        end = offsetPoint(target.visualX, target.visualY, opposite(direction), targetRadius + 1);
      }
    } else if (active && bomb.col === 0 && direction === "left") {
      status = "fire"; end = { x: layout.x - 10, y: bomb.visualY };
    } else if (active && bomb.col === layout.cols - 1 && direction === "right") {
      status = "fire"; end = { x: layout.x + layout.cols * layout.cellSize + 10, y: bomb.visualY };
    }

    const outline = status === "linked" ? LINKED_OUTLINE : status === "fire" ? FIRE_OUTLINE : OPEN_OUTLINE;
    const center = status === "linked" ? LINKED_FUSE : status === "fire" ? FIRE_FUSE : OPEN_FUSE;
    ctx.save();
    if (!active) ctx.globalAlpha = 0.42;
    ctx.strokeStyle = outline; ctx.lineWidth = status === "open" ? 5 : 7; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
    ctx.strokeStyle = center; ctx.lineWidth = status === "open" ? 2 : 3;
    if (status === "open") ctx.setLineDash([3, 2]);
    ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke(); ctx.setLineDash([]);
    this.drawFuseTip(ctx, end.x, end.y, direction, status);
    if (status === "linked") {
      ctx.strokeStyle = "rgba(255,255,220,0.95)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(end.x, end.y, 4, 0, Math.PI * 2); ctx.stroke();
    } else if (status === "open") {
      ctx.fillStyle = "#29171b"; ctx.beginPath(); ctx.arc(end.x, end.y, 2.7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  private drawFuseTip(ctx: CanvasRenderingContext2D, x: number, y: number, direction: Direction, status: "linked" | "fire" | "open"): void {
    const forward = vector(direction);
    const side = { x: -forward.y, y: forward.x };
    const size = status === "open" ? 3.5 : 4.5;
    const backX = x - forward.x * size * 1.5;
    const backY = y - forward.y * size * 1.5;
    ctx.fillStyle = status === "linked" ? "#fffbe0" : status === "fire" ? "#ffe15c" : "#8f5057";
    ctx.beginPath();
    ctx.moveTo(x + forward.x * 1.5, y + forward.y * 1.5);
    ctx.lineTo(backX + side.x * size, backY + side.y * size);
    ctx.lineTo(backX - side.x * size, backY - side.y * size);
    ctx.closePath(); ctx.fill();
  }

  private drawCursor(ctx: CanvasRenderingContext2D, layout: BoardLayout, cursor: Cursor, cells: Cell[][]): void {
    const x = layout.x + cursor.col * layout.cellSize + layout.cellSize / 2;
    const y = layout.y + cursor.row * layout.cellSize + layout.cellSize / 2;
    const radius = layout.cellSize * 0.48;
    const bomb = cells[cursor.row]?.[cursor.col] ?? null;
    const status = bomb ? this.fuseStatus(layout, cells, bomb) : "empty";
    const flash = Math.sin(cursor.blink * 11) > 0;
    const statusColor = status === "linked" ? "#9cff82" : status === "fire" ? "#ffd85a" : status === "open" ? "#ff9c91" : "#ffffff";
    ctx.strokeStyle = "#121a22"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = flash ? statusColor : "rgba(255,255,255,0.78)"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = statusColor;
    for (let i = -1; i <= 1; i += 1) ctx.fillRect(x + i * 5 - 1.5, y - radius - 4, 3, 3);
  }

  private fuseStatus(layout: BoardLayout, cells: Cell[][], bomb: Bomb): "linked" | "fire" | "open" {
    const direction = bomb.connectors[0];
    if (!direction) return "open";
    const delta = DELTA[direction];
    const row = bomb.row + delta.row;
    const col = bomb.col + delta.col;
    const previewRow = layout.rows - 1;
    if (row >= 0 && row < previewRow && col >= 0 && col < layout.cols && cells[row]?.[col]) return "linked";
    if ((bomb.col === 0 && direction === "left") || (bomb.col === layout.cols - 1 && direction === "right")) return "fire";
    return "open";
  }

  private drawDangerLine(ctx: CanvasRenderingContext2D, layout: BoardLayout, dangerRow: number, blink: boolean): void {
    const y = layout.y + dangerRow * layout.cellSize + 1;
    ctx.strokeStyle = blink ? "#ffec62" : "rgb(255 96 72 / 0.65)"; ctx.lineWidth = 2; ctx.setLineDash([5, 3]);
    ctx.beginPath(); ctx.moveTo(layout.x + 2, y); ctx.lineTo(layout.x + layout.cols * layout.cellSize - 2, y); ctx.stroke(); ctx.setLineDash([]);
  }

  private drawNextFlameMarker(ctx: CanvasRenderingContext2D, layout: BoardLayout, nextFlameRow: number | null, nextFlameSide: FlameSide, phase: Phase, fireWarning: boolean): void {
    if (phase === "banner" || phase === "ready" || phase === "flamePassing" || phase === "fuseBurning") return;
    const x = nextFlameSide === "left" ? 32 : 208;
    const topY = layout.y - 14;
    const blink = fireWarning ? Math.floor(performance.now() / 1000 * 16) % 2 === 0 : true;
    if (!blink) return;
    ctx.fillStyle = fireWarning ? "#ff3b30" : "#ff9500";
    ctx.beginPath(); ctx.moveTo(x - 6, topY); ctx.lineTo(x + 6, topY); ctx.lineTo(x, topY + 8); ctx.closePath(); ctx.fill();
  }
}

function opposite(direction: Direction): Direction {
  switch (direction) { case "up": return "down"; case "right": return "left"; case "down": return "up"; case "left": return "right"; }
}
function vector(direction: Direction): { x: number; y: number } {
  switch (direction) { case "up": return { x: 0, y: -1 }; case "right": return { x: 1, y: 0 }; case "down": return { x: 0, y: 1 }; case "left": return { x: -1, y: 0 }; }
}
function offsetPoint(x: number, y: number, direction: Direction, distance: number): { x: number; y: number } {
  const v = vector(direction); return { x: x + v.x * distance, y: y + v.y * distance };
}
