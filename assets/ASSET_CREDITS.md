# Asset Credits

## Generic Soccer Sprite Sheets

- Files: `assets/sprites/player-base.json`, `assets/sprites/keeper-base.json`
- Source: Generated locally for this project from deterministic vector drawing instructions in `src/match/assets/LocalSpriteSheetFactory.mjs`.
- Date recorded: 2026-07-02
- License: Project-owned generated generic art.
- Notes: These assets intentionally use no official kits, no federation marks, no sponsor marks, no official player photos, no official likenesses, and no copyrighted sports branding. Player names may appear in UI text, but the visuals are generic.
- Constraint checklist: No official kits. No official player photos. No official logos. No sponsor marks.

## Runtime Generated Textures

- The active Pixi match renderer generates transparent frame textures at startup from the local sprite-sheet definitions.
- Missing/failing sprite generation falls back to the previous procedural Pixi player drawing path.

## Generated Pitch, UI, Ball, and Audio Assets

- Files: `assets/sprites/ball.png`, `assets/pitch/grass-texture.png`, `assets/pitch/line-overlay.png`, `assets/pitch/goal.png`, `assets/ui/radar-icons.png`, `assets/ui/action-icons.png`, `assets/audio/*.wav`, `assets/audio/crowd-loop.ogg`
- Source: Generated locally by `scripts/generate-local-assets.mjs`.
- Date recorded: 2026-07-02
- License: Project-owned generated generic art and synthetic audio.
- Prompt/instructions: Deterministic generic soccer pitch, ball, radar/action icon, and synthetic match-effect audio assets. No official kits. No official player photos. No official logos. No sponsor marks.
- Fallbacks: The active match renderer can continue with Pixi-drawn pitch/UI/ball and WebAudio-style synthetic effects if these files are missing or fail to decode.
