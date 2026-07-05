(function () {
  const PHYSICS = {
    fixedDt: 1 / 60,
    maxSubSteps: 5,
    maxFrameGapMs: 250,

    playerRadius: 10,
    captainRadius: 13,
    keeperRadius: 12,
    ballRadius: 8,
    goalHeight: 140,
    goalWidth: 18,
    postRadius: 10,

    starterMaxSpeed: 195,
    eliteMaxSpeed: 355,
    playerAcceleration: 1380,
    playerDrag: 10.2,
    sprintMultiplier: 1.32,

    ballDrag: 1.08,
    ballStopSpeed: 8,
    ballMaxSpeed: 760,
    wallRestitution: 0.72,
    postRestitution: 0.92,

    tapKickSpeed: 250,
    chargedKickMinSpeed: 335,
    chargedKickMaxSpeed: 720,
    maxChargeMs: 700,
  };

  const PLAYER_VISUALS = {
    normalWidth: 27,
    normalHeight: 46,
    captainWidth: 36,
    captainHeight: 58,
    keeperWidth: 34,
    keeperHeight: 52,
    faceBadgeRadius: 12,
    captainFaceBadgeRadius: 17,
    showFaceBadges: true,
    minFacingSpeed: 12,
    runCycleSpeed: 0.045,
    actionKickDuration: 0.22,
    actionSaveDuration: 0.32,
    actionTackleDuration: 0.18,
  };

  const POSSESSION = {
    claimRadius: 22,
    controlledClaimRadius: 30,
    keeperClaimRadius: 34,
    releaseSpeed: 420,
    closeControlDistance: 14,
    sprintControlDistance: 22,
    maxCarrySpeedRatio: 0.92,
    dribbleBlend: 0.58,
    sprintDribbleBlend: 0.44,
    looseAfterHeavyTouch: 0.35,
    stealContestRadius: 26,
    controlledPossessionGrace: 0.32,
    aiPossessionGrace: 0.18,
    shotLooseTimer: 0.35,
    passLooseTimer: 0.18,
    tackleLooseTimer: 0.24,
    bounceLooseTimer: 0.18,
    minStealRelativeSpeed: 80,
  };

  const ACTIONS = {
    passSpeed: 430,
    throughPassSpeed: 520,
    passAssistAngle: 0.72,
    passerCooldownAfterPass: 0.28,
    receiverClaimGrace: 0.1,
    tackleRange: 28,
    tackleDuration: 0.2,
    tackleCooldown: 0.55,
    tackleWhiffSlowdown: 0.68,
    cleanStealThreshold: 0.62,
    pokeLooseThreshold: 0.38,
  };

  const FORMATION = [
    { role: "G", x: 58, y: 260 },
    { role: "LB", x: 158, y: 110 },
    { role: "CB", x: 170, y: 205 },
    { role: "CB", x: 170, y: 315 },
    { role: "RB", x: 158, y: 410 },
    { role: "CM", x: 310, y: 150 },
    { role: "CM", x: 325, y: 260 },
    { role: "CAM", x: 310, y: 370 },
    { role: "LW", x: 458, y: 122 },
    { role: "ST", x: 482, y: 260 },
    { role: "RW", x: 458, y: 398 },
  ];

  const RIVAL_ROSTER = [
    ["Rival Keeper", "G", 6, 2, 4, 9],
    ["Rival Left Back", "LB", 6, 3, 5, 7],
    ["Rival Stopper", "CB", 5, 3, 4, 8],
    ["Rival Sweeper", "CB", 6, 4, 5, 8],
    ["Rival Right Back", "RB", 6, 3, 5, 7],
    ["Rival Engine", "CM", 7, 6, 7, 7],
    ["Rival Pivot", "CM", 6, 5, 7, 8],
    ["Rival Creator", "CAM", 7, 7, 8, 5],
    ["Rival Left Wing", "LW", 8, 7, 8, 4],
    ["Rival Striker", "ST", 7, 8, 7, 4],
    ["Rival Right Wing", "RW", 8, 7, 8, 4],
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(start, end, amount) {
    return start + (end - start) * amount;
  }

  class SoccerGame {
    constructor(canvas, selectedPlayer, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.selectedPlayer = selectedPlayer;
      this.unlockedPlayers = Array.isArray(options.unlockedPlayers)
        ? options.unlockedPlayers
        : [selectedPlayer];
      this.onEnd = options.onEnd || function () {};
      this.onGoal = options.onGoal || function () {};
      this.wins = options.wins || 0;

      this.width = 900;
      this.height = 520;
      this.goalHeight = PHYSICS.goalHeight;
      this.goalWidth = PHYSICS.goalWidth;
      this.ballRadius = PHYSICS.ballRadius;

      this.keys = {};
      this.lastDirection = { x: 1, y: 0 };
      this.lastTimestamp = null;
      this.currentTimestamp = performance.now();
      this.accumulator = 0;
      this.matchTime = 0;

      this.playerScore = 0;
      this.aiScore = 0;
      this.pauseUntil = 0;
      this.ended = false;
      this.destroyed = false;
      this.debug = false;
      this.goalFlash = 0;
      this.shakeTime = 0;
      this.shakeMagnitude = 0;
      this.reduceMotion = window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;

      this.message = "11v11 kickoff";
      this.messageTimer = 1.8;
      this.introUntil = this.currentTimestamp + 1400;
      this.kickCooldown = 0;
      this.passCooldown = 0;
      this.tackleCooldown = 0;
      this.shotCharge = null;
      this.stamina = 1;
      this.ballTrail = [];
      this.effects = [];
      this.aiState = "Shape";
      this.camera = {
        x: this.width / 2,
        y: this.height / 2,
        zoom: 1.42,
        targetZoom: 1.42,
      };

      this.difficulty = this.getDifficultySettings(this.wins);
      this.homeTeam = this.createTeam("home", this.getHomeRoster());
      this.awayTeam = this.createTeam("away", this.getRivalRoster());
      this.players = [...this.homeTeam, ...this.awayTeam];
      this.player = this.homeTeam.find((unit) => unit.controlled) || this.homeTeam[0];
      this.ai = this.awayTeam.find((unit) => unit.role === "ST") || this.awayTeam[0];
      this.homeChaser = null;
      this.awayChaser = null;

      this.ball = {
        x: this.width / 2,
        y: this.height / 2,
        vx: 0,
        vy: 0,
        radius: this.ballRadius,
        drag: PHYSICS.ballDrag,
        restitution: PHYSICS.wallRestitution,
        maxSpeed: PHYSICS.ballMaxSpeed,
        ownerId: null,
        ownerSide: null,
        possessionTimer: 0,
        looseTimer: 0,
        lastOwnerId: null,
        intendedReceiverId: null,
      };
      this.posts = this.createGoalPosts();

      this.handleKeyDown = this.handleKeyDown.bind(this);
      this.handleKeyUp = this.handleKeyUp.bind(this);
      this.loop = this.loop.bind(this);

      this.resizeCanvasForDpr();
      window.addEventListener("keydown", this.handleKeyDown);
      window.addEventListener("keyup", this.handleKeyUp);
      this.animationFrame = requestAnimationFrame(this.loop);
    }

    destroy() {
      this.destroyed = true;
      cancelAnimationFrame(this.animationFrame);
      window.removeEventListener("keydown", this.handleKeyDown);
      window.removeEventListener("keyup", this.handleKeyUp);
      this.effects = [];
      this.ballTrail = [];
      this.shotCharge = null;
      if (this.ball) this.clearBallOwner("reset");
    }

    getHomeRoster() {
      const seen = new Set([this.selectedPlayer.id]);
      const unlocked = this.unlockedPlayers
        .filter((player) => player && player.id !== this.selectedPlayer.id)
        .filter((player) => {
          if (seen.has(player.id)) return false;
          seen.add(player.id);
          return true;
        })
        .sort((a, b) => (b.grade || 0) - (a.grade || 0));

      const starters = (window.GAME_DATA && window.GAME_DATA.starterPlayers ? window.GAME_DATA.starterPlayers : [])
        .filter((player) => !seen.has(player.id));

      return [this.selectedPlayer, ...unlocked, ...starters];
    }

    getRivalRoster() {
      const boost = this.wins >= 6 ? 2 : this.wins >= 3 ? 1 : 0;
      return RIVAL_ROSTER.map(([name, position, speed, shot, dribble, defense], index) => ({
        id: `rival-${index}`,
        name,
        rarity: boost > 1 ? "Legendary" : "Epic",
        position,
        grade: 82 + boost * 8 + index,
        speed: clamp(speed + boost, 2, 10),
        shot: clamp(shot + boost, 2, 10),
        dribble: clamp(dribble + boost, 2, 10),
        defense: clamp(defense + boost, 2, 10),
      }));
    }

    createTeam(side, roster) {
      const team = [];
      const selectedIndex = side === "home" ? this.getFormationIndex(this.selectedPlayer.position) : -1;
      const queue = roster.filter((player) => side !== "home" || player.id !== this.selectedPlayer.id);

      for (let index = 0; index < FORMATION.length; index += 1) {
        const spot = FORMATION[index];
        const controlled = side === "home" && index === selectedIndex;
        const player = controlled
          ? this.selectedPlayer
          : queue.shift() || this.createFallbackPlayer(side, index, spot.role);

        team.push(this.createFieldPlayer(player, spot, side, index, controlled));
      }

      if (side === "home" && !team.some((unit) => unit.controlled)) {
        team[9] = this.createFieldPlayer(this.selectedPlayer, FORMATION[9], side, 9, true);
      }

      return team;
    }

    createFallbackPlayer(side, index, role) {
      const home = side === "home";
      return {
        id: `${side}-bench-filler-${index}`,
        name: home ? `Bench Filler ${index + 1}` : `Rival Filler ${index + 1}`,
        rarity: "Starter",
        position: role,
        grade: home ? 49 : 72,
        speed: home ? 3 : 5,
        shot: home ? 2 : 5,
        dribble: home ? 3 : 5,
        defense: role === "G" || role === "CB" ? 6 : 4,
      };
    }

    createFieldPlayer(player, spot, side, index, controlled) {
      const position = player.position || spot.role;
      const role = this.normalizeRole(controlled ? position : spot.role);
      const isKeeper = role === "G";
      const x = side === "home" ? spot.x : this.width - spot.x;
      const unit = {
        id: `${side}-${player.id || index}-${index}`,
        sourceId: player.id,
        name: player.name,
        role,
        side,
        team: side,
        controlled,
        index,
        x,
        y: spot.y,
        homeX: x,
        homeY: spot.y,
        vx: 0,
        vy: 0,
        radius: controlled ? PHYSICS.captainRadius : isKeeper ? PHYSICS.keeperRadius : PHYSICS.playerRadius,
        color: side === "home" ? (controlled ? "#ff5a3d" : "#f97316") : "#3f63ff",
        label: controlled ? this.getInitials(player.name) : this.getRoleLabel(role, index),
        kickCooldown: 0,
        passCooldown: 0,
        hasPossession: false,
        possessionCooldown: 0,
        dribbleTouchTimer: 0,
        isSprinting: false,
        tackleState: null,
        tackleTimer: 0,
        tackleCooldown: 0,
        aiState: "shape",
        visual: this.getVisualProfile(player, side, role, index, controlled),
        facing: side === "home" ? { x: 1, y: 0 } : { x: -1, y: 0 },
        runPhase: 0,
        actionPose: null,
        actionTimer: 0,
        actionDuration: 0,
        gameplay: this.deriveGameplayStats({
          ...player,
          position: role,
        }),
      };
      unit.maxSpeed = unit.gameplay.maxSpeed * (controlled ? 1.04 : 0.88);
      unit.acceleration = unit.gameplay.acceleration * (controlled ? 1.08 : 0.82);
      unit.drag = PHYSICS.playerDrag;
      return unit;
    }

    getVisualProfile(player, side, role, index, controlled) {
      const profile = {
        ...this.getFallbackVisualProfile(side, role, index, controlled),
      };
      const portrait = player && player.portrait ? player.portrait : {};
      const visualProfile = player && player.visualProfile ? player.visualProfile : {};

      if (portrait.skin) profile.skin = portrait.skin;
      if (portrait.hair) profile.hair = portrait.hair;
      if (portrait.hairStyle) profile.hairStyle = portrait.hairStyle;
      if (portrait.accent) profile.accent = portrait.accent;
      if (portrait.shirt) profile.secondaryAccent = portrait.shirt;
      if (portrait.headband) profile.headband = portrait.headband;
      if (portrait.beard) profile.beard = true;

      Object.assign(profile, visualProfile);

      if (role === "G") {
        profile.kit = side === "home" ? "#16a34a" : "#8b5cf6";
        profile.shorts = side === "home" ? "#14532d" : "#4c1d95";
        profile.gloveColor = visualProfile.gloveColor || "#f8fafc";
      }

      if (controlled) {
        profile.kit = "#ff5a3d";
        profile.shorts = "#9a3412";
        profile.stripe = "#ffffff";
      }

      return profile;
    }

    getFallbackVisualProfile(side, role, index, controlled) {
      const skinTones = ["#f1c7a8", "#d9a17a", "#c9855c", "#9b6546", "#7c4a2d"];
      const hairTones = ["#171717", "#2d2118", "#4b2e1f", "#f6d365", "#111827"];
      const hairStyles = ["short", "curly", "flat", "messy", "buzz"];
      const seed = Math.abs((side === "home" ? 3 : 11) + index * 7 + role.length * 5);
      const isKeeper = role === "G";

      return {
        kit: isKeeper ? (side === "home" ? "#16a34a" : "#8b5cf6") : side === "home" ? (controlled ? "#ff5a3d" : "#f97316") : "#3f63ff",
        shorts: isKeeper ? (side === "home" ? "#14532d" : "#4c1d95") : side === "home" ? "#7c2d12" : "#172554",
        stripe: "#ffffff",
        skin: skinTones[seed % skinTones.length],
        hair: hairTones[(seed + 2) % hairTones.length],
        hairStyle: hairStyles[(seed + 1) % hairStyles.length],
        bootColor: index % 3 === 0 ? "#f8fafc" : "#111827",
        gloveColor: "#f8fafc",
        accent: side === "home" ? "#fed7aa" : "#bfdbfe",
        secondaryAccent: side === "home" ? "#fdba74" : "#93c5fd",
        headband: null,
        beard: false,
        build: isKeeper ? "stocky" : index % 5 === 0 ? "tall" : index % 4 === 0 ? "compact" : "balanced",
      };
    }

    getFormationIndex(position) {
      const role = this.normalizeRole(position);
      if (role === "G") return 0;
      if (role === "LB") return 1;
      if (role === "CB") return 2;
      if (role === "RB") return 4;
      if (role === "CM" || role === "CDM") return 6;
      if (role === "CAM" || role === "RM") return 7;
      if (role === "LW") return 8;
      if (role === "ST") return 9;
      if (role === "RW") return 10;
      return 9;
    }

    normalizeRole(position) {
      const role = String(position || "ST").toUpperCase();
      if (role === "GK") return "G";
      return role;
    }

    getRoleLabel(role, index) {
      if (role === "G") return "GK";
      if (role === "CB") return index === 2 ? "CB" : "CB";
      return role.slice(0, 2);
    }

    deriveGameplayStats(player) {
      const grade = Number.isFinite(player.grade) ? player.grade : 60;
      const gradeBoost = clamp((grade - 60) / 60, 0, 1);
      const speed = clamp((player.speed - 2) / 8, 0, 1);
      const shot = clamp((player.shot - 2) / 8, 0, 1);
      const dribble = clamp((player.dribble - 2) / 8, 0, 1);
      const defense = clamp((player.defense - 2) / 8, 0, 1);
      const position = this.normalizeRole(player.position);
      const isKeeper = position === "G";
      const isStriker = position === "ST";
      const isWing = position === "LW" || position === "RW";
      const isDefender = position === "CB" || position === "LB" || position === "RB";

      const positionSpeedBoost = isWing ? 0.1 : isKeeper ? -0.08 : isDefender ? -0.04 : 0;
      const positionShotBoost = isStriker ? 0.1 : isKeeper ? -0.24 : 0;
      const safeGradeBoost = gradeBoost * 0.1;
      const maxSpeed = clamp(
        lerp(PHYSICS.starterMaxSpeed, PHYSICS.eliteMaxSpeed, speed + positionSpeedBoost + safeGradeBoost),
        PHYSICS.starterMaxSpeed,
        isKeeper ? 275 : PHYSICS.eliteMaxSpeed,
      );

      return {
        maxSpeed,
        acceleration: clamp(PHYSICS.playerAcceleration * (0.82 + speed * 0.26 + gradeBoost * 0.1), 960, 1580),
        tapKickSpeed: clamp(PHYSICS.tapKickSpeed + shot * 70 + gradeBoost * 22 + positionShotBoost * 100, 210, 390),
        chargedKickSpeed: clamp(
          PHYSICS.chargedKickMaxSpeed + shot * 30 + gradeBoost * 18 + positionShotBoost * 110,
          490,
          isKeeper ? 610 : PHYSICS.ballMaxSpeed,
        ),
        shotAccuracy: clamp(0.1 + shot * 0.12 + gradeBoost * 0.08, 0.08, 0.28),
        dribbleControl: clamp(0.56 + dribble * 0.35 + gradeBoost * 0.1, 0.48, 1.04),
        tackleStrength: clamp(0.62 + defense * 0.42 + gradeBoost * 0.08, 0.5, 1.14),
        staminaDrain: clamp(0.26 - speed * 0.07 - gradeBoost * 0.04, 0.13, 0.32),
        staminaRecovery: clamp(0.24 + speed * 0.08 + gradeBoost * 0.05, 0.2, 0.38),
        keeperReach: isKeeper ? clamp(13 + defense * 13 + gradeBoost * 5, 15, 28) : 0,
        isKeeper,
      };
    }

    getDifficultySettings(wins) {
      if (wins >= 6) {
        return {
          label: "Hard AI",
          reactionTime: 0.08,
          shotError: 28,
          recoverTime: 0.24,
          pressLine: 0.46,
        };
      }

      if (wins >= 3) {
        return {
          label: "Medium AI",
          reactionTime: 0.14,
          shotError: 48,
          recoverTime: 0.34,
          pressLine: 0.52,
        };
      }

      return {
        label: "Easy AI",
        reactionTime: 0.22,
        shotError: 72,
        recoverTime: 0.44,
        pressLine: 0.58,
      };
    }

    createGoalPosts() {
      const goalTop = this.height / 2 - this.goalHeight / 2;
      const goalBottom = this.height / 2 + this.goalHeight / 2;

      return [
        { x: this.goalWidth, y: goalTop, radius: PHYSICS.postRadius },
        { x: this.goalWidth, y: goalBottom, radius: PHYSICS.postRadius },
        { x: this.width - this.goalWidth, y: goalTop, radius: PHYSICS.postRadius },
        { x: this.width - this.goalWidth, y: goalBottom, radius: PHYSICS.postRadius },
      ];
    }

    handleKeyDown(event) {
      const key = this.normalizeKey(event.key, event.code);

      if (key === "`" || key === "F2") {
        event.preventDefault();
        if (!event.repeat) this.debug = !this.debug;
        return;
      }

      if (!this.isGameKey(key)) return;
      event.preventDefault();

      if (this.isShootKey(key)) {
        if (event.repeat || this.shotCharge) return;
        this.keys[key] = true;
        this.startShotCharge(key);
        return;
      }

      if (this.isPassKey(key)) {
        this.keys[key] = true;
        if (!event.repeat) this.passBall(this.player);
        return;
      }

      if (this.isTackleKey(key)) {
        this.keys[key] = true;
        if (!event.repeat) this.tackle(this.player);
        return;
      }

      this.keys[key] = true;
    }

    handleKeyUp(event) {
      const key = this.normalizeKey(event.key, event.code);
      if (!this.isGameKey(key)) return;

      event.preventDefault();
      this.keys[key] = false;

      if (this.isShootKey(key) && this.shotCharge && this.shotCharge.key === key) {
        this.releaseShotCharge(key);
      }
    }

    normalizeKey(key, code) {
      if (key === "Spacebar" || code === "Space") return " ";
      if (key === "Shift" || code === "ShiftLeft" || code === "ShiftRight") return "Shift";
      if (key === "`" || code === "Backquote") return "`";
      return key.length === 1 ? key.toLowerCase() : key;
    }

    isGameKey(key) {
      return [
        "w",
        "a",
        "s",
        "d",
        "ArrowUp",
        "ArrowLeft",
        "ArrowDown",
        "ArrowRight",
        " ",
        "Shift",
        "j",
        "x",
        "k",
        "l",
        "c",
      ].includes(key);
    }

    isShootKey(key) {
      return key === " " || key === "k";
    }

    isPassKey(key) {
      return key === "j" || key === "x";
    }

    isTackleKey(key) {
      return key === "l" || key === "c";
    }

    loop(timestamp) {
      if (this.destroyed) return;

      this.currentTimestamp = timestamp;
      if (this.lastTimestamp === null) this.lastTimestamp = timestamp;

      const elapsedMs = timestamp - this.lastTimestamp;
      this.lastTimestamp = timestamp;

      if (this.ended || timestamp < this.pauseUntil) {
        this.accumulator = 0;
        this.draw();
        this.animationFrame = requestAnimationFrame(this.loop);
        return;
      }

      if (elapsedMs > PHYSICS.maxFrameGapMs) {
        this.accumulator = 0;
        this.draw();
        this.animationFrame = requestAnimationFrame(this.loop);
        return;
      }

      this.accumulator += elapsedMs / 1000;
      let steps = 0;

      while (this.accumulator >= PHYSICS.fixedDt && steps < PHYSICS.maxSubSteps) {
        this.update(PHYSICS.fixedDt);
        this.accumulator -= PHYSICS.fixedDt;
        steps += 1;
      }

      if (steps === PHYSICS.maxSubSteps) this.accumulator = 0;

      this.draw();
      this.animationFrame = requestAnimationFrame(this.loop);
    }

    update(dt) {
      this.matchTime += dt;
      this.kickCooldown = Math.max(0, this.kickCooldown - dt);
      this.passCooldown = Math.max(0, this.passCooldown - dt);
      this.tackleCooldown = Math.max(0, this.tackleCooldown - dt);
      this.ball.looseTimer = Math.max(0, this.ball.looseTimer - dt);
      this.messageTimer = Math.max(0, this.messageTimer - dt);
      this.goalFlash = Math.max(0, this.goalFlash - dt);
      this.shakeTime = Math.max(0, this.shakeTime - dt);
      this.players.forEach((unit) => {
        unit.kickCooldown = Math.max(0, unit.kickCooldown - dt);
        unit.passCooldown = Math.max(0, unit.passCooldown - dt);
        unit.possessionCooldown = Math.max(0, unit.possessionCooldown - dt);
        unit.dribbleTouchTimer = Math.max(0, unit.dribbleTouchTimer - dt);
        unit.tackleCooldown = Math.max(0, unit.tackleCooldown - dt);
        unit.tackleTimer = Math.max(0, unit.tackleTimer - dt);
        if (unit.tackleTimer === 0) unit.tackleState = null;
      });

      this.updateEffects(dt);
      this.updatePlayer(dt);
      this.homeChaser = this.getTeamChaser(this.homeTeam);
      this.awayChaser = this.getTeamChaser(this.awayTeam);
      this.homeTeam.forEach((unit) => {
        if (!unit.controlled) this.updateAutonomousUnit(unit, dt);
      });
      this.awayTeam.forEach((unit) => this.updateAutonomousUnit(unit, dt));

      this.resolvePlayerCollisions();
      this.updatePossession(dt);

      const owner = this.getBallOwner();
      if (owner) {
        this.updateCarriedBall(owner, dt);
        this.resolveBallWallCollision();
        this.resolveBallPostCollision();
        this.updateBallTrail(dt);
      } else {
        this.players.forEach((unit) => this.handleEntityBallCollision(unit));
        this.updateBall(dt);
      }

      this.checkGoals();
      this.aiState = this.getTeamMood(this.awayTeam);
      this.players.forEach((unit) => {
        this.updateUnitFacing(unit, dt);
        this.updateUnitAnimation(unit, dt);
      });
      this.updateCamera(dt);
    }

    updatePlayer(dt) {
      const input = this.getInputVector();
      const moving = Math.hypot(input.x, input.y) > 0;
      const sprinting = moving && this.keys.Shift && this.stamina > 0.08;
      const sprintFactor = sprinting ? PHYSICS.sprintMultiplier : 1;
      const maxSpeed = this.player.gameplay.maxSpeed * sprintFactor;
      const acceleration = this.player.gameplay.acceleration * (sprinting ? 1.11 : 1);
      this.player.isSprinting = sprinting;

      if (moving) {
        this.player.vx += input.x * acceleration * dt;
        this.player.vy += input.y * acceleration * dt;
        this.lastDirection = input;
      }

      this.applyDrag(this.player, this.player.drag, dt);
      this.limitVelocity(this.player, maxSpeed);
      this.integrate(this.player, dt);
      this.keepInsideField(this.player);

      if (this.player.hasPossession) {
        this.limitVelocity(this.player, this.player.gameplay.maxSpeed * PHYSICS.sprintMultiplier * POSSESSION.maxCarrySpeedRatio);
      }

      if (sprinting) {
        this.stamina = Math.max(0, this.stamina - this.player.gameplay.staminaDrain * dt);
      } else {
        this.stamina = Math.min(1, this.stamina + this.player.gameplay.staminaRecovery * dt);
      }
    }

    updateUnitFacing(unit) {
      const speed = this.getSpeed(unit);

      if (unit.controlled && Math.hypot(this.lastDirection.x, this.lastDirection.y) > 0 && speed > 4) {
        unit.facing = { ...this.lastDirection };
        return;
      }

      if (speed > PLAYER_VISUALS.minFacingSpeed) {
        unit.facing = this.normalizeVector(unit.vx, unit.vy);
      }
    }

    updateUnitAnimation(unit, dt) {
      const speed = this.getSpeed(unit);

      if (!this.reduceMotion && speed > PLAYER_VISUALS.minFacingSpeed) {
        unit.runPhase += speed * dt * PLAYER_VISUALS.runCycleSpeed;
      }

      if (unit.actionTimer > 0) {
        unit.actionTimer = Math.max(0, unit.actionTimer - dt);
        if (unit.actionTimer === 0) {
          unit.actionPose = null;
          unit.actionDuration = 0;
        }
      }
    }

    updateCamera(dt) {
      const owner = this.getBallOwner();
      const focus = owner && owner.side === "home" ? owner : this.player;
      const ballWeight = this.player.hasPossession ? 0.2 : 0.38;
      const targetX = focus.x * (1 - ballWeight) + this.ball.x * ballWeight;
      const targetY = focus.y * (1 - ballWeight) + this.ball.y * ballWeight;
      const speed = this.getSpeed(focus);
      const targetZoom = focus.hasPossession ? 1.78 : speed > 220 ? 1.58 : 1.46;
      const smooth = 1 - Math.exp(-dt * 5.6);

      this.camera.targetZoom = targetZoom;
      this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * smooth;

      const visibleWidth = this.width / this.camera.zoom;
      const visibleHeight = this.height / this.camera.zoom;
      this.camera.x += (targetX - this.camera.x) * smooth;
      this.camera.y += (targetY - this.camera.y) * smooth;
      this.camera.x = clamp(this.camera.x, visibleWidth / 2, this.width - visibleWidth / 2);
      this.camera.y = clamp(this.camera.y, visibleHeight / 2, this.height - visibleHeight / 2);
    }

    updateAutonomousUnit(unit, dt) {
      const target = this.getUnitTarget(unit);
      const dx = target.x - unit.x;
      const dy = target.y - unit.y;
      const direction = this.normalizeVector(dx, dy);
      const distance = Math.hypot(dx, dy);
      const chaseBoost = unit.aiState === "press" ? 1.08 : unit.aiState === "recover" ? 1.04 : unit.aiState === "carry" ? 0.96 : 1;

      if (distance > 3) {
        unit.vx += direction.x * unit.acceleration * chaseBoost * dt;
        unit.vy += direction.y * unit.acceleration * chaseBoost * dt;
      }

      this.applyDrag(unit, unit.drag, dt);
      this.limitVelocity(unit, unit.maxSpeed * chaseBoost);
      this.integrate(unit, dt);
      this.keepInsideField(unit);
      unit.isSprinting = this.getSpeed(unit) > unit.maxSpeed * 0.86;

      if (unit.role === "G") {
        this.keepKeeperInBox(unit);
      }

      if (unit.hasPossession || !this.isBallOwned()) this.tryUnitKick(unit);
    }

    getUnitTarget(unit) {
      const attackingRight = unit.side === "home";
      const teamChaser = unit.side === "home" ? this.homeChaser : this.awayChaser;
      const ownGoalX = attackingRight ? 0 : this.width;
      const attackDirection = attackingRight ? 1 : -1;
      const ballDistance = this.distance(unit, this.ball);
      const ballNearOwnGoal = attackingRight ? this.ball.x < 185 : this.ball.x > this.width - 185;
      const owner = this.getBallOwner();

      if (unit.role === "G") {
        unit.aiState = ballNearOwnGoal || ballDistance < 72 ? "save" : "shape";
        return {
          x: unit.homeX,
          y: clamp(this.ball.y, this.height / 2 - this.goalHeight / 2 + 16, this.height / 2 + this.goalHeight / 2 - 16),
        };
      }

      if (owner) {
        if (owner === unit) {
          const shootingRange = attackingRight ? unit.x > this.width * 0.67 : unit.x < this.width * 0.33;
          unit.aiState = shootingRange ? "shoot" : "carry";
          return this.withSeparation(unit, {
            x: clamp(unit.x + attackDirection * 120, 36, this.width - 36),
            y: clamp(this.height / 2 + (unit.index - 5) * 9, 32, this.height - 32),
          });
        }

        if (owner.side === unit.side) {
          unit.aiState = "support";
          return this.withSeparation(unit, this.getSupportSpot(unit, owner));
        }

        const defenders = this.getNearestDefenders(owner, 2);
        if (defenders[0] === unit) {
          unit.aiState = "press";
          return this.withSeparation(unit, {
            x: clamp(owner.x - owner.facing.x * 14, 36, this.width - 36),
            y: clamp(owner.y - owner.facing.y * 14, 32, this.height - 32),
          });
        }

        if (defenders[1] === unit) {
          unit.aiState = "mark";
          const laneTarget = this.getBestPassTarget(owner) || owner;
          return this.withSeparation(unit, this.getMarkingSpot(unit, laneTarget));
        }
      }

      if (unit === teamChaser && ballDistance < 360) {
        unit.aiState = "recover";
        return this.withSeparation(unit, {
          x: clamp(this.ball.x + this.ball.vx * 0.18, 40, this.width - 40),
          y: clamp(this.ball.y + this.ball.vy * 0.18, 32, this.height - 32),
        });
      }

      const linePull = clamp((this.ball.x - this.width / 2) / 8, -42, 42) * attackDirection;
      const yPull = clamp((this.ball.y - this.height / 2) * 0.16, -34, 34);
      const defenderHold = Math.abs(unit.homeX - ownGoalX) < 190 ? 0.45 : 1;
      unit.aiState = "shape";

      return this.withSeparation(unit, {
        x: clamp(unit.homeX + linePull * defenderHold, 36, this.width - 36),
        y: clamp(unit.homeY + yPull, 30, this.height - 30),
      });
    }

    getNearestDefenders(owner, count) {
      return this.players
        .filter((unit) => unit.side !== owner.side && unit.role !== "G")
        .sort((a, b) => this.distance(a, owner) - this.distance(b, owner))
        .slice(0, count);
    }

    getSupportSpot(unit, owner) {
      const attackingRight = unit.side === "home";
      const attackDirection = attackingRight ? 1 : -1;
      const wideY = unit.role === "LW" ? 96 : unit.role === "RW" ? this.height - 96 : null;
      const forwardBias = unit.role === "ST" || unit.role === "LW" || unit.role === "RW" ? 110 : 48;
      const sideOffset = unit.index % 2 === 0 ? -72 : 72;
      return {
        x: clamp(owner.x + attackDirection * forwardBias, 42, this.width - 42),
        y: clamp(wideY || owner.y + sideOffset, 38, this.height - 38),
      };
    }

    getMarkingSpot(unit, opponent) {
      const defendingLeft = unit.side === "home";
      const goalSide = defendingLeft ? -1 : 1;
      return {
        x: clamp(opponent.x + goalSide * 28, 36, this.width - 36),
        y: clamp(opponent.y + (unit.index % 2 === 0 ? -18 : 18), 32, this.height - 32),
      };
    }

    withSeparation(unit, target) {
      let sx = 0;
      let sy = 0;
      const team = unit.side === "home" ? this.homeTeam : this.awayTeam;
      for (const mate of team) {
        if (mate === unit) continue;
        const dx = unit.x - mate.x;
        const dy = unit.y - mate.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 0 && distance < 42) {
          const force = (42 - distance) / 42;
          sx += (dx / distance) * force * 24;
          sy += (dy / distance) * force * 24;
        }
      }
      return {
        x: clamp(target.x + sx, 30, this.width - 30),
        y: clamp(target.y + sy, 30, this.height - 30),
      };
    }

    getTeamChaser(team) {
      const candidates = team.filter((unit) => {
        if (unit.controlled) return false;
        if (unit.role === "G") return unit.side === "home" ? this.ball.x < 160 : this.ball.x > this.width - 160;
        return true;
      });

      return candidates.reduce((best, unit) => {
        const distance = this.distance(unit, this.ball);
        if (!best || distance < best.distance) return { unit, distance };
        return best;
      }, null)?.unit;
    }

    getTeamMood(team) {
      if (team.some((unit) => unit.aiState === "save")) return "Save";
      if (team.some((unit) => unit.aiState === "press")) return "Press";
      if (team.some((unit) => unit.aiState === "recover")) return "Recover";
      if (team.some((unit) => unit.aiState === "support")) return "Support";
      return "Shape";
    }

    tryUnitKick(unit) {
      if (unit.controlled || unit.kickCooldown > 0) return false;

      const reach = this.getUnitBallReach(unit);
      const ownsBall = unit.hasPossession;
      if (!ownsBall && (this.isBallOwned() || this.distance(unit, this.ball) > reach)) return false;

      const attackingRight = unit.side === "home";
      const attackGoalX = attackingRight ? this.width : 0;
      const ownBox = attackingRight ? this.ball.x < 150 : this.ball.x > this.width - 150;
      const attackingThird = attackingRight ? this.ball.x > this.width * 0.64 : this.ball.x < this.width * 0.36;
      let target;
      let speed;

      let releaseReason = "shot";
      if (unit.role === "G" || ownBox) {
        target = { x: unit.x + (attackingRight ? 260 : -260), y: this.height / 2 };
        speed = unit.gameplay.tapKickSpeed + 120;
        releaseReason = "pass";
      } else if (attackingThird || unit.role === "ST" || unit.role === "LW" || unit.role === "RW") {
        const error = unit.side === "away" ? this.difficulty.shotError : 34;
        target = { x: attackGoalX, y: this.height / 2 + (Math.random() - 0.5) * error };
        speed = unit.gameplay.chargedKickSpeed * (unit.role === "ST" ? 0.86 : 0.76);
      } else {
        const receiver = this.getForwardTeammate(unit);
        target = receiver || { x: unit.x + (attackingRight ? 170 : -170), y: unit.y };
        speed = unit.gameplay.tapKickSpeed + 35;
        releaseReason = "pass";
      }

      const aim = this.normalizeVector(target.x - unit.x, target.y - unit.y);
      const receiver = releaseReason === "pass" ? this.getForwardTeammate(unit) : null;
      this.clearBallOwner(releaseReason, { intendedReceiverId: receiver ? receiver.id : null });
      this.ball.x = unit.x + aim.x * (unit.radius + this.ball.radius + 2);
      this.ball.y = unit.y + aim.y * (unit.radius + this.ball.radius + 2);
      this.ball.vx = aim.x * speed + unit.vx * 0.08;
      this.ball.vy = aim.y * speed + unit.vy * 0.08;
      this.limitVelocity(this.ball, PHYSICS.ballMaxSpeed);
      unit.kickCooldown = unit.role === "G" ? 0.7 : 0.46;
      this.setUnitActionPose(unit, "kick", PLAYER_VISUALS.actionKickDuration);

      if (this.messageTimer <= 0 || this.distance(unit, this.player) < 180) {
        this.flashMessage(`${unit.label} moves it`, 0.7);
      }

      this.pushEffect("kick", this.ball.x, this.ball.y, unit.side === "home" ? "#fed7aa" : "#93c5fd");
      return true;
    }

    getForwardTeammate(unit) {
      const attackingRight = unit.side === "home";
      const team = unit.side === "home" ? this.homeTeam : this.awayTeam;
      const options = team
        .filter((mate) => mate !== unit && mate.role !== "G")
        .filter((mate) => (attackingRight ? mate.x > unit.x + 18 : mate.x < unit.x - 18))
        .sort((a, b) => this.distance(a, unit) - this.distance(b, unit));

      return options[0] || null;
    }

    updateBall(dt) {
      this.integrate(this.ball, dt);
      this.applyDrag(this.ball, this.ball.drag, dt);
      this.limitVelocity(this.ball, this.ball.maxSpeed);

      if (this.getSpeed(this.ball) < PHYSICS.ballStopSpeed) {
        this.ball.vx = 0;
        this.ball.vy = 0;
      }

      this.resolveBallWallCollision();
      this.resolveBallPostCollision();
      this.updateBallTrail(dt);
    }

    getBallOwner() {
      if (!this.ball.ownerId) return null;
      return this.players.find((unit) => unit.id === this.ball.ownerId) || null;
    }

    isBallOwned() {
      return Boolean(this.getBallOwner());
    }

    setBallOwner(unit) {
      if (!unit || this.ended) return;
      this.players.forEach((player) => {
        player.hasPossession = player === unit;
      });
      this.ball.ownerId = unit.id;
      this.ball.ownerSide = unit.side;
      this.ball.possessionTimer = 0;
      this.ball.looseTimer = 0;
      this.ball.lastOwnerId = unit.id;
      this.ball.intendedReceiverId = null;
      unit.possessionCooldown = unit.controlled ? POSSESSION.controlledPossessionGrace : POSSESSION.aiPossessionGrace;
    }

    clearBallOwner(reason = "loose", options = {}) {
      const owner = this.getBallOwner();
      if (owner) owner.hasPossession = false;
      this.ball.ownerId = null;
      this.ball.ownerSide = null;
      this.ball.lastOwnerId = owner ? owner.id : this.ball.lastOwnerId;
      this.ball.possessionTimer = 0;
      this.ball.intendedReceiverId = options.intendedReceiverId || null;

      const looseTimes = {
        shot: POSSESSION.shotLooseTimer,
        pass: POSSESSION.passLooseTimer,
        tackle: POSSESSION.tackleLooseTimer,
        bounce: POSSESSION.bounceLooseTimer,
        save: POSSESSION.tackleLooseTimer,
        reset: 0,
        goal: 0,
        loose: 0.12,
      };
      this.ball.looseTimer = looseTimes[reason] ?? looseTimes.loose;
    }

    tryClaimPossession(unit) {
      if (!unit || this.isBallOwned() || unit.possessionCooldown > 0) return false;
      const ballSpeed = this.getSpeed(this.ball);
      const intendedReceiver = this.ball.intendedReceiverId && this.ball.intendedReceiverId === unit.id;
      if (ballSpeed > POSSESSION.releaseSpeed && !unit.gameplay.isKeeper && !intendedReceiver) return false;
      if (intendedReceiver && this.ball.looseTimer > POSSESSION.passLooseTimer - ACTIONS.receiverClaimGrace) return false;
      if (this.ball.looseTimer > 0 && !intendedReceiver) return false;

      const claimRadius = unit.controlled
        ? POSSESSION.controlledClaimRadius
        : unit.gameplay.isKeeper
          ? POSSESSION.keeperClaimRadius
          : POSSESSION.claimRadius;

      if (this.distance(unit, this.ball) > claimRadius) return false;
      this.setBallOwner(unit);
      if (unit.controlled) this.flashMessage(`${unit.name} dribbles`, 0.65);
      return true;
    }

    updatePossession(dt) {
      const owner = this.getBallOwner();
      if (owner) {
        this.ball.possessionTimer += dt;
        for (const defender of this.players) {
          if (defender.side !== owner.side && this.canContestPossession(defender, owner)) {
            this.resolvePossessionContest(defender, owner, defender.tackleTimer > 0);
            if (!this.getBallOwner() || this.getBallOwner() !== owner) break;
          }
        }
        return;
      }

      const candidates = [...this.players].sort((a, b) => {
        if (a.controlled !== b.controlled) return a.controlled ? -1 : 1;
        if (this.ball.intendedReceiverId === a.id) return -1;
        if (this.ball.intendedReceiverId === b.id) return 1;
        return this.distance(a, this.ball) - this.distance(b, this.ball);
      });

      for (const unit of candidates) {
        if (this.tryClaimPossession(unit)) break;
      }
    }

    getDribbleAnchor(owner) {
      const facing = owner.facing || (owner.side === "home" ? { x: 1, y: 0 } : { x: -1, y: 0 });
      const distance = owner.isSprinting ? POSSESSION.sprintControlDistance : POSSESSION.closeControlDistance;
      return {
        x: owner.x + facing.x * distance,
        y: owner.y + facing.y * distance,
      };
    }

    updateCarriedBall(owner, dt) {
      const drift = this.distance(owner, this.ball);
      if (drift > owner.radius + POSSESSION.sprintControlDistance + 30) {
        this.clearBallOwner("loose");
        return;
      }

      const anchor = this.getDribbleAnchor(owner);
      const control = clamp(owner.gameplay.dribbleControl, 0.5, 1.08);
      const blend = (owner.isSprinting ? POSSESSION.sprintDribbleBlend : POSSESSION.dribbleBlend) * control;
      const facing = owner.facing || this.normalizeVector(owner.vx, owner.vy);
      const speed = this.getSpeed(owner);
      const touchSpeed = owner.dribbleTouchTimer <= 0 ? 44 + speed * 0.1 : 22 + speed * 0.05;

      this.ball.x += (anchor.x - this.ball.x) * blend;
      this.ball.y += (anchor.y - this.ball.y) * blend;
      this.ball.vx = owner.vx * 0.82 + facing.x * touchSpeed;
      this.ball.vy = owner.vy * 0.82 + facing.y * touchSpeed;
      this.limitVelocity(this.ball, owner.gameplay.maxSpeed * PHYSICS.sprintMultiplier);
      owner.dribbleTouchTimer = owner.dribbleTouchTimer <= 0 ? 0.16 : owner.dribbleTouchTimer;

      if (!this.isBallInGoalMouth()) {
        this.ball.x = clamp(this.ball.x, this.ball.radius, this.width - this.ball.radius);
      }
      this.ball.y = clamp(this.ball.y, this.ball.radius, this.height - this.ball.radius);

      if (!this.reduceMotion && this.getSpeed(this.ball) > 260) {
        this.updateBallTrail(dt);
      }
    }

    canContestPossession(defender, owner) {
      if (!defender || !owner || defender === owner) return false;
      if (owner.possessionCooldown > 0) return false;
      if (defender.side === owner.side) return false;
      const distance = this.distance(defender, owner);
      if (distance > POSSESSION.stealContestRadius) return false;
      const relativeSpeed = Math.hypot(defender.vx - owner.vx, defender.vy - owner.vy);
      if (owner.controlled && defender.tackleTimer <= 0) {
        return distance < 18 && (relativeSpeed >= 150 || owner.isSprinting);
      }
      return defender.tackleTimer > 0 || relativeSpeed >= POSSESSION.minStealRelativeSpeed || owner.isSprinting;
    }

    resolvePossessionContest(defender, owner, manual) {
      const toOwner = this.normalizeVector(owner.x - defender.x, owner.y - defender.y);
      const defenderMove = this.normalizeVector(defender.vx, defender.vy);
      const ownerMove = this.normalizeVector(owner.vx, owner.vy);
      const approach = defenderMove.x * toOwner.x + defenderMove.y * toOwner.y;
      const ownerShield = ownerMove.x * toOwner.x + ownerMove.y * toOwner.y;
      const relativeSpeed = Math.hypot(defender.vx - owner.vx, defender.vy - owner.vy);
      const manualBonus = manual ? 0.2 : 0;
      const sprintPenalty = owner.isSprinting ? 0.12 : 0;
      const score =
        defender.gameplay.tackleStrength * 0.45 +
        clamp(relativeSpeed / 320, 0, 0.28) +
        approach * 0.18 +
        manualBonus +
        sprintPenalty -
        owner.gameplay.dribbleControl * 0.3 -
        Math.max(0, ownerShield) * 0.16;

      if (score >= ACTIONS.cleanStealThreshold) {
        this.setBallOwner(defender);
        this.setUnitActionPose(defender, "tackle", PLAYER_VISUALS.actionTackleDuration);
        this.pushEffect("steal", this.ball.x, this.ball.y, defender.side === "home" ? "#fed7aa" : "#93c5fd");
        if (defender.controlled) this.flashMessage(`${defender.name} wins it`, 0.75);
        return "steal";
      }

      if (score >= ACTIONS.pokeLooseThreshold) {
        this.clearBallOwner("tackle");
        this.ball.vx = (this.ball.x - defender.x) * 10 + defender.vx * 0.35;
        this.ball.vy = (this.ball.y - defender.y) * 10 + defender.vy * 0.35;
        this.limitVelocity(this.ball, 360);
        this.setUnitActionPose(defender, "tackle", PLAYER_VISUALS.actionTackleDuration);
        this.pushEffect("tackle", this.ball.x, this.ball.y, "#fef08a");
        return "loose";
      }

      if (manual) {
        defender.vx *= ACTIONS.tackleWhiffSlowdown;
        defender.vy *= ACTIONS.tackleWhiffSlowdown;
      }
      return "miss";
    }

    tackle(unit) {
      if (!unit || unit.tackleCooldown > 0 || this.tackleCooldown > 0 || this.ended) return false;
      unit.tackleCooldown = ACTIONS.tackleCooldown;
      unit.tackleTimer = ACTIONS.tackleDuration;
      unit.tackleState = "active";
      this.tackleCooldown = ACTIONS.tackleCooldown;
      this.setUnitActionPose(unit, "tackle", PLAYER_VISUALS.actionTackleDuration);

      const owner = this.getBallOwner();
      if (owner && owner.side !== unit.side && this.distance(unit, owner) <= ACTIONS.tackleRange) {
        const result = this.resolvePossessionContest(unit, owner, true);
        if (result !== "miss") return true;
      }

      if (!owner && this.distance(unit, this.ball) <= ACTIONS.tackleRange) {
        const aim = unit.facing || this.normalizeVector(this.ball.x - unit.x, this.ball.y - unit.y);
        this.ball.vx += aim.x * 160 + unit.vx * 0.25;
        this.ball.vy += aim.y * 160 + unit.vy * 0.25;
        this.limitVelocity(this.ball, 380);
        this.pushEffect("tackle", this.ball.x, this.ball.y, "#fef08a");
        return true;
      }

      unit.vx *= ACTIONS.tackleWhiffSlowdown;
      unit.vy *= ACTIONS.tackleWhiffSlowdown;
      return false;
    }

    getInputVector() {
      let dx = 0;
      let dy = 0;

      if (this.keys.w || this.keys.ArrowUp) dy -= 1;
      if (this.keys.s || this.keys.ArrowDown) dy += 1;
      if (this.keys.a || this.keys.ArrowLeft) dx -= 1;
      if (this.keys.d || this.keys.ArrowRight) dx += 1;

      return this.normalizeVector(dx, dy);
    }

    startShotCharge(key = " ") {
      if (this.ended || this.pauseUntil > this.currentTimestamp || this.kickCooldown > 0) return;

      this.shotCharge = {
        startedAt: this.currentTimestamp || performance.now(),
        key,
      };
    }

    releaseShotCharge(key = " ") {
      if (!this.shotCharge) return;
      if (this.shotCharge.key !== key) return;

      const startedAt = this.shotCharge.startedAt;
      this.shotCharge = null;

      if (this.ended || this.pauseUntil > this.currentTimestamp) return;

      if (!this.canReachBall() && !this.player.hasPossession) {
        this.flashMessage("Too far from the ball", 0.8);
        return;
      }

      const chargeMs = clamp((this.currentTimestamp || performance.now()) - startedAt, 0, PHYSICS.maxChargeMs);
      this.firePlayerShot(chargeMs);
    }

    firePlayerShot(chargeMs) {
      if (this.kickCooldown > 0) return;

      const chargeRatio = clamp(chargeMs / PHYSICS.maxChargeMs, 0, 1);
      const isTap = chargeMs < 120;
      const aim = this.getShotAim();
      const speed = isTap
        ? this.player.gameplay.tapKickSpeed
        : lerp(PHYSICS.chargedKickMinSpeed, this.player.gameplay.chargedKickSpeed, chargeRatio);

      this.clearBallOwner("shot");
      this.ball.x = this.player.x + aim.x * (this.player.radius + this.ball.radius + 2);
      this.ball.y = this.player.y + aim.y * (this.player.radius + this.ball.radius + 2);
      this.ball.vx = aim.x * speed + this.player.vx * 0.12;
      this.ball.vy = aim.y * speed + this.player.vy * 0.12;
      this.limitVelocity(this.ball, PHYSICS.ballMaxSpeed);
      this.kickCooldown = 0.16;
      this.setUnitActionPose(this.player, "kick", PLAYER_VISUALS.actionKickDuration);
      this.flashMessage(isTap ? `${this.selectedPlayer.name} taps` : `${this.selectedPlayer.name} shoots`, 0.8);
      this.pushEffect("kick", this.ball.x, this.ball.y, isTap ? "#d9f99d" : "#facc15");
      this.playSound(isTap ? "tap" : "kick", isTap ? 0.02 : 0.04);
    }

    getBestPassTarget(unit) {
      const team = unit.side === "home" ? this.homeTeam : this.awayTeam;
      const attackingRight = unit.side === "home";
      const facing = unit.facing || (attackingRight ? { x: 1, y: 0 } : { x: -1, y: 0 });
      const options = team
        .filter((mate) => mate !== unit)
        .map((mate) => {
          const toMate = this.normalizeVector(mate.x - unit.x, mate.y - unit.y);
          const distance = this.distance(unit, mate);
          const forward = attackingRight ? mate.x - unit.x : unit.x - mate.x;
          const dot = facing.x * toMate.x + facing.y * toMate.y;
          const keeperPenalty = mate.role === "G" ? -0.55 : 0;
          const forwardBonus = clamp(forward / 220, -0.4, 0.45);
          const nearBonus = clamp(1 - distance / 420, -0.15, 0.35);
          return { mate, score: dot * ACTIONS.passAssistAngle + forwardBonus + nearBonus + keeperPenalty };
        })
        .sort((a, b) => b.score - a.score);

      return options[0]?.mate || null;
    }

    getPassAim(unit, target) {
      if (!target) return unit.facing || (unit.side === "home" ? { x: 1, y: 0 } : { x: -1, y: 0 });
      const lead = {
        x: target.x + target.vx * 0.18,
        y: target.y + target.vy * 0.18,
      };
      return this.normalizeVector(lead.x - unit.x, lead.y - unit.y);
    }

    passBall(unit, target = null) {
      if (!unit || unit.passCooldown > 0 || this.passCooldown > 0 || this.ended || this.pauseUntil > this.currentTimestamp) return false;
      if (!unit.hasPossession && this.distance(unit, this.ball) > this.getUnitBallReach(unit)) {
        if (unit.controlled) this.flashMessage("Too far to pass", 0.65);
        return false;
      }

      const receiver = target || this.getBestPassTarget(unit);
      const aim = this.getPassAim(unit, receiver);
      const distanceToReceiver = receiver ? this.distance(unit, receiver) : 160;
      const speed = distanceToReceiver > 250 ? ACTIONS.throughPassSpeed : ACTIONS.passSpeed;

      this.clearBallOwner("pass", { intendedReceiverId: receiver ? receiver.id : null });
      this.ball.x = unit.x + aim.x * (unit.radius + this.ball.radius + 3);
      this.ball.y = unit.y + aim.y * (unit.radius + this.ball.radius + 3);
      this.ball.vx = aim.x * speed + unit.vx * 0.08;
      this.ball.vy = aim.y * speed + unit.vy * 0.08;
      this.limitVelocity(this.ball, PHYSICS.ballMaxSpeed);
      unit.passCooldown = ACTIONS.passerCooldownAfterPass;
      unit.possessionCooldown = ACTIONS.passerCooldownAfterPass;
      this.passCooldown = unit.controlled ? 0.2 : 0;
      this.setUnitActionPose(unit, "kick", PLAYER_VISUALS.actionKickDuration);
      this.pushEffect("pass", this.ball.x, this.ball.y, unit.side === "home" ? "#d9f99d" : "#bfdbfe");
      if (unit.controlled) this.flashMessage(receiver ? `Pass to ${receiver.label}` : "Pass", 0.65);
      this.playSound("tap", 0.02);
      return true;
    }

    getShotAim() {
      const input = this.getInputVector();
      let aim = Math.hypot(input.x, input.y) > 0 ? input : this.lastDirection;

      if (Math.hypot(aim.x, aim.y) === 0) {
        aim = this.normalizeVector(this.width - this.player.x, this.height / 2 - this.player.y);
      }

      const starterAssist = this.selectedPlayer.rarity === "Starter" ? 0.18 : 0.08;
      const goalAim = this.normalizeVector(this.width - this.player.x, this.height / 2 - this.player.y);
      return this.normalizeVector(
        aim.x * (1 - starterAssist) + goalAim.x * starterAssist,
        aim.y * (1 - starterAssist) + goalAim.y * starterAssist,
      );
    }

    canReachBall() {
      return this.distance(this.player, this.ball) <= this.getUnitBallReach(this.player);
    }

    getUnitBallReach(unit) {
      const ownBoxBonus = unit.gameplay.isKeeper && this.isBallNearOwnGoal(unit)
        ? unit.gameplay.keeperReach
        : unit.gameplay.keeperReach * 0.35;
      const controlledBonus = unit.controlled ? 18 : 8;
      return unit.radius + this.ball.radius + controlledBonus + ownBoxBonus;
    }

    isBallNearOwnGoal(unit) {
      return unit.side === "home" ? this.ball.x < 245 : this.ball.x > this.width - 245;
    }

    handleEntityBallCollision(unit) {
      if (this.isBallOwned()) return;
      const dx = this.ball.x - unit.x;
      const dy = this.ball.y - unit.y;
      const distance = Math.hypot(dx, dy) || 0.0001;
      const minDistance = this.getUnitBallReach(unit);

      if (distance > minDistance) return;

      if (this.tryClaimPossession(unit)) return;

      const nx = dx / distance;
      const ny = dy / distance;
      const overlap = minDistance - distance;
      this.ball.x += nx * overlap;
      this.ball.y += ny * overlap;

      if (this.tryKeeperSave(unit, nx, ny)) return;
      if (!unit.controlled && this.tryUnitKick(unit)) return;

      const entitySpeed = this.getSpeed(unit);
      const control = unit.gameplay.dribbleControl;
      const touchImpulse = (unit.controlled ? 42 : 28) + control * 32;
      const carry = unit.controlled ? 0.34 : 0.2;

      this.ball.vx += nx * touchImpulse + unit.vx * carry;
      this.ball.vy += ny * touchImpulse + unit.vy * carry;

      if (entitySpeed > 140) {
        this.ball.vx += (unit.vx / Math.max(entitySpeed, 1)) * touchImpulse * 0.28;
        this.ball.vy += (unit.vy / Math.max(entitySpeed, 1)) * touchImpulse * 0.28;
        if (entitySpeed > 185) this.setUnitActionPose(unit, "tackle", PLAYER_VISUALS.actionTackleDuration);
      }

      this.limitVelocity(this.ball, Math.min(PHYSICS.ballMaxSpeed, unit.controlled ? 520 : 430));
    }

    tryKeeperSave(unit, nx, ny) {
      if (!unit.gameplay.isKeeper || !this.isBallNearOwnGoal(unit)) return false;
      if (unit.side === "home" && this.ball.vx >= 0) return false;
      if (unit.side === "away" && this.ball.vx <= 0) return false;

      const clearDirection = unit.side === "home" ? 1 : -1;
      const savePower = 200 + unit.gameplay.tackleStrength * 88;
      const clear = this.normalizeVector(clearDirection, ny * 0.45);
      this.ball.vx = Math.max(Math.abs(this.ball.vx) * 0.25, savePower) * clear.x;
      this.ball.vy = (this.ball.vy * 0.28 + savePower * clear.y) * 0.72;
      this.flashMessage(`${unit.label} save`, 0.85);
      this.pushEffect("save", this.ball.x, this.ball.y, "#86efac");
      this.playSound("save", 0.035);
      unit.kickCooldown = 0.6;
      this.setUnitActionPose(unit, "save", PLAYER_VISUALS.actionSaveDuration);
      return true;
    }

    setUnitActionPose(unit, pose, duration) {
      if (!unit) return;
      unit.actionPose = pose;
      unit.actionTimer = duration;
      unit.actionDuration = duration;
    }

    resolvePlayerCollisions() {
      for (let i = 0; i < this.players.length; i += 1) {
        for (let j = i + 1; j < this.players.length; j += 1) {
          this.resolveCircleCollision(this.players[i], this.players[j], {
            restitution: 0.18,
            moveA: 0.5,
            moveB: 0.5,
          });
        }
      }
    }

    resolveCircleCollision(a, b, options = {}) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy) || 0.0001;
      const minDistance = a.radius + b.radius;

      if (distance >= minDistance) return false;

      const nx = dx / distance;
      const ny = dy / distance;
      const overlap = minDistance - distance;
      const moveA = options.moveA ?? 0.5;
      const moveB = options.moveB ?? 0.5;

      a.x -= nx * overlap * moveA;
      a.y -= ny * overlap * moveA;
      b.x += nx * overlap * moveB;
      b.y += ny * overlap * moveB;

      const restitution = options.restitution ?? 0.25;
      const rvx = (b.vx || 0) - (a.vx || 0);
      const rvy = (b.vy || 0) - (a.vy || 0);
      const velocityAlongNormal = rvx * nx + rvy * ny;

      if (velocityAlongNormal > 0) return true;

      const impulse = (-(1 + restitution) * velocityAlongNormal) / 2;
      a.vx -= impulse * nx;
      a.vy -= impulse * ny;
      b.vx += impulse * nx;
      b.vy += impulse * ny;
      return true;
    }

    resolveBallWallCollision() {
      const goalTop = this.height / 2 - this.goalHeight / 2;
      const goalBottom = this.height / 2 + this.goalHeight / 2;
      const inGoalMouth = this.isBallInGoalMouth();

      if (this.ball.y - this.ball.radius < 0) {
        if (this.isBallOwned()) this.clearBallOwner("bounce");
        this.ball.y = this.ball.radius;
        this.ball.vy = Math.abs(this.ball.vy) * this.ball.restitution;
      }

      if (this.ball.y + this.ball.radius > this.height) {
        if (this.isBallOwned()) this.clearBallOwner("bounce");
        this.ball.y = this.height - this.ball.radius;
        this.ball.vy = -Math.abs(this.ball.vy) * this.ball.restitution;
      }

      if (this.ball.x - this.ball.radius < 0 && !inGoalMouth) {
        if (this.isBallOwned()) this.clearBallOwner("bounce");
        this.ball.x = this.ball.radius;
        this.ball.vx = Math.abs(this.ball.vx) * this.ball.restitution;
      }

      if (this.ball.x + this.ball.radius > this.width && !inGoalMouth) {
        if (this.isBallOwned()) this.clearBallOwner("bounce");
        this.ball.x = this.width - this.ball.radius;
        this.ball.vx = -Math.abs(this.ball.vx) * this.ball.restitution;
      }

      if (this.ball.x < this.goalWidth + this.ball.radius && (this.ball.y < goalTop || this.ball.y > goalBottom)) {
        this.ball.x = Math.max(this.ball.x, this.ball.radius);
      }

      if (
        this.ball.x > this.width - this.goalWidth - this.ball.radius &&
        (this.ball.y < goalTop || this.ball.y > goalBottom)
      ) {
        this.ball.x = Math.min(this.ball.x, this.width - this.ball.radius);
      }
    }

    resolveBallPostCollision() {
      for (const post of this.posts) {
        const dx = this.ball.x - post.x;
        const dy = this.ball.y - post.y;
        const distance = Math.hypot(dx, dy) || 0.0001;
        const minDistance = this.ball.radius + post.radius;

        if (distance > minDistance) continue;

        if (this.isBallOwned()) this.clearBallOwner("bounce");
        const nx = dx / distance;
        const ny = dy / distance;
        const overlap = minDistance - distance;
        this.ball.x += nx * overlap;
        this.ball.y += ny * overlap;

        const velocityAlongNormal = this.ball.vx * nx + this.ball.vy * ny;
        if (velocityAlongNormal < 0) {
          this.ball.vx -= (1 + PHYSICS.postRestitution) * velocityAlongNormal * nx;
          this.ball.vy -= (1 + PHYSICS.postRestitution) * velocityAlongNormal * ny;
          this.limitVelocity(this.ball, PHYSICS.ballMaxSpeed);
        }

        this.pushEffect("post", post.x, post.y, "#fef08a");
        this.playSound("post", 0.035);
      }
    }

    checkGoals() {
      if (!this.isBallInGoalMouth()) return;

      if (this.ball.x + this.ball.radius < 0) {
        this.aiScore += 1;
        this.afterGoal("Rivals scored");
      }

      if (this.ball.x - this.ball.radius > this.width) {
        this.playerScore += 1;
        this.afterGoal("Your XI scored");
      }
    }

    afterGoal(message) {
      const shotSpeed = this.getSpeed(this.ball);
      this.clearBallOwner("goal");
      this.message = message;
      this.messageTimer = 1.2;
      this.goalFlash = 0.55;
      this.pushEffect("goal", this.ball.x, this.ball.y, "#ffffff");
      this.playSound("goal", 0.05);
      this.onGoal({ playerScore: this.playerScore, aiScore: this.aiScore, message });

      if (!this.reduceMotion && shotSpeed > 520) {
        this.shakeTime = 0.24;
        this.shakeMagnitude = 5;
      }

      if (this.playerScore >= 3 || this.aiScore >= 3) {
        this.ended = true;
        const won = this.playerScore > this.aiScore;
        this.message = won ? "You won!" : "You lost";
        this.onEnd({ won, playerScore: this.playerScore, aiScore: this.aiScore });
        return;
      }

      this.resetPositions();
      this.pauseUntil = this.currentTimestamp + 1450;
    }

    resetPositions() {
      this.clearBallOwner("reset");
      for (const unit of this.players) {
        unit.x = unit.homeX;
        unit.y = unit.homeY;
        unit.vx = 0;
        unit.vy = 0;
        unit.kickCooldown = 0;
        unit.passCooldown = 0;
        unit.hasPossession = false;
        unit.possessionCooldown = 0;
        unit.dribbleTouchTimer = 0;
        unit.isSprinting = false;
        unit.tackleState = null;
        unit.tackleTimer = 0;
        unit.tackleCooldown = 0;
        unit.facing = unit.side === "home" ? { x: 1, y: 0 } : { x: -1, y: 0 };
        unit.runPhase = 0;
        unit.actionPose = null;
        unit.actionTimer = 0;
        unit.actionDuration = 0;
      }

      Object.assign(this.ball, {
        x: this.width / 2,
        y: this.height / 2,
        vx: 0,
        vy: 0,
        ownerId: null,
        ownerSide: null,
        possessionTimer: 0,
        looseTimer: 0,
        lastOwnerId: null,
        intendedReceiverId: null,
      });

      this.shotCharge = null;
      this.passCooldown = 0;
      this.tackleCooldown = 0;
      this.ballTrail = [];
      this.aiState = "Shape";
    }

    isBallInGoalMouth() {
      const goalTop = this.height / 2 - this.goalHeight / 2;
      const goalBottom = this.height / 2 + this.goalHeight / 2;
      return this.ball.y > goalTop && this.ball.y < goalBottom;
    }

    keepInsideField(unit) {
      if (unit.x - unit.radius < 0) {
        unit.x = unit.radius;
        unit.vx = Math.max(0, unit.vx);
      }
      if (unit.x + unit.radius > this.width) {
        unit.x = this.width - unit.radius;
        unit.vx = Math.min(0, unit.vx);
      }
      if (unit.y - unit.radius < 0) {
        unit.y = unit.radius;
        unit.vy = Math.max(0, unit.vy);
      }
      if (unit.y + unit.radius > this.height) {
        unit.y = this.height - unit.radius;
        unit.vy = Math.min(0, unit.vy);
      }
    }

    keepKeeperInBox(unit) {
      const maxX = unit.side === "home" ? 128 : this.width - 18;
      const minX = unit.side === "home" ? 18 : this.width - 128;
      unit.x = clamp(unit.x, minX + unit.radius, maxX - unit.radius);
      unit.y = clamp(
        unit.y,
        this.height / 2 - this.goalHeight / 2 - 22,
        this.height / 2 + this.goalHeight / 2 + 22,
      );
    }

    normalizeVector(x, y) {
      const length = Math.hypot(x, y);
      if (length === 0) return { x: 0, y: 0 };
      return { x: x / length, y: y / length };
    }

    limitVelocity(entity, maxSpeed) {
      const speed = this.getSpeed(entity);
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        entity.vx *= scale;
        entity.vy *= scale;
      }
    }

    applyDrag(entity, drag, dt) {
      const dragFactor = Math.exp(-drag * dt);
      entity.vx *= dragFactor;
      entity.vy *= dragFactor;
    }

    integrate(entity, dt) {
      entity.x += entity.vx * dt;
      entity.y += entity.vy * dt;
    }

    distance(a, b) {
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    getSpeed(entity) {
      return Math.hypot(entity.vx || 0, entity.vy || 0);
    }

    updateBallTrail(dt) {
      const speed = this.getSpeed(this.ball);
      if (speed > 320) {
        this.ballTrail.push({ x: this.ball.x, y: this.ball.y, life: 0.22, maxLife: 0.22 });
      }

      this.ballTrail = this.ballTrail
        .map((point) => ({ ...point, life: point.life - dt }))
        .filter((point) => point.life > 0)
        .slice(-12);
    }

    pushEffect(type, x, y, color) {
      this.effects.push({
        type,
        x,
        y,
        color,
        life: type === "goal" ? 0.55 : 0.28,
        maxLife: type === "goal" ? 0.55 : 0.28,
      });
    }

    updateEffects(dt) {
      this.effects = this.effects
        .map((effect) => ({ ...effect, life: effect.life - dt }))
        .filter((effect) => effect.life > 0)
        .slice(-24);
    }

    flashMessage(message, seconds) {
      this.message = message;
      this.messageTimer = seconds;
    }

    playSound(type, volume) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const audio = new AudioContext();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const now = audio.currentTime;
        const frequencies = {
          tap: [360, 460],
          kick: [190, 520],
          post: [760, 430],
          goal: [440, 880],
          save: [260, 340],
        };
        const pair = frequencies[type] || frequencies.kick;

        oscillator.type = type === "post" ? "square" : "triangle";
        oscillator.frequency.setValueAtTime(pair[0], now);
        oscillator.frequency.exponentialRampToValueAtTime(pair[1], now + 0.16);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(volume, now + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.24);
        setTimeout(() => audio.close(), 320);
      } catch (error) {
        // Sound is feedback only; gameplay must continue if the browser blocks audio.
      }
    }

    resizeCanvasForDpr() {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const targetWidth = Math.round(this.width * dpr);
      const targetHeight = Math.round(this.height * dpr);

      if (this.canvas.width !== targetWidth || this.canvas.height !== targetHeight) {
        this.canvas.width = targetWidth;
        this.canvas.height = targetHeight;
      }

      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ctx.imageSmoothingEnabled = true;
    }

    draw() {
      this.resizeCanvasForDpr();
      const ctx = this.ctx;

      ctx.clearRect(0, 0, this.width, this.height);
      ctx.fillStyle = "#07130d";
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.save();

      if (!this.reduceMotion && this.shakeTime > 0) {
        const amount = this.shakeMagnitude * (this.shakeTime / 0.24);
        ctx.translate((Math.random() - 0.5) * amount, (Math.random() - 0.5) * amount);
      }

      this.applyWorldCamera();
      this.drawField();
      this.drawGoals();
      this.drawBallTrail();
      this.players
        .filter((unit) => !unit.controlled)
        .sort((a, b) => a.y - b.y)
        .forEach((unit) => this.drawPlayer(unit));
      this.drawPlayer(this.player);
      this.drawBall();
      this.drawFaceBadges();
      this.drawPlayerNameplates();
      this.drawEffects();
      this.drawShotUi();
      ctx.restore();

      this.drawHud();
      this.drawPlayerStatusPanel();
      this.drawRadar();

      if (this.debug) this.drawDebug();
    }

    applyWorldCamera() {
      const ctx = this.ctx;
      ctx.translate(this.width / 2, this.height / 2);
      ctx.scale(this.camera.zoom, this.camera.zoom);
      ctx.translate(-this.camera.x, -this.camera.y);
    }

    drawField() {
      const ctx = this.ctx;
      ctx.fillStyle = "#188446";
      ctx.fillRect(0, 0, this.width, this.height);

      for (let x = 0; x < this.width; x += 54) {
        ctx.fillStyle = x % 108 === 0 ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.045)";
        ctx.fillRect(x, 0, 54, this.height);
      }

      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 1;
      for (let y = 36; y < this.height; y += 36) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.width, y);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 4;
      ctx.strokeRect(18, 18, this.width - 36, this.height - 36);
      ctx.beginPath();
      ctx.moveTo(this.width / 2, 18);
      ctx.lineTo(this.width / 2, this.height - 18);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(this.width / 2, this.height / 2, 62, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 3;
      ctx.strokeRect(18, this.height / 2 - 110, 110, 220);
      ctx.strokeRect(this.width - 128, this.height / 2 - 110, 110, 220);

      this.drawCornerArc(18, 18, 18, 0, Math.PI / 2);
      this.drawCornerArc(this.width - 18, 18, 18, Math.PI / 2, Math.PI);
      this.drawCornerArc(18, this.height - 18, 18, -Math.PI / 2, 0);
      this.drawCornerArc(this.width - 18, this.height - 18, 18, Math.PI, Math.PI * 1.5);

      ctx.fillStyle = "rgba(255,255,255,0.86)";
      ctx.beginPath();
      ctx.arc(92, this.height / 2, 4, 0, Math.PI * 2);
      ctx.arc(this.width - 92, this.height / 2, 4, 0, Math.PI * 2);
      ctx.fill();

      if (this.goalFlash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${0.26 * (this.goalFlash / 0.55)})`;
        ctx.fillRect(0, 0, this.width, this.height);
      }
    }

    drawCornerArc(x, y, radius, startAngle, endAngle) {
      const ctx = this.ctx;
      ctx.beginPath();
      ctx.arc(x, y, radius, startAngle, endAngle);
      ctx.stroke();
    }

    drawGoals() {
      const ctx = this.ctx;
      const goalTop = this.height / 2 - this.goalHeight / 2;
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, goalTop, this.goalWidth, this.goalHeight);
      ctx.fillRect(this.width - this.goalWidth, goalTop, this.goalWidth, this.goalHeight);

      ctx.strokeStyle = "rgba(15,23,42,0.18)";
      ctx.lineWidth = 2;
      for (let y = goalTop + 12; y < goalTop + this.goalHeight; y += 18) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.goalWidth, y);
        ctx.moveTo(this.width - this.goalWidth, y);
        ctx.lineTo(this.width, y);
        ctx.stroke();
      }

      ctx.fillStyle = "#fef08a";
      for (const post of this.posts) {
        ctx.beginPath();
        ctx.arc(post.x, post.y, post.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#422006";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    drawBallTrail() {
      const ctx = this.ctx;
      for (const point of this.ballTrail) {
        const alpha = point.life / point.maxLife;
        ctx.fillStyle = `rgba(255,255,255,${0.28 * alpha})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, this.ball.radius * (0.7 + alpha * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawBall() {
      const ctx = this.ctx;
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = this.isBallOwned() ? "#facc15" : "#111827";
      ctx.lineWidth = this.isBallOwned() ? 3.2 : 2.4;
      ctx.stroke();
      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.arc(this.ball.x - 3, this.ball.y - 2, 1.8, 0, Math.PI * 2);
      ctx.arc(this.ball.x + 3, this.ball.y + 2, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    drawPlayer(unit) {
      const ctx = this.ctx;
      const profile = unit.visual || this.getFallbackVisualProfile(unit.side, unit.role, unit.index, unit.controlled);
      const dimensions = this.getPlayerVisualDimensions(unit);
      const facing = unit.facing || (unit.side === "home" ? { x: 1, y: 0 } : { x: -1, y: 0 });
      const speedRatio = clamp(this.getSpeed(unit) / Math.max(unit.maxSpeed || unit.gameplay.maxSpeed || 1, 1), 0, 1);
      const flip = facing.x < -0.1 ? -1 : 1;

      ctx.save();

      if (unit.gameplay.isKeeper) {
        ctx.strokeStyle = unit.side === "home" ? "rgba(134, 239, 172, 0.68)" : "rgba(147, 197, 253, 0.62)";
        ctx.lineWidth = unit.controlled ? 2.8 : 1.8;
        ctx.beginPath();
        ctx.arc(unit.x, unit.y, unit.radius + unit.gameplay.keeperReach * (unit.actionPose === "save" ? 0.88 : 0.72), 0, Math.PI * 2);
        ctx.stroke();
      }

      if (unit.hasPossession) this.drawPossessionIndicator(unit, dimensions.width, dimensions.height);
      if (unit.controlled) this.drawCaptainIndicator(unit, dimensions.width, dimensions.height);
      this.drawUnitShadow(unit, dimensions.width, dimensions.height);

      ctx.translate(unit.x, unit.y);
      ctx.scale(flip, 1);
      ctx.rotate(clamp(facing.y * 0.08, -0.12, 0.12));
      this.drawPlayerFigure(unit, profile, dimensions.width, dimensions.height, speedRatio);
      ctx.restore();
    }

    getPlayerVisualDimensions(unit) {
      if (unit.gameplay.isKeeper) {
        return {
          width: PLAYER_VISUALS.keeperWidth + (unit.controlled ? 2 : 0),
          height: PLAYER_VISUALS.keeperHeight + (unit.controlled ? 2 : 0),
        };
      }

      if (unit.controlled) {
        return {
          width: PLAYER_VISUALS.captainWidth,
          height: PLAYER_VISUALS.captainHeight,
        };
      }

      const build = unit.visual && unit.visual.build;
      return {
        width: PLAYER_VISUALS.normalWidth + (build === "stocky" ? 2 : build === "compact" ? -1 : 0),
        height: PLAYER_VISUALS.normalHeight + (build === "tall" ? 2 : build === "compact" ? -1 : 0),
      };
    }

    drawUnitShadow(unit, width, height) {
      const ctx = this.ctx;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.beginPath();
      ctx.ellipse(unit.x - 1, unit.y + 5, width * 0.76, height * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    drawCaptainIndicator(unit, width, height) {
      const ctx = this.ctx;
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(unit.x, unit.y + 7, width * 0.74, height * 0.18, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(250,204,21,0.84)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(unit.x, unit.y + 7, width * 0.94, height * 0.23, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    drawPossessionIndicator(unit, width, height) {
      const ctx = this.ctx;
      const pulse = this.reduceMotion ? 0 : Math.sin(this.matchTime * 8) * 0.08;
      ctx.save();
      ctx.strokeStyle = unit.side === "home" ? "rgba(250, 204, 21, 0.9)" : "rgba(147, 197, 253, 0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(unit.x, unit.y + 7, width * (1.02 + pulse), height * (0.24 + pulse), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    drawFaceBadges() {
      if (!PLAYER_VISUALS.showFaceBadges) return;
      const drawn = new Set();
      for (const unit of this.players) {
        if (!this.shouldDrawFaceBadge(unit) || drawn.has(unit.id)) continue;
        drawn.add(unit.id);
        this.drawFaceBadge(unit, unit.controlled ? PLAYER_VISUALS.captainFaceBadgeRadius : PLAYER_VISUALS.faceBadgeRadius);
      }
    }

    drawPlayerNameplates() {
      const owner = this.getBallOwner();
      const targets = [this.player, owner].filter(Boolean);
      const drawn = new Set();
      for (const unit of targets) {
        if (drawn.has(unit.id)) continue;
        drawn.add(unit.id);
        this.drawPlayerNameplate(unit);
      }
    }

    drawPlayerNameplate(unit) {
      const ctx = this.ctx;
      const dimensions = this.getPlayerVisualDimensions(unit);
      const text = unit.controlled ? unit.name : unit.label;
      const width = clamp(text.length * 6 + 20, 48, 118);
      const x = clamp(unit.x - width / 2, 18, this.width - width - 18);
      const y = clamp(unit.y - dimensions.height - 28, 18, this.height - 32);

      ctx.save();
      ctx.fillStyle = "rgba(7, 19, 13, 0.84)";
      ctx.fillRect(x, y, width, 19);
      ctx.strokeStyle = unit.hasPossession ? "#facc15" : "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1.3;
      ctx.strokeRect(x, y, width, 19);
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 10px Arial";
      ctx.textAlign = "center";
      ctx.fillText(text.toUpperCase(), x + width / 2, y + 13);
      ctx.textAlign = "start";
      ctx.restore();
    }

    shouldDrawFaceBadge(unit) {
      return unit && (unit.controlled || unit.hasPossession);
    }

    drawFaceBadge(unit, radius) {
      const ctx = this.ctx;
      const profile = unit.visual || this.getFallbackVisualProfile(unit.side, unit.role, unit.index, unit.controlled);
      const dimensions = this.getPlayerVisualDimensions(unit);
      const yOffset = dimensions.height + (unit.controlled ? 14 : 10);
      const pulse = unit.hasPossession && !this.reduceMotion ? Math.sin(this.matchTime * 9) * 1.2 : 0;
      const x = clamp(unit.x, radius + 4, this.width - radius - 4);
      const y = clamp(unit.y - yOffset - pulse, radius + 7, this.height - radius - 4);

      ctx.save();
      ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
      ctx.beginPath();
      ctx.arc(x, y, radius + 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = unit.hasPossession ? "#facc15" : "#ffffff";
      ctx.lineWidth = unit.controlled ? 2.2 : 1.6;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.translate(x, y);
      this.drawMiniPortrait(profile, radius);
      ctx.restore();
    }

    drawMiniPortrait(profile, radius) {
      const ctx = this.ctx;
      const skin = profile.skin || "#d9a17a";
      const hair = profile.hair || "#22140c";
      ctx.fillStyle = profile.secondaryAccent || "#93c5fd";
      ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(0, radius * 0.06, radius * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hair;
      if (profile.hairStyle === "curly" || profile.hairStyle === "tight-curls" || profile.hairStyle === "headband-curls") {
        for (let i = -2; i <= 2; i += 1) {
          ctx.beginPath();
          ctx.arc(i * radius * 0.22, -radius * 0.42 + Math.abs(i) * radius * 0.05, radius * 0.25, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.beginPath();
        ctx.ellipse(0, -radius * 0.38, radius * 0.68, radius * 0.34, 0, Math.PI, Math.PI * 2);
        ctx.fill();
      }
      if (profile.headband || profile.hairStyle === "headband-curls") {
        ctx.strokeStyle = profile.headband || "#ffffff";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-radius * 0.58, -radius * 0.25);
        ctx.lineTo(radius * 0.58, -radius * 0.25);
        ctx.stroke();
      }
      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.arc(-radius * 0.24, radius * 0.02, Math.max(1, radius * 0.08), 0, Math.PI * 2);
      ctx.arc(radius * 0.24, radius * 0.02, Math.max(1, radius * 0.08), 0, Math.PI * 2);
      ctx.fill();
      if (profile.beard) {
        ctx.fillStyle = this.hexToRgba(hair, 0.76);
        ctx.beginPath();
        ctx.ellipse(0, radius * 0.36, radius * 0.38, radius * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawPlayerFigure(unit, profile, width, height, speedRatio) {
      const ctx = this.ctx;
      const runWave = this.reduceMotion ? 0 : Math.sin(unit.runPhase || 0) * speedRatio;
      const actionRatio = unit.actionDuration > 0 ? unit.actionTimer / unit.actionDuration : 0;
      const kickPose = unit.actionPose === "kick" ? actionRatio : 0;
      const savePose = unit.actionPose === "save" ? actionRatio : 0;
      const tacklePose = unit.actionPose === "tackle" ? actionRatio : 0;
      const skin = profile.skin || "#d9a17a";
      const kit = profile.kit || unit.color;
      const shorts = profile.shorts || "#111827";
      const stripe = profile.stripe || "#ffffff";
      const bootColor = profile.bootColor || "#111827";
      const torsoWidth = width * (profile.build === "stocky" ? 0.5 : profile.build === "compact" ? 0.42 : 0.46);
      const torsoY = -height * 0.48;
      const hipY = -height * 0.18;
      const footY = 0;
      const headY = -height * 0.82;
      const shoulderY = -height * 0.55;
      const stride = runWave * width * 0.18;
      const kickReach = kickPose * width * 0.32;
      const saveReach = savePose * width * 0.38;
      const tackleLean = tacklePose * width * 0.12;

      ctx.save();
      ctx.translate(kickPose * 2 - tackleLean, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      this.drawPlayerLimb(-width * 0.16, hipY, -width * 0.25 - stride - kickReach, footY, shorts, 5.4);
      this.drawPlayerLimb(width * 0.16, hipY, width * 0.26 + stride + kickReach * 0.2, footY - Math.abs(runWave) * 2, shorts, 5.4);
      this.drawBoot(-width * 0.25 - stride - kickReach, footY, bootColor);
      this.drawBoot(width * 0.26 + stride + kickReach * 0.2, footY - Math.abs(runWave) * 2, bootColor);

      this.drawPlayerLimb(-torsoWidth * 0.78, shoulderY, -width * (0.5 + saveReach * 0.02), -height * 0.28 + runWave * 1.4, skin, 4.4);
      this.drawPlayerLimb(torsoWidth * 0.78, shoulderY, width * (0.5 + saveReach * 0.02), -height * 0.3 - runWave * 1.2, skin, 4.4);

      ctx.fillStyle = kit;
      ctx.beginPath();
      ctx.ellipse(0, torsoY, torsoWidth, height * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = this.hexToRgba(stripe, unit.controlled ? 0.95 : 0.72);
      ctx.lineWidth = unit.controlled ? 2.4 : 1.6;
      ctx.beginPath();
      ctx.moveTo(-torsoWidth * 0.34, torsoY - height * 0.14);
      ctx.lineTo(torsoWidth * 0.24, torsoY + height * 0.15);
      ctx.stroke();

      ctx.fillStyle = shorts;
      ctx.beginPath();
      ctx.ellipse(0, hipY, width * 0.34, height * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(0, headY, width * 0.24, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = profile.hair || "#22140c";
      if (profile.hairStyle === "curly" || profile.hairStyle === "tight-curls" || profile.hairStyle === "headband-curls") {
        for (let i = -2; i <= 2; i += 1) {
          ctx.beginPath();
          ctx.arc(i * width * 0.09, headY - width * 0.16 + Math.abs(i) * 0.7, width * 0.1, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.beginPath();
        ctx.ellipse(0, headY - width * 0.14, width * 0.23, width * 0.12, 0, Math.PI, Math.PI * 2);
        ctx.fill();
      }

      if (profile.headband || profile.hairStyle === "headband-curls") {
        ctx.strokeStyle = profile.headband || "#ffffff";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-width * 0.2, headY - width * 0.06);
        ctx.lineTo(width * 0.2, headY - width * 0.06);
        ctx.stroke();
      }

      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.arc(-width * 0.08, headY, 1.5, 0, Math.PI * 2);
      ctx.arc(width * 0.08, headY, 1.5, 0, Math.PI * 2);
      ctx.fill();

      if (profile.beard) {
        ctx.fillStyle = this.hexToRgba(profile.hair || "#22140c", 0.78);
        ctx.beginPath();
        ctx.ellipse(0, headY + width * 0.12, width * 0.14, width * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      if (unit.gameplay.isKeeper) this.drawKeeperDetails(unit, profile, width, height);

      if (unit.controlled) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(0, torsoY, torsoWidth + 3, height * 0.22 + 2.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = profile.accent || "#facc15";
        ctx.fillRect(width * 0.04, torsoY - height * 0.12, width * 0.08, height * 0.13);
      }

      ctx.restore();
    }

    drawPlayerLimb(startX, startY, endX, endY, color, width) {
      const ctx = this.ctx;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    drawBoot(x, y, color) {
      const ctx = this.ctx;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, y, 5.2, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    drawHair(profile, width, height) {
      const ctx = this.ctx;
      const hair = profile.hair || "#22140c";
      const style = profile.hairStyle || "short";
      const headX = width * 0.43;

      ctx.fillStyle = hair;
      if (style === "buzz" || style === "flat") {
        ctx.beginPath();
        ctx.ellipse(headX + width * 0.03, -height * 0.04, width * 0.2, height * 0.12, 0, Math.PI, Math.PI * 2);
        ctx.fill();
      } else if (style === "curly" || style === "tight-curls" || style === "headband-curls") {
        for (let i = -2; i <= 2; i += 1) {
          ctx.beginPath();
          ctx.arc(headX - width * 0.08 + i * 2.6, -height * 0.11 + Math.abs(i) * 0.8, style === "tight-curls" ? 2.7 : 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (style === "mohawk") {
        ctx.beginPath();
        ctx.ellipse(headX + width * 0.02, -height * 0.12, width * 0.07, height * 0.18, 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (style === "topknot" || style === "ponytail") {
        ctx.beginPath();
        ctx.ellipse(headX - width * 0.04, -height * 0.11, width * 0.18, height * 0.1, 0, 0, Math.PI * 2);
        ctx.arc(headX - width * 0.19, -height * 0.06, 3.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.ellipse(headX + width * 0.02, -height * 0.09, width * 0.22, height * 0.11, -0.15, 0, Math.PI * 2);
        ctx.fill();
      }

      if (profile.headband || style === "headband-curls") {
        ctx.strokeStyle = profile.headband || "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(headX - width * 0.18, -height * 0.04);
        ctx.lineTo(headX + width * 0.18, -height * 0.04);
        ctx.stroke();
      }
    }

    drawBeard(profile, width, height) {
      const ctx = this.ctx;
      ctx.fillStyle = this.hexToRgba(profile.hair || "#22140c", 0.72);
      ctx.beginPath();
      ctx.ellipse(width * 0.49, height * 0.09, width * 0.12, height * 0.08, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    drawKeeperDetails(unit, profile, width, height) {
      const ctx = this.ctx;
      const saveRatio = unit.actionPose === "save" && unit.actionDuration > 0 ? unit.actionTimer / unit.actionDuration : 0;
      const gloveColor = profile.gloveColor || "#f8fafc";
      const reach = saveRatio * width * 0.2;

      ctx.fillStyle = gloveColor;
      ctx.beginPath();
      ctx.ellipse(width * 0.38 + reach, height * 0.4 + reach, 3.2, 3.8, 0, 0, Math.PI * 2);
      ctx.ellipse(width * 0.38 + reach, -height * 0.4 - reach, 3.2, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = this.hexToRgba(profile.accent || "#ffffff", 0.88);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-width * 0.12, -height * 0.2);
      ctx.lineTo(width * 0.2, -height * 0.2);
      ctx.moveTo(-width * 0.12, height * 0.2);
      ctx.lineTo(width * 0.2, height * 0.2);
      ctx.stroke();
    }

    drawEffects() {
      const ctx = this.ctx;
      for (const effect of this.effects) {
        const alpha = effect.life / effect.maxLife;
        const radius = effect.type === "goal" ? 44 * (1 - alpha) + 18 : 22 * (1 - alpha) + 6;
        ctx.strokeStyle = this.hexToRgba(effect.color, Math.max(0, alpha * 0.7));
        ctx.lineWidth = effect.type === "goal" ? 5 : 3;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    drawHud() {
      const ctx = this.ctx;
      ctx.fillStyle = "rgba(9, 20, 15, 0.82)";
      ctx.fillRect(this.width / 2 - 138, 16, 276, 56);
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 24px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`${this.playerScore} - ${this.aiScore}`, this.width / 2, 39);
      ctx.font = "800 11px Arial";
      ctx.fillStyle = "#d9f99d";
      ctx.fillText(this.getHudMessage(), this.width / 2, 57);

      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(this.width / 2 - 82, 64, 164, 5);
      ctx.fillStyle = this.stamina > 0.22 ? "#86efac" : "#fca5a5";
      ctx.fillRect(this.width / 2 - 82, 64, 164 * this.stamina, 5);
      ctx.textAlign = "start";
    }

    drawPlayerStatusPanel() {
      const ctx = this.ctx;
      const owner = this.getBallOwner();
      const active = owner && owner.side === "home" ? owner : this.player;
      const label = active.name || active.label;
      const status = active.hasPossession ? "DRIBBLING" : owner ? `${owner.label} ON BALL` : "PRESS";
      const panelWidth = 236;
      const x = 18;
      const y = this.height - 72;

      ctx.save();
      ctx.fillStyle = "rgba(7, 19, 13, 0.88)";
      ctx.fillRect(x, y, panelWidth, 54);
      ctx.strokeStyle = active.hasPossession ? "#facc15" : "rgba(255,255,255,0.34)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, panelWidth, 54);
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 16px Arial";
      ctx.fillText(label.toUpperCase(), x + 14, y + 22);
      ctx.fillStyle = "#bfdbfe";
      ctx.font = "900 10px Arial";
      ctx.fillText(`${active.role}  ${status}`, x + 14, y + 39);
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fillRect(x + 132, y + 34, 84, 5);
      ctx.fillStyle = this.stamina > 0.25 ? "#86efac" : "#fca5a5";
      ctx.fillRect(x + 132, y + 34, 84 * this.stamina, 5);
      ctx.restore();
    }

    drawRadar() {
      const ctx = this.ctx;
      const width = 154;
      const height = 88;
      const x = this.width / 2 - width / 2;
      const y = this.height - height - 16;

      ctx.save();
      ctx.fillStyle = "rgba(7, 19, 13, 0.76)";
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = "rgba(255,255,255,0.48)";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x + 6, y + 6, width - 12, height - 12);
      ctx.beginPath();
      ctx.moveTo(x + width / 2, y + 6);
      ctx.lineTo(x + width / 2, y + height - 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + width / 2, y + height / 2, 13, 0, Math.PI * 2);
      ctx.stroke();

      for (const unit of this.players) {
        const px = x + 6 + (unit.x / this.width) * (width - 12);
        const py = y + 6 + (unit.y / this.height) * (height - 12);
        ctx.fillStyle = unit.controlled ? "#facc15" : unit.side === "home" ? "#fb923c" : "#60a5fa";
        ctx.beginPath();
        ctx.arc(px, py, unit.controlled ? 3.2 : 2.3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x + 6 + (this.ball.x / this.width) * (width - 12), y + 6 + (this.ball.y / this.height) * (height - 12), 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    drawShotUi() {
      if (!this.shotCharge) return;

      const ctx = this.ctx;
      const chargeRatio = clamp(
        ((this.currentTimestamp || performance.now()) - this.shotCharge.startedAt) / PHYSICS.maxChargeMs,
        0,
        1,
      );
      const aim = this.getShotAim();
      const arrowLength = 48 + chargeRatio * 34;
      const meterWidth = 64;
      const color = chargeRatio > 0.72 ? "#facc15" : chargeRatio > 0.36 ? "#bef264" : "#86efac";

      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(this.player.x + aim.x * 24, this.player.y + aim.y * 24);
      ctx.lineTo(this.player.x + aim.x * arrowLength, this.player.y + aim.y * arrowLength);
      ctx.stroke();
      ctx.lineCap = "butt";

      ctx.fillStyle = "rgba(9, 20, 15, 0.72)";
      ctx.fillRect(this.player.x - meterWidth / 2, this.player.y - 45, meterWidth, 8);
      ctx.fillStyle = color;
      ctx.fillRect(this.player.x - meterWidth / 2, this.player.y - 45, meterWidth * chargeRatio, 8);
    }

    drawDebug() {
      const ctx = this.ctx;
      const rows = [
        "debug: on",
        `players ${this.players.length}`,
        `ball ${Math.round(this.getSpeed(this.ball))} px/s`,
        `owner ${this.getBallOwner() ? this.getBallOwner().label : "none"}`,
        `rival ${this.aiState}`,
        `steps ${this.accumulator.toFixed(3)}`,
      ];

      ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
      ctx.fillRect(18, 18, 164, 126);
      ctx.fillStyle = "#f8fafc";
      ctx.font = "700 12px Arial";
      rows.forEach((row, index) => ctx.fillText(row, 30, 40 + index * 18));

      ctx.strokeStyle = "rgba(248,250,252,0.46)";
      ctx.lineWidth = 1.2;
      for (const entity of [...this.players, this.ball]) {
        ctx.beginPath();
        ctx.arc(entity.x, entity.y, entity.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    getHudMessage() {
      if (this.currentTimestamp < this.pauseUntil) {
        const remainingMs = this.pauseUntil - this.currentTimestamp;
        if (remainingMs > 1080) return "3";
        if (remainingMs > 720) return "2";
        if (remainingMs > 360) return "1";
        return "Play";
      }

      if (this.currentTimestamp < this.introUntil) return "11v11 kickoff";
      if (this.messageTimer > 0) return this.message;
      return `Rival: ${this.aiState}`;
    }

    hexToRgba(hex, alpha) {
      const safeHex = hex.replace("#", "");
      const value = parseInt(safeHex, 16);
      const r = (value >> 16) & 255;
      const g = (value >> 8) & 255;
      const b = value & 255;
      return `rgba(${r},${g},${b},${alpha})`;
    }

    getInitials(name) {
      return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }
  }

  window.SoccerGame = SoccerGame;
})();
