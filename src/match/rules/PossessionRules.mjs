import { MATCH_CONFIG } from "../MatchConfig.mjs";

export class PossessionRules {
  constructor(state) {
    this.state = state;
  }

  update(dt = 1 / 60) {
    const { state } = this;
    if (state.possession.looseTimer > 0) {
      state.possession.looseTimer = Math.max(0, state.possession.looseTimer - dt);
    }
    if (state.possession.ownerId) {
      const owner = state.players.find((unit) => unit.id === state.possession.ownerId);
      if (!owner) return;
      state.ball.x = owner.x + owner.facing * MATCH_CONFIG.controls.dribbleDistance;
      state.ball.y = owner.y + Math.sin(state.time * 10) * 3;
      state.ball.vx = owner.vx;
      state.ball.vy = owner.vy;
      return;
    }

    if (state.possession.looseTimer > 0) return;

    const candidate = state.players
      .filter((unit) => !unit.isKeeper || Math.abs(state.ball.x - unit.x) < 120)
      .map((unit) => ({ unit, distance: Math.hypot(unit.x - state.ball.x, unit.y - state.ball.y) }))
      .filter((entry) => {
        const radius =
          entry.unit.id === state.possession.intendedReceiverId
            ? MATCH_CONFIG.controls.receiverRadius
            : MATCH_CONFIG.controls.possessionRadius;
        return entry.distance < radius;
      })
      .sort((a, b) => {
        if (a.unit.id === state.possession.intendedReceiverId) return -1;
        if (b.unit.id === state.possession.intendedReceiverId) return 1;
        return a.distance - b.distance;
      })[0]?.unit;

    if (candidate) this.setOwner(candidate);
  }

  setOwner(unit) {
    for (const player of this.state.players) player.hasPossession = player === unit;
    this.state.possession.ownerId = unit.id;
    this.state.possession.side = unit.side;
    this.state.possession.lastOwnerId = unit.id;
    this.state.possession.intendedReceiverId = null;
    unit.hasPossession = true;
  }

  clear(looseTimer = 0) {
    for (const player of this.state.players) player.hasPossession = false;
    this.state.possession.ownerId = null;
    this.state.possession.side = null;
    this.state.possession.looseTimer = looseTimer;
  }
}
