import type { ExplosionFlash, Particle } from "../game/Types";
import { makeBurst } from "./Particle";

export function createExplosion(x: number, y: number, row: number, col: number, count: number): {
  flash: ExplosionFlash;
  particles: Particle[];
} {
  return {
    flash: {
      row,
      col,
      x,
      y,
      age: 0,
      duration: 0.18,
      radius: count >= 8 ? 17 : 13
    },
    particles: makeBurst(x, y, count >= 8 ? 14 : 9, row * 17 + col * 31 + count)
  };
}

export function updateFlashes(flashes: ExplosionFlash[], dt: number): ExplosionFlash[] {
  const next: ExplosionFlash[] = [];

  for (const flash of flashes) {
    flash.age += dt;

    if (flash.age < flash.duration) {
      next.push(flash);
    }
  }

  return next;
}
