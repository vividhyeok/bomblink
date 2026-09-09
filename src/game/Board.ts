import type { Bomb, BoardLayout, Cell } from "./Types";
import { makeConnectors, rotateConnectors } from "./Rules";

const CELL_MOVE_SPEED = 9;
const DEFAULT_STARTING_ROWS = 5;

export class Board {
  readonly layout: BoardLayout;
  cells: Cell[][];

  private nextId = 1;
  private randomSeed = 7229;

  constructor(layout: BoardLayout) {
    this.layout = layout;
    this.cells = [];
    this.reset();
  }

  get previewRow(): number {
    return this.layout.rows - 1;
  }

  get playableRows(): number {
    return this.layout.rows - 1;
  }

  reset(startingRows = DEFAULT_STARTING_ROWS): void {
    this.nextId = 1;
    this.randomSeed = 7229;
    const firstFilledRow = Math.max(0, this.playableRows - startingRows);
    this.cells = Array.from({ length: this.layout.rows }, () => Array(this.layout.cols).fill(null));

    for (let row = firstFilledRow; row < this.playableRows; row += 1) {
      for (let col = 0; col < this.layout.cols; col += 1) {
        this.cells[row][col] = this.createBomb(row, col, 0);
      }
    }

    for (let col = 0; col < this.layout.cols; col += 1) {
      this.cells[this.previewRow][col] = this.createBomb(this.previewRow, col, 0);
    }
  }

  get(row: number, col: number): Bomb | null {
    if (!this.inBounds(row, col)) {
      return null;
    }
    return this.cells[row][col];
  }

  rotate(row: number, col: number, clockwise: boolean): boolean {
    if (row >= this.playableRows) {
      return false;
    }

    const bomb = this.get(row, col);
    if (!bomb || bomb.state !== "normal") {
      return false;
    }

    bomb.connectors = rotateConnectors(bomb.connectors, clockwise);
    return true;
  }

  clearBombs(bombs: Bomb[]): void {
    for (const bomb of bombs) {
      if (this.inBounds(bomb.row, bomb.col) && this.cells[bomb.row][bomb.col]?.id === bomb.id) {
        this.cells[bomb.row][bomb.col] = null;
      }
    }
  }

  setBombState(bomb: Bomb, state: Bomb["state"]): void {
    const current = this.get(bomb.row, bomb.col);
    if (current?.id === bomb.id) {
      current.state = state;
      current.stateAge = 0;
    }
  }

  applyGravity(): void {
    const { cols } = this.layout;

    for (let col = 0; col < cols; col += 1) {
      const survivors: Bomb[] = [];

      for (let row = this.playableRows - 1; row >= 0; row -= 1) {
        const bomb = this.cells[row][col];
        if (bomb) {
          survivors.push(bomb);
        }
      }

      for (let row = this.playableRows - 1; row >= 0; row -= 1) {
        const survivor = survivors[this.playableRows - 1 - row];
        if (survivor) {
          survivor.row = row;
          survivor.col = col;
          survivor.targetX = this.cellCenterX(col);
          survivor.targetY = this.cellCenterY(row);
          survivor.spawnDelay = 0;
          survivor.state = "normal";
          this.cells[row][col] = survivor;
        } else {
          this.cells[row][col] = null;
        }
      }
    }
  }

  addPressureRow(): void {
    const { cols } = this.layout;
    const incoming = this.cells[this.previewRow].slice();

    for (let row = 0; row < this.playableRows - 1; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const bomb = this.cells[row + 1][col];
        this.cells[row][col] = bomb;
        if (bomb) {
          this.moveBomb(bomb, row, col);
        }
      }
    }

    const bottomRow = this.playableRows - 1;
    for (let col = 0; col < cols; col += 1) {
      const bomb = incoming[col];
      this.cells[bottomRow][col] = bomb;
      if (bomb) {
        this.moveBomb(bomb, bottomRow, col);
      }
    }

    for (let col = 0; col < cols; col += 1) {
      const bomb = this.createBomb(this.previewRow, col, col * 18);
      bomb.visualY = this.cellCenterY(this.layout.rows);
      this.cells[this.previewRow][col] = bomb;
    }
  }

  update(dt: number): boolean {
    let settled = true;

    for (const row of this.cells) {
      for (const bomb of row) {
        if (!bomb) {
          continue;
        }

        bomb.stateAge += dt;
        const speed = CELL_MOVE_SPEED * this.layout.cellSize * dt;
        const dx = bomb.targetX - bomb.visualX;
        const dy = bomb.targetY - bomb.visualY;
        const distance = Math.hypot(dx, dy);

        if (distance > 0.3) {
          const step = Math.min(speed, distance);
          bomb.visualX += (dx / distance) * step;
          bomb.visualY += (dy / distance) * step;
          settled = false;
        } else {
          bomb.visualX = bomb.targetX;
          bomb.visualY = bomb.targetY;
        }
      }
    }

    return settled;
  }

  inBounds(row: number, col: number): boolean {
    return row >= 0 && row < this.layout.rows && col >= 0 && col < this.layout.cols;
  }

  hasBombInRow(row: number): boolean {
    return this.cells[row]?.some((bomb) => bomb !== null) ?? false;
  }

  highestOccupiedRow(): number | null {
    for (let row = 0; row < this.playableRows; row += 1) {
      if (this.hasBombInRow(row)) {
        return row;
      }
    }
    return null;
  }

  occupiedRows(): number[] {
    const rows: number[] = [];
    for (let row = 0; row < this.playableRows; row += 1) {
      if (this.hasBombInRow(row)) {
        rows.push(row);
      }
    }
    return rows;
  }

  cellCenter(row: number, col: number): { x: number; y: number } {
    return { x: this.cellCenterX(col), y: this.cellCenterY(row) };
  }

  cellCenterX(col: number): number {
    return this.layout.x + col * this.layout.cellSize + this.layout.cellSize / 2;
  }

  cellCenterY(row: number): number {
    return this.layout.y + row * this.layout.cellSize + this.layout.cellSize / 2;
  }

  private moveBomb(bomb: Bomb, row: number, col: number): void {
    bomb.row = row;
    bomb.col = col;
    bomb.targetX = this.cellCenterX(col);
    bomb.targetY = this.cellCenterY(row);
    bomb.spawnDelay = 0;
    bomb.state = "normal";
  }

  private createBomb(row: number, col: number, spawnDelay: number): Bomb {
    return {
      id: this.nextId++,
      row,
      col,
      connectors: makeConnectors(this.nextRandomInt(4)),
      visualX: this.cellCenterX(col),
      visualY: this.cellCenterY(row),
      targetX: this.cellCenterX(col),
      targetY: this.cellCenterY(row),
      state: "normal",
      stateAge: 0,
      spawnDelay
    };
  }

  private nextRandomInt(max: number): number {
    this.randomSeed = (this.randomSeed * 1664525 + 1013904223) >>> 0;
    return this.randomSeed % max;
  }
}
