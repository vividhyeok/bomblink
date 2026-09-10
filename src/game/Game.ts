import { RetroSound } from "../audio/RetroSound";
import { createExplosion, updateFlashes } from "../effects/ExplosionEffect";
import { createBurnSegment, updateBurnSegments } from "../effects/FuseBurnEffect";
import { createFlameLine, updateFlameLine } from "../effects/FlameLine";
import { updateParticles } from "../effects/Particle";
import { ScreenShake } from "../effects/ScreenShake";
import type { KeyboardInput } from "../input/KeyboardInput";
import { Board } from "./Board";
import type { Phase } from "./Phase";
import { canConnect, DELTA, DIRECTIONS, scoreForExplosion } from "./Rules";
import type {
  Bomb,
  BoardLayout,
  BonusSize,
  BurnSegment,
  Cursor,
  DifficultySetting,
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
const STARTING_ROWS = 4;
const DEATH_ROW = 0;

// Reference-derived timing from the surviving Android feature-phone reconstruction.
const FIRST_FLAME_GRACE = 4;
const FLAME_TRAVEL_SECONDS = 3;
const NEXT_FLAME_DELAY = 4;
const INITIAL_RAISE_DELAY = 41;
const RAISE_DELAY_STEP = 1.5;
const MIN_RAISE_DELAY = 0.5;
const CHAIN_STEP_SECONDS = 0.4;
const FIRE_WARNING_SECONDS = 4;
const INITIAL_FLAMES = 100;

const LEVEL_PROGRESS_UNITS = 16;
const LEVEL_BONUS: Record<DifficultySetting, number> = {
  easy: 50_000,
  normal: 100_000,
  hard: 200_000
};

const PARAMS = new URLSearchParams(globalThis.location?.search ?? "");
const DEBUG_MODE = PARAMS.has("debug");
const DEFAULT_MODE: GameMode = PARAMS.get("mode") === "endless" ? "endless" : "flames100";
const DEFAULT_DIFFICULTY: DifficultySetting =
  PARAMS.get("difficulty") === "easy" ? "easy" : PARAMS.get("difficulty") === "hard" ? "hard" : "normal";

type PropagationEvent = {
  source: Bomb;
  timer: number;
};

type RuntimeChain = {
  visitedIds: Set<number>;
  bombs: Bomb[];
  frontier: PropagationEvent[];
};

export class Game {
  private readonly input: KeyboardInput;
  private readonly board = new Board(BOARD_LAYOUT);
  private readonly sound = new RetroSound();
  private readonly shake = new ScreenShake();

  private cursor: Cursor = { row: this.board.playableRows - 1, col: Math.floor(BOARD_LAYOUT.cols / 2), blink: 0 };
  private phase: Phase = "banner";
  private previousPhase: Phase = "banner";
  private phaseTimer = 0;
  private flame: FlameEvent | null = null;
  private nextFlameTimer = FIRST_FLAME_GRACE;
  private raiseInterval = INITIAL_RAISE_DELAY;
  private pressureTimer = INITIAL_RAISE_DELAY;
  private gameplayTime = 0;
  private flameSide: FlameSide = Math.random() < 0.5 ? "left" : "right";
  private activeChain: RuntimeChain | null = null;
  private exploded: Bomb[] = [];
  private burns: BurnSegment[] = [];
  private particles: Particle[] = [];
  private flashes: ExplosionFlash[] = [];
  private shakeOffset = { x: 0, y: 0 };
  private level = 0;
  private levelProgress = 0;
  private score = 0;
  private combo = 0;
  private bestCombo = 0;
  private totalExploded = 0;
  private flamesRemaining = INITIAL_FLAMES;
  private hudLabelIndex = 1;
  private mode: GameMode = DEFAULT_MODE;
  private difficultySetting: DifficultySetting = DEFAULT_DIFFICULTY;
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
    this.burns = updateBurnSegments(this.burns, dt);
    this.particles = updateParticles(this.particles, dt);
    this.flashes = updateFlashes(this.flashes, dt);
    this.shakeOffset = this.shake.update(dt);

    this.consumeGlobalInput();
    if (this.isGameplayPhase()) this.gameplayTime += dt;

    switch (this.phase) {
      case "banner": this.updateBanner(); break;
      case "ready": this.updateReady(); break;
      case "idle": this.updateIdle(dt); break;
      case "rotating": this.updateRotating(dt); break;
      case "flamePassing": this.updateFlamePassing(dt); break;
      case "fuseBurning": this.updateFuseBurning(dt); break;
      case "exploding": this.updateExploding(); break;
      case "falling":
      case "spawning": this.updateFalling(); break;
      case "paused":
      case "levelClear":
      case "result":
      case "gameOver": break;
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
    if (this.phaseTimer >= 1.45) this.setPhase("ready");
  }

  private updateReady(): void {
    this.message = this.phaseTimer < 0.8 ? "READY" : "START";
    if (this.phaseTimer >= 1.15) {
      this.message = null;
      this.nextFlameTimer = FIRST_FLAME_GRACE;
      this.pressureTimer = this.raiseInterval;
      this.setPhase("idle");
    }
  }

  private updateIdle(dt: number): void {
    this.message = null;
    this.consumeMoveInput();
    this.consumeRotationInput();

    if (this.input.consume("raise")) {
      this.startPressureRow();
      return;
    }

    if (this.input.consume("fire")) {
      if (DEBUG_MODE) this.startFlame(this.flameSide);
      return;
    }

    if (this.advanceReadyTimers(dt, true)) return;
  }

  private updateRotating(dt: number): void {
    this.consumeMoveInput();
    this.consumeRotationInput();

    if (this.advanceReadyTimers(dt, true)) return;
    if (this.phaseTimer >= 0.08) this.setPhase("idle");
  }

  /**
   * The same side flame pauses while a live chain resolves, then resumes from the
   * same location. Manual/automatic raise timers keep running while the flame is
   * merely travelling; they pause once an explosion chain is active.
   */
  private updateFlamePassing(dt: number): void {
    this.consumeMoveInput();
    this.consumeRotationInput();

    if (this.input.consume("raise")) {
      this.startPressureRow();
      return;
    }

    this.pressureTimer -= dt;
    if (this.pressureTimer <= 0) {
      this.startPressureRow();
      return;
    }

    if (!this.flame) {
      this.setPhase("idle");
      return;
    }

    updateFlameLine(this.flame, dt);
    this.scanFlameHit();
    if (this.phase !== "flamePassing") return;

    if (this.flame.progress >= 1) {
      this.flame = null;
      if (this.mode === "flames100" && this.flamesRemaining <= 0) {
        this.triggerResult();
      } else {
        this.scheduleNextFlame();
        this.setPhase("idle");
      }
    }
  }

  /**
   * Runtime propagation is intentionally evaluated after player input each frame.
   * A bomb that has not ignited yet remains rotatable, so the player can turn its
   * fuse toward an exploding neighbor before that neighbor's 0.4s propagation
   * check, or turn it away to break the chain.
   */
  private updateFuseBurning(dt: number): void {
    this.consumeMoveInput();
    this.consumeRotationInput();
    this.updateRuntimeChain(dt);
    if (!this.activeChain) this.setPhase("exploding");
  }

  private updateExploding(): void {
    this.consumeMoveInput();
    this.consumeRotationInput();
    if (this.phaseTimer < 0.16) return;

    this.board.clearBombs(this.exploded);
    this.board.applyGravity();
    this.board.dropPendingBonus();
    this.exploded = [];
    this.setPhase("falling");
  }

  private updateFalling(): void {
    if (!this.boardSettled || this.phaseTimer <= 0.18) return;
    this.sound.land();

    if (this.gameOverPending || this.board.hasBombInRow(DEATH_ROW)) {
      this.triggerGameOver();
      return;
    }

    if (this.flame) {
      this.flame.hit = null;
      this.setPhase("flamePassing");
      return;
    }

    if (this.mode === "flames100" && this.flamesRemaining <= 0) {
      this.triggerResult();
      return;
    }

    this.nextFlameTimer = Math.max(0, Math.min(this.nextFlameTimer, NEXT_FLAME_DELAY));
    this.setPhase("idle");
  }

  private consumeGlobalInput(): void {
    if (this.input.consume("mute")) this.sound.toggleMute();
    if (this.input.consume("hud") && DEBUG_MODE) this.hudLabelIndex = (this.hudLabelIndex + 1) % HUD_LABELS.length;

    if (this.phase === "result" || this.phase === "gameOver") {
      if (this.phaseTimer > 1.0 && (
        this.input.consume("fire") ||
        this.input.consume("rotateClockwise") ||
        this.input.consume("rotateCounterClockwise") ||
        this.input.consume("restart")
      )) {
        this.reset();
        return;
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
        this.phase !== "levelClear" && this.phase !== "result" && this.phase !== "gameOver" &&
        this.phase !== "banner" && this.phase !== "ready"
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
      if (!this.input.consume(move.action)) continue;
      const row = clamp(this.cursor.row + move.row, 0, this.board.playableRows - 1);
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
    if (this.input.consume("rotateClockwise")) this.rotateCurrent(true);
    if (this.input.consume("rotateCounterClockwise")) this.rotateCurrent(false);
  }

  private rotateCurrent(clockwise: boolean): void {
    const rotated = this.board.rotate(this.cursor.row, this.cursor.col, clockwise);
    if (!rotated) {
      this.sound.deny();
      return;
    }
    this.sound.rotate();
  }

  private startFlame(side: FlameSide): void {
    if (this.mode === "flames100" && this.flamesRemaining <= 0) {
      this.triggerResult();
      return;
    }

    if (this.mode === "flames100") this.flamesRemaining = Math.max(0, this.flamesRemaining - 1);
    this.combo = 0;
    this.flame = createFlameLine(side, this.board.playableRows - 1, FLAME_TRAVEL_SECONDS);
    this.sound.flame();
    this.nextFlameRow = null;
    this.setPhase("flamePassing");
  }

  private startPressureRow(): void {
    if (this.board.hasBombInRow(DEATH_ROW)) {
      this.triggerGameOver();
      return;
    }

    this.board.addPressureRow(this.difficultySetting);
    this.board.dropPendingBonus();
    this.gameOverPending = this.board.hasBombInRow(DEATH_ROW);

    this.raiseInterval = Math.max(MIN_RAISE_DELAY, this.raiseInterval - RAISE_DELAY_STEP);
    this.pressureTimer = this.raiseInterval;
    this.setPhase("spawning");
  }

  private scanFlameHit(): void {
    if (!this.flame || this.flame.hit) return;
    const { side, progress, row: targetRow } = this.flame;
    const startY = this.board.layout.y - 12;
    const endY = this.board.layout.y + targetRow * this.board.layout.cellSize + this.board.layout.cellSize / 2;
    const flameY = startY + (endY - startY) * progress;

    for (let r = 0; r <= targetRow; r += 1) {
      if (this.flame.scannedRows.has(r)) continue;
      const centerY = this.board.layout.y + r * this.board.layout.cellSize + this.board.layout.cellSize / 2;
      if (flameY < centerY) continue;

      this.flame.scannedRows.add(r);
      const col = side === "left" ? 0 : this.board.layout.cols - 1;
      const bomb = this.board.get(r, col);
      const requiredConnector = side === "left" ? "left" : "right";
      if (bomb && bomb.state === "normal" && bomb.connectors.includes(requiredConnector)) {
        this.flame.hit = { row: r, col };
        this.sound.ignite();
        this.startRuntimeChain(bomb);
        this.setPhase("fuseBurning");
        return;
      }
    }
  }

  private startRuntimeChain(root: Bomb): void {
    this.combo = 0;
    this.activeChain = {
      visitedIds: new Set<number>(),
      bombs: [],
      frontier: []
    };
    this.igniteRuntimeBomb(root, null);
  }

  private igniteRuntimeBomb(bomb: Bomb, parent: Bomb | null): void {
    const chain = this.activeChain;
    if (!chain || chain.visitedIds.has(bomb.id)) return;

    chain.visitedIds.add(bomb.id);
    chain.bombs.push(bomb);
    this.exploded.push(bomb);

    this.board.setBombState(bomb, "exploding");
    if (parent) {
      this.burns.push(createBurnSegment(parent.row, parent.col, bomb.row, bomb.col));
    }

    this.combo = chain.bombs.length;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.spawnExplosion(bomb, this.combo);
    this.sound.explode(this.combo);

    chain.frontier.push({ source: bomb, timer: CHAIN_STEP_SECONDS });
  }

  private updateRuntimeChain(dt: number): void {
    const chain = this.activeChain;
    if (!chain) return;

    const ready: PropagationEvent[] = [];
    for (let index = chain.frontier.length - 1; index >= 0; index -= 1) {
      const event = chain.frontier[index];
      event.timer -= dt;
      if (event.timer <= 0) {
        chain.frontier.splice(index, 1);
        ready.push(event);
      }
    }

    for (const event of ready) {
      this.propagateFrom(event.source);
    }

    if (this.activeChain && this.activeChain.frontier.length === 0) {
      this.finishRuntimeChain();
    }
  }

  private propagateFrom(source: Bomb): void {
    const chain = this.activeChain;
    if (!chain) return;

    for (const direction of DIRECTIONS) {
      const delta = DELTA[direction];
      const row = source.row + delta.row;
      const col = source.col + delta.col;
      if (row < 0 || row >= this.board.playableRows || col < 0 || col >= this.board.layout.cols) continue;

      const neighbor = this.board.get(row, col);
      if (!neighbor || neighbor.state !== "normal" || chain.visitedIds.has(neighbor.id)) continue;

      // Critical fidelity rule: inspect the neighbor's fuse NOW, at propagation
      // time, not when the root was first ignited. Player rotations during the
      // previous 0.4s therefore change the result of this exact edge.
      if (canConnect(source, neighbor, direction)) {
        this.igniteRuntimeBomb(neighbor, source);
      }
    }
  }

  private finishRuntimeChain(): void {
    const chain = this.activeChain;
    if (!chain) return;

    const bombs = chain.bombs.slice();
    const chainLength = bombs.length;
    this.activeChain = null;

    this.combo = chainLength;
    this.bestCombo = Math.max(this.bestCombo, chainLength);
    this.totalExploded += chainLength;
    this.score += scoreForExplosion(chainLength, chainLength);
    this.score += this.bigBonusScore(bombs);
    this.queueBonusForChain(chainLength);
    this.applyLevelProgress(chainLength);
    this.shake.trigger(chainLength);
  }

  private queueBonusForChain(chainLength: number): void {
    let size: Exclude<BonusSize, 1> | null = null;
    if (chainLength >= 27) size = 4;
    else if (chainLength >= 18) size = 3;
    else if (chainLength >= 9) size = 2;
    if (size) this.board.queueBonus(size);
  }

  private bigBonusScore(bombs: Bomb[]): number {
    const scored = new Set<number>();
    let bonus = 0;

    for (const bomb of bombs) {
      if (bomb.kind !== "bonus" || bomb.bonusSize <= 1 || scored.has(bomb.pieceId)) continue;
      scored.add(bomb.pieceId);
      if (bomb.bonusSize === 2) bonus += 20_000;
      else if (bomb.bonusSize === 3) bonus += 90_000;
      else if (bomb.bonusSize === 4) bonus += 200_000;
    }

    return bonus;
  }

  private applyLevelProgress(explodedUnits: number): void {
    this.levelProgress += explodedUnits;

    while (this.levelProgress >= LEVEL_PROGRESS_UNITS) {
      this.levelProgress -= LEVEL_PROGRESS_UNITS;
      if (this.level < 99) this.level += 1;
      this.score += LEVEL_BONUS[this.difficultySetting];
    }
  }

  private advanceReadyTimers(dt: number, includeFlameTimer: boolean): boolean {
    this.pressureTimer -= dt;
    if (includeFlameTimer) this.nextFlameTimer -= dt;

    if (this.pressureTimer <= 0) {
      this.startPressureRow();
      return true;
    }

    if (includeFlameTimer && this.nextFlameTimer <= 0) {
      this.startFlame(this.flameSide);
      return true;
    }

    return false;
  }

  private spawnExplosion(bomb: Bomb, chainLength: number): void {
    const effect = createExplosion(bomb.visualX, bomb.visualY, bomb.row, bomb.col, chainLength);
    this.flashes.push(effect.flash);
    this.particles.push(...effect.particles);
  }

  private scheduleNextFlame(delay = NEXT_FLAME_DELAY): void {
    this.flameSide = Math.random() < 0.5 ? "left" : "right";
    this.nextFlameRow = null;
    this.nextFlameTimer = delay;
  }

  private isDangerWarning(): boolean {
    const highest = this.board.highestOccupiedRow();
    return highest !== null && (highest <= DEATH_ROW + 1 || this.gameOverPending);
  }

  private isFireWarning(): boolean {
    return (this.phase === "idle" || this.phase === "rotating") && this.nextFlameTimer <= FIRE_WARNING_SECONDS;
  }

  private triggerGameOver(): void {
    this.gameOverPending = false;
    this.activeChain = null;
    this.flame = null;
    this.message = "GAME OVER";
    this.sound.gameOver();
    this.setPhase("gameOver");
  }

  private triggerResult(): void {
    this.activeChain = null;
    this.flame = null;
    this.nextFlameRow = null;
    this.message = "RESULT";
    this.sound.clear();
    this.setPhase("result");
  }

  private isGameplayPhase(): boolean {
    return this.phase === "idle" || this.phase === "rotating" || this.phase === "flamePassing" ||
      this.phase === "fuseBurning" || this.phase === "exploding" || this.phase === "falling" || this.phase === "spawning";
  }

  private setPhase(phase: Phase): void {
    this.phase = phase;
    this.phaseTimer = 0;
  }

  private reset(): void {
    this.board.reset(STARTING_ROWS);
    this.cursor = { row: this.board.playableRows - 1, col: Math.floor(BOARD_LAYOUT.cols / 2), blink: 0 };
    this.phase = "banner";
    this.previousPhase = "banner";
    this.phaseTimer = 0;
    this.flame = null;
    this.nextFlameTimer = FIRST_FLAME_GRACE;
    this.raiseInterval = INITIAL_RAISE_DELAY;
    this.pressureTimer = this.raiseInterval;
    this.gameplayTime = 0;
    this.flameSide = Math.random() < 0.5 ? "left" : "right";
    this.nextFlameRow = null;
    this.activeChain = null;
    this.exploded = [];
    this.burns = [];
    this.particles = [];
    this.flashes = [];
    this.level = 0;
    this.levelProgress = 0;
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
