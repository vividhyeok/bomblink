import type { Bomb, BoardLayout, Cell, Direction } from "./Types";
import { makeConnectors, rotateConnectors } from "./Rules";

const CELL_MOVE_SPEED = 9;
const DEFAULT_STARTING_ROWS = 4;

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

  reset(startingRows = DEFAULT_STARTING_ROWS): void {
    this.nextId = 1;
    this.randomSeed = 7229;
    const firstFilledRow = Math.max(0, this.layout.rows - startingRows);
    
    this.cells = Array.from({ length: this.layout.rows }, () => Array(this.layout.cols).fill(null));
    
    for (let row = 0; row < this.layout.rows; row++) {
      for (let col = 0; col < this.layout.cols; col++) {
        if (row >= firstFilledRow) {
          this.cells[row][col] = this.createBomb(row, col, 0);
        }
      }
    }
  }

  get(row: number, col: number): Bomb | null {
    if (!this.inBounds(row, col)) {
      return null;
    }

    return this.cells[row][col];
  }

  rotate(row: number, col: number, clockwise: boolean): boolean {
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
    const { rows, cols } = this.layout;

    for (let col = 0; col < cols; col += 1) {
      const survivors: Bomb[] = [];

      for (let row = rows - 1; row >= 0; row -= 1) {
        const bomb = this.cells[row][col];

        if (bomb) {
          survivors.push(bomb);
        }
      }

      for (let row = rows - 1; row >= 0; row -= 1) {
        const survivor = survivors[rows - 1 - row];

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
    const { rows, cols } = this.layout;

    for (let row = 0; row < rows - 1; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const bomb = this.cells[row + 1][col];
        this.cells[row][col] = bomb;

        if (bomb) {
          bomb.row = row;
          bomb.col = col;
          bomb.targetX = this.cellCenterX(col);
          bomb.targetY = this.cellCenterY(row);
          bomb.spawnDelay = 0;
          bomb.state = "normal";
        }
      }
    }

    const bottomRow = rows - 1;

    for (let col = 0; col < cols; col += 1) {
      const bomb = this.createBomb(bottomRow, col, col * 18);
      bomb.visualY = this.cellCenterY(rows);
      this.cells[bottomRow][col] = bomb;
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
    for (let row = 0; row < this.layout.rows; row += 1) {
      if (this.hasBombInRow(row)) {
        return row;
      }
    }

    return null;
  }

  occupiedRows(): number[] {
    const rows: number[] = [];

    for (let row = 0; row < this.layout.rows; row += 1) {
      if (this.hasBombInRow(row)) {
        rows.push(row);
      }
    }

    return rows;
  }

  cellCenter(row: number, col: number): { x: number; y: number } {
    return {
      x: this.cellCenterX(col),
      y: this.cellCenterY(row)
    };
  }

  cellCenterX(col: number): number {
    return this.layout.x + col * this.layout.cellSize + this.layout.cellSize / 2;
  }

  cellCenterY(row: number): number {
    return this.layout.y + row * this.layout.cellSize + this.layout.cellSize / 2;
  }

  private createBomb(row: number, col: number, spawnDelay: number): Bomb {
    const connectors = new Set<Direction>();
    const dirs: Direction[] = ["up", "right", "down", "left"];
    
    // All bombs have exactly 1 fuse as per original game mechanic
    const numConnectors = 1;
    
    while (connectors.size < numConnectors) {
      connectors.add(dirs[Math.floor(Math.random() * dirs.length)]);
    }

    return {
      id: this.nextId++,
      row,
      col,
      connectors: Array.from(connectors),
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
