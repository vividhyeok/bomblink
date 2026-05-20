import type { BurnSegment } from "../game/Types";

export function createBurnSegment(fromRow: number, fromCol: number, toRow: number, toCol: number): BurnSegment {
  return {
    fromRow,
    fromCol,
    toRow,
    toCol,
    age: 0,
    duration: 0.24
  };
}

export function updateBurnSegments(segments: BurnSegment[], dt: number): BurnSegment[] {
  const next: BurnSegment[] = [];

  for (const segment of segments) {
    segment.age += dt;

    if (segment.age < segment.duration) {
      next.push(segment);
    }
  }

  return next;
}
