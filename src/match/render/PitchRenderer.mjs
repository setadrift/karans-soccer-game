import { Graphics } from "pixi.js";
import { MATCH_CONFIG } from "../MatchConfig.mjs";

export function createPitchGraphic() {
  const { pitch } = MATCH_CONFIG;
  const g = new Graphics();
  const x = -pitch.width / 2;
  const y = -pitch.height / 2;

  g.rect(x, y, pitch.width, pitch.height).fill("#1c8a52");
  for (let i = 0; i < 8; i += 1) {
    const stripeX = x + (pitch.width / 8) * i;
    g.rect(stripeX, y, pitch.width / 8, pitch.height).fill(i % 2 ? "#18804b" : "#20945a");
  }

  g.rect(x, y, pitch.width, pitch.height).stroke({ color: "#e8fff1", width: 4, alpha: 0.9 });
  g.moveTo(0, y).lineTo(0, y + pitch.height).stroke({ color: "#e8fff1", width: 3, alpha: 0.85 });
  g.circle(0, 0, pitch.centerCircleRadius).stroke({ color: "#e8fff1", width: 3, alpha: 0.85 });
  g.circle(0, 0, 4).fill("#e8fff1");

  const boxY = -pitch.penaltyBoxHeight / 2;
  g.rect(x, boxY, pitch.penaltyBoxWidth, pitch.penaltyBoxHeight).stroke({ color: "#e8fff1", width: 3, alpha: 0.85 });
  g.rect(x + pitch.width - pitch.penaltyBoxWidth, boxY, pitch.penaltyBoxWidth, pitch.penaltyBoxHeight).stroke({
    color: "#e8fff1",
    width: 3,
    alpha: 0.85,
  });
  g.rect(x - pitch.goalDepth, -pitch.goalWidth / 2, pitch.goalDepth, pitch.goalWidth).stroke({
    color: "#f8fafc",
    width: 4,
  });
  g.rect(x + pitch.width, -pitch.goalWidth / 2, pitch.goalDepth, pitch.goalWidth).stroke({
    color: "#f8fafc",
    width: 4,
  });
  for (const postX of [x, x + pitch.width]) {
    for (const postY of [-pitch.goalWidth / 2, pitch.goalWidth / 2]) {
      g.circle(postX, postY, 7).fill("#f8fafc").stroke({ color: "#cbd5e1", width: 2 });
    }
  }

  return g;
}
