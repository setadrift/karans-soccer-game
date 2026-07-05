import { Container, Graphics } from "pixi.js";

export class BallSprite extends Container {
  constructor(ball) {
    super();
    this.ball = ball;
    this.shadow = new Graphics();
    this.graphic = new Graphics();
    this.addChild(this.shadow, this.graphic);
    this.redraw();
  }

  redraw() {
    this.shadow.clear().ellipse(2, 7, 8, 4).fill({ color: "#020617", alpha: 0.25 });
    this.graphic.clear().circle(0, 0, 8).fill("#f8fafc").stroke({ color: "#111827", width: 2 });
    this.graphic.moveTo(-5, -1).lineTo(5, 3).stroke({ color: "#111827", width: 1.5, alpha: 0.7 });
    this.graphic.moveTo(1, -6).lineTo(-2, 6).stroke({ color: "#111827", width: 1.5, alpha: 0.7 });
  }

  update() {
    this.position.set(this.ball.x, this.ball.y);
    this.graphic.rotation += Math.hypot(this.ball.vx, this.ball.vy) / 900;
  }
}
