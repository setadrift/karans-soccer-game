export class PlayerBody {
  constructor(physics, unit) {
    this.physics = physics;
    this.unit = unit;
    this.body = null;
    this.collider = null;
  }

  create() {
    const created = this.physics.createPlayer(this.unit.x, this.unit.y);
    this.body = created.body;
    this.collider = created.collider;
    this.unit.body = this.body;
    return this;
  }

  move(vx, vy) {
    this.physics.setKinematicVelocity(this.body, vx, vy);
  }

  syncFromPhysics() {
    const next = this.physics.getBodyPixels(this.body);
    Object.assign(this.unit, next);
  }

  setPosition(x, y) {
    this.physics.setBodyPosition(this.body, x, y);
    this.body.setLinvel({ x: 0, y: 0 }, true);
    this.unit.x = x;
    this.unit.y = y;
    this.unit.vx = 0;
    this.unit.vy = 0;
  }
}
