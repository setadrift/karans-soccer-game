import { MATCH_CONFIG } from "../MatchConfig.mjs";

export class MatchRules {
  constructor(state, options = {}) {
    this.state = state;
    this.onEnd = options.onEnd || (() => {});
    this.duration = options.duration || MATCH_CONFIG.match.duration;
    this.maxGoals = options.maxGoals || MATCH_CONFIG.match.maxGoals;
    this.detectGoal = options.detectGoal || null;
  }

  update(dt) {
    if (this.state.finished) return;
    this.state.time += dt;
    if (this.state.pauseTimer > 0) {
      this.state.pauseTimer = Math.max(0, this.state.pauseTimer - dt);
    }
    if (this.state.goalFlash > 0) {
      this.state.goalFlash = Math.max(0, this.state.goalFlash - dt);
    }
    const halfW = MATCH_CONFIG.pitch.width / 2;
    const goalHalf = MATCH_CONFIG.pitch.goalWidth / 2;
    const sensorGoal = this.detectGoal ? this.detectGoal() : null;
    if (sensorGoal) this.score(sensorGoal);
    else if (this.state.ball.x < -halfW && Math.abs(this.state.ball.y) < goalHalf) this.score("away");
    else if (this.state.ball.x > halfW && Math.abs(this.state.ball.y) < goalHalf) this.score("home");
    if (this.state.score.home >= this.maxGoals || this.state.score.away >= this.maxGoals) this.finish();
    else if (this.state.time >= this.duration) this.finish();
  }

  score(side) {
    this.state.score[side] += 1;
    this.state.resetKickoff(side);
  }

  finish() {
    this.state.finished = true;
    const won = this.state.score.home >= this.state.score.away;
    this.state.addEvent(won ? "You won the match" : "Rivals win the match", won ? "goal" : "danger");
    this.onEnd({
      won,
      playerScore: this.state.score.home,
      aiScore: this.state.score.away,
    });
  }
}
