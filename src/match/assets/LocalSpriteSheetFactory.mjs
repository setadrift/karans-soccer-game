import { Container, Graphics, Sprite } from "pixi.js";

export const PLAYER_SPRITE_STATES = Object.freeze([
  "idle",
  "run",
  "sprint",
  "dribble",
  "pass",
  "shoot",
  "tackle",
  "stumble",
  "save",
]);

export const PLAYER_SPRITE_FRAME_COUNT = Object.freeze({
  idle: 2,
  run: 6,
  sprint: 6,
  dribble: 6,
  pass: 4,
  shoot: 5,
  tackle: 5,
  stumble: 4,
  save: 5,
});

export const LOCAL_SPRITE_SHEET_META = Object.freeze({
  source: "Generated locally from generic vector drawing instructions at runtime.",
  license: "Project-owned generated generic art. No official kits, logos, photos, or likenesses.",
  frameWidth: 64,
  frameHeight: 80,
  states: PLAYER_SPRITE_STATES,
});

function teamColors(unit) {
  const rareTrim = unit.grade >= 115 ? "#facc15" : unit.grade >= 100 ? "#c084fc" : unit.side === "home" ? "#2563eb" : "#111827";
  return unit.side === "home"
    ? { kit: "#f8fafc", trim: rareTrim, shorts: "#2563eb", socks: "#f8fafc" }
    : { kit: "#ef4444", trim: rareTrim, shorts: "#111827", socks: "#ef4444" };
}

function faceColors(unit) {
  const portrait = unit.source?.portrait || {};
  return {
    skin: portrait.skin || "#d8a47a",
    hair: portrait.hair || "#1f2937",
    hairStyle: portrait.hairStyle || "classic",
  };
}

function drawHair(graphics, colors, x, y) {
  if (colors.hairStyle === "buzz") {
    graphics.ellipse(x, y - 4, 8, 5).fill(colors.hair);
    return;
  }
  if (colors.hairStyle === "mohawk" || colors.hairStyle === "topknot") {
    graphics.ellipse(x, y - 7, 5, 8).fill(colors.hair);
    graphics.ellipse(x, y - 3, 8, 5).fill(colors.hair);
    return;
  }
  if (colors.hairStyle === "curly" || colors.hairStyle === "tight-curls" || colors.hairStyle === "headband-curls") {
    for (const [dx, dy, r] of [
      [-6, -5, 4],
      [0, -8, 5],
      [6, -5, 4],
      [-8, -1, 4],
      [8, -1, 4],
    ]) {
      graphics.circle(x + dx, y + dy, r).fill(colors.hair);
    }
    return;
  }
  graphics.ellipse(x, y - 5, 9, 5).fill(colors.hair);
}

function framePose(state, frame, total) {
  const cycle = total <= 1 ? 0 : (frame / total) * Math.PI * 2;
  const run = state === "run" || state === "sprint" || state === "dribble";
  const stride = run ? Math.sin(cycle) : 0;
  const armSwing = run ? Math.sin(cycle + Math.PI) : 0;
  return {
    stride,
    armSwing,
    lean: state === "tackle" ? 0.34 : state === "shoot" ? -0.28 : state === "save" ? -0.35 : state === "stumble" ? 0.22 : 0,
    kickBack: state === "shoot" ? -9 : state === "pass" ? -5 : 0,
    kickForward: state === "shoot" ? 9 : state === "pass" ? 5 : 0,
    reach: state === "save" ? 8 : state === "tackle" ? 5 : 0,
  };
}

function drawFrame(unit, state, frame, total) {
  const colors = teamColors(unit);
  const face = faceColors(unit);
  const pose = framePose(state, frame, total);
  const container = new Container();
  const graphics = new Graphics();
  const cx = 32;
  const cy = 42;
  container.addChild(graphics);

  graphics.ellipse(cx, cy + 23, 18, 6).fill({ color: "#020617", alpha: 0.2 });
  graphics.rotation = pose.lean;
  graphics.pivot.set(cx, cy);
  graphics.position.set(cx, cy);

  graphics.roundRect(cx - 9, cy - 15, 18, 28, 6).fill(colors.kit).stroke({ color: colors.trim, width: 3 });
  graphics.roundRect(cx - 13 - pose.reach, cy - 11 + pose.armSwing * 2, 5, 21, 3).fill(colors.kit).stroke({
    color: colors.trim,
    width: 1,
  });
  graphics.roundRect(cx + 8 + pose.reach, cy - 11 - pose.armSwing * 2, 5, 21, 3).fill(colors.kit).stroke({
    color: colors.trim,
    width: 1,
  });
  graphics.roundRect(cx - 7, cy + 11 + pose.stride * 5 + pose.kickBack, 5, 18, 2).fill(colors.shorts);
  graphics.roundRect(cx + 2, cy + 11 - pose.stride * 5 + pose.kickForward, 5, 18, 2).fill(colors.shorts);
  graphics.ellipse(cx - 4, cy + 28 + pose.stride * 5 + pose.kickBack, 7, 3).fill("#0f172a");
  graphics.ellipse(cx + 6, cy + 28 - pose.stride * 5 + pose.kickForward, 7, 3).fill("#0f172a");

  graphics.circle(cx, cy - 24, 9).fill(face.skin).stroke({ color: "#111827", width: 1, alpha: 0.25 });
  drawHair(graphics, face, cx, cy - 24);
  graphics.circle(cx - 3.5, cy - 24, 1.2).fill("#111827");
  graphics.circle(cx + 3.5, cy - 24, 1.2).fill("#111827");
  graphics.moveTo(cx - 3, cy - 19).lineTo(cx + 3, cy - 19).stroke({ color: "#7f4a35", width: 1, alpha: 0.65 });

  if (unit.isKeeper) {
    graphics.rect(cx - 14, cy - 18, 28, 8).fill("#facc15");
  }

  return container;
}

export function createPlayerSpriteSheet(renderer, unit) {
  const states = {};
  for (const state of PLAYER_SPRITE_STATES) {
    const count = unit.isKeeper && state === "save" ? PLAYER_SPRITE_FRAME_COUNT.save : PLAYER_SPRITE_FRAME_COUNT[state];
    states[state] = [];
    for (let frame = 0; frame < count; frame += 1) {
      const target = drawFrame(unit, state, frame, count);
      const texture = renderer.generateTexture({
        target,
        resolution: 2,
      });
      states[state].push(texture);
      target.destroy({ children: true });
    }
  }
  return {
    meta: LOCAL_SPRITE_SHEET_META,
    states,
  };
}

export function createSpriteFromSheet(sheet) {
  const texture = sheet?.states?.idle?.[0];
  if (!texture) return null;
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5, 0.56);
  return sprite;
}
