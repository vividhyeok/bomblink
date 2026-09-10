import type { Phase } from "./Phase";

export type Direction = "up" | "right" | "down" | "left";

export type BombState = "normal" | "ignited" | "exploding" | "empty";
export type BombKind = "normal" | "bonus" | "obstruction";
export type BonusSize = 1 | 2 | 3 | 4;
export type DifficultySetting = "easy" | "normal" | "hard";

export type Bomb = {
  id: number;
  row: number;
  col: number;
  /**
   * Normal and obstruction pieces have one fixed fuse direction. A multi-cell
   * bonus piece exposes a fuse only on its anchor segment; the remaining segments
   * keep this array empty because the whole piece explodes as one rigid object.
   */
  connectors: Direction[];
  kind: BombKind;
  /** Number of horizontal cells occupied by the whole bonus piece. */
  bonusSize: BonusSize;
  /** Segments belonging to one long bonus bomb share this id. */
  pieceId: number;
  /** Zero-based position inside a long horizontal bonus piece. */
  pieceIndex: number;
  /** Only the externally fused segment of a bonus piece is chain-addressable. */
  fuseActive: boolean;
  visualX: number;
  visualY: number;
  targetX: number;
  targetY: number;
  state: BombState;
  stateAge: number;
  spawnDelay: number;
};

export type Cell = Bomb | null;

export type Cursor = {
  row: number;
  col: number;
  blink: number;
};

export type BoardLayout = {
  x: number;
  y: number;
  cols: number;
  rows: number;
  cellSize: number;
};

export type FlameSide = "left" | "right";

export type FlameEvent = {
  row: number;
  side: FlameSide;
  progress: number;
  age: number;
  duration: number;
  scannedRows: Set<number>;
  /** The current ignition point while this same flame drop is paused. */
  hit: { row: number; col: number } | null;
};

export type BurnSegment = {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  age: number;
  duration: number;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  age: number;
  lifetime: number;
  color: string;
  gravity: number;
};

export type ExplosionFlash = {
  row: number;
  col: number;
  x: number;
  y: number;
  age: number;
  duration: number;
  radius: number;
};

export type HudLabel = "FIRE" | "FLAMES" | "TOTAL" | "ATTACK" | "LEFT";

export type GameMode = "flames100" | "endless";

export type GameSnapshot = {
  canvasWidth: number;
  canvasHeight: number;
  layout: BoardLayout;
  phase: Phase;
  mode: GameMode;
  level: number;
  score: number;
  combo: number;
  bestCombo: number;
  totalExploded: number;
  flamesRemaining: number;
  hudLabel: HudLabel;
  nextFlameIn: number;
  nextFlameRow: number | null;
  nextFlameSide: FlameSide;
  fireWarning: boolean;
  pressureIn: number;
  dangerRow: number;
  dangerWarning: boolean;
  cursor: Cursor;
  cells: Cell[][];
  flame: FlameEvent | null;
  burns: BurnSegment[];
  particles: Particle[];
  flashes: ExplosionFlash[];
  shakeX: number;
  shakeY: number;
  muted: boolean;
  debugMode: boolean;
  message: string | null;
};
