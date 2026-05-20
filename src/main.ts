import "./style.css";
import { Game } from "./game/Game";
import { KeyboardInput } from "./input/KeyboardInput";
import { Renderer } from "./render/Renderer";

function setAppHeight() {
  document.documentElement.style.setProperty("--app-height", `${window.innerHeight}px`);
}
window.addEventListener("resize", setAppHeight);
setAppHeight();

const canvas = document.querySelector<HTMLCanvasElement>("#game");

if (!canvas) {
  throw new Error("Game canvas was not found.");
}

const context = canvas.getContext("2d");

if (!context) {
  throw new Error("2D canvas context is not available.");
}

const input = new KeyboardInput(window);
const game = new Game(input);
const renderer = new Renderer(context);

let lastTime = performance.now();

function frame(time: number): void {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  game.update(dt);
  renderer.render(game.getSnapshot());

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
