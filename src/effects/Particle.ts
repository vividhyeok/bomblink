import type { Particle } from "../game/Types";

export function updateParticles(particles: Particle[], dt: number): Particle[] {
  const next: Particle[] = [];

  for (const particle of particles) {
    particle.age += dt;
    particle.vy += particle.gravity * dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;

    if (particle.age < particle.lifetime) {
      next.push(particle);
    }
  }

  return next;
}

export function makeBurst(x: number, y: number, count: number, seedOffset: number): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < count; i += 1) {
    const angle = ((i / count) * Math.PI * 2) + pseudoRandom(seedOffset + i) * 0.85;
    const speed = 28 + pseudoRandom(seedOffset + i * 7) * 76;
    const fire = i % 3 !== 0;

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (fire ? 12 : 0),
      size: fire ? 2 + Math.floor(pseudoRandom(seedOffset + i * 5) * 3) : 2,
      age: 0,
      lifetime: fire ? 0.18 + pseudoRandom(seedOffset + i * 11) * 0.22 : 0.3 + pseudoRandom(seedOffset + i * 13) * 0.26,
      color: fire ? pickFireColor(i) : pickSmokeColor(i),
      gravity: fire ? 70 : -10
    });
  }

  return particles;
}

function pickFireColor(index: number): string {
  const colors = ["#fff3a8", "#ffd236", "#ff8a20", "#f04120"];
  return colors[index % colors.length];
}

function pickSmokeColor(index: number): string {
  const colors = ["#1a1c22", "#32363c", "#555b61"];
  return colors[index % colors.length];
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
