(function () {
  const SAVE_KEY = "bench-to-ballon-dor-save-v1";

  function createInitialState() {
    return {
      screen: "start",
      coins: 0,
      packQueue: [],
      wins: 0,
      losses: 0,
      selectedDraft: "Pro Draft",
      selectedPlayerId: "ali-dia",
      unlockedPlayerIds: [...window.GAME_DATA.starterIds],
      unlockedSpecialCardIds: [],
      lastPackResult: null,
      lastMilestone: null,
    };
  }

  function loadState() {
    const initial = createInitialState();
    const raw = localStorage.getItem(SAVE_KEY);

    if (!raw) {
      return initial;
    }

    try {
      const saved = JSON.parse(raw);
      const validIds = new Set(window.GAME_DATA.allPlayers.map((player) => player.id));
      const unlockedPlayerIds = Array.isArray(saved.unlockedPlayerIds)
        ? saved.unlockedPlayerIds.filter((id) => validIds.has(id))
        : initial.unlockedPlayerIds;

      for (const starterId of window.GAME_DATA.starterIds) {
        if (!unlockedPlayerIds.includes(starterId)) {
          unlockedPlayerIds.push(starterId);
        }
      }

      const selectedPlayerId = unlockedPlayerIds.includes(saved.selectedPlayerId)
        ? saved.selectedPlayerId
        : initial.selectedPlayerId;
      const validDraftNames = new Set(window.GAME_DATA.drafts.map((draft) => draft.name));
      const selectedDraft = validDraftNames.has(saved.selectedDraft)
        ? saved.selectedDraft
        : initial.selectedDraft;
      const validSpecialIds = new Set(window.GAME_DATA.specialCards.map((card) => card.id));
      const unlockedSpecialCardIds = Array.isArray(saved.unlockedSpecialCardIds)
        ? saved.unlockedSpecialCardIds.filter((id) => validSpecialIds.has(id))
        : initial.unlockedSpecialCardIds;
      const savedPackQueue = Array.isArray(saved.packQueue)
        ? saved.packQueue
        : Array.from({ length: Math.max(0, Number(saved.packs) || 0) }, () => "target-draft");
      const validPackIds = new Set(window.GAME_DATA.packTypes.map((packType) => packType.id));
      const packQueue = savedPackQueue.filter((id) => validPackIds.has(id));

      return {
        ...initial,
        coins: Number.isFinite(saved.coins) ? saved.coins : initial.coins,
        packQueue,
        wins: Number.isFinite(saved.wins) ? saved.wins : initial.wins,
        losses: Number.isFinite(saved.losses) ? saved.losses : initial.losses,
        selectedDraft,
        selectedPlayerId,
        unlockedPlayerIds,
        unlockedSpecialCardIds,
        screen: "start",
        lastPackResult: null,
        lastMilestone: typeof saved.lastMilestone === "string" ? saved.lastMilestone : null,
      };
    } catch (error) {
      console.warn("Could not load save data. Starting fresh.", error);
      return initial;
    }
  }

  const app = {
    root: document.getElementById("app"),
    state: loadState(),
    currentGame: null,
    currentMatchKeyHandler: null,
    pendingMatchResult: null,

    render() {
      window.GameUI.render(this);
    },

    save() {
      const saveState = {
        ...this.state,
        screen: "start",
        lastPackResult: null,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveState));
    },

    setScreen(screen) {
      this.state.screen = screen;
      if (screen !== "pack") {
        this.state.lastPackResult = null;
        this.state.lastMilestone = null;
      }
      this.save();
      this.render();
    },

    getSelectedPlayer() {
      return window.GAME_DATA.getPlayerById(this.state.selectedPlayerId);
    },

    isUnlocked(playerId) {
      return this.state.unlockedPlayerIds.includes(playerId);
    },

    isSpecialUnlocked(cardId) {
      return this.state.unlockedSpecialCardIds.includes(cardId);
    },

    getPackCount() {
      return this.state.packQueue.length;
    },

    getSelectedDraft() {
      return window.GAME_DATA.getDraftByName(this.state.selectedDraft);
    },

    getUnlockedLegendCount() {
      return window.GAME_DATA.legendCards.filter((player) => this.isUnlocked(player.id)).length;
    },

    isCollectionComplete() {
      return this.getUnlockedLegendCount() === window.GAME_DATA.legendCards.length;
    },

    getDifficultyTier(wins = this.state.wins) {
      if (wins >= 6) {
        return {
          id: "hard",
          label: "Hard AI",
          description: "The rival presses fast and shoots harder.",
          next: "Collection chase",
        };
      }

      if (wins >= 3) {
        return {
          id: "medium",
          label: "Medium AI",
          description: "The rival reacts quicker after three wins.",
          next: "Hard AI unlocks at 6 wins",
        };
      }

      return {
          id: "easy",
          label: "Easy AI",
          description: "A fair first opponent while you build the squad.",
          next: wins < 1 ? "First win earns 125 coins" : "Medium AI unlocks at 3 wins",
        };
      },

    getMilestoneMessage(wins = this.state.wins) {
      if (wins === 1) return "First win: 125 coins earned. Pick a pack from the shop.";
      if (wins === 3) return "Three wins: Medium AI is now active.";
      if (wins === 6) return "Six wins: Hard AI is now active.";
      if (this.isCollectionComplete()) return "Collection complete: every legend is unlocked.";
      return null;
    },

    getNextMilestone() {
      if (this.state.wins < 1) return "Next: win 1 match to earn 125 coins.";
      if (this.state.wins < 3) return `Next: ${3 - this.state.wins} more win(s) to reach Medium AI.`;
      if (this.state.wins < 6) return `Next: ${6 - this.state.wins} more win(s) to reach Hard AI.`;
      if (!this.isCollectionComplete()) {
        return `Next: buy packs until all ${window.GAME_DATA.legendCards.length} legends are unlocked.`;
      }
      return "All milestones complete.";
    },

    selectDraft(draftName) {
      if (!window.GAME_DATA.drafts.some((draft) => draft.name === draftName)) {
        return;
      }
      this.state.selectedDraft = draftName;
      this.save();
      this.render();
    },

    selectPlayer(playerId) {
      if (!this.isUnlocked(playerId)) {
        return;
      }
      this.state.selectedPlayerId = playerId;
      this.save();
      this.render();
    },

    finishMatch(result) {
      if (!result) {
        return;
      }

      if (result.won) {
        this.state.wins += 1;
        this.state.coins += 125;
        this.state.lastMilestone = this.getMilestoneMessage(this.state.wins);
        this.state.screen = "lineup";
      } else {
        this.state.losses += 1;
        this.state.coins += 10;
        this.state.lastMilestone = null;
        this.state.screen = "lineup";
      }

      this.pendingMatchResult = null;
      this.state.lastPackResult = null;
      this.save();
      this.render();
    },

    openPack() {
      if (this.getPackCount() < 1) {
        this.state.lastPackResult = { type: "empty" };
        this.render();
        return;
      }

      const packTypeId = this.state.packQueue.shift();
      const packType = window.GAME_DATA.getPackTypeById(packTypeId);

      if (packType.kind === "special") {
        const lockedSpecialCards = window.GAME_DATA.specialCards.filter(
          (card) => !this.isSpecialUnlocked(card.id),
        );

        if (lockedSpecialCards.length > 0) {
          const card = lockedSpecialCards[Math.floor(Math.random() * lockedSpecialCards.length)];
          this.state.unlockedSpecialCardIds.push(card.id);
          this.state.lastPackResult = {
            type: "special",
            specialCardId: card.id,
            packTypeId: packType.id,
            complete: this.state.unlockedSpecialCardIds.length === window.GAME_DATA.specialCards.length,
          };
          this.playRewardSound("new");
        } else {
          this.state.coins += 75;
          this.state.lastPackResult = {
            type: "special-complete",
            packTypeId: packType.id,
          };
          this.playRewardSound("complete");
        }

        this.save();
        this.render();
        return;
      }

      const draftName = packType.kind === "fixed-draft" ? packType.draft : this.state.selectedDraft;
      const draft = window.GAME_DATA.getDraftByName(draftName);
      const draftPool = draft.ids
        .map((id) => window.GAME_DATA.getPlayerById(id))
        .filter((player) => player.rarity !== "Starter" && !this.isUnlocked(player.id));
      const lockedLegends = window.GAME_DATA.legendCards.filter(
        (player) => !this.isUnlocked(player.id),
      );
      const packPool = draftPool.length > 0 ? draftPool : lockedLegends;

      if (packPool.length > 0) {
        const player = packPool[Math.floor(Math.random() * packPool.length)];
        if (!this.state.unlockedPlayerIds.includes(player.id)) {
          this.state.unlockedPlayerIds.push(player.id);
        }
        this.state.lastPackResult = {
          type: "new",
          playerId: player.id,
          draft: player.draft,
          packTypeId: packType.id,
          complete: this.isCollectionComplete(),
        };
        this.playRewardSound("new");
      } else {
        this.state.coins += 50;
        this.state.lastPackResult = {
          type: "complete",
        };
        this.playRewardSound("complete");
      }

      this.save();
      this.render();
    },

    buyPack(packTypeId = "target-draft") {
      const packType = window.GAME_DATA.getPackTypeById(packTypeId);
      if (this.state.coins < packType.cost) {
        return;
      }

      this.state.coins -= packType.cost;
      this.state.packQueue.push(packType.id);
      this.state.lastPackResult = null;
      this.state.lastMilestone = null;
      this.state.screen = "pack";
      this.save();
      this.render();
    },

    playRewardSound(type) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const audio = new AudioContext();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const now = audio.currentTime;

        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(type === "complete" ? 523 : 659, now);
        oscillator.frequency.exponentialRampToValueAtTime(type === "complete" ? 880 : 988, now + 0.18);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.045, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.25);
        setTimeout(() => audio.close(), 350);
      } catch (error) {
        // Audio is a small polish feature; gameplay should never depend on it.
      }
    },

    resetSave() {
      const confirmed = window.confirm("Reset all unlocked cards, coins, wins, and losses?");
      if (!confirmed) {
        return;
      }
      localStorage.removeItem(SAVE_KEY);
      this.state = createInitialState();
      this.render();
    },
  };

  window.BenchToBallonDor = app;
  app.render();
})();
