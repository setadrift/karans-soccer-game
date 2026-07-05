import { Application } from "pixi.js";
import { MATCH_CONFIG } from "../MatchConfig.mjs";
import { createLayers } from "./Layers.mjs";
import { createPitchGraphic } from "./PitchRenderer.mjs";
import { PlayerSprite } from "./PlayerSprite.mjs";
import { BallSprite } from "./BallSprite.mjs";
import { HudOverlay } from "./HudOverlay.mjs";
import { RadarRenderer } from "./RadarRenderer.mjs";
import { createPlayerSpriteSheet } from "../assets/LocalSpriteSheetFactory.mjs";

export class PixiRenderer {
  constructor(canvas, state) {
    this.canvas = canvas;
    this.state = state;
    this.app = new Application();
    this.layers = null;
    this.ballSprite = null;
    this.playerSprites = new Map();
    this.playerSpriteSheets = new Map();
    this.hud = null;
    this.radar = null;
  }

  async init() {
    await this.app.init({
      canvas: this.canvas,
      width: MATCH_CONFIG.width,
      height: MATCH_CONFIG.height,
      background: "#0f5132",
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    this.canvas.style.width = "100%";
    this.canvas.style.height = "auto";
    this.canvas.style.aspectRatio = `${MATCH_CONFIG.width} / ${MATCH_CONFIG.height}`;
    this.layers = createLayers();
    this.app.stage.addChild(this.layers.stage);
    this.layers.pitchLayer.addChild(createPitchGraphic());
    for (const unit of this.state.players) {
      const sheet = this.createSpriteSheet(unit);
      const sprite = new PlayerSprite(unit, sheet);
      unit.sprite = sprite;
      this.playerSprites.set(unit.id, sprite);
      this.layers.playerLayer.addChild(sprite);
    }
    this.layers.playerLayer.sortableChildren = true;
    this.ballSprite = new BallSprite(this.state.ball);
    this.layers.ballLayer.addChild(this.ballSprite);
    this.hud = new HudOverlay(this.state);
    this.radar = new RadarRenderer(this.state);
    this.layers.screenUiLayer.addChild(this.hud, this.radar);
    return this;
  }

  createSpriteSheet(unit) {
    try {
      const sheet = createPlayerSpriteSheet(this.app.renderer, unit);
      this.playerSpriteSheets.set(unit.id, sheet);
      return sheet;
    } catch (error) {
      console.warn("Player sprite sheet generation failed; using procedural fallback.", error);
      return null;
    }
  }

  update(camera) {
    camera.apply(this.layers.world);
    for (const sprite of this.playerSprites.values()) sprite.update();
    this.layers.playerLayer.sortChildren();
    this.ballSprite.update();
    this.hud.update();
    this.radar.update();
  }

  destroy() {
    this.app.destroy(false);
  }
}
