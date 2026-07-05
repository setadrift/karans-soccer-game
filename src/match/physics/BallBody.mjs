export class BallBody {
  constructor(physics, stateBall) {
    this.physics = physics;
    this.stateBall = stateBall;
    this.body = null;
    this.collider = null;
  }

  create() {
    const created = this.physics.createBall(this.stateBall.x, this.stateBall.y);
    this.body = created.body;
    this.collider = created.collider;
    this.stateBall.body = this.body;
    return this;
  }

  syncFromPhysics() {
    const next = this.physics.getBodyPixels(this.body);
    Object.assign(this.stateBall, next);
  }

  kick(vx, vy) {
    const ppm = this.physics.config.physics.pixelsPerMeter;
    this.body.setLinvel({ x: vx / ppm, y: vy / ppm }, true);
  }

  setPosition(x, y) {
    this.physics.setBodyPosition(this.body, x, y);
    this.body.setLinvel({ x: 0, y: 0 }, true);
    this.stateBall.x = x;
    this.stateBall.y = y;
    this.stateBall.vx = 0;
    this.stateBall.vy = 0;
  }
}
