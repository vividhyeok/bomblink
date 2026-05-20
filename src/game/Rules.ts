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

const SHAPES: Direction[][] = [
  ["left", "right"],
  ["up", "down"],
  ["up", "right"],
  ["right", "down"],
  ["down", "left"],
  ["left", "up"],
  ["up", "right", "down", "left"]
];

export function makeConnectors(seed: number): Direction[] {
  return [...SHAPES[seed % SHAPES.length]];
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

export function canConnect(a: Bomb | null, b: Bomb | null, directionFromA: Direction): boolean {
  if (!a || !b || a.state === "empty" || b.state === "empty") {
    return false;
  }

  // Unidirectional: A connects to B if A has a connector pointing to B.
  return a.connectors.includes(directionFromA);
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

export function findConnectedChain(cells: Cell[][], startRow: number, startCol: number): ChainNode[] {
  const start = cells[startRow]?.[startCol] ?? null;

  if (!start || start.state === "empty") {
    return [];
  }

  const rows = cells.length;
  const cols = cells[0]?.length ?? 0;
  const queue: ChainNode[] = [{ bomb: start, parent: null, depth: 0, order: 0 }];
  const visited = new Set<string>([key(startRow, startCol)]);
  const result: ChainNode[] = [];
  let order = 1;

  while (queue.length > 0) {
    const currentNode = queue.shift();

    if (!currentNode) {
      continue;
    }

    const current = currentNode.bomb;
    result.push(currentNode);

    for (const direction of DIRECTIONS) {
      const delta = DELTA[direction];
      const row = current.row + delta.row;
      const col = current.col + delta.col;

      if (row < 0 || row >= rows || col < 0 || col >= cols) {
        continue;
      }

      const neighbor = cells[row][col];
      const neighborKey = key(row, col);

      if (!neighbor || visited.has(neighborKey) || (neighbor.state !== "normal" && neighbor.id !== start.id)) {
        continue;
      }

      if (canConnect(current, neighbor, direction)) {
        visited.add(neighborKey);
        queue.push({
          bomb: neighbor,
          parent: current,
          depth: currentNode.depth + 1,
          order
        });
        order += 1;
      }
    }
  }

  return result;
}

export function findCombinedConnectedChain(cells: Cell[][], starts: { row: number; col: number }[]): ChainNode[] {
  if (starts.length === 0) {
    return [];
  }

  const rows = cells.length;
  const cols = cells[0]?.length ?? 0;
  const queue: ChainNode[] = [];
  const visited = new Set<string>();
  let order = 0;

  for (const start of starts) {
    const bomb = cells[start.row]?.[start.col];
    if (bomb && bomb.state !== "empty") {
      const k = key(start.row, start.col);
      if (!visited.has(k)) {
        visited.add(k);
        queue.push({ bomb, parent: null, depth: 0, order });
        order += 1;
      }
    }
  }

  const result: ChainNode[] = [];
  let queueIndex = 0;

  while (queueIndex < queue.length) {
    const currentNode = queue[queueIndex];
    queueIndex += 1;

    const current = currentNode.bomb;
    result.push(currentNode);

    for (const direction of DIRECTIONS) {
      const delta = DELTA[direction];
      const row = current.row + delta.row;
      const col = current.col + delta.col;

      if (row < 0 || row >= rows || col < 0 || col >= cols) {
        continue;
      }

      const neighbor = cells[row][col];
      const neighborKey = key(row, col);

      if (!neighbor || visited.has(neighborKey)) {
        continue;
      }

      if (canConnect(current, neighbor, direction)) {
        visited.add(neighborKey);
        queue.push({
          bomb: neighbor,
          parent: current,
          depth: currentNode.depth + 1,
          order
        });
        order += 1;
      }
    }
  }

  return result;
}

export function scoreForExplosion(count: number): number {
  if (count <= 0) {
    return 0;
  }

  let bonus = 0;

  if (count >= 10) {
    bonus = 200;
  } else if (count >= 6) {
    bonus = 90;
  } else if (count >= 4) {
    bonus = 35;
  }

  return count * 10 + bonus;
}

function key(row: number, col: number): string {
  return `${row}:${col}`;
}
