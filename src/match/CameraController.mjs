import { MATCH_CONFIG, clamp, lerp } from "./MatchConfig.mjs";

export class CameraController {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.zoom = MATCH_CONFIG.camera.zoom;
  }

  update(target, ball, dt) {
    const mixX = target ? target.x * 0.72 + ball.x * 0.28 : ball.x;
    const mixY = target ? target.y * 0.72 + ball.y * 0.28 : ball.y;
    const amount = 1 - Math.pow(1 - MATCH_CONFIG.camera.lerp, dt * 60);
    this.x = lerp(this.x, clamp(mixX, MATCH_CONFIG.camera.minX, MATCH_CONFIG.camera.maxX), amount);
    this.y = lerp(this.y, clamp(mixY, MATCH_CONFIG.camera.minY, MATCH_CONFIG.camera.maxY), amount);
  }

  apply(container) {
    container.scale.set(this.zoom);
    container.position.set(MATCH_CONFIG.width / 2 - this.x * this.zoom, MATCH_CONFIG.height / 2 - this.y * this.zoom);
  }
}
