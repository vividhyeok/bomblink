import { RetroSound } from "../audio/RetroSound";
import { createExplosion, updateFlashes } from "../effects/ExplosionEffect";
import { createBurnSegment, updateBurnSegments } from "../effects/FuseBurnEffect";
import { createFlameLine, updateFlameLine } from "../effects/FlameLine";
import { updateParticles } from "../effects/Particle";
import { ScreenShake } from "../effects/ScreenShake";
import type { KeyboardInput } from "../input/KeyboardInput";
import { Board } from "./Board";
import type { Phase } from "./Phase";
import {
  type ChainNode,
  findConnectedChain,
  findCombinedConnectedChain,
  scoreForExplosion
} from "./Rules";
import type {
  Bomb,
  BoardLayout,
  BurnSegment,
  Cursor,
  ExplosionFlash,
  FlameEvent,
  FlameSide,
  GameMode,
  GameSnapshot,
  HudLabel,
  Particle
} from "./Types";

const CANVAS_WIDTH = 240;
const CANVAS_HEIGHT = 360;
const BOARD_LAYOUT: BoardLayout = {
  x: 40,
  y: 72,
  cols: 5,
  rows: 8,
  cellSize: 32
};

const HUD_LABELS: HudLabel[] = ["FIRE", "FLAMES", "TOTAL", "ATTACK", "LEFT"];
const STARTING_ROWS = 6;
const DEATH_ROW = 0;
const FIRST_FLAME_GRACE = 12;
const INITIAL_PRESSURE_DELAY = 18;
const FIRE_WARNING_SECONDS = 4;
const INITIAL_FLAMES = 100;
const DEBUG_MODE = new URLSearchParams(globalThis.location?.search ?? "").has("debug");

export class Game {
  private readonly input: KeyboardInput;
  private readonly board = new Board(BOARD_LAYOUT);
  private readonly sound = new RetroSound();
  private readonly shake = new ScreenShake();
  private cursor: Cursor = { row: BOARD_LAYOUT.rows - 1, col: Math.floor(BOARD_LAYOUT.cols / 2), blink: 0 };
  private phase: Phase = "banner";
  private previousPhase: Phase = "banner";
  private phaseTimer = 0;
  private flame: FlameEvent | null = null;
  private nextFlameTimer = FIRST_FLAME_GRACE;
  private pressureTimer = INITIAL_PRESSURE_DELAY;
  private gameplayTime = 0;
  private flameSide: FlameSide = Math.random() < 0.5 ? "left" : "right";
  private flameHistory: FlameSide[] = [];
  private chain: ChainNode[] = [];
  private activeChains: { nodes: ChainNode[]; index: number; timer: number }[] = [];
  private chainIndex = 0;
  private chainTimer = 0;
  private exploded: Bomb[] = [];
  private burns: BurnSegment[] = [];
  private particles: Particle[] = [];
  private flashes: ExplosionFlash[] = [];
  private shakeOffset = { x: 0, y: 0 };
  private level = 0;
  private score = 0;
  private combo = 0;
  private bestCombo = 0;
  private totalExploded = 0;
  private flamesRemaining = INITIAL_FLAMES;
  private hudLabelIndex = 1;
  private mode: GameMode = "flames100";
  private message: string | null = null;
  private boardSettled = true;
  private gameOverPending = false;
  private nextFlameRow: number | null = null;

  constructor(input: KeyboardInput) {
    this.input = input;
    this.sound.bindUnlock((callback) => this.input.onceStarted(callback));
  }

  update(dt: number): void {
    this.phaseTimer += dt;
    this.cursor.blink += dt;
    this.boardSettled = this.board.update(dt);
    this.updateActiveChains(dt);
    this.burns = updateBurnSegments(this.burns, dt);
    this.particles = updateParticles(this.particles, dt);
    this.flashes = updateFlashes(this.flashes, dt);
    this.shakeOffset = this.shake.update(dt);

    this.consumeGlobalInput();

    if (this.isGameplayPhase()) {
      this.gameplayTime += dt;
    }

    switch (this.phase) {
      case "banner":
        this.updateBanner();
        break;
      case "ready":
        this.updateReady();
        break;
      case "idle":
        this.updateIdle(dt);
        break;
      case "rotating":
        this.updateRotating();
        break;
      case "flamePassing":
        this.updateFlamePassing(dt);
        break;
      case "fuseBurning":
        this.updateFuseBurning(dt);
        break;
      case "exploding":
        this.updateExploding();
        break;
      case "falling":
      case "spawning":
        this.updateFalling();
        break;
      case "paused":
      case "levelClear":
      case "gameOver":
        break;
    }
  }

  getSnapshot(): GameSnapshot {
    return {
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      layout: this.board.layout,
      phase: this.phase,
      mode: this.mode,
      level: this.level,
      score: this.score,
      combo: this.combo,
      bestCombo: this.bestCombo,
      totalExploded: this.totalExploded,
      flamesRemaining: this.flamesRemaining,
      hudLabel: HUD_LABELS[this.hudLabelIndex],
      nextFlameIn: this.nextFlameTimer,
      nextFlameRow: this.nextFlameRow,
      nextFlameSide: this.flameSide,
      fireWarning: this.isFireWarning(),
      pressureIn: this.pressureTimer,
      dangerRow: DEATH_ROW,
      dangerWarning: this.isDangerWarning(),
      cursor: this.cursor,
      cells: this.board.cells,
      flame: this.flame,
      burns: this.burns,
      particles: this.particles,
      flashes: this.flashes,
      shakeX: this.shakeOffset.x,
      shakeY: this.shakeOffset.y,
      muted: this.sound.muted,
      debugMode: DEBUG_MODE,
      message: this.message
    };
  }

  private updateBanner(): void {
    this.message = this.phaseTimer < 0.9 ? "BOMB LINK" : `LEVEL ${this.level.toString().padStart(2, "0")}`;

    if (this.phaseTimer >= 1.45) {
      this.setPhase("ready");
    }
  }

  private updateReady(): void {
    this.message = this.phaseTimer < 0.8 ? "READY" : "START";

    if (this.phaseTimer >= 1.15) {
      this.message = null;
      this.nextFlameTimer = FIRST_FLAME_GRACE;
      this.pressureTimer = INITIAL_PRESSURE_DELAY;
      this.setPhase("idle");
    }
  }

  private updateIdle(dt: number): void {
    this.message = null;
    this.consumeMoveInput();
    this.consumeRotationInput();

    if (this.input.consume("fire")) {
      if (DEBUG_MODE) {
        this.startFlame(this.flameSide);
      }
      return;
    }

    this.nextFlameTimer -= dt;
    this.pressureTimer -= dt;

    if (this.pressureTimer <= 0) {
      this.startPressureRow();
      return;
    }

    if (this.nextFlameTimer <= 0) {
      this.startFlame(this.flameSide);
    }
  }

  private updateRotating(): void {
    this.consumeMoveInput();
    this.consumeRotationInput();

    if (this.phaseTimer >= 0.08) {
      this.setPhase("idle");
    }
  }

  private updateFlamePassing(dt: number): void {
    this.consumeMoveInput();
    this.consumeRotationInput();

    if (!this.flame) {
      this.setPhase("idle");
      return;
    }

    updateFlameLine(this.flame, dt);
    this.scanFlameHit();

    if (this.flame.progress >= 1) {
      this.flame = null;
      if (this.activeChains.length > 0) {
        this.setPhase("fuseBurning");
      } else {
        if (this.flamesRemaining <= 0) {
          this.triggerResult();
        } else {
          this.scheduleNextFlame();
          this.setPhase("idle");
        }
      }
    }
  }

  private updateFuseBurning(dt: number): void {
    this.consumeMoveInput();
    this.consumeRotationInput();

    if (this.activeChains.length === 0) {
      this.setPhase("exploding");
    }
  }

  private updateExploding(): void {
    this.consumeMoveInput();
    this.consumeRotationInput();

    if (this.phaseTimer < 0.16) {
      return;
    }

    this.board.clearBombs(this.exploded);
    this.board.applyGravity();
    this.exploded = [];
    this.chain = [];
    this.setPhase("falling");
  }

  private updateFalling(): void {
    if (this.boardSettled && this.phaseTimer > 0.18) {
      this.sound.land();

      if (this.gameOverPending || this.board.hasBombInRow(DEATH_ROW)) {
        this.triggerGameOver();
      } else if (this.flamesRemaining <= 0 && this.mode === "flames100") {
        this.triggerResult();
      } else {
        this.nextFlameTimer = Math.max(2.2, Math.min(this.nextFlameTimer, this.nextFlameDelay()));
        this.setPhase("idle");
      }
    }
  }

  private consumeGlobalInput(): void {
    if (this.input.consume("mute")) {
      this.sound.toggleMute();
    }

    if (this.input.consume("hud") && DEBUG_MODE) {
      this.hudLabelIndex = (this.hudLabelIndex + 1) % HUD_LABELS.length;
    }

    if (this.phase === "result" || this.phase === "gameOver") {
      if (this.phaseTimer > 1.0) {
        if (
          this.input.consume("fire") ||
          this.input.consume("rotateClockwise") ||
          this.input.consume("rotateCounterClockwise") ||
          this.input.consume("restart")
        ) {
          this.reset();
          return;
        }
      }
    }

    if (this.input.consume("restart")) {
      this.reset();
      return;
    }

    if (this.input.consume("pause")) {
      if (this.phase === "paused") {
        this.setPhase(this.previousPhase === "paused" ? "idle" : this.previousPhase);
      } else if (
        this.phase !== "levelClear" &&
        this.phase !== "result" &&
        this.phase !== "gameOver" &&
        this.phase !== "banner" &&
        this.phase !== "ready"
      ) {
        this.previousPhase = this.phase;
        this.message = "PAUSE";
        this.setPhase("paused");
      }
    }
  }

  private consumeMoveInput(): void {
    const moves = [
      { action: "up", row: -1, col: 0 },
      { action: "right", row: 0, col: 1 },
      { action: "down", row: 1, col: 0 },
      { action: "left", row: 0, col: -1 }
    ] as const;

    for (const move of moves) {
      if (!this.input.consume(move.action)) {
        continue;
      }

      const row = clamp(this.cursor.row + move.row, 0, this.board.layout.rows - 1);
      const col = clamp(this.cursor.col + move.col, 0, this.board.layout.cols - 1);

      if (row !== this.cursor.row || col !== this.cursor.col) {
        this.cursor.row = row;
        this.cursor.col = col;
        this.sound.move();
      } else {
        this.sound.deny();
      }
    }
  }

  private consumeRotationInput(): void {
    if (this.input.consume("rotateClockwise")) {
      this.rotateCurrent(true);
    }

    if (this.input.consume("rotateCounterClockwise")) {
      this.rotateCurrent(false);
    }
  }

  private rotateCurrent(clockwise: boolean): void {
    const rotated = this.board.rotate(this.cursor.row, this.cursor.col, clockwise);

    if (!rotated) {
      this.sound.deny();
      return;
    }

    this.sound.rotate();
    // Do NOT setPhase("rotating") because it breaks movement during explosions!
  }

  private startFlame(side: FlameSide): void {
    if (this.flamesRemaining <= 0) {
      this.triggerResult();
      return;
    }

    this.flamesRemaining = Math.max(0, this.flamesRemaining - 1);
    this.combo = 0;
    this.flame = createFlameLine(side, this.board.layout.rows - 1, this.flameDuration());
    this.sound.flame();
    this.nextFlameRow = null;
    this.setPhase("flamePassing");
  }

  private startPressureRow(): void {
    if (this.board.hasBombInRow(DEATH_ROW)) {
      this.triggerGameOver();
      return;
    }

    this.board.addPressureRow();
    this.gameOverPending = this.board.hasBombInRow(DEATH_ROW);
    this.pressureTimer = this.nextPressureDelay();
    this.setPhase("spawning");
  }

  private scanFlameHit(): void {
    if (!this.flame) {
      return;
    }

    const { side, progress, row: targetRow } = this.flame;
    const startY = this.board.layout.y - 12;
    const endY = this.board.layout.y + targetRow * this.board.layout.cellSize + this.board.layout.cellSize / 2;
    const flameY = startY + (endY - startY) * progress;

    for (let r = 0; r <= targetRow; r += 1) {
      if (this.flame.scannedRows.has(r)) {
        continue;
      }

      const centerY = this.board.layout.y + r * this.board.layout.cellSize + this.board.layout.cellSize / 2;
      if (flameY >= centerY) {
        this.flame.scannedRows.add(r);

        const col = side === "left" ? 0 : this.board.layout.cols - 1;
        const bomb = this.board.get(r, col);
        const requiredConnector = side === "left" ? "left" : "right";

        if (bomb && bomb.state === "normal" && bomb.connectors.includes(requiredConnector)) {
          this.board.setBombState(bomb, "ignited");
          this.sound.ignite();
          this.startChain(r, col);
        }
      }
    }
  }

  private startChain(row: number, col: number): void {
    const bomb = this.board.get(row, col);
    if (!bomb) {
      return;
    }

    const chain = findConnectedChain(this.board.cells, row, col);
    if (chain.length === 0) {
      return;
    }

    for (const node of chain) {
      if (node.parent === null) {
        this.board.setBombState(node.bomb, "ignited");
      }
    }

    this.activeChains.push({
      nodes: chain,
      index: 0,
      timer: 0
    });

    this.combo += chain.length;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.totalExploded += chain.length;
    this.score += scoreForExplosion(chain.length);
    this.updateLevel();
    this.shake.trigger(chain.length);
  }

  private updateActiveChains(dt: number): void {
    for (const active of this.activeChains) {
      active.timer -= dt;
      while (active.timer <= 0 && active.index < active.nodes.length) {
        const node = active.nodes[active.index];
        const bomb = node.bomb;

        this.board.setBombState(bomb, "exploding");
        this.spawnExplosion(bomb, active.nodes.length);
        this.exploded.push(bomb);
        this.sound.explode(active.nodes.length);
        this.igniteChildrenOf(bomb, active.nodes);

        active.index += 1;
        active.timer += active.nodes.length >= 8 ? 0.13 : 0.17;
      }
    }

    this.activeChains = this.activeChains.filter((c) => c.index < c.nodes.length);
  }

  private spawnExplosion(bomb: Bomb, chainLength: number): void {
    const effect = createExplosion(bomb.visualX, bomb.visualY, bomb.row, bomb.col, chainLength);
    this.flashes.push(effect.flash);
    this.particles.push(...effect.particles);
  }

  private igniteChildrenOf(parent: Bomb, nodes: ChainNode[]): void {
    for (const node of nodes) {
      if (node.parent?.id !== parent.id) {
        continue;
      }

      this.board.setBombState(node.bomb, "ignited");
      this.burns.push(createBurnSegment(parent.row, parent.col, node.bomb.row, node.bomb.col));
    }
  }

  private pickFlameRow(): number {
    const occupiedRows = this.board.occupiedRows();

    if (occupiedRows.length === 0) {
      return this.cursor.row;
    }

    const random = Math.abs(Math.sin((this.score + this.level * 13 + this.gameplayTime) * 1.37));
    const row = occupiedRows[Math.floor(random * occupiedRows.length)];

    if (Math.abs(row - this.cursor.row) > 3) {
      const cursorBomb = this.board.get(this.cursor.row, this.cursor.col);
      return cursorBomb ? this.cursor.row : row;
    }

    return row;
  }

  private nextFlameDelay(): number {
    return 13.5 - this.difficulty() * 5;
  }

  private flameDuration(): number {
    return 3.1 - this.difficulty() * 0.9;
  }

  private nextPressureDelay(): number {
    return 15 - this.difficulty() * 5;
  }

  private difficulty(): number {
    const timePressure = Math.max(0, this.gameplayTime - 18) / 100;
    const scorePressure = this.score / 3400;
    return Math.min(1, timePressure + scorePressure + this.level * 0.08);
  }

  private scheduleNextFlame(delay = this.nextFlameDelay()): void {
    let nextSide: FlameSide = Math.random() < 0.5 ? "left" : "right";

    // Enforce 2-in-a-row rule
    if (this.flameHistory.length >= 2) {
      const last = this.flameHistory[this.flameHistory.length - 1];
      const prev = this.flameHistory[this.flameHistory.length - 2];
      if (last === prev) {
        nextSide = last === "left" ? "right" : "left";
      }
    }

    this.flameSide = nextSide;
    this.flameHistory.push(nextSide);
    if (this.flameHistory.length > 5) {
      this.flameHistory.shift();
    }

    this.nextFlameRow = null;
    this.nextFlameTimer = delay;
  }

  private isDangerWarning(): boolean {
    const highest = this.board.highestOccupiedRow();
    return highest !== null && (highest <= DEATH_ROW + 1 || this.gameOverPending);
  }

  private isFireWarning(): boolean {
    return this.phase === "idle" && this.nextFlameTimer <= FIRE_WARNING_SECONDS;
  }

  private triggerGameOver(): void {
    this.gameOverPending = false;
    this.message = "GAME OVER";
    this.sound.gameOver();
    this.setPhase("gameOver");
  }

  private triggerResult(): void {
    this.flame = null;
    this.nextFlameRow = null;
    this.message = "RESULT";
    this.sound.clear();
    this.setPhase("result");
  }

  private updateLevel(): void {
    this.level = Math.floor(this.score / 500);
  }

  private isGameplayPhase(): boolean {
    return (
      this.phase === "idle" ||
      this.phase === "rotating" ||
      this.phase === "flamePassing" ||
      this.phase === "fuseBurning" ||
      this.phase === "exploding" ||
      this.phase === "falling" ||
      this.phase === "spawning"
    );
  }

  private setPhase(phase: Phase): void {
    this.phase = phase;
    this.phaseTimer = 0;
  }

  private reset(): void {
    this.board.reset(STARTING_ROWS);
    this.cursor = { row: BOARD_LAYOUT.rows - 1, col: Math.floor(BOARD_LAYOUT.cols / 2), blink: 0 };
    this.phase = "banner";
    this.previousPhase = "banner";
    this.phaseTimer = 0;
    this.flame = null;
    this.nextFlameTimer = FIRST_FLAME_GRACE;
    this.pressureTimer = INITIAL_PRESSURE_DELAY;
    this.gameplayTime = 0;
    this.flameSide = Math.random() < 0.5 ? "left" : "right";
    this.flameHistory = [];
    this.nextFlameRow = null;
    this.chain = [];
    this.activeChains = [];
    this.chainIndex = 0;
    this.chainTimer = 0;
    this.exploded = [];
    this.burns = [];
    this.particles = [];
    this.flashes = [];
    this.level = 0;
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.totalExploded = 0;
    this.flamesRemaining = INITIAL_FLAMES;
    this.message = null;
    this.gameOverPending = false;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
