import * as YUKA from "yuka";
import { PlayerAI } from "./PlayerAI.mjs";
import { TEAM_TACTICS } from "./Tactics.mjs";

export class TeamAI {
  constructor(state) {
    this.state = state;
    this.entityManager = new YUKA.EntityManager();
    this.controllers = new Map();
    for (const unit of state.players) {
      this.controllers.set(unit.id, new PlayerAI(unit));
    }
  }

  velocityFor(unit) {
    return this.controllers.get(unit.id)?.desiredVelocity(this.state) || { vx: 0, vy: 0 };
  }

  update(dt) {
    this.updateTeamStates();
    this.entityManager.update(dt);
  }

  updateTeamStates() {
    for (const side of ["home", "away"]) {
      const tactic = TEAM_TACTICS[side];
      const ownsBall = this.state.possession.side === side;
      const opponentOwnsBall = this.state.possession.side && this.state.possession.side !== side;
      const team = side === "home" ? this.state.homeTeam : this.state.awayTeam;
      const attackingDirection = side === "home" ? 1 : -1;
      const inFinalThird = this.state.ball.x * attackingDirection > 170;

      let teamState = tactic.outOfPossession;
      if (ownsBall) teamState = inFinalThird ? tactic.finalThird : tactic.inPossession;
      else if (opponentOwnsBall && Math.abs(this.state.ball.x - tactic.defensiveLine) < 250) teamState = tactic.press;
      this.state.teamStates[side] = teamState;

      for (const unit of team) {
        if (unit.isKeeper) unit.aiState = "keeper-sweep";
        else if (ownsBall && unit.hasPossession) unit.aiState = inFinalThird ? "attack-goal" : "progress-ball";
        else if (ownsBall) unit.aiState = "support-lane";
        else if (teamState === tactic.press) unit.aiState = "press-ball";
        else unit.aiState = "hold-shape";
      }
    }
  }
}
