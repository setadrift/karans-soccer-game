import { arrive, seek } from "./Steering.mjs";
import { MATCH_CONFIG } from "../MatchConfig.mjs";

export class PlayerAI {
  constructor(unit) {
    this.unit = unit;
  }

  desiredVelocity(state) {
    const unit = this.unit;
    const hasTeamPossession = state.possession.side === unit.side;
    const teamState = state.teamStates[unit.side] || "balanced";
    const ball = state.ball;
    const maxSpeed = (MATCH_CONFIG.controls.walkSpeed + unit.speed * 8) * (unit.side === "away" ? 0.92 : 0.86);

    if (unit.isKeeper) {
      const keeperX = unit.side === "home" ? -MATCH_CONFIG.pitch.width * 0.43 : MATCH_CONFIG.pitch.width * 0.43;
      return arrive(unit, { x: keeperX, y: Math.max(-90, Math.min(90, ball.y * 0.45)) }, maxSpeed * 0.65, 80);
    }

    const distanceToBall = Math.hypot(unit.x - ball.x, unit.y - ball.y);
    const nearestOwn = (unit.side === "home" ? state.homeTeam : state.awayTeam)
      .filter((candidate) => !candidate.isKeeper)
      .sort((a, b) => Math.hypot(a.x - ball.x, a.y - ball.y) - Math.hypot(b.x - ball.x, b.y - ball.y))[0];

    const pressRange = teamState === "counterpress" || teamState === "press" ? 360 : 250;
    if (!hasTeamPossession && nearestOwn === unit && distanceToBall < pressRange) {
      return seek(unit, ball, maxSpeed);
    }

    const roleLane =
      {
        LW: -0.34,
        RW: 0.34,
        LB: -0.32,
        RB: 0.32,
        CAM: 0.18,
        CM: unit.homeY < 0 ? -0.16 : 0.08,
        ST: 0,
        CB: unit.homeY < 0 ? -0.12 : 0.12,
      }[unit.role] ?? unit.homeY / MATCH_CONFIG.pitch.height;
    const advance = hasTeamPossession ? (unit.side === "home" ? 110 : -110) : teamState === "mid-block" ? 35 * (unit.side === "home" ? -1 : 1) : 0;
    const supportX = unit.homeX + advance;
    const supportY = roleLane * MATCH_CONFIG.pitch.height + Math.sin(state.time * 1.1 + unit.homeY * 0.02) * 18;
    return arrive(unit, { x: supportX, y: supportY }, maxSpeed, 120);
  }
}
