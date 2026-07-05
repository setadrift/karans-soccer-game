# Bench to Ballon d'Or - FIFA-Like Gameplay Enhancement Spec

## Purpose

Upgrade the current arcade 11v11 match so it feels closer to actually controlling a soccer player:

- The controlled player can move faster and respond more sharply.
- The player can run with the ball instead of only bumping or kicking it.
- Ball control feels like dribbling/possession.
- Faces/player identity are more visible during play.
- Passing, shooting, sprinting, and tackles become distinct actions.

This spec is written so an AI coding agent can implement the next round in stages without migrating away from the current vanilla HTML/CSS/Canvas/JavaScript stack.

## Research Summary

Research pass completed from browser game loop docs, Canvas rendering docs, game physics/steering references, and practical 2D soccer/dribbling references.

Useful references:

- MDN game loop anatomy: browser games should use `requestAnimationFrame()` and intentionally separate input, update, and render work.
  - https://developer.mozilla.org/en-US/docs/Games/Anatomy
- MDN Canvas animation: Canvas animation should be driven by `requestAnimationFrame()`.
  - https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_animations
- Game Programming Patterns, Game Loop: fixed timesteps keep physics and AI stable across different hardware/frame rates.
  - https://gameprogrammingpatterns.com/game-loop.html
- Phaser Arcade Physics: lightweight top-down games commonly use velocity, acceleration, drag, damping, bounce, and circle/rectangle bodies. This confirms the current custom physics model is still reasonable without migrating to Phaser.
  - https://docs.phaser.io/phaser/concepts/physics/arcade
- MDN keyboard events: use `keydown`/`keyup`, track held keys, and be careful with auto-repeat via `KeyboardEvent.repeat`.
  - https://developer.mozilla.org/docs/Web/API/Element/keydown_event
  - https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
- MDN Canvas `drawImage()`: supports drawing images or sprite/portrait source rectangles into the Canvas, which is the path for future face portraits or sprite atlases.
  - https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
- MDN Canvas clipping/compositing: clipping paths can mask images, useful for circular face badges.
  - https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Compositing
- web.dev Canvas performance: pre-render repeated character/face details to snug offscreen canvases instead of redrawing complex details every frame.
  - https://web.dev/articles/canvas-performance
- Red Blob Games flow-field/pathfinding notes: useful later if many AI players need shared movement direction, but not necessary for the next stage.
  - https://www.redblobgames.com/pathfinding/tower-defense/
- Steering behaviors summary: soccer AI can improve by combining seek, arrival, pursuit, separation, and marking vectors rather than only chasing the ball.
  - https://gamedev.stackexchange.com/tags/steering-behaviors/info

Recommendation: do not migrate to Phaser, WebGL, or 3D yet. The current game already has a fixed-timestep loop, velocity-based movement, 11v11 units, and procedural players. The next step should be a custom possession/dribble system layered onto the existing ball/player physics.

## Current State

Current implementation is in `src/game.js`.

Current strengths:

- Plain browser app, no build step.
- Canvas match at `900 x 520`.
- 11v11 teams with one controlled captain.
- Fixed timestep loop using `PHYSICS.fixedDt`.
- Players have `vx`, `vy`, acceleration, drag, max speed, and circular hitboxes.
- Ball has velocity, drag, wall/post bounce, and trail.
- Space supports tap/charged kick.
- Shift sprint exists with stamina.
- Player visuals are top-down figures, not circles.
- Card portraits already exist in `src/data.js` and are used for card headshots.

Current limitations:

- Controlled player still feels too slow.
- Ball is mostly pushed by collision impulses, not owned/controlled.
- There is no explicit possession state.
- Running with the ball is unreliable because the ball can bounce away.
- Pass and shoot are not separate actions.
- There is no through ball, teammate selection, or pass assist.
- Player faces are not visible enough on the pitch.
- AI does not defend possession realistically.
- Tackles are mostly incidental collisions.

## Feasibility Summary

This spec is feasible in the current codebase because the match engine already has the core pieces needed for it:

- `update(dt)` is already fixed-timestep.
- `updatePlayer(dt)` and `updateAutonomousUnit(unit, dt)` already use velocity, acceleration, drag, and speed caps.
- `handleEntityBallCollision(unit)` is the main behavior to replace/guard when possession exists.
- `firePlayerShot(chargeMs)`, `tryUnitKick(unit)`, and `tryKeeperSave(unit, nx, ny)` are the action hooks for clearing ownership.
- `drawPlayer(unit)` already has a procedural player body and identity profile data, so face badges are an incremental renderer change.
- `src/ui.js` has one visible match controls string to update.

The biggest risk is not technical feasibility; it is scope. Build Stage 1 and Stage 2 first, verify that dribbling feels good, then add pass/tackle/face badges. Do not attempt AI flow or camera zoom until possession works.

## Current App Constraints to Preserve

- Keep plain HTML/CSS/JavaScript.
- Keep the current local URL: `http://127.0.0.1:8020/`.
- Keep existing files:
  - `index.html`
  - `styles.css`
  - `src/data.js`
  - `src/main.js`
  - `src/ui.js`
  - `src/game.js`
- Keep save key: `bench-to-ballon-dor-save-v1`.
- Keep the current `window.GAME_DATA.legendCards` roster unchanged. Do not remove, reorder, or rename cards as part of this gameplay pass.
- Keep existing saves compatible.
- Keep 11v11.
- Keep the card/pack/collection loop intact.
- Keep circular physics hitboxes unless a later spec explicitly changes collision shape.
- Keep current fixed-timestep loop. Do not rework the loop unless a bug is found.
- Do not use official photos, club logos, national-team logos, or official kits.
- Do not try to replicate FIFA branding, presentation, names, UI, or licensed assets.
- Do not turn this into a full 3D simulation.

## Target Feel

This should feel like a kid-friendly, top-down, simplified FIFA-style match:

1. Move quickly and responsively.
2. Sprint into space.
3. Keep the ball close while dribbling.
4. Tap to pass.
5. Hold to shoot.
6. Lose the ball if sprinting recklessly into defenders.
7. See the selected player's identity more clearly.
8. Play a short match without needing complicated controls.

## Non-Goals

Do not do these in this next round:

- Do not migrate to Phaser, Pixi, WebGL, Three.js, React, or Vite.
- Do not add online multiplayer.
- Do not add real-world licensed face photos or official player likeness assets.
- Do not add full tactical squad management.
- Do not implement every FIFA control.
- Do not make the controls require a gamepad.
- Do not make AI perfect. It should be better and more soccer-like, not realistic pro simulation.

## Stage 1: Faster Player Control

This is the required first implementation stage.

### Goal

The player should immediately feel faster and more responsive without becoming slippery.

### Required Changes

Update `PHYSICS` in `src/game.js`:

```js
starterMaxSpeed: 195,
eliteMaxSpeed: 355,
playerAcceleration: 1380,
playerDrag: 10.2,
sprintMultiplier: 1.32,
```

Tune `deriveGameplayStats()`:

- Keep visible card ratings clamped and safe.
- Increase the cap for fast elite wings/forwards.
- Make keepers slower than field players, but not sluggish when selected as captain.
- Preserve the starter players as noticeably worse, but still fun.

Suggested caps:

```js
fieldMaxSpeedCap: 355
keeperMaxSpeedCap: 275
controlledAccelerationBonus: 1.08
controlledMaxSpeedBonus: 1.04
```

### Control Feel Requirements

- Acceleration should feel sharper within the first 0.3 seconds.
- Sprint should feel meaningfully faster.
- Stamina should drain enough to discourage holding Shift forever.
- Releasing movement should slow the player quickly enough to turn.
- Diagonal movement must remain normalized.

### Acceptance Criteria

- Barry Backpass feels faster than current version but still weak.
- Messi/Mbappé/Vinícius-style elite players feel clearly faster.
- The selected captain can cross midfield quickly.
- Player does not teleport or clip through boundaries.
- Existing ball, goal, and collision logic still works.

## Stage 2: Possession and Close-Control Dribbling

This is the most important gameplay stage.

### Goal

Add an explicit possession model so a player can run with the ball. The ball should stay close in front of the controlled player while dribbling, but can still be lost through bad touches, tackles, or hard sprinting.

### New Ball State

Add to `this.ball`:

```js
ownerId: null,
ownerSide: null,
possessionTimer: 0,
looseTimer: 0,
lastOwnerId: null,
intendedReceiverId: null,
```

Add to each unit:

```js
hasPossession: false,
possessionCooldown: 0,
dribbleTouchTimer: 0,
isSprinting: false,
```

Also decrement these timers in the existing `this.players.forEach((unit) => { ... })` block inside `update(dt)`:

```js
unit.possessionCooldown = Math.max(0, unit.possessionCooldown - dt);
unit.dribbleTouchTimer = Math.max(0, unit.dribbleTouchTimer - dt);
unit.tackleCooldown = Math.max(0, unit.tackleCooldown - dt);
unit.tackleTimer = Math.max(0, unit.tackleTimer - dt);
```

### New Constants

Add near `PHYSICS`:

```js
const POSSESSION = {
  claimRadius: 22,
  controlledClaimRadius: 30,
  keeperClaimRadius: 34,
  releaseSpeed: 420,
  closeControlDistance: 18,
  sprintControlDistance: 25,
  maxCarrySpeedRatio: 0.92,
  dribbleBlend: 0.42,
  sprintDribbleBlend: 0.3,
  looseAfterHeavyTouch: 0.35,
  stealContestRadius: 26,
  tackleCooldown: 0.45,
  controlledPossessionGrace: 0.32,
  aiPossessionGrace: 0.18,
  shotLooseTimer: 0.35,
  passLooseTimer: 0.18,
  minStealRelativeSpeed: 80,
};
```

Add a separate action-tuning object near `POSSESSION` so pass/tackle tuning does not get mixed into physics:

```js
const ACTIONS = {
  passSpeed: 430,
  throughPassSpeed: 520,
  passAssistAngle: 0.72,
  passerCooldownAfterPass: 0.28,
  receiverClaimGrace: 0.1,
  tackleRange: 28,
  tackleDuration: 0.2,
  tackleCooldown: 0.55,
  tackleWhiffSlowdown: 0.68,
  cleanStealThreshold: 0.62,
  pokeLooseThreshold: 0.38,
};
```

### Possession Rules

Add methods:

```js
getBallOwner()
setBallOwner(unit)
clearBallOwner(reason)
tryClaimPossession(unit)
updatePossession(dt)
updateCarriedBall(owner, dt)
getDribbleAnchor(owner)
canContestPossession(defender, owner)
isBallOwned()
```

Rules:

- If the ball is loose and a unit enters claim range at a low enough relative speed, that unit becomes owner.
- The controlled player has slightly larger claim range to make the game feel good.
- If the ball is moving faster than `releaseSpeed`, it cannot be instantly claimed except by a keeper save.
- While owned, the ball should move toward a dribble anchor in front of the owner's facing direction.
- The anchor should be near the feet, not glued to the chest.
- The ball should still have small visible touches so it feels like dribbling, not magnet attachment.
- Sprinting increases the anchor distance and reduces control blend, causing heavier touches.
- Releasing movement should let the ball settle just in front of the player.
- A shot, pass, tackle, or goal clears ownership.
- `resetPositions()` must clear ownership, possession timers, `hasPossession`, and possession cooldowns.
- `afterGoal()` must clear ownership before resetting positions or ending the match.
- If the ball owner is destroyed by match cleanup, `destroy()` must not leave timers/listeners behind.

`setBallOwner(unit)` must clear `hasPossession` on every other unit before assigning the new owner. Do not rely only on `ball.ownerId`; stale `unit.hasPossession` flags will create confusing render and AI bugs.

`clearBallOwner(reason)` must:

- Set previous owner `hasPossession = false`.
- Set `ball.ownerId = null`.
- Set `ball.ownerSide = null`.
- Set `ball.lastOwnerId` to the previous owner id.
- Clear `ball.intendedReceiverId` unless the reason is a pass that is explicitly assigning a new intended receiver.
- Set `ball.looseTimer` based on reason, such as shot/pass/tackle/reset.

### Anti-Frustration Rules

The human player should not lose the ball instantly just because an AI defender overlaps them by one pixel.

Rules:

- After claiming possession, owner gets a brief `possessionCooldown` grace period.
- Defenders can contest only after grace expires.
- Controlled player grace should be slightly longer than AI grace.
- A defender must be within `stealContestRadius` and have a meaningful angle/speed advantage.
- Defender collision without tackle should sometimes nudge the ball loose, but not always steal cleanly.

Suggested values:

```js
controlledPossessionGrace: 0.32,
aiPossessionGrace: 0.18,
minStealRelativeSpeed: 80,
```

### Dribble Anchor

For a unit facing `facing`:

```js
const distance = sprinting ? POSSESSION.sprintControlDistance : POSSESSION.closeControlDistance;
return {
  x: owner.x + owner.facing.x * distance,
  y: owner.y + owner.facing.y * distance,
};
```

Blend ball movement:

```js
ball.x += (anchor.x - ball.x) * blend;
ball.y += (anchor.y - ball.y) * blend;
ball.vx = owner.vx * 0.82 + owner.facing.x * touchSpeed;
ball.vy = owner.vy * 0.82 + owner.facing.y * touchSpeed;
```

Do not directly teleport the ball every frame unless it has drifted too far.

### Integration Order

In `update(dt)`:

1. Update player/AI movement.
2. Resolve player-player collisions.
3. Decrement possession/action cooldowns before any claim/contest logic reads them.
4. Update possession claims and contests.
5. If there is an owner, run carried-ball movement.
6. If there is no owner, run existing ball collision handling.
7. If there is no owner, update loose ball physics.
8. Always run wall/post collision and goal checks.

Important: when there is a ball owner, skip the existing generic `handleEntityBallCollision(owner)` path for that owner. Otherwise the old impulse logic will fight the new carry logic.

Do not skip goal checks when there is an owner. If a carried ball crosses the goal mouth, the goal must still count.

Do not skip keeper save logic for a shot/pass just because the ball is loose. `tryKeeperSave()` should remain available whenever the ball is traveling toward goal.

### Wall, Post, and Goal Interaction

When the ball is owned:

- `updateCarriedBall(owner, dt)` should keep the ball inside normal field bounds unless the owner is actively carrying into the goal mouth.
- If a carried ball hits a post or boundary, call `clearBallOwner("bounce")` and let existing loose-ball bounce logic handle it.
- If the owner carries the ball fully into the opponent goal, `checkGoals()` should score as normal.
- After a goal, `afterGoal()` should clear owner state before calling `resetPositions()`.

### AI Kicking Compatibility

Current AI uses `tryUnitKick(unit)`. After possession exists:

- AI should call `tryUnitKick(unit)` only when it has possession or can reach a loose ball.
- `tryUnitKick(unit)` must call `clearBallOwner("shot")` or `clearBallOwner("pass")` before setting ball velocity.
- `handleEntityBallCollision(unit)` should not immediately re-trigger `tryUnitKick(unit)` in the same frame after a pass/shot.

### Acceptance Criteria

- The controlled player can run with the ball for several seconds.
- The ball stays near the player's feet and in front of movement direction.
- Sprinting with the ball creates heavier touches and slightly more risk.
- Bumping into a defender can knock the ball loose.
- Space shot still works and releases the ball.
- Goals still work.
- AI players can still take possession and attack.

## Stage 3: Separate Pass and Shoot Controls

### Goal

Make controls more like soccer:

- Quick pass to teammate.
- Hold shoot for a shot.
- Sprint remains Shift.

### Recommended Controls

```txt
WASD / Arrows: move
Shift: sprint
J or X: pass
K or Space: shoot / hold to charge
L or C: tackle / shoulder challenge
Enter: continue after match result
```

Keep Space as shoot for kid simplicity. Add `J`/`X` pass so the player can move the ball without always blasting it.

### Required Input Changes

Update `handleKeyDown()` and `handleKeyUp()`:

- Track `j`, `x`, `k`, `c`, `l`.
- Update `isGameKey(key)` so these keys are actually accepted; currently it only allows movement, Space, and Shift.
- Ignore repeated `keydown` for single actions using `event.repeat`.
- Keep existing Space charge behavior.
- Add visible control text in `src/ui.js`.

Add action cooldowns:

```js
passCooldown: 0,
tackleCooldown: 0,
shotCooldown: existing kickCooldown
```

Pass and tackle should trigger once per key press, not every frame while held.

Recommended key behavior:

- `Space` and `K`: share the same shoot charge path.
- Track which key started the current shot charge, such as `shotCharge.key`, so releasing Space does not finish a shot started by K and releasing K does not finish a shot started by Space.
- `J` and `X`: call pass once on `keydown` when `!event.repeat`.
- `L` and `C`: call tackle once on `keydown` when `!event.repeat`.
- `keyup` for pass/tackle should clear key state only; it should not fire a second action.

### Passing System

Add methods:

```js
getBestPassTarget(unit)
getPassAim(unit, target)
passBall(unit, target)
```

Pass target selection:

- Prefer teammate in facing direction.
- Prefer nearer attacking teammate.
- Avoid passing to keeper unless no other option.
- For controlled player, add light pass assist toward the best teammate.

Pass behavior:

- Clear possession.
- Move ball slightly in front of passer.
- Set ball velocity toward target.
- Use moderate speed, not shot speed.
- Flash a small pass effect.
- Put the passer on a short possession cooldown so the passer does not immediately re-claim the ball before it travels.
- Do not put the intended receiver on a normal possession cooldown, because that would block receiving. Instead set `ball.intendedReceiverId = target.id` and allow that unit to claim after `receiverClaimGrace` even while other players still respect `passLooseTimer`.

Suggested constants, stored on `ACTIONS`:

```js
passSpeed: 430,
throughPassSpeed: 520,
passAssistAngle: 0.72,
passerCooldownAfterPass: 0.28,
receiverClaimGrace: 0.1,
```

### Shooting Changes

- Shooting should require possession or close reach.
- Hold-to-charge still works.
- Shot animation should trigger.
- Shot aim should use input direction first, then goal assist.
- Shooting clears ownership and starts `ball.looseTimer` so the shot cannot be instantly recaptured.

### Acceptance Criteria

- Pressing `J` or `X` passes to a teammate.
- Holding/releasing Space still shoots.
- Passing does not feel like a weak shot.
- Teammates can receive passes and claim possession.
- UI accurately lists the controls.

## Stage 4: Tackles, Steals, and Shielding

### Goal

Make defending more soccer-like. Possession should be valuable, but not permanent.

### Tackle Rules

Add:

```js
tackleState: null,
tackleTimer: 0,
tackleCooldown: 0,
```

Add these fields in `createFieldPlayer()` alongside `kickCooldown`, not lazily during the first tackle, so VM smoke tests can assert the shape exists on all units.

Do not overwrite the existing visual `actionPose` fields. Tackle state can drive gameplay cooldowns; visual pose can still use `setUnitActionPose(unit, "tackle", duration)`.

For controlled player:

- `L` or `C` triggers tackle/challenge.
- If close to opponent owner, compare:
  - defender defense/tackleStrength
  - owner dribbleControl
  - angle of challenge
  - relative speed

Outcomes:

- Clean steal: defender becomes owner.
- Poke loose: ball becomes loose with small impulse.
- Miss: defender slows briefly.

Suggested constants:

```js
tackleRange: 28,
tackleDuration: 0.2,
tackleCooldown: 0.55,
tackleWhiffSlowdown: 0.68,
cleanStealThreshold: 0.62,
pokeLooseThreshold: 0.38,
```

### Shielding

Simple shielding can be automatic:

- If owner is moving away from defender, reduce steal chance.
- If defender approaches from front/side, increase steal chance.
- High-dribble legends keep possession better.

### Acceptance Criteria

- Pressing tackle near an opponent can win the ball.
- Sprinting straight into defenders is risky.
- Skilled dribblers are harder to dispossess.
- Tackle does not spam every frame.

## Stage 5: Faces and Player Identity on the Pitch

### Goal

Make it easier to see who the selected player is without cluttering the pitch.

### Recommended First Pass

Use code-rendered face badges, not official photos.

Add to `PLAYER_VISUALS`:

```js
faceBadgeRadius: 9,
captainFaceBadgeRadius: 12,
showFaceBadges: true,
```

Draw for:

- Controlled captain always.
- Ball owner.
- Nearby selected/highlighted unit.
- Optional: all unlocked home legend players only when zoom/readability allows.

### Face Rendering Options

Option A, preferred first:

- Reuse current `portrait` data.
- Draw a tiny circular face badge using skin/hair/headband/beard fields.
- This avoids image loading and keeps the no-licensed-photo rule.

Option B, later:

- Pre-render each player's portrait to a small offscreen canvas.
- Draw the offscreen canvas with `drawImage()`.
- Clip it to a circle with Canvas clipping.

### Implementation Methods

Add:

```js
drawFaceBadge(unit, radius)
drawMiniPortrait(profile, radius)
shouldDrawFaceBadge(unit)
```

Current `drawPlayer(unit)` already draws rotated player bodies. Face badges should be drawn after the body with screen/world orientation reset so the face remains upright and readable.

Implementation detail:

- Draw player bodies first.
- Draw ball next or after owner ring depending on readability.
- Draw face badges after body rendering but before HUD.
- Use `ctx.save()`/`ctx.restore()` around every badge to avoid leaking clip paths.
- If using `ctx.clip()`, always restore immediately after the clipped drawing.

Rules:

- Do not draw face badges for all 22 players if mobile readability suffers.
- The badge should not hide the ball.
- The controlled captain badge should sit slightly above the body.
- The ball owner badge can pulse subtly.
- If the controlled captain is also the ball owner, draw one badge, not two.

### Acceptance Criteria

- The selected player has a recognizable tiny face badge.
- The current ball owner is visually obvious.
- The badge does not overlap the HUD or hide the ball.
- Mobile view remains readable.

## Stage 6: Better AI for FIFA-Like Flow

### Goal

AI should make the game feel like soccer instead of all players clustering around the ball.

### AI States

Add explicit states:

```js
"shape"
"press"
"mark"
"support"
"receive"
"carry"
"shoot"
"recover"
```

Home teammates:

- Move into passing lanes when the controlled player has possession.
- One or two teammates support near the ball.
- Wingers stay wider.
- Striker moves toward goal.

Away team:

- Nearest defender presses owner.
- Second nearest defender covers pass lane.
- Others hold shape.

### Steering Blend

Use simple steering vectors:

- Seek target position.
- Arrival to slow down near target.
- Separation from nearby teammates.
- Pursuit when chasing loose ball.
- Marking offset near opponent.

Do not add full pathfinding in this stage. The field has no obstacles other than players.

### Concrete AI Implementation Requirements

Keep this lightweight and deterministic enough for a one-pass implementation:

- Update `getUnitTarget(unit)` so it uses `getBallOwner()` first, then falls back to loose-ball chasing.
- Add helper methods if useful:
  - `getNearestDefenders(owner, count)`
  - `getSupportSpot(unit, owner)`
  - `getMarkingSpot(unit, opponent)`
  - `applySeparationSteering(unit, target)`
- If a teammate owns the ball:
  - Owner state is `"carry"` unless in shooting range, then `"shoot"`.
  - Nearest two teammates become `"support"` and move to diagonal passing lanes.
  - Wingers keep wide support spots.
  - Defenders hold shape unless the ball is in their third.
- If an opponent owns the ball:
  - Nearest defender state is `"press"` and targets the owner.
  - Second nearest defender state is `"mark"` and targets the best pass lane or closest forward teammate.
  - Remaining players use `"shape"` with the existing formation-pull logic.
- If the ball is loose:
  - Existing nearest-chaser behavior remains, with state `"recover"`.
- Blend a small separation vector away from nearby teammates so the team does not stack into one pile.

Do not add probabilistic tactics in this stage. The same position should produce roughly the same AI movement every run.

### Acceptance Criteria

- Teammates spread out when the user has the ball.
- At least one teammate is usually passable.
- Defenders press the ball owner instead of only chasing the ball.
- Players do not form one huge pile at midfield.

## Stage 7: Camera, Zoom, and Readability

### Goal

Make faster movement and face badges readable.

### Current Constraint

The game currently draws the full `900 x 520` field into the canvas. This is easy to understand but makes small faces hard to see on mobile.

### First Pass

Keep full-field view, but add:

- Larger controlled player/captain visuals.
- Owner highlight ring.
- Face badge for selected captain/owner.
- Slightly thicker ball outline.

### Optional Later Pass

Add dynamic camera zoom only if full-field readability is not enough.

Requirements if zoom is added:

- Keep goals and enough field context visible.
- Clamp camera to field bounds.
- Keep HUD screen-space, not world-space.
- Do not break mobile layout.

### Acceptance Criteria

- Faster players remain trackable.
- Ball owner is obvious.
- Mobile still has no horizontal overflow.

## Implementation Order for an AI Agent

Build in this order:

1. Tune player speed/acceleration/sprint constants.
2. Add possession state fields to ball and units.
3. Implement `setBallOwner()`, `clearBallOwner()`, `tryClaimPossession()`.
4. Implement `updateCarriedBall()` and dribble anchor behavior.
5. Integrate possession into `update(dt)`.
6. Update `resetPositions()`, `afterGoal()`, and shot/pass clear behavior.
7. Make Space shot clear possession.
8. Add pass controls and `passBall()`.
9. Add tackle controls and simple steal logic.
10. Add the Stage 6 support/press AI behavior using the concrete helper requirements.
11. Add face badge rendering and owner/readability indicators for selected captain and owner.
12. Update UI control text.
13. Run static and VM smoke checks.
14. Browser-test desktop.
15. Browser-test mobile.

Do not start by changing AI or camera. Possession and faster control must work first.
For the full spec, do not stop before Stage 6 AI and Stage 7 first-pass readability are implemented and verified. The minimum slice is the only acceptable reason to defer them, and that must be stated explicitly.

## Minimum Viable Slice

If building this in one implementation turn, the minimum acceptable slice is:

1. Stage 1 faster movement.
2. Stage 2 possession/dribbling for controlled player and AI.
3. Space/K shooting clears possession.
4. Basic `J`/`X` pass.
5. Owner ring or face badge for the selected captain/owner.
6. Updated controls text.
7. Desktop and mobile checks.

Stage 4 tackles, Stage 6 smarter AI, and Stage 7 camera can be deferred only if the minimum slice is complete and the spec remains open for follow-up.

Minimum slice acceptance differs from full spec acceptance:

- Minimum slice completion does not require full tackle/steal implementation.
- Full spec completion does require tackle/steal behavior, smarter AI flow, and final readability checks.
- If the implementer stops after the minimum slice, they must say which later stages remain.

## Testing Plan

### Static Checks

Run:

```sh
node --check src/data.js
node --check src/game.js
node --check src/ui.js
node --check src/main.js
```

### VM Smoke Checks

Create `tests/fifa-like-smoke.js` and run it directly with Node:

```sh
node tests/fifa-like-smoke.js
```

The smoke test should stub only the browser pieces needed by the current vanilla app (`window`, `document` if needed, `performance`, `requestAnimationFrame`, `cancelAnimationFrame`, `matchMedia`, a canvas-like object, and a minimal 2D context with no-op drawing methods). It should load `src/data.js` and `src/game.js` without requiring a bundler or package install.

The smoke test must:

- Instantiates `SoccerGame` with a starter captain.
- Instantiates `SoccerGame` with an elite winger captain.
- Instantiates `SoccerGame` with a keeper captain.
- Confirms 11 home + 11 away players.
- Simulates movement for 180 frames.
- Confirms player speed does not exceed intended cap.
- Moves controlled player into ball and confirms possession can be claimed.
- Simulates 120 frames of movement while owned and confirms ball remains within a reasonable dribble distance.
- Fires a shot and confirms ownership clears.
- Runs a pass and confirms the ball becomes loose/in flight toward a teammate.
- Runs a tackle scenario and confirms ownership can either transfer or become loose.
- Calls `resetPositions()` and confirms no unit has stale `hasPossession`.
- Confirms `ball.ownerId`, `ball.ownerSide`, `ball.lastOwnerId`, `ball.looseTimer`, and `ball.intendedReceiverId` reset/transition as expected.
- Calls `draw()` without throwing.

### Browser Checks

Use:

```txt
http://127.0.0.1:8020/
```

Desktop:

- Start match.
- Move without ball.
- Sprint without ball.
- Claim ball.
- Run with ball for at least 3 seconds.
- Pass to teammate.
- Shoot.
- Tackle/steal.
- Score or concede.
- Confirm no console errors.

Mobile viewport:

- Canvas remains visible.
- No horizontal overflow.
- Face badge and owner ring remain readable.
- Controls text does not overflow.

If browser automation is available, capture these checks with Playwright or the in-app browser tooling. If it is not available, the implementer must still run the static and VM smoke checks and leave a short manual browser checklist for the user.

### Full Acceptance Checklist

The full next round is complete when:

- Controlled player movement is noticeably faster.
- Sprint feels useful but not unlimited.
- Ball possession exists as explicit state.
- The controlled player can run with the ball.
- Passing and shooting are separate.
- Tackles can win or loosen the ball.
- Selected player face/identity is visible during play.
- AI still plays a complete match.
- Pack/collection flow still works.
- Desktop and mobile browser checks pass.
- No console errors.

### Minimum Slice Checklist

The minimum playable slice is complete when:

- Controlled player movement is noticeably faster.
- Ball possession exists as explicit state.
- The controlled player can run with the ball for at least 3 seconds.
- Space/K shooting clears possession.
- `J`/`X` passing works at a basic level.
- Selected player or ball owner identity is visible through an owner ring or face badge.
- Controls text is updated.
- Desktop and mobile browser checks pass.
- No console errors.

## Tuning Notes

Expect at least one tuning pass after implementation.

Likely tuning knobs:

- `starterMaxSpeed`
- `eliteMaxSpeed`
- `playerAcceleration`
- `playerDrag`
- `sprintMultiplier`
- `staminaDrain`
- `staminaRecovery`
- `POSSESSION.claimRadius`
- `POSSESSION.closeControlDistance`
- `POSSESSION.dribbleBlend`
- `POSSESSION.sprintDribbleBlend`
- `POSSESSION.releaseSpeed`
- pass speed
- shot speed
- tackle success thresholds

Good first feel target:

- Without ball: fast players should feel quick within 0.25 seconds.
- With ball: fast players should still be quick, but slightly slower than sprinting without ball.
- Sprint dribbling should be exciting but easier to lose.
- Close-control dribbling should be stable enough for a kid to enjoy.
