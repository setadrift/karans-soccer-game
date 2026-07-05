const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const storage = new Map();
const rootElement = { innerHTML: "", onclick: null };

const context = {
  console,
  Math,
  JSON,
  Number,
  String,
  Boolean,
  Array,
  Set,
  Date,
  window: {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
    confirm: () => true,
  },
  document: {
    getElementById(id) {
      return id === "app" ? rootElement : null;
    },
  },
  localStorage: {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
    removeItem(key) {
      storage.delete(key);
    },
  },
};

context.window.window = context.window;
context.window.document = context.document;
context.window.localStorage = context.localStorage;
context.window.GameUI = { render() {} };
context.global = context.window;
vm.createContext(context);

for (const file of ["src/data.js", "src/main.js"]) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  vm.runInContext(source, context, { filename: file });
}

const app = context.window.BenchToBallonDor;
assert.ok(app, "app should initialize");
assert.equal(app.state.wins, 0, "new save should start with zero wins");
assert.equal(app.getPackCount(), 0, "new save should start with zero packs");

app.finishMatch({ won: true, playerScore: 3, aiScore: 1 });
assert.equal(app.state.wins, 1, "winning a match should increment wins");
assert.equal(app.state.coins, 125, "winning a match should award coins for packs");
assert.equal(app.state.screen, "lineup", "winning should return to lineup");

app.buyPack();
assert.equal(app.getPackCount(), 1, "buying a pack should queue one pack");
assert.equal(app.state.screen, "pack", "buying should route to pack screen");

const unlockedBefore = app.state.unlockedPlayerIds.length;
app.openPack();
assert.equal(app.getPackCount(), 0, "opening a pack should consume one pack");
assert.ok(app.state.unlockedPlayerIds.length >= unlockedBefore, "opening a pack should not reduce unlocked players");
assert.ok(["new", "complete"].includes(app.state.lastPackResult.type), "pack result should be recorded");

app.finishMatch({ won: false, playerScore: 0, aiScore: 3 });
assert.equal(app.state.losses, 1, "losing should increment losses");
assert.equal(app.state.coins, 35, "losing should award consolation coins after pack purchase");
assert.equal(app.state.screen, "lineup", "losing should return to lineup");

console.log("pack-flow smoke passed");
