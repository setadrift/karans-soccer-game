export const MATCH_CONFIG = Object.freeze({
  width: 900,
  height: 520,
  pitch: {
    width: 1240,
    height: 760,
    margin: 40,
    centerCircleRadius: 78,
    penaltyBoxWidth: 150,
    penaltyBoxHeight: 300,
    goalWidth: 128,
    goalDepth: 22,
  },
  physics: {
    pixelsPerMeter: 60,
    fixedDt: 1 / 60,
    playerRadius: 0.34,
    ballRadius: 0.13,
    ballLinearDamping: 1.05,
    playerLinearDamping: 4,
    wallRestitution: 0.34,
    ballRestitution: 0.44,
  },
  controls: {
    walkSpeed: 245,
    sprintSpeed: 390,
    acceleration: 12,
    dribbleDistance: 30,
    possessionRadius: 25,
    receiverRadius: 34,
    passPower: 500,
    shotPower: 760,
    aiDecisionCooldown: 0.55,
  },
  match: {
    duration: 150,
    maxGoals: 3,
    kickoffPause: 1.25,
  },
  camera: {
    lerp: 0.095,
    zoom: 1,
    minX: -170,
    maxX: 170,
    minY: -120,
    maxY: 120,
  },
});

export const FORMATION_433 = Object.freeze([
  { role: "G", x: -0.44, y: 0 },
  { role: "LB", x: -0.28, y: -0.31 },
  { role: "CB", x: -0.32, y: -0.12 },
  { role: "CB", x: -0.32, y: 0.12 },
  { role: "RB", x: -0.28, y: 0.31 },
  { role: "CM", x: -0.05, y: -0.22 },
  { role: "CM", x: -0.08, y: 0 },
  { role: "CAM", x: -0.02, y: 0.22 },
  { role: "LW", x: 0.22, y: -0.32 },
  { role: "ST", x: 0.31, y: 0 },
  { role: "RW", x: 0.22, y: 0.32 },
]);

export const RIVAL_ROSTER = Object.freeze([
  ["Sunday League Stopper", "G", 4, 2, 4, 7],
  ["Back Post Bruno", "LB", 5, 3, 4, 6],
  ["Header Harold", "CB", 4, 3, 3, 8],
  ["Slide Tackle Sam", "CB", 5, 2, 3, 8],
  ["Overlap Omar", "RB", 6, 3, 5, 5],
  ["Pressing Pete", "CM", 6, 5, 6, 6],
  ["Box-to-Box Ben", "CM", 6, 5, 6, 6],
  ["Tricky Theo", "CAM", 7, 6, 7, 3],
  ["Cutback Kai", "LW", 7, 6, 7, 3],
  ["Poacher Paulo", "ST", 6, 8, 5, 3],
  ["Rocket Ryan", "RW", 8, 6, 6, 3],
]);

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(from, to, amount) {
  return from + (to - from) * amount;
}
