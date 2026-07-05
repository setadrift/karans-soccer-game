import { MATCH_CONFIG } from "./MatchConfig.mjs";
import { MatchState } from "./MatchState.mjs";
import { InputController } from "./InputController.mjs";
import { CameraController } from "./CameraController.mjs";
import { PixiRenderer } from "./render/PixiRenderer.mjs";
import { PhysicsWorld } from "./physics/PhysicsWorld.mjs";
import { BallBody } from "./physics/BallBody.mjs";
import { PlayerBody } from "./physics/PlayerBody.mjs";
import { TeamAI } from "./ai/TeamAI.mjs";
import { findBestPasserTarget } from "./ai/PassingModel.mjs";
import { PossessionRules } from "./rules/PossessionRules.mjs";
import { MatchRules } from "./rules/MatchRules.mjs";
import { FoulsAndTackles } from "./rules/FoulsAndTackles.mjs";
import { KeeperRules } from "./rules/KeeperRules.mjs";
import { AnimationStateMachine } from "./animation/AnimationStateMachine.mjs";

export class MatchGame {
  constructor(canvas, selectedPlayer, options = {}) {
    this.canvas = canvas;
    this.options = options;
    this.state = new MatchState(selectedPlayer, options);
    this.input = new InputController(window);
    this.camera = new CameraController();
    this.physics = new PhysicsWorld();
    this.renderer = new PixiRenderer(canvas, this.state);
    this.teamAI = new TeamAI(this.state);
    this.possessionRules = new PossessionRules(this.state);
    this.matchRules = new MatchRules(this.state, {
      onEnd: options.onEnd,
      detectGoal: () => this.physics.goalForCollider(this.ballBody?.collider),
    });
    this.tackles = new FoulsAndTackles(this.state, this.possessionRules);
    this.keepers = new KeeperRules(this.state);
    this.animations = new Map(this.state.players.map((unit) => [unit.id, new AnimationStateMachine(unit)]));
    this.playerBodies = new Map();
    this.ballBody = null;
    this.accumulator = 0;
    this.destroyed = false;
    this.ready = this.init();
  }

  async init() {
    await this.physics.init();
    this.ballBody = new BallBody(this.physics, this.state.ball).create();
    for (const unit of this.state.players) {
      this.playerBodies.set(unit.id, new PlayerBody(this.physics, unit).create());
    }
    await this.renderer.init();
    this.renderer.app.ticker.add((ticker) => this.tick(ticker.deltaMS / 1000));
    this.state.addEvent("Kickoff", "neutral");
    return this;
  }

  tick(frameDt) {
    if (this.destroyed || this.state.finished) return;
    this.accumulator += Math.min(frameDt, 0.08);
    while (this.accumulator >= MATCH_CONFIG.physics.fixedDt) {
      this.update(MATCH_CONFIG.physics.fixedDt);
      this.accumulator -= MATCH_CONFIG.physics.fixedDt;
    }
    this.camera.update(this.state.controlledPlayer, this.state.ball, frameDt);
    this.renderer.update(this.camera);
  }

  update(dt) {
    const input = this.input.snapshot();
    const paused = this.state.pauseTimer > 0;
    if (!paused) {
      this.updateControlledPlayer(input, dt);
      this.updateAI(dt);
      this.updateAIActions(dt);
      this.updatePhysics(dt);
      this.possessionRules.update(dt);
      this.keepers.update(dt);
    }
    const previousScore = `${this.state.score.home}:${this.state.score.away}`;
    this.matchRules.update(dt);
    if (`${this.state.score.home}:${this.state.score.away}` !== previousScore) {
      this.syncPhysicsToState();
    }
    for (const unit of this.state.players) {
      if (unit.tackleCooldown > 0) unit.tackleCooldown = Math.max(0, unit.tackleCooldown - dt);
      if (unit.actionTimer > 0) unit.actionTimer = Math.max(0, unit.actionTimer - dt);
      this.animations.get(unit.id)?.update(Boolean(Math.hypot(unit.vx, unit.vy)), unit.hasPossession, Math.hypot(unit.vx, unit.vy));
    }
    this.input.endFrame();
  }

  updateControlledPlayer(input) {
    const unit = this.state.controlledPlayer;
    const targetSpeed = input.sprint ? MATCH_CONFIG.controls.sprintSpeed : MATCH_CONFIG.controls.walkSpeed + unit.speed * 12;
    unit.vx = input.axis.x * targetSpeed;
    unit.vy = input.axis.y * targetSpeed;
    if (input.axis.moving) unit.facing = input.axis.x < -0.1 ? -1 : input.axis.x > 0.1 ? 1 : unit.facing;

    if (input.pass && unit.hasPossession) {
      const target = findBestPasserTarget(this.state, unit);
      if (target) this.kickBallToward(unit, target, MATCH_CONFIG.controls.passPower, "pass", target);
    }
    if (input.shoot && unit.hasPossession) {
      this.kickBallToward(unit, { x: MATCH_CONFIG.pitch.width / 2 + 40, y: 0 }, MATCH_CONFIG.controls.shotPower, "shot");
    }
    if (input.tackle) this.tackles.tryTackle(unit);
  }

  updateAI(dt) {
    this.teamAI.update(dt);
    for (const unit of this.state.players) {
      if (unit === this.state.controlledPlayer) continue;
      const velocity = this.teamAI.velocityFor(unit);
      unit.vx = velocity.vx;
      unit.vy = velocity.vy;
    }
  }

  updateAIActions(dt) {
    const owner = this.state.players.find((unit) => unit.id === this.state.possession.ownerId);
    if (!owner || owner === this.state.controlledPlayer || owner.side !== "away" || owner.isKeeper) return;

    owner.decisionTimer = Math.max(0, owner.decisionTimer - dt);
    if (owner.decisionTimer > 0) return;
    owner.decisionTimer = MATCH_CONFIG.controls.aiDecisionCooldown + Math.random() * 0.45;

    const goalX = -MATCH_CONFIG.pitch.width / 2 - 40;
    const distanceToGoal = Math.hypot(owner.x - goalX, owner.y);
    const clearShot = distanceToGoal < 240 && Math.abs(owner.y) < MATCH_CONFIG.pitch.goalWidth * 0.8;
    if (clearShot || (owner.role === "ST" && distanceToGoal < 310 && Math.random() > 0.35)) {
      this.kickBallToward(owner, { x: goalX, y: 0 }, MATCH_CONFIG.controls.shotPower * 0.86, "shot");
      return;
    }

    const target = findBestPasserTarget(this.state, owner);
    if (target && Math.random() > 0.45) {
      this.kickBallToward(owner, target, MATCH_CONFIG.controls.passPower * 0.82, "pass", target);
    }
  }

  updatePhysics(dt) {
    for (const unit of this.state.players) {
      const body = this.playerBodies.get(unit.id);
      body.move(unit.vx, unit.vy);
    }

    if (this.state.possession.ownerId && this.ballBody?.body) {
      const owner = this.state.players.find((unit) => unit.id === this.state.possession.ownerId);
      if (owner) this.physics.setBodyPosition(this.ballBody.body, owner.x + owner.facing * MATCH_CONFIG.controls.dribbleDistance, owner.y);
    }

    this.physics.step(dt);

    for (const body of this.playerBodies.values()) body.syncFromPhysics();
    if (!this.state.possession.ownerId) this.ballBody.syncFromPhysics();
  }

  kickBallToward(kicker, target, power, eventType, intendedReceiver = null) {
    const dx = target.x - kicker.x;
    const dy = target.y - kicker.y;
    const length = Math.hypot(dx, dy) || 1;
    const vx = (dx / length) * power;
    const vy = (dy / length) * power;
    kicker.action = eventType === "shot" ? "shoot" : "pass";
    kicker.actionTimer = eventType === "shot" ? 0.34 : 0.24;
    this.possessionRules.clear(eventType === "shot" ? 0.25 : 0.12);
    this.state.possession.intendedReceiverId = intendedReceiver?.id || null;
    if (eventType === "shot") this.state.stats[kicker.side].shots += 1;
    if (eventType === "pass") this.state.stats[kicker.side].passes += 1;
    this.physics.setBodyPosition(this.ballBody.body, kicker.x + (dx / length) * 22, kicker.y + (dy / length) * 22);
    this.ballBody.kick(vx, vy);
    this.state.ball.vx = vx;
    this.state.ball.vy = vy;
    this.state.addEvent(eventType === "shot" ? `${kicker.name} shoots` : `${kicker.name} passes`, eventType);
  }

  syncPhysicsToState() {
    for (const unit of this.state.players) {
      this.playerBodies.get(unit.id)?.setPosition(unit.x, unit.y);
    }
    this.ballBody?.setPosition(this.state.ball.x, this.state.ball.y);
  }

  destroy() {
    this.destroyed = true;
    this.input.destroy();
    this.renderer.destroy();
  }
}
