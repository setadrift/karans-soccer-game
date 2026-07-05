import RAPIER from "@dimforge/rapier2d-compat";
import { MATCH_CONFIG } from "../MatchConfig.mjs";

let rapierReady = null;

export async function initRapier() {
  if (!rapierReady) {
    const originalWarn = console.warn;
    console.warn = (...args) => {
      const message = String(args[0] || "");
      if (message.includes("deprecated parameters") && message.includes("initialization function")) return;
      originalWarn(...args);
    };
    rapierReady = RAPIER.init({}).finally(() => {
      console.warn = originalWarn;
    });
  }
  await rapierReady;
  return RAPIER;
}

export class PhysicsWorld {
  constructor(config = MATCH_CONFIG) {
    this.config = config;
    this.RAPIER = RAPIER;
    this.world = null;
    this.eventQueue = null;
    this.postBodies = [];
    this.goalSensors = [];
    this.initialized = false;
  }

  async init() {
    await initRapier();
    this.world = new RAPIER.World({ x: 0, y: 0 });
    this.eventQueue = new RAPIER.EventQueue(true);
    this.world.timestep = this.config.physics.fixedDt;
    this.addPitchBounds();
    this.initialized = true;
    return this;
  }

  addPitchBounds() {
    const { pitch, physics } = this.config;
    const ppm = physics.pixelsPerMeter;
    const halfW = pitch.width / ppm / 2;
    const halfH = pitch.height / ppm / 2;
    const goalHalf = pitch.goalWidth / ppm / 2;
    const wall = 0.2;
    const addWall = (x, y, hx, hy) => {
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y));
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(hx, hy).setRestitution(physics.wallRestitution),
        body,
      );
      return body;
    };

    addWall(0, -halfH - wall, halfW + wall, wall);
    addWall(0, halfH + wall, halfW + wall, wall);
    const sideSegmentHalf = (halfH - goalHalf) / 2;
    const upperSegmentY = -(halfH + goalHalf) / 2;
    const lowerSegmentY = (halfH + goalHalf) / 2;
    addWall(-halfW - wall, upperSegmentY, wall, sideSegmentHalf);
    addWall(-halfW - wall, lowerSegmentY, wall, sideSegmentHalf);
    addWall(halfW + wall, upperSegmentY, wall, sideSegmentHalf);
    addWall(halfW + wall, lowerSegmentY, wall, sideSegmentHalf);
    this.addGoalPosts(halfW, goalHalf);
    this.addGoalSensors(halfW, goalHalf);
  }

  addGoalPosts(halfW, goalHalf) {
    const postRadius = 0.09;
    const addPost = (x, y) => {
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y));
      this.world.createCollider(
        RAPIER.ColliderDesc.ball(postRadius).setRestitution(this.config.physics.wallRestitution + 0.18),
        body,
      );
      this.postBodies.push(body);
    };
    addPost(-halfW, -goalHalf);
    addPost(-halfW, goalHalf);
    addPost(halfW, -goalHalf);
    addPost(halfW, goalHalf);
  }

  addGoalSensors(halfW, goalHalf) {
    const sensorDepth = 0.28;
    const addSensor = (side, x) => {
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, 0));
      const collider = this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(sensorDepth, goalHalf).setSensor(true),
        body,
      );
      this.goalSensors.push({ side, body, collider });
    };
    addSensor("away", -halfW - sensorDepth * 0.45);
    addSensor("home", halfW + sensorDepth * 0.45);
  }

  createBall(x = 0, y = 0) {
    const ppm = this.config.physics.pixelsPerMeter;
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(x / ppm, y / ppm)
        .setLinearDamping(this.config.physics.ballLinearDamping)
        .setAngularDamping(1.8),
    );
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.ball(this.config.physics.ballRadius)
        .setRestitution(this.config.physics.ballRestitution)
        .setFriction(0.9),
      body,
    );
    return { body, collider };
  }

  createPlayer(x, y) {
    const ppm = this.config.physics.pixelsPerMeter;
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicVelocityBased()
        .setTranslation(x / ppm, y / ppm)
        .setLinearDamping(this.config.physics.playerLinearDamping),
    );
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.ball(this.config.physics.playerRadius).setFriction(1.2).setRestitution(0.05),
      body,
    );
    return { body, collider };
  }

  setKinematicVelocity(body, vx, vy) {
    const ppm = this.config.physics.pixelsPerMeter;
    body.setLinvel({ x: vx / ppm, y: vy / ppm }, true);
  }

  setBodyPosition(body, x, y) {
    const ppm = this.config.physics.pixelsPerMeter;
    body.setTranslation({ x: x / ppm, y: y / ppm }, true);
  }

  getBodyPixels(body) {
    const ppm = this.config.physics.pixelsPerMeter;
    const translation = body.translation();
    const velocity = body.linvel();
    return {
      x: translation.x * ppm,
      y: translation.y * ppm,
      vx: velocity.x * ppm,
      vy: velocity.y * ppm,
    };
  }

  goalForCollider(collider) {
    if (!collider || !this.world) return null;
    for (const sensor of this.goalSensors) {
      if (this.world.intersectionPair(sensor.collider, collider)) {
        return sensor.side;
      }
    }
    return null;
  }

  step(dt = this.config.physics.fixedDt) {
    if (!this.world) return;
    this.world.timestep = dt;
    this.world.step(this.eventQueue);
  }
}
