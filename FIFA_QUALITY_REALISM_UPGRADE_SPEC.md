# Bench to Ballon d'Or - FIFA-Quality Realism Upgrade Spec

## Purpose

This spec is a full audit and rebuild plan for taking the current browser soccer game from a code-drawn arcade prototype toward a much more realistic, early-FIFA-style experience.

The goal is not to copy FIFA branding, UI, official likenesses, kits, logos, commentary, or licensed assets. The goal is to build a polished, kid-friendly soccer game with:

- Smooth camera and player control.
- Real sprite animation instead of code-drawn figures.
- Better ball physics and possession.
- Smarter teammate/opponent movement.
- More convincing match presentation.
- A maintainable engine that can keep improving.

## Current App Audit

### Current Stack

- Static vanilla HTML/CSS/JavaScript.
- No `package.json`, no bundler, no dependency graph.
- Single Canvas match surface in `src/game.js`.
- Main match engine is currently a single `SoccerGame` class of roughly 2,500 lines.
- Data/card loop is separate in `src/data.js`, `src/main.js`, and `src/ui.js`.
- Existing smoke test: `tests/fifa-like-smoke.js`.
- Current local server: `python3 -m http.server 8020 --bind 127.0.0.1`.

### What Is Working

- 11v11 teams.
- Card collection, packs, selected captain, and save compatibility.
- Fixed timestep update loop.
- Keyboard controls.
- Basic possession, pass, shoot, tackle, keeper save, goals.
- Follow camera and radar.
- Code-rendered upright players.
- Desktop/mobile render without horizontal overflow.

### Main Realism Gaps

The current game still cannot feel FIFA-like because the foundation is too limited:

1. Rendering is immediate-mode Canvas drawing.
   - Every player is drawn procedurally every frame.
   - No sprite atlas, animation controller, batching, filters, or scene graph.
   - Adding real animation states will become brittle.

2. Physics is handmade.
   - Ball/player interactions are heuristics, not collision/contact events.
   - Tackles, nudges, body shielding, rebounds, and keeper saves cannot become truly consistent without a better physics layer.

3. Player animation is not real animation.
   - No walk/run/dribble/pass/shoot/tackle/save frame sets.
   - Current players look bigger now, but they still slide and pose rather than animate like footballers.

4. AI is simple steering.
   - Players support and press, but do not understand formations, lanes, marking zones, passing options, off-ball runs, or role-specific behavior deeply enough.

5. Camera/presentation is only first-pass.
   - It needs cinematic zoom, smooth framing, screen-space UI layers, transitions, result overlays, and match-state presentation.

6. Code organization blocks growth.
   - `src/game.js` mixes input, physics, AI, rendering, animation, UI drawing, effects, and match rules.
   - A future agent will struggle to make targeted changes safely.

## Research Summary

The current app should remain browser-first, but it should stop relying on raw Canvas for the match engine.

### Packages Researched

| Package | Use | Fit | Notes |
|---|---|---:|---|
| PixiJS | GPU-accelerated 2D rendering, sprites, scene graph | High | Best fit for richer 2D/2.5D visuals while keeping browser deployment. Official docs describe WebGL/WebGPU/Canvas renderers and Pixi markets itself as a fast, flexible 2D renderer. |
| Phaser 3 | Full HTML5 game framework | Medium | Strong all-in-one option with WebGL/Canvas and built-in game concepts. Better for a rewrite than incremental migration. |
| Rapier 2D | Real-time 2D physics via WASM | High | Good candidate for deterministic-feeling ball/body/contact simulation. Official docs show JS bindings and async WASM initialization. |
| Yuka | Game AI, steering, pathfinding, nav meshes | Medium-High | Good fit for off-ball AI, steering, roles, and tactical state machines. Official docs include steering, graph search, nav mesh, perception, and triggers. |
| Tiled | Field/level/object authoring | Medium | Useful for authoring pitch zones, formations, trigger regions, set-piece points, and debug overlays, even though this is not a tile game. |
| LibreSprite | Free sprite animation tool | Medium | Useful for creating/editing custom sprite sheets if we want fully open tooling. |
| Existing soccer repos | Reference only | Low-Medium | `phaser-simple-soccer` and HaxBall-like repos are useful for AI/control ideas but should not be copied wholesale. |

### Sources

- PixiJS: https://pixijs.com/
- PixiJS rendering docs: https://pixijs.download/dev/docs/rendering.html
- PixiJS guide: https://pixijs.com/7.x/guides/basics/what-pixijs-is
- Phaser GitHub: https://github.com/phaserjs/phaser
- Phaser site: https://phaser.io/
- Rapier JavaScript guide: https://rapier.rs/docs/user_guides/javascript/getting_started_js/
- Rapier docs: https://rapier.rs/docs/
- Yuka docs: https://mugen87.github.io/yuka/
- Yuka GitHub: https://github.com/Mugen87/yuka
- Tiled: https://www.mapeditor.org/
- LibreSprite: https://libresprite.github.io/
- Phaser Simple Soccer reference: https://github.com/sebsowter/phaser-simple-soccer
- Soccer.js reference: https://github.com/Mati365/Soccer.js/

## Recommended Technical Direction

### Chosen Path

Use:

- `Vite` for local development/build.
- `PixiJS` for rendering.
- `@dimforge/rapier2d-compat` for physics. Use the compat package first because it is the simplest browser/Vite path for async WASM initialization.
- `yuka` for AI steering/state foundations.
- Keep existing card/save UI in normal DOM for now.

Do not migrate to Phaser for this next stage unless the team wants a larger rewrite. Phaser is viable, but PixiJS + Rapier lets us replace the match engine in layers while preserving the existing app shell and card loop.

### Why This Path

- PixiJS gives real sprite rendering, containers, layers, camera transforms, and visual effects.
- Rapier gives actual collision/contact simulation for ball, players, posts, boundaries, and tackles.
- Yuka gives a mature vocabulary for AI steering and tactical movement.
- Keeping DOM UI avoids rebuilding packs/cards before the match feels good.

## Non-Goals

- Do not copy FIFA/EA Sports branding, menus, cards, scorebugs, commentary, or licensed presentation.
- Do not use official player photos, official kits, club logos, federation badges, or stadium assets.
- Do not start with multiplayer.
- Do not jump to full 3D yet.
- Do not throw away the collection/save loop.
- Do not try to complete every phase in one unverified mega-edit.

## Target End State

The match should feel like a stylized 2D/2.5D soccer game inspired by early console football games:

- Players visibly run, idle, turn, dribble, pass, shoot, tackle, fall/recover, and keep goal.
- The ball has believable acceleration, spin/trail, rebounds, and possession behavior.
- The camera tracks the controlled player and ball smoothly without hiding field context.
- Teammates make useful runs and stay in formation.
- Opponents press, mark, recover, and defend space.
- HUD includes score/time, active player, stamina/sprint, radar, match events, and result transitions.
- The game remains simple enough for a kid to play with keyboard controls.

## Architecture Target

Create a new match-engine structure while keeping `src/main.js`, `src/ui.js`, and `src/data.js` compatible.

Recommended files:

```txt
src/match/
  MatchGame.js
  MatchState.js
  MatchConfig.js
  InputController.js
  CameraController.js
  physics/
    PhysicsWorld.js
    BallBody.js
    PlayerBody.js
    CollisionEvents.js
  render/
    PixiRenderer.js
    Layers.js
    PlayerSprite.js
    BallSprite.js
    PitchRenderer.js
    HudOverlay.js
    RadarRenderer.js
  animation/
    AnimationStateMachine.js
    PlayerAnimations.js
    ProceduralSpriteFactory.js
  ai/
    TeamAI.js
    PlayerAI.js
    Tactics.js
    Steering.js
    PassingModel.js
  rules/
    MatchRules.js
    PossessionRules.js
    FoulsAndTackles.js
    KeeperRules.js
  assets/
    manifest.js
tests/
  match-engine-smoke.js
```

During migration, `src/game.js` must stay as the old engine until the Pixi/Rapier engine reaches feature parity. `src/ui.js` should instantiate the new engine behind a feature flag such as:

```js
const USE_REALISM_ENGINE = false;
```

Only flip this flag to `true` when the new engine passes the Phase 1 or later acceptance criteria for the current slice. The user should never be left with a broken match screen while the migration is halfway done.

## Phase 0: Package and Build Foundation

### Goal

Move from static ad hoc scripts to a real browser game development setup.

### Required Work

- Add `package.json`.
- Add Vite.
- Add dependencies:
  - `pixi.js`
  - `@dimforge/rapier2d-compat`
  - `yuka`
- Keep a static fallback path if possible.
- Preserve `http://127.0.0.1:8020/` for user testing or document the new Vite URL clearly.
- Add npm scripts:

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1 --port 8020",
    "check": "find src tests -name '*.js' -print0 | xargs -0 -n1 node --check",
    "build": "vite build",
    "test:smoke": "node tests/fifa-like-smoke.js && node tests/match-engine-smoke.js"
  }
}
```

### Acceptance Criteria

- `npm install` works.
- `npm run dev` starts the game.
- `npm run check` passes.
- `npm run build` passes.
- Existing start/lineup/collection/pack screens still load.
- Existing save key still works.
- Existing smoke test still passes.

## Phase 1: PixiJS Rendering Layer

### Goal

Replace immediate-mode Canvas match drawing with a retained scene graph and sprite-ready renderer.

### Required Work

- Create Pixi application inside the existing `#match-canvas` or replace it with a Pixi-managed canvas.
- Add layers:
  - `pitchLayer`
  - `shadowLayer`
  - `playerLayer`
  - `ballLayer`
  - `effectsLayer`
  - `worldUiLayer`
  - `screenUiLayer`
- Port the pitch renderer first.
- Port current procedural players into Pixi `Graphics` or generated textures as an intermediate step.
- Keep radar/HUD either DOM or Pixi screen-space layer.
- Implement camera as a Pixi container transform.

### Acceptance Criteria

- Visual output is at least equivalent to current match.
- Camera follows controlled player/ball.
- Player and ball layers sort correctly by y/depth.
- No Canvas immediate-mode match drawing remains in the active engine.
- Desktop and mobile browser checks pass.

## Phase 2: Real Sprite Animation System

### Goal

Players should look like animated footballers, not code-drawn figures.

### Required Work

- Create generic, non-licensed sprite sheets for:
  - idle
  - jog
  - sprint
  - dribble
  - pass
  - shoot
  - tackle
  - stumble/recover
  - keeper set
  - keeper dive left/right
  - keeper save/catch
- Use generic kit colors derived from team side and player rarity.
- Use portrait/head data only for tiny face/head variations; avoid official likenesses.
- Add `AnimationStateMachine` with priority rules:
  - save/dive > shoot > pass > tackle > dribble > sprint > jog > idle
- Add directional variants:
  - at minimum left/right flip plus front/back-ish stance.
  - later: 8-direction sprites.
- Add animation event frames:
  - kick contact frame
  - pass release frame
  - tackle contact frame
  - keeper save contact frame

### Acceptance Criteria

- Controlled player visibly runs, dribbles, passes, shoots, and tackles.
- Keeper has distinct save animation.
- Animation state follows gameplay state, not random timing.
- Ball release aligns with pass/shot contact frame.
- Players no longer appear to slide while running.

## Phase 3: Rapier Physics Integration

### Goal

Replace handmade collision heuristics with a real contact/collision layer.

### Physics Bodies

- Ball:
  - dynamic circle body.
  - restitution, linear damping, angular velocity/spin approximation.
- Players:
  - kinematic character-style bodies.
  - capsule or circle collider for feet/body.
  - separate interaction radius for possession.
- Posts:
  - fixed circle colliders.
- Field walls:
  - fixed boundary colliders.
- Goal mouth:
  - sensor region.
- Tackle cone:
  - short-lived sensor.

### Required Work

- Initialize Rapier asynchronously before match kickoff.
- Keep fixed timestep.
- Move player bodies through kinematic velocity.
- Drive render positions from physics bodies.
- Convert collision/contact events into:
  - ball rebound
  - body bump
  - tackle contest
  - keeper save
  - post hit
  - goal
- Add debug physics overlay toggle.

### Acceptance Criteria

- Ball bounce is consistent against posts/walls.
- Player body collisions do not jitter.
- Tackles use contact/sensor events.
- Keeper saves can deflect, catch, or parry.
- Goals are detected by sensor crossing, not only x-position checks.
- Existing smoke tests are replaced or extended to prove physics state.

## Phase 4: Better Ball Control and Skill Model

### Goal

Make dribbling, passing, shooting, and first touch feel more like soccer.

### Required Work

- Add ball-control states:
  - loose
  - controlled
  - close dribble
  - sprint dribble
  - pass travel
  - shot travel
  - keeper held
- Add first-touch quality:
  - based on player rating, dribble, speed, incoming ball speed, body angle.
- Add pass assist:
  - target lock while passing.
  - through-ball lead.
  - teammate receive window.
- Add shot model:
  - aim direction.
  - charge.
  - body balance.
  - footedness later.
  - accuracy cone.
- Add shielding:
  - owner body angle and defender approach angle matter.
- Add ball spin/trail:
  - visual spin plus small curve only for higher-rated shots.

### Acceptance Criteria

- Running with the ball feels stable at normal pace.
- Sprint dribble feels faster but riskier.
- Passes are receivable and do not behave like weak shots.
- Shooting feels distinct from passing.
- Bad first touches can happen but do not feel random.

## Phase 5: Tactical AI Upgrade

### Goal

Make 11v11 movement resemble soccer shape instead of swarm behavior.

### Use Yuka For

- Steering behaviors.
- Pursuit/arrive/separation.
- Role-based state machines.
- Optional graph/nav concepts for pitch zones.

### Required AI Concepts

- Team phase:
  - in possession
  - out of possession
  - transition attack
  - transition defense
  - set piece/reset
- Player states:
  - hold shape
  - support
  - receive
  - overlap
  - press
  - mark
  - cover lane
  - recover
  - carry
  - shoot
- Tactical zones:
  - defensive third
  - middle third
  - attacking third
  - wide lanes
  - half spaces
  - penalty box
- Passing model:
  - open teammate score.
  - lane blocked score.
  - distance/angle score.
  - teammate role score.
- Defensive model:
  - nearest press.
  - second defender cover.
  - far-side compactness.
  - keeper positioning.

### Acceptance Criteria

- Teammates create at least one visible passing option.
- Wingers stay wider than central midfielders.
- Defenders do not all chase the ball.
- Opponents press the controlled player and block easy lanes.
- AI can complete a match without piling into midfield.

## Phase 6: Match Presentation

### Goal

Make the game feel like a sports match, not a debug canvas.

### Required Work

- Add pre-kickoff lineup flash.
- Add score/time bar.
- Add player name and role lower-third.
- Add radar.
- Add shot/pass/tackle feedback.
- Add goal replay-style slow pause or camera punch-in.
- Add result screen with match stats:
  - shots
  - passes completed
  - tackles won
  - possession time
  - saves
- Add crowd/stadium ambience using generated or open audio only.

### Acceptance Criteria

- Match kickoff feels intentional.
- Goals have obvious feedback.
- The player always knows who they control.
- HUD does not hide the ball.
- Mobile remains playable.

## Phase 7: Asset Pipeline

### Goal

Create reusable generic soccer assets that can improve over time.

### Required Assets

```txt
assets/
  sprites/
    player-base.png
    player-base.json
    keeper-base.png
    keeper-base.json
    ball.png
  pitch/
    grass-texture.png
    line-overlay.png
    goal.png
  ui/
    radar-icons.png
    action-icons.png
  audio/
    kick.wav
    pass.wav
    tackle.wav
    save.wav
    post.wav
    goal.wav
    crowd-loop.ogg
```

### Asset Rules

- Generic kits only.
- No official logos or player photos.
- Player names can stay in UI/card text because the project already uses a fantasy card framing, but visuals must not copy official photos or kits.
- Every asset needs documented source/license in `assets/ASSET_CREDITS.md`.
- AI-generated bitmap assets are allowed if saved locally and credited as generated for this project.
- Asset generation prompts and output dates should be recorded in `assets/ASSET_CREDITS.md` so future agents know what can be regenerated.

### Acceptance Criteria

- Game can load all assets locally.
- Missing asset fallback exists.
- Credits file exists.
- No official or copyrighted sports branding is introduced.

## Phase 8: Testing and Verification

### Required Checks

- Static:

```sh
npm run check
```

- Smoke:

```sh
npm run test:smoke
```

- Browser:
  - desktop viewport.
  - mobile viewport.
  - no console errors.
  - no mobile horizontal overflow.

### Required Smoke Coverage

- Engine initializes with Pixi/Rapier/Yuka.
- 11v11 match starts.
- Controlled player moves and sprints.
- Controlled player claims possession.
- Ball remains controlled during normal dribble.
- Pass travels to target and receiver can claim.
- Shot releases with higher speed.
- Tackle can win or loosen ball.
- Keeper save works.
- Goal sensor scores.
- Reset clears stale physics and possession state.
- Pack/collection loop still works.

### Visual QA Checklist

- Players are visibly animated.
- Controlled player is obvious.
- Ball is readable.
- Camera follows action without disorientation.
- Radar is useful.
- HUD does not cover the main action.
- Mobile controls/readability are acceptable.

## Phase 9: Implementation Order for an AI Agent

Build in this order:

1. Add package/build foundation.
2. Create new `src/match/` module structure.
3. Add Pixi renderer with current procedural visuals ported as temporary textures.
4. Add camera/layers/radar in Pixi.
5. Add Rapier physics world for ball, field, posts, and player bodies.
6. Port possession/pass/shot/tackle rules onto physics bodies.
7. Add animation state machine with temporary generated texture frames.
8. Replace temporary player visuals with sprite sheets.
9. Add Yuka-based AI steering and tactical states.
10. Add presentation overlays, match stats, and result stats.
11. Add asset credits and local asset manifest.
12. Expand smoke tests.
13. Browser-test desktop/mobile.
14. Tune controls and dribbling after visual QA.

## Feasibility Notes

This is feasible, but it is not a one-file patch. The current game has reached the ceiling of what raw Canvas procedural drawing can deliver. The realistic next stage is a match-engine migration while preserving the card game shell.

Recommended first implementation slice:

- Vite + PixiJS only.
- Port current match to Pixi layers.
- Keep current custom physics temporarily.
- Add sprite-ready player object structure.
- Keep existing pack/card flow.
- Verify it still runs at `127.0.0.1:8020`.
- This slice is not the final realism upgrade. It is complete only when it improves rendering architecture without regressing gameplay.

Recommended second slice:

- Add Rapier physics for ball/posts/walls/player bodies.
- Keep Pixi renderer.
- Rebuild possession/pass/shot around physics events.
- Flip the realism-engine feature flag only after this slice passes smoke and browser tests.

Recommended third slice:

- Add true sprite sheets and animation state machine.
- Add richer AI states.

## Risks

- Sprite assets are the biggest visual dependency.
- Rapier migration can break possession unless done behind a feature flag.
- A full Phaser rewrite would move faster at first but risks losing the existing card loop and custom match logic.
- FIFA-like expectations require animation and presentation, not just physics.
- Performance must be checked on mobile after Pixi filters/effects are added.

## Definition of Done

This upgrade is done only when:

- The active match engine uses PixiJS rendering.
- Ball/player/post/field collisions use Rapier.
- Players use sprite animations for core actions.
- AI has role/team/tactical states beyond nearest-ball chasing.
- Match presentation includes radar, player lower-third, event feedback, stats, and polished score/time HUD.
- Existing pack/collection/save loop remains intact.
- Desktop and mobile browser checks pass.
- No console errors.
- Smoke tests cover engine init, possession, pass, shot, tackle, keeper, goal, reset, and pack flow.
