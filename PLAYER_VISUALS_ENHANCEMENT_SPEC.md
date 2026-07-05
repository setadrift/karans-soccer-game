# Bench to Ballon d'Or - Player Visuals Enhancement Spec

## Purpose

Replace the current on-field circle tokens with soccer-player-looking characters while preserving the working 11v11 arcade match, card collection loop, and vanilla browser setup.

This spec is written so an AI coding agent can build the enhancement in phases. The first phase should be small enough to complete in one pass and test in the browser.

## Research Summary

Research pass completed from web sources on Canvas image drawing, Canvas rotation, sprite sheets, animation loops, sprite asset export, and game asset licensing.

Useful references:

- MDN Canvas `drawImage()`: Canvas can draw whole images or a cropped source rectangle from a sprite sheet into a destination rectangle. This is the browser-native path for sprite sheets.
  - https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
- MDN Canvas `rotate()`: Canvas rotation happens around the current origin, so sprites should be drawn with `save()`, `translate(unit.x, unit.y)`, `rotate(angle)`, draw centered at `0,0`, then `restore()`.
  - https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/rotate
- web.dev Canvas performance: pre-rendering repeated expensive drawing into snug offscreen canvases can help, and animation should use `requestAnimationFrame`.
  - https://web.dev/articles/canvas-performance
- Phaser animation docs: full game engines generally animate characters with sprite sheets or texture atlases made of frame sequences. This is the right long-term model if the game grows beyond the current vanilla Canvas scope.
  - https://docs.phaser.io/phaser/concepts/animations
- Aseprite sprite-sheet docs: sprite sheets can be exported as horizontal, vertical, matrix, or atlas layouts, with JSON metadata if needed.
  - https://www.aseprite.org/docs/sprite-sheet/
- Kenney support / asset licensing: Kenney game assets are CC0/public domain and can be useful for temporary prototype sports assets.
  - https://kenney.nl/support

Recommendation: do not migrate the game to Phaser yet. The current app is already a small vanilla Canvas game, and the player renderer is isolated in `src/game.js`. The fastest high-confidence next step is to replace `drawPlayer(unit)` with a procedural top-down player renderer, then optionally add a real sprite-sheet pipeline once the desired art direction is proven.

## Current State

Current implementation is in `src/game.js`.

Relevant current behavior:

- The match is 11v11 with 22 total units on a `900 x 520` logical canvas.
- The user controls one selected captain; teammates and rivals are AI-controlled.
- `createFieldPlayer(player, spot, side, index, controlled)` creates each unit.
- Each unit already has:
  - `x`, `y`, `vx`, `vy`
  - `radius`
  - `role`
  - `side`
  - `controlled`
  - `name`
  - `sourceId`
  - `gameplay`
- `draw()` calls:
  - `drawField()`
  - `drawGoals()`
  - `drawBallTrail()`
  - `drawPlayer(unit)` for away team
  - `drawPlayer(unit)` for home teammates
  - `drawPlayer(this.player)` for controlled captain
  - `drawBall()`
  - effects and HUD
- `drawPlayer(unit)` currently draws:
  - shadow
  - optional keeper reach circle
  - colored circle
  - initials or role label
- `drawDebug()` already exists and should keep showing collision circles if debug mode is enabled.
- `src/data.js` already includes `portrait` objects for card headshots. These should be reused as the first source for on-field visual profiles before adding any new data fields.

## Current App Constraints to Preserve

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
- Current active legend collection size: 20 cards.
- Existing localStorage saves must keep working.
- The match must remain 11v11.
- Physics hitboxes should remain circle-based unless a separate physics-retuning spec is written.
- The ball must stay visible above player bodies.
- The controlled captain must stay visually obvious.
- The game must remain readable on desktop and mobile browser widths.
- Normal match rendering should not depend on text labels inside the players. Player readability should come from silhouette, color, facing, keeper details, and captain treatment.

## Visual Goal

The on-field units should look like tiny top-down soccer players instead of board-game circles.

Each unit should visibly have:

- Body/torso.
- Head/hair.
- Arms.
- Legs/boots.
- Team kit color.
- Direction/facing.
- Motion when running.
- A distinct keeper look.
- A distinct selected-captain look.

The visual style should be stylized arcade soccer, not photo-real. The goal is "these are players on a pitch," not licensed real-life likeness simulation.

## Non-Goals

Do not do these in this enhancement pass:

- Do not use official player photos on the field.
- Do not use real club logos, national team logos, or official kits.
- Do not attempt exact copyrighted/publicity-right player likenesses.
- Do not migrate the game to Phaser, React, Vite, WebGL, or Three.js.
- Do not replace the current 11v11 gameplay loop.
- Do not change the pack opening or card collection rules.
- Do not change the localStorage key.
- Do not add a large asset dependency that requires a build pipeline.
- Do not make the players so large that 22 units visually clutter the pitch.

## Phase 1: Procedural Top-Down Players

This is the required first implementation phase.

### Goal

Replace circles with simple code-rendered top-down player figures using Canvas 2D primitives. This gives an immediate player-like look without waiting on custom raster assets.

### Required Code Changes

Update `src/game.js`.

Add player visual constants near `PHYSICS`:

```js
const PLAYER_VISUALS = {
  normalWidth: 18,
  normalHeight: 26,
  captainWidth: 22,
  captainHeight: 30,
  keeperWidth: 22,
  keeperHeight: 28,
  minFacingSpeed: 12,
  runCycleSpeed: 0.045,
};
```

Add visual state when creating each unit in `createFieldPlayer()`:

```js
visual: this.getVisualProfile(player, side, role, index, controlled),
facing: side === "home" ? { x: 1, y: 0 } : { x: -1, y: 0 },
runPhase: 0,
actionPose: null,
actionTimer: 0,
actionDuration: 0,
```

Add or update these methods:

```js
getVisualProfile(player, side, role, index, controlled)
getFallbackVisualProfile(side, role, index, controlled)
updateUnitFacing(unit, dt)
updateUnitAnimation(unit, dt)
drawPlayer(unit)
drawUnitShadow(unit, width, height)
drawPlayerFigure(unit, profile, width, height, speedRatio)
drawKeeperDetails(unit, profile, width, height)
drawCaptainIndicator(unit, width, height)
```

The old `drawPlayer(unit)` should become the wrapper that handles keeper reach rings, shadows, facing rotation, and drawing the body. Keep the old circle label only in debug mode or remove it entirely.

Plug the visual updates into the existing `update(dt)` method after movement, collisions, ball updates, and `this.aiState = this.getTeamMood(this.awayTeam);` so facing and animation use the latest velocities:

```js
this.players.forEach((unit) => {
  this.updateUnitFacing(unit, dt);
  this.updateUnitAnimation(unit, dt);
});
```

This visual update must not move entities, change velocities, change scoring, or change collisions.

Update `resetPositions()` so visual state cannot get stuck after goals:

```js
unit.facing = unit.side === "home" ? { x: 1, y: 0 } : { x: -1, y: 0 };
unit.runPhase = 0;
unit.actionPose = null;
unit.actionTimer = 0;
unit.actionDuration = 0;
```

This reset should happen alongside the existing `x`, `y`, `vx`, `vy`, and `kickCooldown` resets.

### Visual Profile Defaults

`getVisualProfile()` must work in Phase 1 without changing `src/data.js`.

Priority order:

1. Start from team and role defaults.
2. Merge values from `player.visualProfile` if present.
3. Merge compatible values from existing `player.portrait` if present.
4. Fall back to deterministic values from `side`, `role`, and `index`.

Suggested returned shape:

```js
{
  kit: "#f97316",
  shorts: "#7c2d12",
  stripe: "#ffffff",
  skin: "#d9a17a",
  hair: "#22140c",
  hairStyle: "short",
  bootColor: "#111827",
  gloveColor: "#f8fafc",
  accent: "#facc15",
  build: "balanced",
}
```

Existing `portrait` fields that can map directly:

- `portrait.skin` -> `skin`
- `portrait.hair` -> `hair`
- `portrait.hairStyle` -> `hairStyle`
- `portrait.shirt` -> optional kit accent, not the whole team kit
- `portrait.accent` -> `accent`

Do not let individual legend portrait colors override the home/away team identity so strongly that teams become hard to distinguish.

### Facing Rules

Each unit should keep a stable `facing` vector.

Update facing when:

- `Math.hypot(unit.vx, unit.vy) > PLAYER_VISUALS.minFacingSpeed`.
- For the controlled player, input direction can also update facing using existing `lastDirection`.
- If a unit is idle, keep the previous facing instead of snapping to a default.

Use this drawing pattern:

```js
const angle = Math.atan2(unit.facing.y, unit.facing.x);
ctx.save();
ctx.translate(unit.x, unit.y);
ctx.rotate(angle);
// draw canonical player facing right, centered around 0,0
ctx.restore();
```

Do not call `ctx.setTransform()` from player drawing helpers. `resizeCanvasForDpr()` owns the DPR transform. Player helpers should use `save()`, `translate()`, `rotate()`, and `restore()` only.

### Canvas Drawing Safety

Every drawing helper that changes canvas state must either:

- Use `ctx.save()` and `ctx.restore()` internally, or
- Be called from a wrapper that guarantees state restoration.

Protect against these leaks:

- `fillStyle`
- `strokeStyle`
- `lineWidth`
- `globalAlpha`
- `textAlign`
- `textBaseline`
- rotation/translation transforms

Draw unrotated field-space rings before the rotated body:

1. Keeper reach ring.
2. Captain/selected ring.
3. Shadow.
4. Rotated player body.

The ball must still be drawn after all players.

### Drawing Anatomy

Draw each player in this order:

1. Shadow under the feet.
2. Back leg.
3. Far arm.
4. Torso/kit.
5. Near arm.
6. Front leg.
7. Head.
8. Hair/headband.
9. Boots.
10. Captain outline, selection glow, or keeper details.

Suggested proportions for a normal outfield player:

```txt
body center:   0, 0
torso:         x -5..7, y -7..7
head:          x 8..13, y -4..4
legs:          x -9..-2
arms:          x -1..7, y +/-7
boots:         x -11..-8
```

This assumes the canonical player faces right before rotation.

### Kit Rules

Use current side colors as the base:

- Home teammate: orange kit.
- Controlled captain: brighter orange/red kit plus white outline.
- Away team: blue kit.
- Home keeper: green or gold keeper kit.
- Away keeper: light blue or purple keeper kit.

Add small accents so teams look premium:

- Thin white side stripe on torso.
- Slight darker shorts.
- Boots in black or white.
- Keeper gloves.
- Captain armband for the controlled player.

### Animation Rules

Add simple motion from velocity. Do not require sprite images yet.

Each moving unit should update:

```js
const speed = Math.hypot(unit.vx, unit.vy);
unit.runPhase += speed * dt * PLAYER_VISUALS.runCycleSpeed;
```

Use `Math.sin(unit.runPhase)` to offset arms and legs slightly.

States:

- Idle: arms and legs mostly still.
- Jog/run: alternating arms and legs.
- Kick: brief leg extension when `firePlayerShot(chargeMs)` or `tryUnitKick(unit)` fires.
- Keeper save: brief wide-arm pose when the keeper touches or blocks the ball.

Phase 1 can implement idle/run only. Kick/save can wait for Phase 3 if needed.

If `this.reduceMotion` is true, keep facing updates but freeze or minimize limb run-cycle offsets. This preserves readability without unnecessary motion.

### Acceptance Criteria

Phase 1 is complete when:

- All 22 on-field units render as player-like figures, not circles.
- Home, away, keeper, and controlled captain are visually distinct.
- Player facing changes while moving and remains stable while idle.
- The ball still renders clearly above players.
- Collision behavior is unchanged.
- Debug mode, if enabled, still shows circle hitboxes.
- With debug mode off, no player should appear as a filled circular token. The ball, goal posts, effects, and keeper reach rings may still be circular.
- No console errors in the browser.
- Desktop and mobile browser views remain readable.

## Phase 2: Player Identity Profiles

### Goal

Give unlocked legends and starters distinct visual profiles so the controlled captain feels more like the selected card.

### Data Model

Use existing `portrait` data first. Add `visualProfile` only when the on-field renderer needs data that is not already present in `portrait`, such as `build`, `bootColor`, or keeper glove color.

Optional `src/data.js` field:

```js
visualProfile: {
  skin: "#c58a5b",
  hair: "#2b160c",
  hairStyle: "short",
  build: "balanced",
  bootColor: "#f8fafc",
  accent: "#facc15",
}
```

Supported fields:

- `skin`: skin tone.
- `hair`: hair color.
- `hairStyle`: support current card values such as `buzz`, `mohawk`, `topknot`, `ponytail`, `curly`, `tight-curls`, `headband-curls`, `messy`, `flat`, and `classic`; map unknown values to a simple short-hair shape.
- `build`: `compact`, `balanced`, `tall`, `stocky`.
- `bootColor`: boot color.
- `accent`: small kit accent color.

Rules:

- Use stylized, non-photorealistic profiles.
- Avoid official kits/logos.
- Avoid exact real-life likenesses.
- Generic starter players can use deliberately goofy profiles.
- Rival players can use deterministic profiles based on index.

### Required Code Changes

Add:

```js
getVisualProfile(player, side, role, index, controlled)
getFallbackVisualProfile(side, role, index, controlled)
```

Behavior:

- If `player.visualProfile` exists, merge it with team kit defaults.
- If `player.portrait` exists, merge compatible portrait fields into the visual profile.
- If both are missing, generate a deterministic fallback from `side`, `role`, and `index`.
- Never mutate the imported card object directly.

### Acceptance Criteria

- Selecting different unlocked legends changes the controlled captain's visible hair/body/accent details.
- Starter players no longer all look identical.
- Rival XI remains readable as the other team.
- Existing saves still load.

## Phase 3: Ball-Action Poses

### Goal

Make player actions read clearly: running, kicking, tackling, and keeper saves should feel like soccer actions.

### Required Action State

Add to each unit:

```js
actionPose: null, // "kick" | "tackle" | "save"
actionTimer: 0,
actionDuration: 0,
```

Add a small helper to avoid inconsistent timers:

```js
setUnitActionPose(unit, pose, duration) {
  unit.actionPose = pose;
  unit.actionTimer = duration;
  unit.actionDuration = duration;
}
```

Set poses from existing gameplay events:

- `kick`: when the controlled player or AI kicks the ball.
- `tackle`: when a player-player or player-ball contest creates a strong ball displacement.
- `save`: when a keeper contacts the ball inside or near the box.

Current method hook points:

- Set controlled-player `kick` pose inside `firePlayerShot(chargeMs)`.
- Set AI/teammate `kick` pose inside `tryUnitKick(unit)`.
- Set keeper `save` pose inside `tryKeeperSave(unit, nx, ny)`.
- If tackle pose is added, set it inside `handleEntityBallCollision(unit)` only for strong contacts.

Update each frame:

```js
if (unit.actionTimer > 0) {
  unit.actionTimer = Math.max(0, unit.actionTimer - dt);
  if (unit.actionTimer === 0) unit.actionPose = null;
}
```

### Pose Rendering

- Kick: front leg extends toward facing direction, arms counterbalance.
- Tackle: body leans lower and wider for a short time.
- Save: keeper arms widen, gloves become larger, keeper reach ring pulses.

### Acceptance Criteria

- Pressing Space creates a visible kick pose.
- Keeper blocks/saves create a visible keeper pose.
- Poses never affect physics unless a separate gameplay task explicitly changes them.
- Poses do not obscure the ball during shots.

## Phase 4: Optional Sprite-Sheet Pipeline

### Goal

If procedural figures are not premium enough, move to custom raster sprites or a sprite atlas while keeping Canvas and the current game loop.

### Asset Format

Recommended file structure:

```txt
assets/
  players/
    player-atlas.png
    player-atlas.json
```

Recommended frame size:

```txt
32 x 32 for compact pixel/top-down sprites
48 x 48 for smoother high-DPI sprites
```

Recommended animation clips:

```txt
idle:  4 frames
run:   6 frames
kick:  4 frames
save:  4 frames for keepers
```

Recommended directions:

- Start with one right-facing top-down sprite and rotate it in Canvas.
- Use 8-direction sprite rows only if rotation looks awkward.

### Manifest Shape

```json
{
  "image": "assets/players/player-atlas.png",
  "frameWidth": 48,
  "frameHeight": 48,
  "clips": {
    "outfield_idle": [0, 1, 2, 3],
    "outfield_run": [4, 5, 6, 7, 8, 9],
    "outfield_kick": [10, 11, 12, 13],
    "keeper_idle": [14, 15, 16, 17],
    "keeper_save": [18, 19, 20, 21]
  }
}
```

### Loading Rules

Add a small preloader:

```js
loadPlayerSpriteAtlas()
getSpriteFrame(unit)
drawPlayerSprite(unit, frame)
drawProceduralPlayer(unit) // fallback
```

Rules:

- Load the atlas once per page session.
- Never create a new `Image()` inside the draw loop.
- If the image or JSON fails to load, fall back to procedural players.
- Use MDN's 9-argument `drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)` form for atlas frames.
- Keep an `assets/players/README.md` or comments in the manifest noting where the art came from and what license applies.

### Asset Creation Guidance

Acceptable sources:

- Custom generated bitmap sprites with transparent background.
- Hand-drawn sprites exported from Aseprite.
- Temporary CC0 prototype assets, such as Kenney sports assets.

Restrictions:

- No official player photos.
- No official kits/logos.
- No ripped sprites from existing games.
- No assets without a clear license.
- No AI-generated image assets that mimic a specific official player photo or copyrighted kit.

### Acceptance Criteria

- Atlas loads before match rendering or falls back gracefully.
- Player animation frame changes are visible during movement.
- Sprites align with current circular hitboxes.
- The ball and HUD still render clearly.
- No broken-image flashes or console errors.

## Phase 5: Premium Polish

### Goal

Make the on-field player presentation feel finished and consistent with the premium card direction.

Add:

- Subtle player shadows that match movement and scale.
- Tiny jersey numbers or role marks only if they remain legible.
- Controlled captain selection ring that sits under the player, not over the body.
- Keeper gloves and a different keeper silhouette.
- Small boot/leg flash on kicks.
- Optional goal celebration pose after scoring.
- Optional reduced-motion handling that freezes non-essential run-cycle animation.

Do not add:

- Floating name labels above all 22 players.
- Large portraits on the pitch.
- Effects that hide the ball.
- Visual clutter that makes the match harder to play.

### Acceptance Criteria

- The field reads as 11v11 soccer at a glance.
- The selected captain is easy to find during crowded play.
- The players look better than circles even when zoomed out on mobile.
- The premium look supports gameplay instead of distracting from it.

## Implementation Order for an AI Agent

Build in this order:

1. Add `PLAYER_VISUALS` constants.
2. Add unit visual state in `createFieldPlayer()`.
3. Add `getVisualProfile()` with deterministic fallback profiles.
4. Add facing and animation update methods.
5. Call the update methods from the existing simulation update path.
6. Replace `drawPlayer(unit)` with the procedural top-down renderer.
7. Keep debug hitbox rendering separate from normal rendering.
8. Browser-test desktop match.
9. Browser-test mobile match.
10. Only then add Phase 2 identity profiles.

Do not start with sprite-sheet assets unless the user explicitly asks for generated art first. Procedural figures are faster, easier to tune, and good enough to prove the gameplay readability.

## Testing Plan

### Static Checks

Run:

```sh
node --check src/data.js
node --check src/game.js
node --check src/ui.js
node --check src/main.js
```

### Browser Checks

Use the current local server at:

```txt
http://127.0.0.1:8020/
```

Verify:

- Start screen still loads.
- Lineup still loads.
- Match starts with 22 players.
- Players are figures, not circles.
- Controlled captain is visually distinct.
- Keeper is visually distinct.
- Ball is not hidden behind players.
- Movement updates facing.
- Space/kick still works.
- Scoring still works.
- Pack rewards still work after a win.
- Collection still shows 20 active legend cards.
- Browser console has no app errors.

Primary visual QA should be done with debug mode off. A separate debug-mode check can confirm the collision circles still align with the new bodies.

### Responsive Checks

Check at least:

```txt
Desktop: current browser size or 1280 x 900
Mobile: 390 x 780
```

Acceptance:

- No horizontal overflow.
- Canvas remains visible.
- Players remain identifiable.
- HUD and buttons do not overlap the canvas.

### Save Compatibility Checks

Before and after the enhancement:

- Existing unlocked players remain unlocked.
- Removed old roster IDs remain filtered.
- `selectedPlayerId` fallback still works if needed.
- No save wipe occurs.

### Canvas/VM Smoke Checks

Add or run a small VM-style smoke test that:

- Instantiates `SoccerGame` with a regular outfield captain.
- Instantiates `SoccerGame` with a keeper captain.
- Confirms `homeTeam.length === 11`, `awayTeam.length === 11`, and `players.length === 22`.
- Confirms every unit has `visual`, `facing`, `runPhase`, `actionPose`, `actionTimer`, and `actionDuration`.
- Calls `draw()` with a stub or browser canvas without throwing.

## Definition of Done

This enhancement is done when:

- `PLAYER_VISUALS_ENHANCEMENT_SPEC.md` has been followed through at least Phase 1.
- The first playable match shows 22 soccer-player-like figures.
- Gameplay behavior is unchanged except for visual improvements.
- Desktop and mobile browser checks pass.
- Static JS checks pass.
- No new asset licensing risk has been introduced.
