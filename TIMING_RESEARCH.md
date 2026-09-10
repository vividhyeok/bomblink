# BombLink Timing / Motion Reconstruction Notes

This note records the timing and motion rules used by the web reconstruction after the September 2026 fidelity pass.

## Evidence hierarchy

1. **Official feature-phone manuals** — strongest for rules and controls, but they do not publish frame/timer values.
2. **Contemporary player/review accounts** — strong for qualitative behaviour such as flame pause/resume and board pressure.
3. **Null38/BombLink public reconstruction source** — implementation-level reference for exact timer constants and animation sequencing. These values are useful, but are **not claimed to be ROM-extracted originals**.
4. **2009 iPhone/2011 Android ports and coverage** — corroboration only where behaviour matches the feature-phone descriptions.

## Flame cadence

Reference implementation (`Game.cs -> Loop()`):

```text
initial wait                 3.0 s
flame visible at top         1.0 s
flame travel                 3.0 s
post-drop wait               3.0 s
next flame top preview       1.0 s
---------------------------------
movement-start to movement-start ~= 7.0 s, excluding explosion pauses
first movement begins        ~= 4.0 s after gameplay loop starts
```

During an explosion chain the flame stops. The 2004 Jun Mitani play note independently states that the edge flame stops while bombs are exploding, while the player can continue operating other bombs.

The web build therefore uses a 4-second countdown before movement, but only exposes the next flame visually during the final 1 second, reproducing the 3s absent + 1s top-preview rhythm.

## Flame side sequence

The implementation-level reference does **not** independently choose left/right 50:50 each time. It keeps a four-state sequence:

```text
0 -> right
1 -> right
2 -> left
3 -> left
```

Normally it advances one state, producing a repeating `R R L L` rhythm. Before advancing there is a 20% chance to add one extra state, effectively skipping one position. The web build now reproduces this behaviour.

This remains `reference-derived`, not an original-ROM claim.

## Explosion propagation

Each exploded bomb checks its neighbours after approximately:

```text
0.4 s
```

The neighbour's **current** fuse direction is checked at propagation time. This is why the player can redirect a not-yet-ignited bomb while a chain is already running.

## Gravity and fuse flip

Reference implementation (`Bomb.cs -> MoveBombDAnim`):

```text
fall one logical cell ~= 0.25 s
```

Every one-cell downward fall flips a vertical fuse:

```text
up   <-> down
left -> left
right -> right
```

Therefore the visual motion should read as:

```text
1 cell fall -> 180° fuse flip
2 cell fall -> 360° total rotation -> original orientation
3 cell fall -> 540° total rotation -> opposite orientation
```

The reference code changes intermediate fuse sprites during the 0.25s movement rather than teleporting the orientation at landing. The web renderer now continuously animates the equivalent half-turn per cell.

## Board raise timing

Reference implementation (`Game.cs -> BombUp / MoveBombAnim`):

```text
one-row raise animation ~= 0.75 s
```

This is deliberately slower than gravity. The previous web build reused the 0.25s gravity speed for raising and therefore felt much too abrupt.

### Automatic raise pressure

Reference values:

```text
initial auto-raise interval  41.0 s
after every raise            -1.5 s
minimum                       0.5 s
```

The crucial balancing rule is in `ScoreCalculate()`:

```text
if currentRaiseInterval < explodedBombCount:
    currentRaiseInterval = explodedBombCount

restart the auto-raise timer
```

So the game is **not supposed to monotonically accelerate to 0.5s and stay there**. Clearing bombs buys breathing room. Omitting this reset creates the late-game "the board only rockets upward until you die" behaviour seen in the earlier web build.

The web build now restores the raise interval to at least the number of bombs cleared by the completed chain and restarts the pressure clock after every clear.

## Raise / flame concurrency

In the reference implementation a board raise and a travelling flame are independent animations. A normal raise does not itself pause flame travel; an explosion does. The web build now lets the flame/countdown continue through the 0.75s row-rise animation, while collision evaluation resumes once the board has visually settled.

## Cursor motion

The reference player implementation wraps horizontally:

```text
right edge + right -> left edge
left edge + left   -> right edge
```

Vertical movement remains bounded. The web build now matches this behaviour.

## Danger presentation

The reference reconstruction enters danger presentation before the literal game-over row: one warning state roughly three rows from the top, intensified on the row immediately below the top. The web build now begins its danger warning earlier instead of waiting until only the top two rows are occupied.

## Sources

### Official / contemporary

- P506iC manual — BombLink rules, modes, raise control, bonus/square restrictions:
  https://www.manualslib.com/manual/3787763/Docomo-Mova-P506ic.html?page=405
- P252iS manual — same core rules and raise control:
  https://www.manualslib.com/manual/3161479/Ishot-Mova-P252is.html?page=411
- GameSpot review (2004) — 5x7 active board, layers rising from below, flames falling on both sides:
  https://www.gamespot.com/reviews/bomblink-review/1900-6094366/
- Jun Mitani play note (2004) — flame stops during explosions while other bombs remain operable:
  https://junmitani.hatenablog.com/entry/20041030

### Implementation-level reference

- Null38/BombLink `Game.cs` — flame loop, raise animation, auto-raise pressure/recovery, danger state, bonus placement:
  https://github.com/Null38/BombLink/blob/main/Assets/C%23/Game.cs
- Null38/BombLink `Bomb.cs` — 0.25s falling and vertical-fuse flip animation:
  https://github.com/Null38/BombLink/blob/main/Assets/C%23/Bomb.cs
- Null38/BombLink `Player.cs` — horizontal cursor wrapping and rotation timing:
  https://github.com/Null38/BombLink/blob/main/Assets/C%23/Player.cs

### Later-port corroboration

- 4Gamer iPhone coverage — rising bomb layers, falling side flames, manual raise/shake:
  https://www.4gamer.net/games/049/G004989/20091005001/
- Dengeki iPhone report — manual one-row raise and gaps causing bombs to shift/fall:
  https://dengekionline.com/elem/000/000/208/208949/

## Fidelity policy

Exact numbers in this document are marked as implementation-level reconstruction values, not direct measurements of a preserved original ROM. If a future ROM capture or frame-accurate feature-phone video conflicts with these values, that evidence should take priority.
