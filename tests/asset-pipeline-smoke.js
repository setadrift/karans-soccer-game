const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const credits = fs.readFileSync(path.join(root, "assets/ASSET_CREDITS.md"), "utf8");
const playerManifest = JSON.parse(fs.readFileSync(path.join(root, "assets/sprites/player-base.json"), "utf8"));
const keeperManifest = JSON.parse(fs.readFileSync(path.join(root, "assets/sprites/keeper-base.json"), "utf8"));

assert.ok(credits.includes("No official kits"), "asset credits should document no official kits");
assert.ok(credits.includes("No official player photos"), "asset credits should document no official photos");

for (const manifest of [playerManifest, keeperManifest]) {
  assert.equal(manifest.frameWidth, 64, "sprite manifest should declare frame width");
  assert.equal(manifest.frameHeight, 80, "sprite manifest should declare frame height");
  for (const state of ["idle", "run", "sprint", "dribble", "pass", "shoot", "tackle"]) {
    assert.ok(manifest.states[state], `sprite manifest should include ${state}`);
    assert.ok(manifest.states[state].frames > 0, `${state} should declare frames`);
  }
  assert.ok(manifest.directionVariants.includes("left-flip"), "sprite manifest should include left flip variant");
}

assert.ok(keeperManifest.states.save, "keeper manifest should include save animation");

console.log("asset-pipeline smoke passed");
