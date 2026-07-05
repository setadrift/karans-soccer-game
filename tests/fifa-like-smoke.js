const fs = require("fs");
const path = require("path");
const vm = require("vm");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createContext() {
  const noop = function () {};
  return {
    imageSmoothingEnabled: true,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineCap: "butt",
    lineJoin: "miter",
    font: "",
    textAlign: "start",
    save: noop,
    restore: noop,
    setTransform: noop,
    translate: noop,
    rotate: noop,
    scale: noop,
    beginPath: noop,
    closePath: noop,
    arc: noop,
    ellipse: noop,
    rect: noop,
    clip: noop,
    fill: noop,
    stroke: noop,
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    moveTo: noop,
    lineTo: noop,
    quadraticCurveTo: noop,
    bezierCurveTo: noop,
    fillText: noop,
    strokeText: noop,
  };
}

function loadGame() {
  const root = path.resolve(__dirname, "..");
  const context = {
    console,
    Math,
    JSON,
    Set,
    Array,
    Number,
    String,
    Boolean,
    parseInt,
    setTimeout,
    performance: { now: () => 1000 },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
    window: {
      devicePixelRatio: 1,
      matchMedia: () => ({ matches: false }),
      addEventListener: () => {},
      removeEventListener: () => {},
    },
  };
  context.window.window = context.window;
  context.window.console = console;
  context.window.performance = context.performance;
  context.window.requestAnimationFrame = context.requestAnimationFrame;
  context.window.cancelAnimationFrame = context.cancelAnimationFrame;
  context.global = context.window;
  vm.createContext(context);

  for (const file of ["src/data.js", "src/game.js"]) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    vm.runInContext(source, context, { filename: file });
  }

  return context.window;
}

function makeCanvas() {
  return {
    width: 900,
    height: 520,
    getContext: () => createContext(),
  };
}

function runFrames(game, frames, input = null) {
  for (let i = 0; i < frames; i += 1) {
    if (input) game.keys = { ...input };
    game.currentTimestamp += 1000 / 60;
    game.update(1 / 60);
  }
}

function instantiate(window, player) {
  const game = new window.SoccerGame(makeCanvas(), player, {
    unlockedPlayers: window.GAME_DATA.allPlayers,
    wins: 3,
  });
  assert(game.homeTeam.length === 11, "home team should have 11 players");
  assert(game.awayTeam.length === 11, "away team should have 11 players");
  assert(game.players.every((unit) => "hasPossession" in unit), "every unit should expose possession state");
  assert(game.players.every((unit) => "tackleCooldown" in unit), "every unit should expose tackle state");
  return game;
}

const windowRef = loadGame();
const starter = windowRef.GAME_DATA.starterPlayers[0];
const eliteWinger = windowRef.GAME_DATA.getPlayerById("kylian-mbappe");
const keeper = windowRef.GAME_DATA.getPlayerById("gianluigi-buffon");

const starterGame = instantiate(windowRef, starter);
const eliteGame = instantiate(windowRef, eliteWinger);
const keeperGame = instantiate(windowRef, keeper);

assert(keeperGame.player.gameplay.isKeeper, "keeper captain should retain keeper gameplay");

runFrames(eliteGame, 180, { d: true, Shift: true });
const playerSpeed = eliteGame.getSpeed(eliteGame.player);
assert(playerSpeed <= eliteGame.player.gameplay.maxSpeed * 1.32 + 1, "controlled sprint should respect speed cap");

eliteGame.ball.x = eliteGame.player.x + 4;
eliteGame.ball.y = eliteGame.player.y;
eliteGame.ball.vx = 0;
eliteGame.ball.vy = 0;
eliteGame.ball.looseTimer = 0;
eliteGame.updatePossession(1 / 60);
assert(eliteGame.player.hasPossession, "controlled player should claim possession");
assert(eliteGame.ball.ownerId === eliteGame.player.id, "ball owner id should be controlled player");

runFrames(eliteGame, 120, { d: true });
assert(eliteGame.distance(eliteGame.player, eliteGame.ball) < 58, "owned ball should stay within dribble distance");

eliteGame.firePlayerShot(360);
assert(!eliteGame.getBallOwner(), "shot should clear possession");
assert(eliteGame.ball.looseTimer > 0, "shot should set loose timer");

eliteGame.setBallOwner(eliteGame.player);
const passTarget = eliteGame.homeTeam.find((unit) => unit !== eliteGame.player && unit.role !== "G");
const passWorked = eliteGame.passBall(eliteGame.player, passTarget);
assert(passWorked, "pass should execute");
assert(!eliteGame.getBallOwner(), "pass should clear possession");
assert(eliteGame.ball.intendedReceiverId === passTarget.id, "pass should assign intended receiver");
assert(eliteGame.getSpeed(eliteGame.ball) > 300, "pass should put ball in flight");

const defender = eliteGame.awayTeam.find((unit) => unit.role !== "G");
eliteGame.setBallOwner(eliteGame.player);
defender.x = eliteGame.player.x + 10;
defender.y = eliteGame.player.y;
defender.vx = -220;
defender.vy = 0;
eliteGame.player.possessionCooldown = 0;
const tackleResult = eliteGame.resolvePossessionContest(defender, eliteGame.player, true);
assert(["steal", "loose", "miss"].includes(tackleResult), "tackle should resolve to a known outcome");
assert(tackleResult === "miss" || !eliteGame.player.hasPossession, "successful tackle should transfer or loosen possession");

eliteGame.resetPositions();
assert(!eliteGame.players.some((unit) => unit.hasPossession), "reset should clear stale possession flags");
assert(eliteGame.ball.ownerId === null, "reset should clear owner id");
assert(eliteGame.ball.ownerSide === null, "reset should clear owner side");
assert(eliteGame.ball.lastOwnerId === null, "reset should clear last owner");
assert(eliteGame.ball.looseTimer === 0, "reset should clear loose timer");
assert(eliteGame.ball.intendedReceiverId === null, "reset should clear intended receiver");

eliteGame.ball.x = eliteGame.width + eliteGame.ball.radius + 2;
eliteGame.ball.y = eliteGame.height / 2;
eliteGame.checkGoals();
assert(eliteGame.playerScore === 1, "goal check should score carried/loose balls crossing the goal");

starterGame.draw();
eliteGame.draw();
keeperGame.draw();

starterGame.destroy();
eliteGame.destroy();
keeperGame.destroy();

console.log("fifa-like smoke passed");
