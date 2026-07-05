import { Container, Graphics } from "pixi.js";
import { MATCH_CONFIG } from "../MatchConfig.mjs";

export class RadarRenderer extends Container {
  constructor(state) {
    super();
    this.state = state;
    this.g = new Graphics();
    this.addChild(this.g);
    this.position.set(MATCH_CONFIG.width - 178, MATCH_CONFIG.height - 102);
  }

  update() {
    const { pitch } = MATCH_CONFIG;
    const w = 150;
    const h = 84;
    this.g.clear();
    this.g.roundRect(0, 0, w, h, 6).fill({ color: "#020617", alpha: 0.58 }).stroke({
      color: "#f8fafc",
      width: 1,
      alpha: 0.35,
    });
    for (const unit of this.state.players) {
      const x = ((unit.x + pitch.width / 2) / pitch.width) * w;
      const y = ((unit.y + pitch.height / 2) / pitch.height) * h;
      this.g.circle(x, y, unit === this.state.controlledPlayer ? 3.2 : 2.2).fill(unit.side === "home" ? "#f8fafc" : "#ef4444");
    }
    const bx = ((this.state.ball.x + pitch.width / 2) / pitch.width) * w;
    const by = ((this.state.ball.y + pitch.height / 2) / pitch.height) * h;
    this.g.circle(bx, by, 2.5).fill("#facc15");
  }
}
