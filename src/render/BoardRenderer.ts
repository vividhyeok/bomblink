import type { Phase } from "../game/Phase";
import { DELTA } from "../game/Rules";
import type { BoardLayout, Bomb, Cell, Cursor, Direction, FlameSide } from "../game/Types";
import { BombRenderer } from "./BombRenderer";

const FUSE_CORE = "#f3c7b7";
const FUSE_LINKED = "#ffe4d1";
const FUSE_FIRE = "#ffd05b";
const FUSE_OUTLINE = "#6b3a43";
const FUSE_OPEN = "#bb827b";

type FuseStatus = "linked" | "fire" | "open" | "fixed";

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
    this.drawFrame(ctx, layout, dangerWarning);
    this.drawCells(ctx, layout);
    this.drawPreviewRow(ctx, layout);
    this.drawDangerLine(ctx, layout, dangerRow, dangerWarning && Math.sin(cursor.blink * 9) > 0);
    this.drawNextFlameMarker(ctx, layout, nextFlameRow, nextFlameSide, phase, fireWarning);
    this.drawFuseNetwork(ctx, layout, cells);

    const previewRow = layout.rows - 1;
    for (let row = 0; row < cells.length; row += 1) {
      for (const bomb of cells[row]) {
        if (!bomb) continue;
        ctx.save();
        if (row === previewRow) ctx.globalAlpha = 0.72;
        this.bombRenderer.render(ctx, bomb, layout.cellSize);
        ctx.restore();
      }
    }

    if (phase !== "banner" && phase !== "ready" && phase !== "gameOver") {
      this.drawCursor(ctx, layout, cursor, cells);
    }
  }

  /**
   * Original-inspired frame: pale blue well, cream/gold side towers, narrow flame
   * rails and an orange floor. This recreates the visual grammar without copying
   * the original sprite assets.
   */
  private drawFrame(ctx: CanvasRenderingContext2D, layout: BoardLayout, dangerWarning: boolean): void {
    const boardW = layout.cols * layout.cellSize;
    const boardH = layout.rows * layout.cellSize;
    const top = layout.y;
    const bottom = top + boardH;

    ctx.fillStyle = "#4b93ce";
    ctx.fillRect(layout.x - 2, top - 2, boardW + 4, boardH + 4);
    ctx.fillStyle = "#79b9e7";
    ctx.fillRect(layout.x, top, boardW, boardH);

    ctx.fillStyle = "rgba(255,255,255,0.09)";
    ctx.fillRect(layout.x + 2, top + 2, boardW - 4, boardH * 0.34);
    ctx.fillStyle = "rgba(37,112,170,0.08)";
    ctx.fillRect(layout.x + 2, top + boardH * 0.58, boardW - 4, boardH * 0.4);

    this.drawRail(ctx, 32, top - 7, boardH + 14, dangerWarning);
    this.drawRail(ctx, 208, top - 7, boardH + 14, dangerWarning);

    this.drawTower(ctx, 24, top - 8, 16, boardH + 16, false);
    this.drawTower(ctx, 200, top - 8, 16, boardH + 16, true);

    ctx.fillStyle = "#f2cd78";
    ctx.fillRect(22, top - 12, 20, 8);
    ctx.fillRect(198, top - 12, 20, 8);
    ctx.fillStyle = "#b76e26";
    ctx.fillRect(24, top - 5, 16, 3);
    ctx.fillRect(200, top - 5, 16, 3);

    ctx.fillStyle = "#f2a33b";
    ctx.fillRect(22, bottom, 196, 14);
    ctx.fillStyle = "#c66b22";
    ctx.fillRect(22, bottom + 14, 196, 7);
    ctx.fillStyle = "#6e351e";
    ctx.fillRect(layout.x, bottom - 2, boardW, 4);
    ctx.fillStyle = "#f7c160";
    ctx.fillRect(layout.x + 2, bottom + 1, boardW - 4, 3);
  }

  private drawRail(ctx: CanvasRenderingContext2D, x: number, y: number, height: number, danger: boolean): void {
    ctx.fillStyle = "#25382f";
    ctx.fillRect(x - 2, y, 5, height);
    ctx.fillStyle = danger && Math.floor(performance.now() / 180) % 2 === 0 ? "#f3ba42" : "#6fa04a";
    ctx.fillRect(x, y + 1, 2, height - 2);
  }

  private drawTower(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, mirror: boolean): void {
    const grad = ctx.createLinearGradient(x, 0, x + width, 0);
    grad.addColorStop(0, mirror ? "#d49d42" : "#f6df96");
    grad.addColorStop(0.5, "#f4d77f");
    grad.addColorStop(1, mirror ? "#f6df96" : "#d49d42");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = "#b97a2d";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    ctx.strokeStyle = "rgba(174,113,38,0.52)";
    ctx.lineWidth = 2;
    for (let yy = y + 9; yy < y + height - 5; yy += 11) {
      ctx.beginPath();
      if (!mirror) {
        ctx.moveTo(x + 3, yy - 3);
        ctx.lineTo(x + width / 2, yy + 1);
        ctx.lineTo(x + width - 3, yy - 3);
      } else {
        ctx.moveTo(x + 3, yy + 2);
        ctx.lineTo(x + width / 2, yy - 2);
        ctx.lineTo(x + width - 3, yy + 2);
      }
      ctx.stroke();
    }
  }

  private drawCells(ctx: CanvasRenderingContext2D, layout: BoardLayout): void {
    ctx.strokeStyle = "rgba(255,255,255,0.075)";
    ctx.lineWidth = 1;
    for (let col = 1; col < layout.cols; col += 1) {
      const x = layout.x + col * layout.cellSize;
      ctx.beginPath();
      ctx.moveTo(x, layout.y);
      ctx.lineTo(x, layout.y + layout.rows * layout.cellSize);
      ctx.stroke();
    }
  }

  private drawPreviewRow(ctx: CanvasRenderingContext2D, layout: BoardLayout): void {
    const y = layout.y + (layout.rows - 1) * layout.cellSize;
    ctx.fillStyle = "rgba(31,89,139,0.14)";
    ctx.fillRect(layout.x, y, layout.cols * layout.cellSize, layout.cellSize);
    ctx.strokeStyle = "rgba(244,247,232,0.92)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(layout.x, y);
    ctx.lineTo(layout.x + layout.cols * layout.cellSize, y);
    ctx.stroke();
  }

  private drawFuseNetwork(ctx: CanvasRenderingContext2D, layout: BoardLayout, cells: Cell[][]): void {
    const previewRow = layout.rows - 1;
    for (let row = 0; row < layout.rows; row += 1) {
      for (let col = 0; col < layout.cols; col += 1) {
        const bomb = cells[row]?.[col] ?? null;
        if (!bomb) continue;
        if (bomb.kind === "bonus" && !bomb.fuseActive) continue;

        const direction = bomb.connectors[0];
        if (!direction) continue;

        ctx.save();
        if (row === previewRow) ctx.globalAlpha = 0.5;
        this.drawDirectionalFuse(ctx, layout, cells, bomb, direction, row < previewRow);
        ctx.restore();
      }
    }
  }

  /**
   * Fuses are fixed-length pieces attached to the bomb. The old renderer drew a
   * line all the way to the neighbour's current visual position; during gravity
   * this could stretch several cells like elastic. Fixed local geometry removes
   * that immersion-breaking artefact and is closer to the source UI.
   */
  private drawDirectionalFuse(
    ctx: CanvasRenderingContext2D,
    layout: BoardLayout,
    cells: Cell[][],
    bomb: Bomb,
    direction: Direction,
    active: boolean
  ): void {
    if (!active) ctx.globalAlpha *= 0.55;
    const status = this.fuseStatus(layout, cells, bomb);
    const angle = this.visualFuseAngle(bomb, direction, layout.cellSize);
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    const startRadius = layout.cellSize * (bomb.kind === "bonus" ? 0.35 : 0.31);
    const endRadius = layout.cellSize * (status === "fire" ? 0.57 : 0.5);
    const start = { x: bomb.visualX + ux * startRadius, y: bomb.visualY + uy * startRadius };
    const end = { x: bomb.visualX + ux * endRadius, y: bomb.visualY + uy * endRadius };

    ctx.lineCap = "round";
    ctx.strokeStyle = FUSE_OUTLINE;
    ctx.lineWidth = status === "open" ? 4 : 5;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    ctx.strokeStyle = status === "linked" ? FUSE_LINKED : status === "fire" ? FUSE_FIRE : FUSE_CORE;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    ctx.fillStyle = status === "fire" ? "#f59a32" : status === "open" ? FUSE_OPEN : FUSE_LINKED;
    ctx.beginPath();
    ctx.arc(end.x, end.y, status === "open" ? 2 : 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Logical gravity flips up/down immediately so chaining is deterministic. For
   * rendering, infer the unfinished fall distance and unwind 180° per cell. This
   * makes 1-cell falls visibly flip 180°, 2-cell falls 360°, and so on.
   */
  private visualFuseAngle(bomb: Bomb, direction: Direction, cellSize: number): number {
    const finalAngle = directionAngle(direction);
    if (direction !== "up" && direction !== "down") return finalAngle;

    const remainingPixels = bomb.targetY - bomb.visualY;
    if (remainingPixels <= 0.2) return finalAngle;
    const remainingCells = remainingPixels / cellSize;
    return finalAngle - remainingCells * Math.PI;
  }

  private fuseStatus(layout: BoardLayout, cells: Cell[][], bomb: Bomb): FuseStatus {
    if (bomb.kind === "bonus" && !bomb.fuseActive) return "fixed";

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

  private drawCursor(ctx: CanvasRenderingContext2D, layout: BoardLayout, cursor: Cursor, cells: Cell[][]): void {
    const x = layout.x + cursor.col * layout.cellSize + layout.cellSize / 2;
    const y = layout.y + cursor.row * layout.cellSize + layout.cellSize / 2;
    const r = layout.cellSize * 0.44;
    const corner = 6;
    const flash = Math.sin(cursor.blink * 10) > -0.2;
    const bomb = cells[cursor.row]?.[cursor.col] ?? null;
    const fixed = bomb && bomb.kind !== "normal";

    ctx.save();
    ctx.strokeStyle = "rgba(25,43,62,0.78)";
    ctx.lineWidth = 4;
    this.strokeCornerCursor(ctx, x, y, r, corner);
    ctx.strokeStyle = fixed ? "#e7dcc1" : flash ? "#ffffff" : "#cdeeff";
    ctx.lineWidth = 2;
    this.strokeCornerCursor(ctx, x, y, r, corner);
    ctx.restore();
  }

  private strokeCornerCursor(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: number): void {
    ctx.beginPath();
    ctx.moveTo(x - r, y - r + c); ctx.lineTo(x - r, y - r); ctx.lineTo(x - r + c, y - r);
    ctx.moveTo(x + r - c, y - r); ctx.lineTo(x + r, y - r); ctx.lineTo(x + r, y - r + c);
    ctx.moveTo(x - r, y + r - c); ctx.lineTo(x - r, y + r); ctx.lineTo(x - r + c, y + r);
    ctx.moveTo(x + r - c, y + r); ctx.lineTo(x + r, y + r); ctx.lineTo(x + r, y + r - c);
    ctx.stroke();
  }

  private drawDangerLine(ctx: CanvasRenderingContext2D, layout: BoardLayout, dangerRow: number, blink: boolean): void {
    if (!blink) return;
    const y = layout.y + dangerRow * layout.cellSize + 1;
    ctx.strokeStyle = "rgba(255,205,74,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(layout.x + 2, y);
    ctx.lineTo(layout.x + layout.cols * layout.cellSize - 2, y);
    ctx.stroke();
  }

  private drawNextFlameMarker(
    ctx: CanvasRenderingContext2D,
    layout: BoardLayout,
    _nextFlameRow: number | null,
    nextFlameSide: FlameSide,
    phase: Phase,
    fireWarning: boolean
  ): void {
    if (!fireWarning || phase === "banner" || phase === "ready" || phase === "flamePassing" || phase === "fuseBurning") return;

    const x = nextFlameSide === "left" ? 32 : 208;
    const y = layout.y - 11;
    const time = performance.now() / 1000;
    const flicker = Math.sin(time * 22) * 1.2;

    ctx.fillStyle = "#d84a23";
    ctx.beginPath();
    ctx.moveTo(x, y + 7);
    ctx.quadraticCurveTo(x + 5, y + 4, x + 3, y - 1);
    ctx.quadraticCurveTo(x + flicker, y - 7, x - 3, y - 1);
    ctx.quadraticCurveTo(x - 5, y + 4, x, y + 7);
    ctx.fill();

    ctx.fillStyle = "#ffd34c";
    ctx.beginPath();
    ctx.ellipse(x, y + 1, 2.2, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function directionAngle(direction: Direction): number {
  switch (direction) {
    case "up": return -Math.PI / 2;
    case "right": return 0;
    case "down": return Math.PI / 2;
    case "left": return Math.PI;
  }
}
