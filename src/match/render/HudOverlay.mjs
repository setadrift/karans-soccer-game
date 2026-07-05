import { Container, Graphics, Text } from "pixi.js";
import { MATCH_CONFIG } from "../MatchConfig.mjs";

export class HudOverlay extends Container {
  constructor(state) {
    super();
    this.state = state;
    this.panel = new Graphics();
    this.scoreText = new Text({
      text: "",
      style: { fill: "#f8fafc", fontSize: 16, fontWeight: "900" },
    });
    this.eventText = new Text({
      text: "",
      style: { fill: "#cbd5e1", fontSize: 12, fontWeight: "700" },
    });
    this.statsText = new Text({
      text: "",
      style: { fill: "#94a3b8", fontSize: 11, fontWeight: "700" },
    });
    this.goalText = new Text({
      text: "GOAL",
      style: { fill: "#facc15", fontSize: 44, fontWeight: "900", stroke: { color: "#020617", width: 6 } },
    });
    this.goalText.anchor.set(0.5);
    this.addChild(this.panel, this.scoreText, this.eventText, this.statsText, this.goalText);
    this.panel.roundRect(14, 12, 310, 72, 8).fill({ color: "#020617", alpha: 0.68 }).stroke({
      color: "#facc15",
      width: 1,
      alpha: 0.55,
    });
    this.scoreText.position.set(28, 21);
    this.eventText.position.set(28, 45);
    this.statsText.position.set(28, 65);
    this.goalText.position.set(MATCH_CONFIG.width / 2, 96);
    this.goalText.visible = false;
  }

  update() {
    const minutes = Math.floor(this.state.time / 60);
    const seconds = String(Math.floor(this.state.time % 60)).padStart(2, "0");
    this.scoreText.text = `Home ${this.state.score.home} - ${this.state.score.away} Away   ${minutes}:${seconds}`;
    this.eventText.text = this.state.eventLog[0]?.label || `${this.state.controlledPlayer.name} on the ball`;
    this.statsText.text = `Shots ${this.state.stats.home.shots}-${this.state.stats.away.shots}  Passes ${this.state.stats.home.passes}-${this.state.stats.away.passes}  Tackles ${this.state.stats.home.tackles}-${this.state.stats.away.tackles}`;
    this.position.set(0, 0);
    this.eventText.style.fill = this.state.eventLog[0]?.tone === "goal" ? "#facc15" : "#cbd5e1";
    this.goalText.visible = this.state.goalFlash > 0;
    this.goalText.alpha = Math.min(1, this.state.goalFlash * 2);
    this.goalText.scale.set(1 + Math.max(0, this.state.goalFlash) * 0.25);
    this.visible = MATCH_CONFIG.width > 0;
  }
}
