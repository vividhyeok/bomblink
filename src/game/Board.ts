import type { Bomb, BoardLayout, BonusSize, Cell, DifficultySetting, Direction } from "./Types";
import { makeConnectors, rotateConnectors } from "./Rules";

// Reference reconstruction timing: gravity falls one cell in ~0.25s, while a
// manual/automatic board raise takes ~0.75s for one row.
const FALL_MOVE_SPEED = 4;
const RAISE_MOVE_SPEED = 1 / 0.75;
const DEFAULT_STARTING_ROWS = 4;

const ROW_SPECIAL_CHANCE: Record<DifficultySetting, number> = {
  easy: 1 / 4,
  normal: 1 / 3,
  hard: 1 / 2
};

export class Board {
  readonly layout: BoardLayout;
  cells: Cell[][];

  private nextId = 1;
  private nextPieceId = 1;
  private randomSeed = 7229;
  private pendingBonusSize: Exclude<BonusSize, 1> | null = null;
  private movementSpeeds = new Map<number, number>();

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
    this.nextPieceId = 1;
    this.randomSeed = 7229;
    this.pendingBonusSize = null;
    this.movementSpeeds.clear();
    const firstFilledRow = Math.max(0, this.playableRows - startingRows);
    this.cells = Array.from({ length: this.layout.rows }, () => Array(this.layout.cols).fill(null));

    for (let row = firstFilledRow; row < this.playableRows; row += 1) {
      for (let col = 0; col < this.layout.cols; col += 1) {
        this.cells[row][col] = this.createBomb(row, col, 0, "normal", 1);
      }
    }

    this.generatePreviewRow("easy", false);
  }

  get(row: number, col: number): Bomb | null {
    if (!this.inBounds(row, col)) return null;
    return this.cells[row][col];
  }

  rotate(row: number, col: number, clockwise: boolean): boolean {
    if (row >= this.playableRows) return false;

    const bomb = this.get(row, col);
    if (!bomb || bomb.state !== "normal" || bomb.kind !== "normal") return false;

    bomb.connectors = rotateConnectors(bomb.connectors, clockwise);
    return true;
  }

  queueBonus(size: Exclude<BonusSize, 1>): void {
    this.pendingBonusSize = Math.max(this.pendingBonusSize ?? 0, size) as Exclude<BonusSize, 1>;
  }

  dropPendingBonus(): boolean {
    const size = this.pendingBonusSize;
    if (!size) return false;

    type Candidate = { startCol: number; row: number; supportCols: number[] };
    const candidates: Candidate[] = [];

    for (let startCol = 0; startCol <= this.layout.cols - size; startCol += 1) {
      const firstOccupied: number[] = [];

      for (let offset = 0; offset < size; offset += 1) {
        const col = startCol + offset;
        let first = this.playableRows;
        for (let row = 0; row < this.playableRows; row += 1) {
          if (this.cells[row][col]) {
            first = row;
            break;
          }
        }
        firstOccupied.push(first);
      }

      const row = Math.min(...firstOccupied) - 1;
      if (row < 0 || row >= this.playableRows) continue;

      const supportCols: number[] = [];
      for (let offset = 0; offset < size; offset += 1) {
        if (firstOccupied[offset] === row + 1 && firstOccupied[offset] < this.playableRows) {
          supportCols.push(startCol + offset);
        }
      }

      if (supportCols.length > 0) candidates.push({ startCol, row, supportCols });
    }

    if (candidates.length === 0) return false;

    const candidate = candidates[this.nextRandomInt(candidates.length)];
    const anchorCol = candidate.supportCols[this.nextRandomInt(candidate.supportCols.length)];
    const anchorIndex = anchorCol - candidate.startCol;
    const pieceId = this.nextPieceId++;

    for (let index = 0; index < size; index += 1) {
      const col = candidate.startCol + index;
      const fuseActive = index === anchorIndex;
      const connectors: Direction[] = fuseActive
        ? ["down"]
        : index < anchorIndex
          ? ["right"]
          : ["left"];

      const bomb = this.createBomb(
        candidate.row,
        col,
        0,
        "bonus",
        size,
        pieceId,
        index,
        connectors,
        fuseActive
      );

      bomb.visualX = this.cellCenterX(col);
      bomb.visualY = this.layout.y - this.layout.cellSize / 2;
      this.movementSpeeds.set(bomb.id, FALL_MOVE_SPEED);
      this.cells[candidate.row][col] = bomb;
    }

    this.pendingBonusSize = null;
    return true;
  }

  clearBombs(bombs: Bomb[]): void {
    for (const bomb of bombs) {
      this.movementSpeeds.delete(bomb.id);
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

  /**
   * Resolve logical gravity one cell at a time. Every vertical one-cell fall flips
   * a vertical fuse. Rendering derives the in-between half-turns from visualY vs
   * targetY, so a one-cell fall visibly turns 180°, two cells 360°, etc.
   */
  applyGravity(): void {
    let moved = true;

    while (moved) {
      moved = false;
      const processedPieces = new Set<number>();

      for (let row = this.playableRows - 2; row >= 0; row -= 1) {
        for (let col = 0; col < this.layout.cols; col += 1) {
          const bomb = this.cells[row][col];
          if (!bomb) continue;

          if (bomb.kind === "bonus" && bomb.bonusSize > 1) {
            if (processedPieces.has(bomb.pieceId)) continue;
            processedPieces.add(bomb.pieceId);
            const members = this.getPieceMembers(bomb.pieceId);
            if (members.length === bomb.bonusSize && this.canGroupFall(members)) {
              this.moveGroupDown(members);
              moved = true;
            }
            continue;
          }

          if (row + 1 < this.playableRows && this.cells[row + 1][col] === null) {
            this.moveSingleDown(bomb);
            moved = true;
          }
        }
      }
    }
  }

  /**
   * The incoming row rises over ~0.75s. Raising does not flip the fuse: the 180°
   * flip belongs only to gravity falling, matching the reconstruction source.
   */
  addPressureRow(difficulty: DifficultySetting = "normal"): void {
    const { cols } = this.layout;
    const incoming = this.cells[this.previewRow].slice();

    for (let row = 0; row < this.playableRows - 1; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const bomb = this.cells[row + 1][col];
        this.cells[row][col] = bomb;
        if (bomb) this.moveBomb(bomb, row, col, RAISE_MOVE_SPEED);
      }
    }

    const bottomRow = this.playableRows - 1;
    for (let col = 0; col < cols; col += 1) {
      const bomb = incoming[col];
      this.cells[bottomRow][col] = bomb;
      if (bomb) this.moveBomb(bomb, bottomRow, col, RAISE_MOVE_SPEED);
    }

    this.generatePreviewRow(difficulty, true);
  }

  update(dt: number): boolean {
    let settled = true;

    for (const row of this.cells) {
      for (const bomb of row) {
        if (!bomb) continue;

        bomb.stateAge += dt;
        const cellsPerSecond = this.movementSpeeds.get(bomb.id) ?? FALL_MOVE_SPEED;
        const speed = cellsPerSecond * this.layout.cellSize * dt;
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
          this.movementSpeeds.delete(bomb.id);
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
      if (this.hasBombInRow(row)) return row;
    }
    return null;
  }

  occupiedRows(): number[] {
    const rows: number[] = [];
    for (let row = 0; row < this.playableRows; row += 1) {
      if (this.hasBombInRow(row)) rows.push(row);
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

  private generatePreviewRow(difficulty: DifficultySetting, allowSpecials: boolean): void {
    const { cols } = this.layout;
    const chance = ROW_SPECIAL_CHANCE[difficulty];
    const obstructionCol = allowSpecials && this.roll(chance) ? this.nextRandomInt(cols) : -1;
    const emptyCol = allowSpecials && this.roll(chance) ? this.nextRandomInt(cols) : -1;

    for (let col = 0; col < cols; col += 1) {
      if (col === emptyCol) {
        this.cells[this.previewRow][col] = null;
        continue;
      }

      const kind: Bomb["kind"] = col === obstructionCol ? "obstruction" : "normal";
      const bomb = this.createBomb(this.previewRow, col, col * 18, kind, 1);
      bomb.visualY = this.cellCenterY(this.layout.rows);
      this.movementSpeeds.set(bomb.id, allowSpecials ? RAISE_MOVE_SPEED : FALL_MOVE_SPEED);
      this.cells[this.previewRow][col] = bomb;
    }
  }

  private roll(chance: number): boolean {
    return this.nextRandomInt(10_000) < Math.floor(chance * 10_000);
  }

  private getPieceMembers(pieceId: number): Bomb[] {
    const members: Bomb[] = [];
    for (let row = 0; row < this.playableRows; row += 1) {
      for (let col = 0; col < this.layout.cols; col += 1) {
        const bomb = this.cells[row][col];
        if (bomb?.pieceId === pieceId) members.push(bomb);
      }
    }
    return members.sort((a, b) => a.pieceIndex - b.pieceIndex);
  }

  private canGroupFall(members: Bomb[]): boolean {
    return members.every((member) => {
      const nextRow = member.row + 1;
      if (nextRow >= this.playableRows) return false;
      const below = this.cells[nextRow][member.col];
      return below === null || below.pieceId === member.pieceId;
    });
  }

  private moveGroupDown(members: Bomb[]): void {
    for (const member of members) {
      if (this.cells[member.row][member.col]?.id === member.id) {
        this.cells[member.row][member.col] = null;
      }
    }

    for (const member of members) {
      member.row += 1;
      member.targetY = this.cellCenterY(member.row);
      member.spawnDelay = 0;
      member.state = "normal";
      this.flipVerticalFuse(member);
      this.movementSpeeds.set(member.id, FALL_MOVE_SPEED);
    }

    for (const member of members) {
      this.cells[member.row][member.col] = member;
    }
  }

  private moveSingleDown(bomb: Bomb): void {
    const oldRow = bomb.row;
    const col = bomb.col;
    if (this.cells[oldRow][col]?.id === bomb.id) this.cells[oldRow][col] = null;
    bomb.row = oldRow + 1;
    bomb.targetY = this.cellCenterY(bomb.row);
    bomb.spawnDelay = 0;
    bomb.state = "normal";
    this.flipVerticalFuse(bomb);
    this.movementSpeeds.set(bomb.id, FALL_MOVE_SPEED);
    this.cells[bomb.row][col] = bomb;
  }

  private flipVerticalFuse(bomb: Bomb): void {
    bomb.connectors = bomb.connectors.map((direction) => {
      if (direction === "up") return "down";
      if (direction === "down") return "up";
      return direction;
    });
  }

  private moveBomb(bomb: Bomb, row: number, col: number, speed = FALL_MOVE_SPEED): void {
    bomb.row = row;
    bomb.col = col;
    bomb.targetX = this.cellCenterX(col);
    bomb.targetY = this.cellCenterY(row);
    bomb.spawnDelay = 0;
    bomb.state = "normal";
    this.movementSpeeds.set(bomb.id, speed);
  }

  private createBomb(
    row: number,
    col: number,
    spawnDelay: number,
    kind: Bomb["kind"],
    bonusSize: BonusSize,
    pieceId?: number,
    pieceIndex = 0,
    connectors?: Direction[],
    fuseActive = true
  ): Bomb {
    const id = this.nextId++;
    const resolvedPieceId = pieceId ?? this.nextPieceId++;
    return {
      id,
      row,
      col,
      connectors: connectors ?? makeConnectors(this.nextRandomInt(4)),
      kind,
      bonusSize,
      pieceId: resolvedPieceId,
      pieceIndex,
      fuseActive,
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
    if (max <= 1) return 0;
    this.randomSeed = (this.randomSeed * 1664525 + 1013904223) >>> 0;
    return this.randomSeed % max;
  }
}
