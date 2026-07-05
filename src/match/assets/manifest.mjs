export const ASSET_MANIFEST = Object.freeze({
  players: {
    mode: "local-generated-sprite-sheet-v1",
    files: [
      "assets/sprites/player-base.png",
      "assets/sprites/player-base.json",
      "assets/sprites/keeper-base.png",
      "assets/sprites/keeper-base.json",
    ],
    note: "Generic frame textures are generated locally at runtime from documented sprite-sheet instructions.",
  },
  ball: {
    mode: "local-generated-png-v1",
    files: ["assets/sprites/ball.png"],
  },
  pitch: {
    mode: "local-generated-png-v1-with-pixi-fallback",
    files: ["assets/pitch/grass-texture.png", "assets/pitch/line-overlay.png", "assets/pitch/goal.png"],
  },
  ui: {
    mode: "local-generated-png-v1-with-pixi-fallback",
    files: ["assets/ui/radar-icons.png", "assets/ui/action-icons.png"],
  },
  audio: {
    mode: "local-generated-audio-v1-with-web-audio-fallback",
    files: [
      "assets/audio/kick.wav",
      "assets/audio/pass.wav",
      "assets/audio/tackle.wav",
      "assets/audio/save.wav",
      "assets/audio/post.wav",
      "assets/audio/goal.wav",
      "assets/audio/crowd-loop.ogg",
    ],
  },
});

export const REQUIRED_ASSET_FILES = Object.freeze([
  ...ASSET_MANIFEST.players.files,
  ...ASSET_MANIFEST.ball.files,
  ...ASSET_MANIFEST.pitch.files,
  ...ASSET_MANIFEST.ui.files,
  ...ASSET_MANIFEST.audio.files,
]);
