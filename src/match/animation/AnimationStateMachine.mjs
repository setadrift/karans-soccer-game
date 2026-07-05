export class AnimationStateMachine {
  constructor(unit) {
    this.unit = unit;
    this.state = "idle";
  }

  update(inputMoving, hasBall, speed) {
    if (this.unit.actionTimer > 0) this.state = this.unit.action;
    else if (this.unit.tackleCooldown > 0) this.state = "tackle";
    else if (hasBall && speed > 24) this.state = "dribble";
    else if (speed > 240) this.state = "sprint";
    else if (speed > 24) this.state = "run";
    else this.state = "idle";
    this.unit.action = this.state;
    return this.state;
  }
}
