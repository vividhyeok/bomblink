import type { Bomb, Cell, Direction } from "./Types";

export const DIRECTIONS: Direction[] = ["up", "right", "down", "left"];

export const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  right: "left",
  down: "up",
  left: "right"
};

export const DELTA: Record<Direction, { row: number; col: number }> = {
  up: { row: -1, col: 0 },
  right: { row: 0, col: 1 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 }
};

export function makeConnectors(seed: number): Direction[] {
  return [DIRECTIONS[seed % DIRECTIONS.length]];
}

export function rotateConnectors(connectors: Direction[], clockwise: boolean): Direction[] {
  const amount = clockwise ? 1 : -1;
  return connectors.map((direction) => {
    const next = (DIRECTIONS.indexOf(direction) + amount + DIRECTIONS.length) % DIRECTIONS.length;
    return DIRECTIONS[next];
  });
}

export function hasConnector(bomb: Bomb | null, direction: Direction): boolean {
  return Boolean(bomb && bomb.state !== "empty" && bomb.connectors.includes(direction));
}

/**
 * Directed BombLink rule: A is already exploding. B joins only when B's fuse
 * points back toward A. This is the wording used by the feature-phone manuals and
 * is also how the surviving reconstruction source performs its incoming-hit test.
 */
export function canConnect(a: Bomb | null, b: Bomb | null, directionFromA: Direction): boolean {
  if (!a || !b || a.state === "empty" || b.state === "empty") return false;
  return b.connectors.includes(OPPOSITE[directionFromA]);
}

export function incomingDirectionForFlame(side: "left" | "right"): Direction {
  return side === "left" ? "left" : "right";
}

export function findConnectedCluster(cells: Cell[][], startRow: number, startCol: number): Bomb[] {
  return findConnectedChain(cells, startRow, startCol).map((node) => node.bomb);
}

export type ChainNode = {
  bomb: Bomb;
  parent: Bomb | null;
  depth: number;
  order: number;
};

/**
 * A long bonus bomb is one rigid piece occupying 2/3/4 cells. Only its anchor
 * segment owns the external fuse, but once that anchor is ignited every segment
 * participates in the explosion and can ignite neighboring bombs. The public
 * Android reconstruction models the same behavior as several linked bomb objects;
 * expanding the piece here gives the equivalent graph semantics without exposing
 * fake rotatable fuses on every segment.
 */
export function findConnectedChain(cells: Cell[][], startRow: number, startCol: number): ChainNode[] {
  const start = cells[startRow]?.[startCol] ?? null;
  if (!start || start.state === "empty") return [];

  const rows = cells.length;
  const cols = cells[0]?.length ?? 0;
  const queue: ChainNode[] = [];
  const visitedIds = new Set<number>();
  const result: ChainNode[] = [];
  let order = 0;

  const enqueuePiece = (bomb: Bomb, parent: Bomb | null, depth: number): void => {
    if (visitedIds.has(bomb.id)) return;

    visitedIds.add(bomb.id);
    queue.push({ bomb, parent, depth, order: order++ });

    if (bomb.kind !== "bonus" || bomb.bonusSize <= 1) return;

    for (const segment of findPieceMembers(cells, bomb.pieceId)) {
      if (visitedIds.has(segment.id)) continue;
      visitedIds.add(segment.id);
      queue.push({ bomb: segment, parent: bomb, depth: depth + 1, order: order++ });
    }
  };

  enqueuePiece(start, null, 0);

  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const currentNode = queue[queueIndex++];
    const current = currentNode.bomb;
    result.push(currentNode);

    for (const direction of DIRECTIONS) {
      const delta = DELTA[direction];
      const row = current.row + delta.row;
      const col = current.col + delta.col;
      if (row < 0 || row >= rows || col < 0 || col >= cols) continue;

      const neighbor = cells[row][col];
      if (!neighbor || visitedIds.has(neighbor.id)) continue;
      if (neighbor.state !== "normal" && neighbor.id !== start.id) continue;

      if (canConnect(current, neighbor, direction)) {
        enqueuePiece(neighbor, current, currentNode.depth + 1);
      }
    }
  }

  return result;
}

export function findCombinedConnectedChain(cells: Cell[][], starts: { row: number; col: number }[]): ChainNode[] {
  if (starts.length === 0) return [];

  const combined: ChainNode[] = [];
  const seen = new Set<number>();
  let order = 0;

  for (const start of starts) {
    const chain = findConnectedChain(cells, start.row, start.col);
    for (const node of chain) {
      if (seen.has(node.bomb.id)) continue;
      seen.add(node.bomb.id);
      combined.push({ ...node, order: order++ });
    }
  }

  return combined;
}

/**
 * Reconstructed feature-phone score curve:
 * 100 * exploded-unit count + 100 * max(0, combo - 2)^2.
 */
export function scoreForExplosion(combo: number, explodedUnits = combo): number {
  if (combo <= 0 || explodedUnits <= 0) return 0;
  const comboBonusBase = Math.max(0, combo - 2);
  return explodedUnits * 100 + comboBonusBase * comboBonusBase * 100;
}

function findPieceMembers(cells: Cell[][], pieceId: number): Bomb[] {
  const members: Bomb[] = [];
  for (const row of cells) {
    for (const bomb of row) {
      if (bomb?.pieceId === pieceId) members.push(bomb);
    }
  }
  return members.sort((a, b) => a.pieceIndex - b.pieceIndex);
}
