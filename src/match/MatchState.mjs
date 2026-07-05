import { FORMATION_433, MATCH_CONFIG, RIVAL_ROSTER } from "./MatchConfig.mjs";

const ROLE_ORDER = ["G", "CB", "LB", "RB", "CM", "CAM", "LW", "RW", "ST"];
const POSITION_FALLBACKS = Object.freeze({
  G: ["G"],
  GK: ["G"],
  CB: ["CB"],
  LB: ["LB", "CB"],
  RB: ["RB", "CB"],
  CM: ["CM", "CAM"],
  CAM: ["CAM", "CM", "ST"],
  LW: ["LW", "ST", "RW"],
  RW: ["RW", "ST", "LW"],
  RM: ["RW", "CM"],
  LM: ["LW", "CM"],
  ST: ["ST", "LW", "RW", "CAM"],
});

function rating(player, fallback = 50) {
  return Number(player?.grade || player?.rating || fallback);
}

function positionScore(player, role) {
  const position = player?.position || "ST";
  if (position === role) return 1000;
  if (role === "CB" && ["CB", "LB", "RB"].includes(position)) return 760;
  if (["LB", "RB"].includes(role) && ["LB", "RB", "CB"].includes(position)) return 700;
  if (["CM", "CAM"].includes(role) && ["CM", "CAM"].includes(position)) return 740;
  if (["LW", "RW"].includes(role) && ["LW", "RW", "ST", "CAM"].includes(position)) return 700;
  if (role === "ST" && ["ST", "LW", "RW", "CAM"].includes(position)) return 700;
  if (role === "G") return position === "G" ? 1000 : -600;
  return 0;
}

function normalizedPlayer(player, index, side, role, homeDirection) {
  const placement = FORMATION_433[index] || FORMATION_433[0];
  const pitch = MATCH_CONFIG.pitch;
  const sideMultiplier = side === "home" ? -1 : 1;
  const ySign = side === "home" ? 1 : -1;
  return {
    source: player,
    id: `${side}-${player.id || index}`,
    playerId: player.id || `${side}-${index}`,
    name: player.name || `Player ${index + 1}`,
    side,
    role,
    grade: rating(player),
    speed: Number(player.speed || 5),
    shot: Number(player.shot || 5),
    dribble: Number(player.dribble || 5),
    defense: Number(player.defense || 5),
    isKeeper: role === "G" || player.position === "G",
    decisionTimer: 0,
    homeX: placement.x * pitch.width * sideMultiplier,
    homeY: placement.y * pitch.height * ySign,
    x: placement.x * pitch.width * sideMultiplier,
    y: placement.y * pitch.height * ySign,
    vx: 0,
    vy: 0,
    facing: homeDirection,
    action: "idle",
    actionTimer: 0,
    aiState: "hold-shape",
    stamina: 1,
    hasPossession: false,
    tackleCooldown: 0,
    sprite: null,
    body: null,
  };
}

function selectRosterPlayers(roster, selectedPlayer) {
  const byId = new Map();
  if (selectedPlayer) byId.set(selectedPlayer.id, selectedPlayer);
  for (const player of roster || []) {
    if (player && !byId.has(player.id)) byId.set(player.id, player);
  }

  const pool = Array.from(byId.values());
  const selected = selectedPlayer || pool[0];
  const chosen = Array(FORMATION_433.length).fill(null);
  const used = new Set();
  if (selected) {
    const preferredRoles = POSITION_FALLBACKS[selected.position || "ST"] || POSITION_FALLBACKS.ST;
    let selectedSlot = FORMATION_433.findIndex((slot) => preferredRoles.includes(slot.role));
    if (selectedSlot < 0) selectedSlot = FORMATION_433.findIndex((slot) => slot.role === "ST");
    chosen[selectedSlot < 0 ? FORMATION_433.length - 2 : selectedSlot] = selected;
    used.add(selected.id);
  }

  for (let slotIndex = 0; slotIndex < FORMATION_433.length; slotIndex += 1) {
    if (chosen[slotIndex]) continue;
    const slot = FORMATION_433[slotIndex];
    let best = null;
    let bestScore = -Infinity;
    for (const player of pool) {
      if (!player || used.has(player.id)) continue;
      const score = positionScore(player, slot.role) + rating(player) * 3;
      if (score > bestScore) {
        best = player;
        bestScore = score;
      }
    }
    if (best) {
      chosen[slotIndex] = best;
      used.add(best.id);
    }
  }

  const fallbackPool = pool.filter((player) => !used.has(player.id)).sort((a, b) => rating(b) - rating(a));
  for (let index = 0; index < chosen.length; index += 1) {
    if (chosen[index]) continue;
    chosen[index] =
      fallbackPool.shift() ||
      {
        id: `generated-bench-${index}`,
        name: `Bench Player ${index + 1}`,
        position: ROLE_ORDER[index % ROLE_ORDER.length],
        grade: 45,
        speed: 4,
        shot: 3,
        dribble: 3,
        defense: 4,
      };
  }

  return chosen.slice(0, 11);
}

function rivalRoster(wins = 0) {
  const boost = wins >= 6 ? 2 : wins >= 3 ? 1 : 0;
  return RIVAL_ROSTER.map(([name, position, speed, shot, dribble, defense], index) => ({
    id: `rival-${index}`,
    name,
    rarity: boost > 1 ? "Legendary" : "Epic",
    position,
    grade: 82 + boost * 8 + index,
    speed: speed + boost,
    shot: shot + boost,
    dribble: dribble + boost,
    defense: defense + boost,
  }));
}

export class MatchState {
  constructor(selectedPlayer, options = {}) {
    this.selectedPlayer = selectedPlayer;
    this.wins = Number(options.wins || 0);
    this.time = 0;
    this.pauseTimer = 0;
    this.goalFlash = 0;
    this.score = { home: 0, away: 0 };
    this.stats = {
      home: { shots: 0, passes: 0, tackles: 0 },
      away: { shots: 0, passes: 0, tackles: 0 },
    };
    this.teamStates = {
      home: "balanced",
      away: "balanced",
    };
    this.eventLog = [];
    this.finished = false;
    this.possession = {
      ownerId: null,
      side: null,
      looseTimer: 0,
      lastOwnerId: null,
      intendedReceiverId: null,
    };
    this.ball = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      spin: 0,
      body: null,
    };

    const homeRoster = selectRosterPlayers(options.unlockedPlayers || [], selectedPlayer);
    const awayRoster = rivalRoster(this.wins);
    this.homeTeam = homeRoster.map((player, index) =>
      normalizedPlayer(player, index, "home", FORMATION_433[index].role, 1),
    );
    this.awayTeam = awayRoster.map((player, index) =>
      normalizedPlayer(player, index, "away", FORMATION_433[index].role, -1),
    );
    this.players = [...this.homeTeam, ...this.awayTeam];
    this.controlledPlayer = this.homeTeam.find((unit) => unit.playerId === selectedPlayer?.id) || this.homeTeam[0];
    this.controlledPlayer.isControlled = true;
  }

  addEvent(label, tone = "neutral") {
    this.eventLog.unshift({ label, tone, at: this.time });
    this.eventLog = this.eventLog.slice(0, 4);
  }

  resetKickoff(scoringSide = null) {
    for (const unit of this.players) {
      unit.x = unit.homeX;
      unit.y = unit.homeY;
      unit.vx = 0;
      unit.vy = 0;
      unit.hasPossession = false;
      unit.action = "idle";
      unit.decisionTimer = 0;
    }
    this.ball.x = 0;
    this.ball.y = 0;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.possession.ownerId = null;
    this.possession.side = null;
    this.possession.looseTimer = 0;
    this.possession.intendedReceiverId = null;
    this.pauseTimer = MATCH_CONFIG.match.kickoffPause;
    this.goalFlash = 0.65;
    if (scoringSide) this.addEvent(`${scoringSide === "home" ? "Home" : "Away"} goal`, "goal");
  }
}
