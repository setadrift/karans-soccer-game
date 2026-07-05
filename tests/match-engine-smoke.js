const assert = require("assert");

async function run() {
  const [
    { MatchState },
    { PhysicsWorld },
    { TeamAI },
    { PossessionRules },
    { MatchRules },
    { FoulsAndTackles },
    { KeeperRules },
    { findBestPasserTarget },
    { AnimationStateMachine },
    pixi,
    yuka,
  ] = await Promise.all([
    import("../src/match/MatchState.mjs"),
    import("../src/match/physics/PhysicsWorld.mjs"),
    import("../src/match/ai/TeamAI.mjs"),
    import("../src/match/rules/PossessionRules.mjs"),
    import("../src/match/rules/MatchRules.mjs"),
    import("../src/match/rules/FoulsAndTackles.mjs"),
    import("../src/match/rules/KeeperRules.mjs"),
    import("../src/match/ai/PassingModel.mjs"),
    import("../src/match/animation/AnimationStateMachine.mjs"),
    import("pixi.js"),
    import("yuka"),
  ]);

  assert.equal(typeof pixi.Application, "function", "Pixi Application should be importable");
  assert.equal(typeof yuka.EntityManager, "function", "Yuka EntityManager should be importable");

  const selectedPlayer = {
    id: "kylian-mbappe",
    name: "Kylian Mbappe",
    position: "LW",
    grade: 120,
    speed: 10,
    shot: 9,
    dribble: 9,
    defense: 4,
  };
  const unlockedPlayers = [
    selectedPlayer,
    { id: "buffon", name: "Buffon", position: "G", grade: 117, speed: 4, shot: 2, dribble: 4, defense: 10 },
    { id: "messi", name: "Messi", position: "RW", grade: 119, speed: 8, shot: 9, dribble: 10, defense: 4 },
  ];

  const state = new MatchState(selectedPlayer, { unlockedPlayers, wins: 4 });
  assert.equal(state.homeTeam.length, 11, "home team should have 11 units");
  assert.equal(state.awayTeam.length, 11, "away team should have 11 units");
  assert.equal(state.controlledPlayer.playerId, selectedPlayer.id, "selected player should be controlled");
  assert.equal(state.controlledPlayer.role, "LW", "selected winger should be placed in a winger slot");
  assert.equal(state.controlledPlayer.isKeeper, false, "selected outfield player should not become keeper");
  assert.ok(state.players.some((unit) => unit.isKeeper), "state should include keepers");

  const ai = new TeamAI(state);
  ai.update(1 / 60);
  assert.equal(typeof state.teamStates.home, "string", "team AI should set home tactical state");
  assert.equal(typeof state.teamStates.away, "string", "team AI should set away tactical state");
  assert.ok(state.players.every((unit) => typeof unit.aiState === "string"), "every player should expose an AI role state");
  const aiVelocity = ai.velocityFor(state.awayTeam.find((unit) => !unit.isKeeper));
  assert.equal(typeof aiVelocity.vx, "number", "AI should produce velocity x");
  assert.equal(typeof aiVelocity.vy, "number", "AI should produce velocity y");

  const possession = new PossessionRules(state);
  possession.setOwner(state.controlledPlayer);
  possession.update(1 / 60);
  assert.equal(state.possession.ownerId, state.controlledPlayer.id, "possession should attach to controlled player");
  assert.equal(state.ball.x, state.controlledPlayer.x + state.controlledPlayer.facing * 30, "owned ball should sit in dribble lane");

  const passTarget = findBestPasserTarget(state, state.controlledPlayer);
  assert.ok(passTarget, "passing model should find a teammate");
  assert.equal(passTarget.side, state.controlledPlayer.side, "passing target should be a teammate");
  state.possession.intendedReceiverId = passTarget.id;
  state.ball.x = passTarget.x + 30;
  state.ball.y = passTarget.y;
  possession.clear(0);
  possession.update();
  assert.equal(state.possession.ownerId, passTarget.id, "intended receiver should collect passes at receiver radius");
  possession.clear(0.2);
  state.ball.x = state.controlledPlayer.x;
  state.ball.y = state.controlledPlayer.y;
  possession.update();
  assert.equal(state.possession.ownerId, null, "loose timer should prevent instant recapture");
  possession.setOwner(state.controlledPlayer);

  const defender = state.awayTeam.find((unit) => !unit.isKeeper);
  defender.x = state.controlledPlayer.x + 8;
  defender.y = state.controlledPlayer.y;
  const tackle = new FoulsAndTackles(state, possession);
  const tackleResult = tackle.tryTackle(defender);
  assert.ok(["steal", "loose", "miss"].includes(tackleResult), "tackle should produce known outcome");
  assert.ok(defender.tackleCooldown > 0, "tackle should set cooldown");
  assert.equal(defender.action, "tackle", "tackle should expose animation action");
  assert.ok(defender.actionTimer > 0, "tackle should hold animation action");

  const animationUnit = { action: "shoot", actionTimer: 0.2, tackleCooldown: 0 };
  const animation = new AnimationStateMachine(animationUnit);
  assert.equal(animation.update(false, false, 0), "shoot", "action timer should preserve shot animation state");

  const awayKeeper = state.awayTeam.find((unit) => unit.isKeeper);
  state.ball.x = awayKeeper.x + 2;
  state.ball.y = awayKeeper.y + 2;
  state.possession.side = "home";
  new KeeperRules(state).update();
  assert.equal(awayKeeper.action, "save", "keeper should react to nearby opposition ball");

  let ended = false;
  const rules = new MatchRules(state, {
    duration: 0.01,
    onEnd(result) {
      ended = true;
      assert.equal(typeof result.won, "boolean", "end result should include won boolean");
    },
  });
  rules.update(0.02);
  assert.equal(ended, true, "match rules should finish after duration");

  const scoreState = new MatchState(selectedPlayer, { unlockedPlayers, wins: 0 });
  const scoreRules = new MatchRules(scoreState, { duration: 120, onEnd() {} });
  scoreState.time = 15;
  scoreState.ball.x = 700;
  scoreState.ball.y = 0;
  scoreRules.update(1 / 60);
  assert.equal(scoreState.score.home, 1, "ball crossing away goal should score for home");
  assert.equal(scoreState.time > 0, true, "kickoff reset should not reset match clock");
  assert.equal(scoreState.pauseTimer > 0, true, "kickoff reset should pause play");
  assert.equal(scoreState.goalFlash > 0, true, "goal should trigger goal flash");
  assert.equal(scoreState.ball.x, 0, "kickoff reset should recenter ball");
  assert.equal(scoreState.possession.ownerId, null, "kickoff reset should clear possession");

  let maxGoalEnd = null;
  const maxGoalState = new MatchState(selectedPlayer, { unlockedPlayers, wins: 0 });
  const maxGoalRules = new MatchRules(maxGoalState, {
    duration: 120,
    maxGoals: 3,
    onEnd(result) {
      maxGoalEnd = result;
    },
  });
  maxGoalState.score.home = 2;
  maxGoalState.ball.x = 700;
  maxGoalState.ball.y = 0;
  maxGoalRules.update(1 / 60);
  assert.equal(maxGoalState.finished, true, "match should end at max goals");
  assert.equal(maxGoalEnd.won, true, "home reaching max goals should win");

  const physics = await new PhysicsWorld().init();
  assert.equal(physics.postBodies.length, 4, "Rapier world should include four goal post bodies");
  assert.equal(physics.goalSensors.length, 2, "Rapier world should include two goal sensors");
  const ball = physics.createBall(0, 0);
  ball.body.setLinvel({ x: 5, y: 0 }, true);
  physics.step(1 / 60);
  const ballPixels = physics.getBodyPixels(ball.body);
  assert.ok(ballPixels.x > 0, "Rapier ball should move after step");

  const goalGapPhysics = await new PhysicsWorld().init();
  const goalGapBall = goalGapPhysics.createBall(612, 0);
  goalGapBall.body.setLinvel({ x: 9, y: 0 }, true);
  for (let i = 0; i < 30; i += 1) goalGapPhysics.step(1 / 60);
  const goalGapPixels = goalGapPhysics.getBodyPixels(goalGapBall.body);
  assert.ok(goalGapPixels.x > 620, "Rapier side wall should leave the goal mouth open");

  const sensorPhysics = await new PhysicsWorld().init();
  const sensorBall = sensorPhysics.createBall(633, 0);
  sensorPhysics.step(1 / 60);
  assert.equal(sensorPhysics.goalForCollider(sensorBall.collider), "home", "right goal sensor should score for home");

  const sensorScoreState = new MatchState(selectedPlayer, { unlockedPlayers, wins: 0 });
  const sensorRules = new MatchRules(sensorScoreState, {
    duration: 120,
    detectGoal: () => "home",
    onEnd() {},
  });
  sensorRules.update(1 / 60);
  assert.equal(sensorScoreState.score.home, 1, "match rules should score from goal sensor callback");

  console.log("match-engine smoke passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
