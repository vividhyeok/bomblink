import type { FlameEvent, FlameSide } from "../game/Types";

export function createFlameLine(side: FlameSide, targetRow: number, duration = 2.8): FlameEvent {
  return {
    row: targetRow,
    side,
    progress: 0,
    age: 0,
    duration,
    scannedRows: new Set<number>(),
    hit: null
  };
}

export function updateFlameLine(flame: FlameEvent, dt: number): void {
  flame.age += dt;
  flame.progress = Math.min(1, flame.age / flame.duration);
}
