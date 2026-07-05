# Bench to Ballon d'Or - Next Stage Enhancement Spec

## Purpose

Upgrade the current first playable version into a more satisfying arcade soccer game without losing the simple browser setup.

The next stage should focus on match feel first: better ball physics, clearer kicking, smarter AI, and more exciting match feedback. The card collection loop should remain intact.

## Research Summary

Research pass completed from web sources on browser game loops, Canvas animation, 2D collision, and JavaScript physics libraries.

Useful references:

- MDN Canvas animation: `requestAnimationFrame()` is the right browser-native loop primitive for smooth Canvas animation.
  - https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_animations
- MDN game loop anatomy: browser games should use the browser frame loop carefully and decide how to handle pauses/background-tab gaps.
  - https://developer.mozilla.org/en-US/docs/Games/Anatomy
- MDN 2D collision detection: circle hitboxes are appropriate for simple performant 2D game collisions.
  - https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection
- Game Programming Patterns, Game Loop: fixed update timestep plus variable rendering is the safer model for stable physics than frame-dependent updates.
  - https://gameprogrammingpatterns.com/game-loop.html
- Phaser Arcade Physics: good for lightweight circle/rectangle arcade collisions, velocity, acceleration, and debug helpers.
  - https://docs.phaser.io/phaser/concepts/physics/arcade
- Matter.js: robust 2D rigid-body physics with restitution, friction, collision detection, constraints, and events.
  - https://brm.io/matter-js/
  - https://brm.io/matter-js/docs/

Recommendation: do not migrate to Phaser or Matter.js yet. The current game is a small vanilla Canvas app with only player, AI, ball, goals, and cards. A custom physics pass is faster, lower-risk, and easier for an AI agent to complete in one focused stage. Reconsider Phaser or Matter.js only if the game later adds many players, obstacles, complex body shapes, or reusable sprite animation systems.

## Current Match State

Current implementation is in `src/game.js`.

Observed current behavior:

- Uses `requestAnimationFrame`, but updates are frame-dependent rather than time-step based.
- Player position changes directly from input; player has no velocity, acceleration, or drag.
- Ball has velocity and friction, but movement is one frame at a time.
- Player-ball collision pushes the ball away and either dribbles or sets kick velocity.
- AI walks toward the ball or a defending point and kicks toward the left goal.
- No player-player collision.
- No goal posts or net bounce.
- No shot charging, aiming indicator, possession feel, tackles, or sprint/stamina.

## Current App Constraints to Preserve

The enhancement stage must preserve the current working game shell:

- Plain HTML/CSS/JavaScript, no build step.
- Current local URL: `http://127.0.0.1:8020/`.
- Existing files:
  - `index.html`
  - `styles.css`
  - `src/data.js`
  - `src/main.js`
  - `src/ui.js`
  - `src/game.js`
- Current save key: `bench-to-ballon-dor-save-v1`.
- Current collection size: 20 active legend cards.
- Existing saves may already contain unlocked player IDs from the old 11-card or 15-card versions. Do not wipe those saves during upgrades.
- New cards that are not in an existing save should remain locked until opened in packs.
- Pack opening, card selection, reset save, and collection progress must keep working after the match physics changes.
- The visible card rating can exceed 99; gameplay stats must be derived/clamped and never use visible rating directly as unbounded speed or power.
- The match should remain computer-first with keyboard controls. Do not add touch controls in this stage unless explicitly requested later.

## Next Stage Goal

By the end of this next stage, the match should feel obviously better within 30 seconds of playing:

1. Ball movement feels smoother and less random.
2. Dribbling feels like controlled nudging rather than accidental bouncing.
3. Kicking has aim, charge, and stronger feedback.
4. Goals feel more soccer-like because posts and goal mouth behavior are clearer.
5. AI feels less like a homing circle and more like an opponent.
6. The game remains simple enough for a kid to understand.

## Non-Goals

Do not do these in the next stage:

- Do not migrate the whole game to Phaser, React, Vite, or Matter.js.
- Do not expand beyond the current 11v11 arcade scope into realistic 11v11 simulation management.
- Do not add online multiplayer.
- Do not replace the collection loop.
- Do not use official player photos, club logos, or copyrighted likenesses.
- Do not make the match realistic simulation soccer. This should remain arcade soccer.
- Do not add mobile touch controls yet.
- Do not change the localStorage key unless a migration plan is written and tested.

## Implementation Guardrails

- Keep the first physics milestone small enough to finish and verify in one pass.
- Preserve the logical field size of `900 x 520` unless there is a concrete reason to change it.
- Use constants for physics tuning instead of burying numbers inside methods.
- Keep rendering and simulation concerns separate:
  - simulation uses logical field units and `dt`
  - rendering draws from current state
  - UI/DOM controls are updated by `src/ui.js`
- Update visible control text when controls change. If Shift sprint and hold-to-charge Space are implemented, the Match Screen must no longer say only `WASD / Arrows + Space`.
- Ignore keyboard auto-repeat for shot charge starts. `keydown` repeat events should not restart charge.
- Always clean up new event listeners, timers, audio resources, animation frames, and debug overlays in `destroy()` or screen cleanup.

## Stage 2A: Physics Foundation

This is the required first implementation stage.

### 1. Fixed-Timestep Game Loop

Replace frame-dependent movement with a fixed simulation timestep.

Requirements:

- Use `requestAnimationFrame(timestamp)` for render scheduling.
- Maintain:
  - `lastTime`
  - `accumulator`
  - `fixedDt = 1 / 60`
  - `maxSubSteps = 5`
- Convert velocity and acceleration math to seconds-based units.
- Clamp huge tab/background gaps. If elapsed time is greater than `250ms`, treat it as a pause and skip catch-up.
- Keep rendering every animation frame.
- Store pause timing in simulation time or animation timestamp units. Do not keep using `Date.now()` for goal pauses.

Acceptance criteria:

- The same player and ball speeds feel consistent on 60Hz, 120Hz, and throttled browser conditions.
- Returning from a hidden/background tab does not make the ball teleport or instantly score.
- Existing `destroy()` still cancels animation and key listeners.

### Starting Physics Constants

Use these as first-pass values, then tune in browser:

```js
const PHYSICS = {
  fixedDt: 1 / 60,
  maxSubSteps: 5,
  maxFrameGapMs: 250,

  playerRadius: 16,
  ballRadius: 9,
  goalHeight: 140,
  goalWidth: 18,
  postRadius: 10,

  starterMaxSpeed: 185,
  eliteMaxSpeed: 325,
  playerAcceleration: 1150,
  playerDrag: 9,
  sprintMultiplier: 1.22,

  ballDrag: 1.05,
  ballStopSpeed: 8,
  ballMaxSpeed: 760,
  wallRestitution: 0.72,
  postRestitution: 0.92,

  tapKickSpeed: 260,
  chargedKickMinSpeed: 340,
  chargedKickMaxSpeed: 720,
  maxChargeMs: 700,
};
```

When applying drag, prefer exponential time-based drag:

```js
const dragFactor = Math.exp(-drag * dt);
entity.vx *= dragFactor;
entity.vy *= dragFactor;
```

These values are deliberately conservative. The acceptance test is feel, not exact numeric matching.

### 2. Entity Motion Model

Add velocity to player and AI.

Each moving entity should have:

```js
{
  x,
  y,
  vx,
  vy,
  radius,
  maxSpeed,
  acceleration,
  drag
}
```

Player movement rules:

- WASD/Arrow keys apply acceleration, not direct position changes.
- Drag slows the player when input stops.
- Diagonal movement must not be faster than cardinal movement.
- `speed` stat should affect `maxSpeed` and acceleration.

AI movement rules:

- AI uses the same velocity model, not instant position nudges.
- Difficulty affects AI max speed, acceleration, reaction time, and shot accuracy.

Acceptance criteria:

- Player movement feels smoother and more physical.
- Player still responds quickly enough for a kid.
- Fast cards are visibly faster without becoming uncontrollable.

### 3. Ball Physics Upgrade

Replace the current ball movement constants with a clearer physics model.

Ball should have:

```js
{
  x,
  y,
  vx,
  vy,
  radius,
  drag,
  restitution,
  maxSpeed,
  spin
}
```

Required behavior:

- Ball position integrates from velocity using `dt`.
- Drag/friction is time-based, not per-frame magic.
- Ball has max speed clamp.
- Very small velocities snap to zero.
- Wall bounces use restitution.
- Posts bounce harder than walls.

Initial tuning targets:

- Normal dribble: short controlled touch.
- Tap kick: medium push.
- Full charged shot: fast but still trackable.
- Ball should roll to a stop within a few seconds if untouched.

### 4. Circle Collision and Impulse Response

Keep collision geometry simple: circles for players and ball.

Required collisions:

- Player vs ball.
- AI vs ball.
- Player vs AI.
- Ball vs walls.
- Ball vs goal posts.

Collision response:

- Separate overlapping circles.
- Apply impulse along collision normal.
- Add a small tangential component from player movement so moving through the ball carries it forward.
- Avoid repeated rapid collision impulses by using contact cooldown or possession state where needed.

Acceptance criteria:

- Ball no longer sticks inside player/AI.
- Player cannot pass through AI.
- Ball does not tunnel through walls or posts during normal shots.
- Collision code is isolated in helper functions, not scattered across `update()`.

### 5. Goal Mouth, Posts, and Nets

Improve goal behavior.

Required:

- Add two circular post hitboxes per goal.
- Ball entering between posts counts as goal only after crossing the goal line.
- Ball hitting posts bounces with a noticeable sound/visual spark.
- Ball outside the mouth bounces off the end line.
- Optional: once the ball crosses into goal, slow it inside a short net zone before reset.

Acceptance criteria:

- Shots can hit the post and bounce out.
- Near misses feel understandable.
- Goals still happen often enough that matches do not drag.

## Stage 2B: Controls and Shot Feel

Implement after Stage 2A is stable.

### 1. Shot Charge

Change Space behavior from instant shot to charge-and-release.

Controls:

- Hold Space: charge shot.
- Release Space: shoot.
- Quick tap: short kick.
- Max charge reached around `700ms`.
- Ignore repeated `keydown` events while Space is already held.
- If Space is released while the ball is too far away, clear charge without firing.
- If the player is already in a match-result overlay, Space should not fire a shot.

Visuals:

- Draw a small shot meter near the player or at bottom HUD.
- Draw an aim arrow from the player while charging.
- Use color ramp: low charge, medium, max.

Tuning:

- `shot` stat affects max charge power.
- `dribble` stat affects how well the ball stays controllable after light touches.
- `defense` stat affects tackle/ball steal strength.

Acceptance criteria:

- A kid can tell when they are charging a shot.
- Charged shots feel meaningfully stronger than taps.
- It is still possible to tap-dribble without accidentally launching the ball every time.

### 2. Aiming

Current shot direction uses last movement direction. Improve it.

Rules:

- If player is moving, aim follows movement direction.
- If player is standing still and ball is nearby, aim toward opponent goal.
- While charging, allow small aim adjustments with movement keys.
- Add a small aim-assist cone toward the goal for starter players.
- Higher-rated players can have slightly tighter shot spread.

Acceptance criteria:

- Standing still near the ball and pressing Space produces an understandable shot.
- Players can intentionally shoot diagonally.
- The aiming arrow matches the actual shot direction.

### 3. Sprint and Stamina

Add optional sprint with Shift.

Rules:

- Hold Shift to sprint.
- Sprint increases max speed and acceleration.
- Sprint drains stamina.
- Stamina refills when not sprinting.
- Starter players tire quickly; elite cards recover better.
- Add Shift to game-key handling so sprinting does not scroll/focus the page or trigger browser behavior.
- Update Match Screen control text to mention Shift only after sprint is implemented.

Acceptance criteria:

- Sprint adds excitement but does not let the player outrun every AI forever.
- Stamina UI is small and readable.

## Stage 2C: Smarter AI

Implement after Stage 2A physics are stable.

AI should use states instead of always chasing:

```txt
Defend -> Chase -> Possess -> Shoot -> Recover
```

State behavior:

- `Defend`: hold goal-side position if ball is far away.
- `Chase`: move to intercept ball, not simply to the current ball position.
- `Possess`: lightly dribble toward shooting lane if near ball.
- `Shoot`: kick when angle and distance are good.
- `Recover`: after missed tackle/shot, briefly reposition.

Difficulty tuning:

- Easy: slower reaction, more missed shots, worse intercepts.
- Medium: better intercepts, moderate shooting.
- Hard: faster recovery, better shot selection, tighter angle error.

Acceptance criteria:

- AI no longer feels like a single homing behavior.
- Easy AI remains beatable with starter players.
- Hard AI can challenge high-rated cards without feeling unfair.

## Stage 2D: Match Presentation

Add polish after physics and controls.

Required:

- Short goal animation or flash.
- Ball trail on hard shots.
- Post-hit flash.
- Small camera shake on full-power goal.
- Better whistle/goal/kick/post sounds using existing WebAudio approach.
- Pause/countdown overlay after goals: `3`, `2`, `1`, `Play`.
- Start-of-match kickoff text.

Optional:

- Instant replay for last 2 seconds before a goal.
- Simple confetti on match win.
- Crowd noise toggle.

Acceptance criteria:

- Effects improve clarity and excitement without blocking gameplay.
- Sounds are short and not annoying.
- Respect `prefers-reduced-motion` for shake and heavy effects.

## Stage 2E: Card-to-Gameplay Mapping

The visible card rating is now user-supplied and can go above 99. Gameplay should not directly use the visible rating as raw speed/power.

Add a derived gameplay model:

```js
function deriveGameplayStats(player) {
  return {
    maxSpeed,
    acceleration,
    shotPower,
    shotAccuracy,
    dribbleControl,
    tackleStrength,
    stamina,
    keeperReach
  };
}
```

Rules:

- Position affects behavior:
  - `G`: strong keeper/defense traits, weaker shooting.
  - `ST`: strongest shooting.
  - `LW` / `RW`: strongest speed/dribble.
- Overall rating boosts the player's best traits, but clamp values to arcade-safe ranges.
- Starter players remain intentionally weak.
- Use the hidden `speed`, `shot`, `dribble`, and `defense` fields as the primary gameplay shape, then let visible `grade` add a modest capped boost.
- Normalize visible grade before using it:
  - 48-60: starter/bench tier
  - 78-105: normal legend boost
  - 116-120: elite boost
  - cap all derived outputs after normalization
- Do not let 120-rated cards exceed `PHYSICS.ballMaxSpeed` or the elite max speed range.

Acceptance criteria:

- 120 Mbappe is great but not game-breaking.
- Goalkeeper cards have a reason to exist.
- Position labels matter beyond display.

## Stage 2F: Goalkeeper Mode Option

This is required in minimal form because the collection now includes `G` cards.

Add one of these:

Option A, simpler:

- If selected card position is `G`, player gets a larger tackle/save radius and stronger ball-stop impulse.
- Keep normal movement playable. A goalkeeper card should not feel useless outside the box in this first version.
- Use a clear but small HUD tag such as `Keeper reach` only if it helps explain the feel.

Option B, better:

- Add a friendly AI goalkeeper when the player uses a non-goalkeeper.
- Add an opponent AI goalkeeper on every match.
- Keep goalkeepers inside their box.
- Goalkeepers attempt saves, not full-field chasing.

Recommended for next stage: implement Option A only. Option B is a later stage.

Acceptance criteria:

- Selecting Beiranvand, Casillas, or Buffon changes match feel.
- A `G` card can stop or soften hard AI shots more effectively than a winger.
- `G` cards do not become overpowered attackers.

## Stage 2G: Canvas, HUD, and Debug Safeguards

Implement these alongside the physics pass if the canvas or HUD is touched.

### 1. High-DPI Canvas Rendering

The current canvas uses logical dimensions `900 x 520` and CSS scales it visually.

Requirements:

- Preserve logical game coordinates as `900 x 520`.
- Add a helper such as `resizeCanvasForDpr()` if the canvas looks blurry on high-DPI screens.
- If DPR scaling is added, scale the drawing context carefully and avoid changing physics coordinates.
- Re-check desktop and mobile-width screenshots after any canvas scaling change.

Acceptance criteria:

- Canvas remains sharp enough on the current browser.
- Field geometry and collision math still align with what is drawn.

### 2. HUD and Controls

Update match chrome in `src/ui.js` as controls change.

Required:

- Before shot charge/sprint: `WASD / Arrows + Space`.
- After shot charge: `WASD / Arrows + Hold Space`.
- After sprint: `WASD / Arrows + Hold Space + Shift`.
- Add only compact HUD elements. The match canvas should remain the focus.
- Do not put explanatory paragraphs inside the game surface.

### 3. Debug/Tuning Mode

Add an optional developer-only debug overlay if useful for tuning.

Allowed:

- Toggle with `Backquote` or `F2`.
- Show FPS/update steps, ball speed, AI state, and collision circles.
- Debug overlay must default off.
- Debug overlay must not persist in localStorage unless explicitly wanted.

Acceptance criteria:

- Debug mode helps tune physics.
- Debug visuals do not appear during normal play.

## Implementation Plan for AI Agent

### Task 0: Preserve Save and UI Contracts

Before editing physics, confirm:

- Existing save loading still filters invalid IDs and preserves valid unlocked IDs.
- Newly added active collection cards still show locked cards for IDs not in the save.
- `selectedPlayerId` fallback still works if a selected player is removed or locked.
- Match Screen control copy is updated if controls change.

### Task 1: Add Physics Config and Helpers

Files:

- `src/game.js`

Create helpers:

- `clamp(value, min, max)`
- `normalizeVector(x, y)`
- `limitVelocity(entity, maxSpeed)`
- `applyDrag(entity, drag, dt)`
- `integrate(entity, dt)`
- `resolveCircleCollision(a, b, options)`
- `resolveBallWallCollision()`
- `resolveBallPostCollision()`

Keep helpers inside `SoccerGame` unless they become large enough to justify `src/physics.js`.

### Task 2: Fixed-Timestep Loop

Modify:

- `loop(timestamp)`
- `update(dt)`
- `draw(alpha?)`

Do not use `Date.now()` for physics pause checks. Prefer the animation timestamp.

### Task 3: Player and AI Velocity

Modify:

- `updatePlayer(dt)`
- `updateAi(dt)`
- entity constructors

Add `vx`, `vy`, acceleration, drag, max speed.

### Task 4: Ball Collision Pass

Modify:

- `updateBall(dt)`
- `handleEntityBallCollision(...)`
- add player-vs-AI collision

Goal: remove frame-dependent magic constants and tune in seconds-based values.

### Task 5: Shot Charge

Modify key handling:

- Track `spaceWasDown`.
- Track `shotCharge`.
- Fire shot on Space release.

Modify draw:

- Draw aim arrow.
- Draw shot meter.

### Task 6: Goal Posts and Net Behavior

Add:

- `this.posts`
- post collision checks
- clearer goal detection

### Task 7: AI States

Add:

- `this.aiState`
- `getAiTarget()`
- `updateAiState(dt)`
- `tryAiKick()`

### Task 8: Presentation Polish

Add:

- ball trail array
- short effects state
- sound helpers for kick/post/goal

### Task 9: Canvas and Debug Polish

Add only if needed:

- high-DPI canvas helper
- compact debug overlay
- updated Match Screen control text

## Verification Plan

Run syntax checks:

```txt
node --check src/data.js
node --check src/game.js
node --check src/ui.js
node --check src/main.js
```

Add lightweight VM tests if possible:

- Fixed timestep does not move entities when paused.
- Huge frame gap over `250ms` is treated as pause, not catch-up.
- Ball drag reduces speed over time.
- Ball bounces off top/bottom walls.
- Ball scores only through goal mouth.
- Ball hitting post does not score immediately.
- Charged shot has higher velocity than tap shot.
- Selected high-speed card has higher max speed than starter.
- Goalkeeper card gets stronger defensive/save trait.
- Existing save with old 11-card or 15-card unlocked IDs still loads and leaves new active additions locked.
- Match Screen control text matches implemented controls.

Browser verification:

- Load `http://127.0.0.1:8020/`.
- Start a match.
- Move player with WASD/Arrows.
- Tap Space to short kick.
- Hold/release Space for charged shot.
- Hit at least one wall/post.
- Score one goal.
- Finish one match.
- Confirm pack/collection loop still works.
- Confirm existing unlocked cards remain unlocked after reload.
- Confirm the active legend collection still renders all cards.
- Check console errors/warnings.
- Check desktop and mobile viewport for HUD/controls overflow.
- If debug mode was added, confirm it defaults off and toggles cleanly.

## Stage 2 Acceptance Criteria

Stage 2 is complete when:

- Match is playable from start to finish.
- Movement and ball speed are frame-rate independent.
- Ball physics feel smoother than the current version.
- Player has acceleration/drag.
- Ball has time-based drag/restitution/max speed.
- Player, AI, and ball collisions are stable.
- Goal posts exist and can bounce shots.
- Space charge shot works and has visible UI.
- AI uses at least three states: defend, chase, shoot.
- `G` cards have a noticeable defensive/save benefit.
- Match Screen control text matches the implemented control scheme.
- Collection, packs, save/reset, and card selection still work.
- Existing saves are not wiped.
- No console errors in browser.

## Recommended First Milestone

For the first implementation pass, stop after:

1. Fixed timestep.
2. Entity velocity/drag.
3. Better ball drag/bounce.
4. Circle collision helper.
5. Goal posts.
6. Save/collection loop preserved.
7. Browser-verified playable match.

Do not start shot charge, AI states, or presentation polish until this first physics milestone is playable.
