type Action =
  | "up"
  | "right"
  | "down"
  | "left"
  | "rotateClockwise"
  | "rotateCounterClockwise"
  | "pause"
  | "fire"
  | "mute"
  | "restart"
  | "hud";

const KEY_TO_ACTION: Record<string, Action> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowRight: "right",
  KeyD: "right",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  Space: "rotateClockwise",
  Enter: "rotateClockwise",
  KeyZ: "rotateCounterClockwise",
  Backspace: "rotateCounterClockwise",
  Escape: "pause",
  KeyF: "fire",
  KeyM: "mute",
  KeyR: "restart",
  KeyH: "hud"
};

const BLOCKED_KEYS = new Set(["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft", "Space", "Backspace"]);

export class KeyboardInput {
  private pressed = new Set<Action>();
  private onFirstInput: (() => void) | null = null;
  private activeJoyAction: Action | null = null;
  private lastJoyActionTime = 0;

  constructor(target: Window) {
    target.addEventListener("keydown", (event) => {
      const action = KEY_TO_ACTION[event.code];

      if (!action) {
        return;
      }

      if (BLOCKED_KEYS.has(event.code)) {
        event.preventDefault();
      }

      if (!event.repeat || action === "rotateClockwise" || action === "rotateCounterClockwise") {
        this.pressed.add(action);
      }

      this.onFirstInput?.();
      this.onFirstInput = null;
    });

    // Virtual Controls - Rotation Action
    const bindBtn = (id: string, action: Action) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      
      const trigger = (e: Event) => {
        e.preventDefault();
        this.pressed.add(action);
        this.onFirstInput?.();
        this.onFirstInput = null;
      };
      
      btn.addEventListener("touchstart", trigger, { passive: false });
      btn.addEventListener("mousedown", trigger);
    };

    bindBtn("btnRotate", "rotateClockwise");

    // Virtual Joystick Logic
    const joyBg = document.querySelector(".joy-bg") as HTMLElement;
    const joyCenter = document.querySelector(".joy-center") as HTMLElement;
    let joystickActive = false;
    let joyStartX = 0;
    let joyStartY = 0;
    const joyMaxRadius = 35; // Maximum distance the knob can move

    const handleJoyStart = (e: TouchEvent | MouseEvent) => {
      e.preventDefault();
      joystickActive = true;
      const rect = joyBg.getBoundingClientRect();
      joyStartX = rect.left + rect.width / 2;
      joyStartY = rect.top + rect.height / 2;
      
      this.onFirstInput?.();
      this.onFirstInput = null;
      handleJoyMove(e);
    };

    const handleJoyMove = (e: TouchEvent | MouseEvent) => {
      if (!joystickActive) return;
      e.preventDefault();
      
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
      
      const dx = clientX - joyStartX;
      const dy = clientY - joyStartY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      
      const knobDistance = Math.min(distance, joyMaxRadius);
      const knobX = Math.cos(angle) * knobDistance;
      const knobY = Math.sin(angle) * knobDistance;
      
      if (joyCenter) {
        joyCenter.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
      }
      
      if (distance > 15) {
        let action: Action;
        const pi = Math.PI;
        if (angle > -pi/4 && angle <= pi/4) action = "right";
        else if (angle > pi/4 && angle <= 3*pi/4) action = "down";
        else if (angle > -3*pi/4 && angle <= -pi/4) action = "up";
        else action = "left";
        
        if (this.activeJoyAction !== action) {
          this.activeJoyAction = action;
          this.lastJoyActionTime = 0; // Trigger immediately on direction change
        }
      } else {
        this.activeJoyAction = null;
      }
    };

    const handleJoyEnd = () => {
      joystickActive = false;
      this.activeJoyAction = null;
      if (joyCenter) {
        joyCenter.style.transform = "translate(-50%, -50%)";
      }
    };

    if (joyBg) {
      joyBg.addEventListener("touchstart", handleJoyStart, { passive: false });
      joyBg.addEventListener("mousedown", handleJoyStart);
      window.addEventListener("touchmove", handleJoyMove, { passive: false });
      window.addEventListener("mousemove", handleJoyMove);
      window.addEventListener("touchend", handleJoyEnd);
      window.addEventListener("mouseup", handleJoyEnd);
    }

    // Also trigger interaction on canvas click for mobile starting
    const canvas = document.getElementById("game");
    if (canvas) {
      canvas.addEventListener("touchstart", () => {
        this.onFirstInput?.();
        this.onFirstInput = null;
      });
      canvas.addEventListener("mousedown", () => {
        this.onFirstInput?.();
        this.onFirstInput = null;
      });
    }
  }

  consume(action: Action): boolean {
    // Handle continuous joystick hold
    if (this.activeJoyAction === action) {
      const now = performance.now();
      if (now - this.lastJoyActionTime > 140) {
        this.lastJoyActionTime = now;
        return true;
      }
    }

    if (!this.pressed.has(action)) {
      return false;
    }

    this.pressed.delete(action);
    return true;
  }

  onceStarted(callback: () => void): void {
    this.onFirstInput = callback;
  }
}
