import { Container, Graphics, Text } from "pixi.js";
import { createSpriteFromSheet, PLAYER_SPRITE_FRAME_COUNT } from "../assets/LocalSpriteSheetFactory.mjs";

function teamColors(side) {
  return side === "home"
    ? { kit: "#f8fafc", trim: "#2563eb", skin: "#d8a47a" }
    : { kit: "#ef4444", trim: "#111827", skin: "#c6845d" };
}

function faceColors(unit) {
  const portrait = unit.source?.portrait || {};
  const team = teamColors(unit.side);
  return {
    skin: portrait.skin || team.skin,
    hair: portrait.hair || "#1f2937",
    accent: portrait.accent || team.trim,
    hairStyle: portrait.hairStyle || "classic",
  };
}

export class PlayerSprite extends Container {
  constructor(unit, spriteSheet = null) {
    super();
    this.unit = unit;
    this.spriteSheet = spriteSheet;
    this.shadow = new Graphics();
    this.halo = new Graphics();
    this.body = new Graphics();
    this.avatar = createSpriteFromSheet(spriteSheet);
    this.label = new Text({
      text: unit.name.split(" ").slice(-1)[0],
      style: { fill: "#f8fafc", fontSize: 10, fontWeight: "700", stroke: { color: "#0f172a", width: 3 } },
    });
    this.label.anchor.set(0.5, 0);
    this.addChild(this.shadow, this.halo);
    if (this.avatar) this.addChild(this.avatar);
    else this.addChild(this.body);
    this.addChild(this.label);
    if (!this.avatar) this.drawPose(0);
    else this.drawIndicators();
  }

  drawIndicators() {
    this.shadow.clear().ellipse(0, 11, 18, 6).fill({ color: "#020617", alpha: 0.2 });
    this.halo.clear();
    if (this.unit.isControlled) {
      this.halo.ellipse(0, 16, 22, 8).stroke({ color: "#facc15", width: 3, alpha: 0.92 });
    }
    if (this.unit.hasPossession) {
      this.halo.ellipse(0, 16, 27, 10).stroke({ color: "#86efac", width: 3, alpha: 0.85 });
    }
  }

  drawHair(colors) {
    if (colors.hairStyle === "buzz") {
      this.body.ellipse(0, -28, 8, 5).fill(colors.hair);
      return;
    }
    if (colors.hairStyle === "mohawk" || colors.hairStyle === "topknot") {
      this.body.ellipse(0, -31, 5, 8).fill(colors.hair);
      this.body.ellipse(0, -27, 8, 5).fill(colors.hair);
      return;
    }
    if (colors.hairStyle === "curly" || colors.hairStyle === "tight-curls" || colors.hairStyle === "headband-curls") {
      for (const [x, y, r] of [
        [-6, -29, 4],
        [0, -32, 5],
        [6, -29, 4],
        [-8, -25, 4],
        [8, -25, 4],
      ]) {
        this.body.circle(x, y, r).fill(colors.hair);
      }
      return;
    }
    this.body.ellipse(0, -29, 9, 5).fill(colors.hair);
  }

  drawPose(phase) {
    const colors = teamColors(this.unit.side);
    const face = faceColors(this.unit);
    const run = this.unit.action === "run" || this.unit.action === "sprint" || this.unit.action === "dribble";
    const tackle = this.unit.action === "tackle";
    const passing = this.unit.action === "pass";
    const shooting = this.unit.action === "shoot";
    const keeperSave = this.unit.action === "save";
    const stride = run ? Math.sin(phase) : 0;
    const armSwing = run ? Math.sin(phase + Math.PI) : 0;
    const lean = tackle ? 0.35 : shooting ? -0.3 : keeperSave ? -0.25 : Math.max(-0.18, Math.min(0.18, this.unit.vx / 900));
    const kickBack = shooting ? -9 : passing ? -5 : 0;
    const kickForward = shooting ? 8 : passing ? 4 : 0;

    this.drawIndicators();
    this.body.clear();

    this.body.rotation = lean;
    this.body.roundRect(-9, -15, 18, 28, 6).fill(colors.kit).stroke({ color: colors.trim, width: 3 });
    this.body.roundRect(-13, -11 + armSwing * 2 - (shooting ? 3 : 0), 5, 21, 3).fill(colors.kit).stroke({ color: colors.trim, width: 1 });
    this.body.roundRect(8, -11 - armSwing * 2 + (passing ? 3 : 0), 5, 21, 3).fill(colors.kit).stroke({ color: colors.trim, width: 1 });
    this.body.roundRect(-7, 11 + stride * 5 + kickBack, 5, 18, 2).fill(colors.trim);
    this.body.roundRect(2, 11 - stride * 5 + kickForward, 5, 18, 2).fill(colors.trim);
    this.body.ellipse(-4, 28 + stride * 5 + kickBack, 7, 3).fill("#0f172a");
    this.body.ellipse(6, 28 - stride * 5 + kickForward, 7, 3).fill("#0f172a");

    this.body.circle(0, -24, 9).fill(face.skin).stroke({ color: "#111827", width: 1, alpha: 0.25 });
    this.drawHair(face);
    this.body.circle(-3.5, -24, 1.2).fill("#111827");
    this.body.circle(3.5, -24, 1.2).fill("#111827");
    this.body.moveTo(-3, -19).lineTo(3, -19).stroke({ color: "#7f4a35", width: 1, alpha: 0.65 });

    if (this.unit.isKeeper) {
      this.body.rect(-14, -18, 28, 8).fill("#facc15");
    }
    this.label.position.set(0, 23);
  }

  animationState() {
    if (this.unit.action === "jog") return "run";
    if (this.unit.action === "keeper-set") return "idle";
    if (this.unit.action === "keeper-save" || this.unit.action === "save") return "save";
    return this.spriteSheet?.states?.[this.unit.action] ? this.unit.action : "idle";
  }

  updateAvatar(phase) {
    const state = this.animationState();
    const frames = this.spriteSheet.states[state] || this.spriteSheet.states.idle;
    const frameCount = frames.length || PLAYER_SPRITE_FRAME_COUNT[state] || 1;
    const frame = Math.floor(phase / (state === "sprint" ? 0.7 : 1)) % frameCount;
    this.avatar.texture = frames[frame] || frames[0];
    this.avatar.scale.x = this.unit.facing < 0 ? -1 : 1;
    this.avatar.scale.y = 1;
    this.drawIndicators();
    this.label.position.set(0, 23);
  }

  update() {
    this.position.set(this.unit.x, this.unit.y);
    this.zIndex = Math.round(this.unit.y);
    const speed = Math.hypot(this.unit.vx, this.unit.vy);
    const phase = performance.now() / (this.unit.action === "sprint" ? 60 : 82);
    if (this.avatar) this.updateAvatar(phase);
    else this.drawPose(phase);
    this.alpha = this.unit.hasPossession ? 1 : 0.94;
    this.scale.set(this.unit.hasPossession ? 1.08 : 1);
  }
}
