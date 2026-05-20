import type { Phase } from "./Phase";

export type Direction = "up" | "right" | "down" | "left";

export type BombState = "normal" | "ignited" | "exploding" | "empty";

export type Bomb = {
  id: number;
  row: number;
  col: number;
  connectors: Direction[];
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
