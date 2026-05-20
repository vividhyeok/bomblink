# Fuse Link Prototype

This is a playable reinterpretation of the original feature-phone Bomb Link mechanics.
It does not use original assets, ROM data, or extracted resources.
The rule model is based on public manual descriptions and observed gameplay references.

The prototype focuses on visible bomb fuses, side flame contact, connected fuse chains, sequential explosions, limited flame opportunities, score/level growth, and rising board pressure.

## Run

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal, usually `http://127.0.0.1:5173/`.
You can also double-click `run.bat` on Windows.

## Controls

- Arrow keys / WASD: move the cursor one cell
- Space / Enter: rotate the selected bomb clockwise
- Z / Backspace: rotate counter-clockwise
- M: mute/unmute Web Audio effects
- Escape: pause/resume
- R: restart

Debug mode is enabled by opening the URL with `?debug=1`.

- F: manually start the next side flame
- H: cycle the HUD label
- Debug HUD also shows pressure, flame countdown, and next side text.

## Current Bomb Link Interpretation

- Every bomb has fuse connectors.
- A flame descends from above the board.
- If the descending flame touches an exposed top fuse, that bomb ignites.
- A top fuse is exposed only when that bomb has an `up` connector and no bomb is above it in the same column.
- Adjacent bombs are connected only when their facing fuse connectors meet; the renderer draws a red/white fuse bridge only for those real adjacent connections.
- The connected chain explodes outward from the bomb first touched by the flame.
- Bigger chains increase score, best combo, total exploded count, and level progress.
- `FLAMES` means remaining flame opportunities, not a target bomb count.
- When a flame event is consumed, `FLAMES` decreases by 1.
- When `FLAMES` reaches 0, the game shows a result screen with final level, score, best combo, and total bombs exploded.

## Score

Score is awarded when a chain starts:

```text
score += explodedCount * 10 + comboBonus
```

Combo bonus:

- 1-3 bombs: no bonus
- 4-5 bombs: +35
- 6-9 bombs: +90
- 10+ bombs: +200

## Level

Level is score-based:

```text
level = floor(score / 500)
```

Level contributes to difficulty. Higher difficulty shortens automatic flame delay, flame travel duration, and pressure-row delay.

## Pressure Rows

The current pressure model is `riseFromBottom`:

- The board starts with the bottom 4 rows filled on a 7x8 board.
- The top 4 rows start empty.
- A pressure row periodically shifts all bombs up by 1 row.
- A new full row enters from the bottom.
- If bombs reach row 0, the game ends.

This pressure model may differ from the original and is kept simple for comparison and tuning.

## Current Tuning

- Startup flow: `BOMB LINK` / `LEVEL 00`, then `READY` / `START`.
- First automatic flame: about 12 seconds after `START`.
- First pressure row: about 18 seconds after `START`.
- Final 4 seconds before a flame: the top fire indicator gets a stronger visual warning.
- Canvas uses a `240 x 320` logical resolution and defaults to 2x CSS scale.

## Original Comparison Notes

These parts are likely still subject to change after comparing with real footage:

- Whether pressure should rise from the bottom, fall from the top, or be disabled.
- Whether the original fire descends as a full top flame, side flame, or another presentation.
- Exact flame timing, warning timing, and level pacing.
- Exact bomb connector shape distribution.
- Fuse burn animation is still simplified and not a perfect connector-path burn.
