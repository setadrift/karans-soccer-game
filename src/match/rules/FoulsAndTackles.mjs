export class FoulsAndTackles {
  constructor(state, possessionRules) {
    this.state = state;
    this.possessionRules = possessionRules;
  }

  tryTackle(tackler) {
    const owner = this.state.players.find((unit) => unit.id === this.state.possession.ownerId);
    if (!owner || owner.side === tackler.side || tackler.tackleCooldown > 0) return "none";
    tackler.tackleCooldown = 0.65;
    tackler.action = "tackle";
    tackler.actionTimer = 0.42;
    this.state.stats[tackler.side].tackles += 1;
    const distance = Math.hypot(owner.x - tackler.x, owner.y - tackler.y);
    if (distance > 42) return "miss";
    const chance = 0.42 + tackler.defense * 0.04 - owner.dribble * 0.025;
    if (chance > 0.5) {
      this.possessionRules.setOwner(tackler);
      this.state.addEvent(`${tackler.name} wins it`, "defense");
      return "steal";
    }
    this.possessionRules.clear(0.2);
    this.state.ball.vx = (owner.x - tackler.x) * 4;
    this.state.ball.vy = (owner.y - tackler.y) * 4;
    this.state.addEvent("Ball knocked loose", "neutral");
    return "loose";
  }
}
