(function () {
  const USE_REALISM_ENGINE = true;
  const ENGINE_QUERY =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("engine") : null;
  const USE_CANVAS_ENGINE = ENGINE_QUERY === "canvas";

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function rarityClass(rarity) {
    return `rarity-${rarity.toLowerCase()}`;
  }

  function hexToRgb(hex) {
    const normalized = String(hex || "").replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(normalized)) {
      return { r: 217, g: 161, b: 122 };
    }

    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    };
  }

  function rgbToHex({ r, g, b }) {
    return `#${[r, g, b]
      .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0"))
      .join("")}`;
  }

  function mixColor(color, target, amount) {
    const base = hexToRgb(color);
    const mix = hexToRgb(target);
    return rgbToHex({
      r: base.r + (mix.r - base.r) * amount,
      g: base.g + (mix.g - base.g) * amount,
      b: base.b + (mix.b - base.b) * amount,
    });
  }

  function hairSvg(portrait) {
    const hair = portrait.hair || "#222222";
    const headband = portrait.headband;
    const hairShadow = mixColor(hair, "#000000", 0.28);

    if (portrait.hairStyle === "buzz") {
      return `
        <ellipse cx="80" cy="50" rx="33" ry="22" fill="${hair}" />
        <path d="M49 57c14-15 49-19 65-2-5-20-20-31-36-31-17 0-28 12-29 33Z" fill="${hairShadow}" opacity=".35" />
      `;
    }

    if (portrait.hairStyle === "mohawk") {
      return `
        <path d="M52 53c8-29 27-32 39-28 13 4 19 18 18 30-11-8-25-10-57-2Z" fill="${hair}" />
        <path d="M72 18c11 9 20 19 24 35-10-9-19-11-29-8 1-12 2-20 5-27Z" fill="${hair}" opacity=".9" />
      `;
    }

    if (portrait.hairStyle === "topknot") {
      return `
        <circle cx="83" cy="20" r="13" fill="${hairShadow}" />
        <circle cx="82" cy="17" r="11" fill="${hair}" />
        <path d="M49 56c6-33 30-39 50-26 10 7 14 17 12 29-13-13-42-17-62-3Z" fill="${hair}" />
        <path d="M55 54c16-10 38-11 55 4-6-19-20-28-36-27-12 1-20 8-19 23Z" fill="${hairShadow}" opacity=".38" />
      `;
    }

    if (portrait.hairStyle === "ponytail") {
      return `
        <path d="M50 55c8-31 32-38 51-24 10 8 14 21 10 34-10-16-38-21-61-10Z" fill="${hair}" />
        <path d="M104 49c24 6 25 33 6 45-1-18-6-31-20-38Z" fill="${hair}" opacity=".92" />
      `;
    }

    if (portrait.hairStyle === "curly" || portrait.hairStyle === "tight-curls") {
      const scale = portrait.hairStyle === "tight-curls" ? 0.82 : 1;
      return `
        <circle cx="54" cy="48" r="${13 * scale}" fill="${hair}" />
        <circle cx="67" cy="35" r="${14 * scale}" fill="${hair}" />
        <circle cx="84" cy="31" r="${15 * scale}" fill="${hair}" />
        <circle cx="101" cy="43" r="${14 * scale}" fill="${hair}" />
        <circle cx="109" cy="58" r="${12 * scale}" fill="${hair}" />
        <path d="M52 62c14-20 65-20 76 3-18-5-48-8-76-3Z" fill="${hair}" />
        <path d="M58 63c20-8 39-8 58 1-11-13-49-15-58-1Z" fill="${hairShadow}" opacity=".42" />
      `;
    }

    if (portrait.hairStyle === "headband-curls") {
      return `
        <circle cx="52" cy="50" r="15" fill="${hair}" />
        <circle cx="67" cy="35" r="15" fill="${hair}" />
        <circle cx="86" cy="31" r="17" fill="${hair}" />
        <circle cx="105" cy="42" r="16" fill="${hair}" />
        <circle cx="114" cy="60" r="14" fill="${hair}" />
        <rect x="47" y="53" width="69" height="10" rx="5" fill="${headband || "#ffffff"}" />
      `;
    }

    if (portrait.hairStyle === "messy") {
      return `
        <path d="M48 57c4-31 24-40 43-35 13 3 24 16 21 36-18-9-42-13-64-1Z" fill="${hair}" />
        <path d="M54 57c15-9 36-11 56 2-5-20-19-30-37-29-12 1-20 9-19 27Z" fill="${hairShadow}" opacity=".35" />
        <path d="M58 34 48 16l24 16 6-22 13 24 20-15-7 24Z" fill="${hair}" />
      `;
    }

    if (portrait.hairStyle === "flat") {
      return `
        <path d="M49 55c5-26 21-34 42-32 15 1 25 13 25 31-22-7-43-8-67 1Z" fill="${hair}" />
        <path d="M55 54c18-5 34-5 55 1-8-13-22-19-38-16-9 1-15 6-17 15Z" fill="${hairShadow}" opacity=".34" />
      `;
    }

    if (portrait.hairStyle === "classic") {
      return `
        <path d="M51 53c6-26 25-34 45-28 12 4 19 16 18 31-18-12-43-13-63-3Z" fill="${hair}" />
        <path d="M59 51c13-7 31-10 51 4-5-15-15-23-29-23-12 0-20 7-22 19Z" fill="${hairShadow}" opacity=".36" />
      `;
    }

    return `<path d="M50 57c7-29 27-38 48-28 9 5 15 16 14 29-18-12-40-14-62-1Z" fill="${hair}" />`;
  }

  function headshotSvg(player, locked = false) {
    const portrait = player.portrait || {};
    const gradientId = `portrait-bg-${player.id}`;
    const skin = portrait.skin || "#d9a17a";
    const skinLight = mixColor(skin, "#ffffff", 0.22);
    const skinShadow = mixColor(skin, "#6b2f1f", 0.34);
    const skinDeep = mixColor(skin, "#3f1f16", 0.48);
    const shirt = portrait.shirt || "#2563eb";
    const shirtShadow = mixColor(shirt, "#000000", 0.22);
    const shirtLight = mixColor(shirt, "#ffffff", 0.18);
    const eyeColor = portrait.eye || "#1f2937";
    const mouthColor = mixColor(skin, "#7f1d1d", 0.46);

    if (locked) {
      return `
        <svg class="headshot is-silhouette" viewBox="0 0 160 190" role="img" aria-label="Locked player silhouette">
          <defs>
            <linearGradient id="${gradientId}" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stop-color="#f8fafc" />
              <stop offset="100%" stop-color="#cbd5e1" />
            </linearGradient>
          </defs>
          <rect width="160" height="190" rx="18" fill="url(#${gradientId})" />
          <circle cx="80" cy="72" r="34" fill="#94a3b8" />
          <path d="M31 170c8-38 31-57 49-57s41 19 49 57Z" fill="#64748b" />
          <text x="80" y="86" text-anchor="middle" font-size="38" font-weight="900" fill="#f8fafc">?</text>
        </svg>
      `;
    }

    return `
      <svg class="headshot" viewBox="0 0 160 190" role="img" aria-label="${escapeHtml(player.name)} headshot">
        <defs>
          <linearGradient id="${gradientId}" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="${portrait.background || "#f8fafc"}" />
            <stop offset="100%" stop-color="${portrait.accent || "#cbd5e1"}" />
          </linearGradient>
          <radialGradient id="${gradientId}-skin" cx="39%" cy="30%" r="75%">
            <stop offset="0%" stop-color="${skinLight}" />
            <stop offset="58%" stop-color="${skin}" />
            <stop offset="100%" stop-color="${skinShadow}" />
          </radialGradient>
          <linearGradient id="${gradientId}-shirt" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="${shirtLight}" />
            <stop offset="62%" stop-color="${shirt}" />
            <stop offset="100%" stop-color="${shirtShadow}" />
          </linearGradient>
          <filter id="${gradientId}-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#0f172a" flood-opacity=".22" />
          </filter>
        </defs>
        <rect width="160" height="190" rx="18" fill="url(#${gradientId})" />
        <ellipse cx="80" cy="175" rx="60" ry="13" fill="#0f172a" opacity=".12" />
        <g filter="url(#${gradientId}-shadow)">
          <path d="M51 118c7-13 18-20 29-20s22 7 29 20l9 63H42Z" fill="${skinShadow}" />
          <path d="M34 181c7-42 31-63 46-63s39 21 46 63Z" fill="url(#${gradientId}-shirt)" />
          <path d="M50 176c8-22 18-33 30-33s22 11 30 33Z" fill="${shirtShadow}" opacity=".22" />
          <path d="M58 126h44l-22 29Z" fill="${portrait.accent || "#ffffff"}" opacity=".94" />
          <path d="M68 116c5 8 19 8 24 0v26c-5 7-19 7-24 0Z" fill="${skin}" />
          <path d="M68 118c8 8 16 8 24 0v9c-8 5-16 5-24 0Z" fill="${skinDeep}" opacity=".22" />
          <circle cx="47" cy="76" r="10" fill="${skinShadow}" />
          <circle cx="113" cy="76" r="10" fill="${skinShadow}" />
          <circle cx="47" cy="75" r="7" fill="${skin}" />
          <circle cx="113" cy="75" r="7" fill="${skin}" />
          <path d="M46 77c2-4 5-6 8-4" stroke="${skinDeep}" stroke-width="2" stroke-linecap="round" fill="none" opacity=".35" />
          <path d="M114 77c-2-4-5-6-8-4" stroke="${skinDeep}" stroke-width="2" stroke-linecap="round" fill="none" opacity=".35" />
          <path d="M80 32c25 0 40 19 40 47 0 32-16 51-40 51S40 111 40 79c0-28 15-47 40-47Z" fill="url(#${gradientId}-skin)" />
          <path d="M45 78c4 28 18 44 37 44 15 0 27-9 34-28-2 26-17 41-37 41-23 0-37-20-34-57Z" fill="${skinDeep}" opacity=".13" />
          <path d="M81 63c-4 12-6 24-6 33 3 3 8 3 12 0" stroke="${skinDeep}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity=".34" />
          <path d="M56 69c6-4 15-4 21-1" stroke="${portrait.hair || "#222222"}" stroke-width="3.2" stroke-linecap="round" fill="none" opacity=".7" />
          <path d="M86 68c6-3 15-3 21 1" stroke="${portrait.hair || "#222222"}" stroke-width="3.2" stroke-linecap="round" fill="none" opacity=".7" />
          <path d="M59 78c4-4 11-4 16 0" stroke="#f8fafc" stroke-width="5.2" stroke-linecap="round" opacity=".9" />
          <path d="M87 78c5-4 12-4 16 0" stroke="#f8fafc" stroke-width="5.2" stroke-linecap="round" opacity=".9" />
          <circle cx="67" cy="78" r="2.5" fill="${eyeColor}" />
          <circle cx="95" cy="78" r="2.5" fill="${eyeColor}" />
          <circle cx="66.2" cy="77.2" r=".75" fill="#ffffff" opacity=".82" />
          <circle cx="94.2" cy="77.2" r=".75" fill="#ffffff" opacity=".82" />
          <path d="M66 104c8 4 20 4 28 0" stroke="${mouthColor}" stroke-width="3" stroke-linecap="round" fill="none" opacity=".78" />
          <path d="M62 101c10 12 27 12 37 0-2 14-9 21-19 21s-16-7-18-21Z" fill="${portrait.hair || "#222222"}" opacity="${portrait.beard ? ".64" : "0"}" />
          <path d="M68 93c7 3 17 3 24 0" stroke="${portrait.hair || "#222222"}" stroke-width="3" stroke-linecap="round" opacity="${portrait.beard ? ".46" : "0"}" />
          ${hairSvg(portrait)}
        </g>
        <path d="M18 22c28-13 83-14 124 10" stroke="#ffffff" stroke-width="13" stroke-linecap="round" opacity=".15" />
      </svg>
    `;
  }

  function playerPhoto(player) {
    if (!player.photoUrl) {
      return headshotSvg(player);
    }

    return `
      <span class="photo-shell">
        <span class="photo-fallback">${headshotSvg(player)}</span>
        <img
          class="headshot headshot-photo"
          src="${escapeHtml(player.photoUrl)}"
          alt="${escapeHtml(player.name)} photo"
          loading="eager"
          decoding="async"
          onload="this.previousElementSibling.style.display='none'; this.style.opacity='1';"
          onerror="this.style.display='none';"
        />
      </span>
    `;
  }

  function playerCard(player, options = {}) {
    const locked = options.locked;
    const selectable = options.selectable;
    const selected = options.selected;
    const classes = [
      "player-card",
      rarityClass(player.rarity),
      locked ? "is-locked" : "",
      selected ? "is-selected" : "",
      selectable ? "is-selectable" : "",
    ]
      .filter(Boolean)
      .join(" ");

    if (locked) {
      const lockedGrade = player.grade || "??";
      const lockedPosition = player.position || "??";
      return `
        <article class="${classes}">
          <div class="grade-slab">
            <strong>${escapeHtml(lockedGrade)}</strong>
            <span>${escapeHtml(lockedPosition)}</span>
          </div>
          <div class="portrait-frame">
            ${headshotSvg(player, true)}
          </div>
          <div class="name-strip">
            <h3>${escapeHtml(player.name)}</h3>
          </div>
        </article>
      `;
    }

    const buttonAttrs = selectable
      ? `type="button" data-action="select-player" data-player-id="${player.id}"`
      : "";
    const tag = selectable ? "button" : "article";
    const selectedText = selected ? `<span class="selected-tag">Captain</span>` : "";
    const grade = player.grade || Math.round((player.speed + player.shot + player.dribble + player.defense) * 2.5);
    const position = player.position || "ST";

    return `
      <${tag} class="${classes}" ${buttonAttrs}>
        <div class="grade-slab" aria-label="${grade} overall grade">
          <strong>${grade}</strong>
          <span>${escapeHtml(position)}</span>
        </div>
        <div class="portrait-frame">
          ${playerPhoto(player)}
        </div>
        <div class="name-strip">
          <h3>${escapeHtml(player.name)}</h3>
          ${selectedText}
        </div>
      </${tag}>
    `;
  }

  function pageHeader(title, copy, actions = "") {
    return `
      <header class="page-header">
        <div>
          <h1>${escapeHtml(title)}</h1>
          ${copy ? `<p>${escapeHtml(copy)}</p>` : ""}
        </div>
        ${actions ? `<div class="header-actions">${actions}</div>` : ""}
      </header>
    `;
  }

  function confettiMarkup() {
    return Array.from({ length: 18 })
      .map((_, index) => `<span class="confetti-piece piece-${index + 1}"></span>`)
      .join("");
  }

  function draftPicker(app) {
    return `
      <div class="draft-picker">
        <span class="mini-label">Choose draft</span>
        <div class="draft-options">
          ${window.GAME_DATA.drafts
            .map((draft) => {
              const cards = draft.ids.length;
              const unlocked = draft.ids.filter((id) => app.isUnlocked(id)).length;
              return `
                <button
                  class="draft-option ${draft.name === app.state.selectedDraft ? "is-selected" : ""}"
                  type="button"
                  data-action="select-draft"
                  data-draft-name="${escapeHtml(draft.name)}"
                >
                  <strong>${escapeHtml(draft.name)}</strong>
                  <span>${unlocked} / ${cards} cards</span>
                </button>
              `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  function packShop(app) {
    return `
      <div class="pack-shop">
        ${window.GAME_DATA.packTypes
          .map(
            (packType) => `
              <div class="pack-shop-item">
                <div>
                  <strong>${escapeHtml(packType.name)}</strong>
                  <span>${escapeHtml(packType.description)}</span>
                </div>
                <button
                  class="secondary-btn"
                  type="button"
                  data-action="buy-pack"
                  data-pack-type="${escapeHtml(packType.id)}"
                  ${app.state.coins < packType.cost ? "disabled" : ""}
                >
                  ${packType.cost} coins
                </button>
              </div>
            `,
          )
          .join("")}
      </div>
    `;
  }

  function specialCard(card, locked = false) {
    return `
      <article class="special-card ${locked ? "is-locked" : ""}">
        <span>${escapeHtml(card.type)}</span>
        <strong>${locked ? "Locked special" : escapeHtml(card.name)}</strong>
        <p>${locked ? "Open Special Packs to reveal this card." : escapeHtml(card.bonus)}</p>
      </article>
    `;
  }

  function renderStart(app) {
    const unlockedCount = app.getUnlockedLegendCount();
    const legendTotal = window.GAME_DATA.legendCards.length;
    const difficulty = app.getDifficultyTier();
    const packCount = app.getPackCount();
    app.root.innerHTML = `
      <section class="start-screen">
        <div class="hero-field">
          <div class="hero-player hero-player-left">BB</div>
          <div class="hero-ball"></div>
          <div class="hero-player hero-player-right">MB</div>
        </div>
        <div class="start-panel">
          <p class="game-label">Pick a draft, win coins, buy packs</p>
          <h1>Bench to Ballon d'Or</h1>
          <p class="lead">Choose the draft you want to chase before your first match, then use match coins to buy player packs and special packs.</p>
          <div class="score-strip">
            <span><strong>${unlockedCount}</strong> / ${legendTotal} legends</span>
            <span><strong>${app.state.coins}</strong> coins</span>
            <span><strong>${packCount}</strong> packs</span>
            <span><strong>${app.state.wins}</strong> wins</span>
          </div>
          ${draftPicker(app)}
          <div class="progress-panel difficulty-${difficulty.id}">
            <div>
              <span class="mini-label">Difficulty</span>
              <strong>${escapeHtml(difficulty.label)}</strong>
              <p>${escapeHtml(difficulty.description)}</p>
            </div>
            <div>
              <span class="mini-label">Milestone</span>
              <strong>${escapeHtml(app.getNextMilestone())}</strong>
            </div>
          </div>
          ${packShop(app)}
          <div class="button-row">
            <button class="primary-btn" type="button" data-action="play">Play</button>
            <button class="secondary-btn" type="button" data-action="collection">Collection</button>
          </div>
        </div>
      </section>
    `;
  }

  function renderLineup(app) {
    const selectedPlayer = app.getSelectedPlayer();
    const difficulty = app.getDifficultyTier();
    const packCount = app.getPackCount();
    const availablePlayers = window.GAME_DATA.allPlayers.filter((player) =>
      app.isUnlocked(player.id),
    );

    app.root.innerHTML = `
      <section class="screen">
        ${pageHeader(
          "Pick your captain",
          "Choose one unlocked player to control. The rest of your unlocked cards fill out the 11v11 squad.",
          `<button class="secondary-btn" type="button" data-action="start">Back</button>`,
        )}
        <div class="lineup-summary">
          <div>
            <span class="mini-label">Selected</span>
            <strong>${escapeHtml(selectedPlayer.name)}</strong>
          </div>
          <div>
            <span class="mini-label">Difficulty</span>
            <strong>${escapeHtml(difficulty.label)}</strong>
          </div>
          <div>
            <span class="mini-label">Progress</span>
            <strong>${escapeHtml(app.getNextMilestone())}</strong>
          </div>
          <div>
            <span class="mini-label">Draft target</span>
            <strong>${escapeHtml(app.state.selectedDraft)}</strong>
          </div>
          <button class="primary-btn" type="button" data-action="start-match">Start Match</button>
        </div>
        <div class="economy-row">
          <span>${packCount} unopened pack(s)</span>
          <span>${app.state.coins} coins</span>
          <button class="secondary-btn" type="button" data-action="start">Change draft</button>
        </div>
        <div class="card-grid">
          ${availablePlayers
            .map((player) =>
              playerCard(player, {
                selectable: true,
                selected: player.id === app.state.selectedPlayerId,
              }),
            )
            .join("")}
        </div>
      </section>
    `;
  }

  function renderCollection(app) {
    const unlockedCount = app.getUnlockedLegendCount();
    const legendTotal = window.GAME_DATA.legendCards.length;
    const specialUnlockedCount = window.GAME_DATA.specialCards.filter((card) =>
      app.isSpecialUnlocked(card.id),
    ).length;
    const packCount = app.getPackCount();
    const complete = app.isCollectionComplete();
    app.root.innerHTML = `
      <section class="screen">
        ${pageHeader(
          "Legend collection",
          `Legends unlocked: ${unlockedCount} / ${legendTotal}`,
          `<button class="secondary-btn" type="button" data-action="start">Back</button>`,
        )}
        <div class="collection-toolbar">
          <span>${packCount} unopened packs</span>
          <span>${app.state.coins} coins</span>
          <span>${specialUnlockedCount} / ${window.GAME_DATA.specialCards.length} special cards</span>
          <button class="danger-btn" type="button" data-action="reset-save">Reset Save</button>
        </div>
        ${packShop(app)}
        ${
          complete
            ? `
              <div class="complete-banner">
                <strong>Collection complete</strong>
                <span>All ${legendTotal} legends are unlocked. Keep playing for coins, packs, and bragging rights.</span>
              </div>
            `
            : `
              <div class="progress-panel">
                <div>
                  <span class="mini-label">Next</span>
                  <strong>${escapeHtml(app.getNextMilestone())}</strong>
                </div>
              </div>
            `
        }
        <div class="card-grid">
          ${window.GAME_DATA.legendCards
            .map((player) =>
              playerCard(player, {
                locked: !app.isUnlocked(player.id),
              }),
            )
            .join("")}
        </div>
        <div class="collection-section">
          <h2>Special cards</h2>
          <div class="special-grid">
            ${window.GAME_DATA.specialCards
              .map((card) => specialCard(card, !app.isSpecialUnlocked(card.id)))
              .join("")}
          </div>
        </div>
      </section>
    `;
  }

  function renderPack(app) {
    const result = app.state.lastPackResult;
    const resultPlayer = result && result.playerId ? window.GAME_DATA.getPlayerById(result.playerId) : null;
    const resultSpecial = result && result.specialCardId ? window.GAME_DATA.getSpecialCardById(result.specialCardId) : null;
    const packCount = app.getPackCount();
    const nextPackType = app.state.packQueue[0]
      ? window.GAME_DATA.getPackTypeById(app.state.packQueue[0])
      : null;
    const resultPackType = result && result.packTypeId ? window.GAME_DATA.getPackTypeById(result.packTypeId) : null;
    const packTitle = resultPackType ? resultPackType.name : nextPackType ? nextPackType.name : "Pack";
    const confetti = confettiMarkup();

    app.root.innerHTML = `
      <section class="screen pack-screen ${result ? "has-reveal" : ""}">
        ${pageHeader(
          "Open your pack",
          packCount > 0
            ? `${nextPackType.name} is waiting. Open it now.`
            : "No packs waiting right now. Buy one with coins from matches.",
          `<button class="secondary-btn" type="button" data-action="lineup">Lineup</button>`,
        )}
        <div class="pack-layout">
          <div class="pack-visual ${result ? "is-open" : ""}">
            <div class="pack-shine"></div>
            <strong>BTB</strong>
            <span>${escapeHtml(packTitle)}</span>
          </div>
          <div class="pack-result">
            ${resultPlayer || resultSpecial ? `<div class="confetti" aria-hidden="true">${confetti}</div>` : ""}
            ${
              resultPlayer
                ? `
                  <p class="game-label">New card unlocked!</p>
                  ${app.state.lastMilestone ? `<div class="milestone-callout">${escapeHtml(app.state.lastMilestone)}</div>` : ""}
                  ${playerCard(resultPlayer)}
                  ${
                    result.complete
                      ? `<div class="complete-banner compact"><strong>Collection complete</strong><span>All ${window.GAME_DATA.legendCards.length} legends are now unlocked.</span></div>`
                      : ""
                  }
                  <button class="primary-btn" type="button" data-action="lineup">Use this player</button>
                `
                : resultSpecial
                  ? `
                    <p class="game-label">Special card unlocked!</p>
                    ${specialCard(resultSpecial)}
                    ${
                      result.complete
                        ? `<div class="complete-banner compact"><strong>Special set complete</strong><span>All special cards are now unlocked.</span></div>`
                        : ""
                    }
                    <button class="primary-btn" type="button" data-action="collection">View collection</button>
                  `
                : result && result.type === "complete"
                  ? `
                    <p class="game-label">Collection complete</p>
                    <h2>All legends unlocked. +50 coins</h2>
                    <button class="primary-btn" type="button" data-action="lineup">Back to lineup</button>
                  `
                  : result && result.type === "special-complete"
                    ? `
                      <p class="game-label">Special set complete</p>
                      <h2>All special cards unlocked. +75 coins</h2>
                      <button class="primary-btn" type="button" data-action="collection">View collection</button>
                    `
                  : `
                    <h2>Ready?</h2>
                    <p>Open the next pack to add a player or special card to your collection.</p>
                    <p class="pack-note">${packCount} pack(s) waiting. ${app.state.coins} coins.</p>
                    <button class="primary-btn" type="button" data-action="open-pack" ${packCount < 1 ? "disabled" : ""}>Open Pack</button>
                    ${packShop(app)}
                  `
            }
          </div>
        </div>
      </section>
    `;
  }

  function renderMatch(app) {
    const selectedPlayer = app.getSelectedPlayer();
    const difficulty = app.getDifficultyTier();

    app.root.innerHTML = `
      <section class="match-screen">
        <div class="match-topbar">
          <button class="secondary-btn" type="button" data-action="lineup">Exit</button>
          <div>
            <span class="mini-label">Captain</span>
            <strong>${escapeHtml(selectedPlayer.name)}</strong>
          </div>
          <div>
            <span class="mini-label">Controls</span>
            <strong>WASD / Arrows + Shift sprint + J pass + Space/K shoot + L tackle</strong>
          </div>
          <div>
            <span class="mini-label">AI</span>
            <strong>${escapeHtml(difficulty.label)}</strong>
          </div>
          <div>
            <span class="mini-label">Mode</span>
            <strong>11v11</strong>
          </div>
        </div>
        <div class="field-wrap">
          <canvas id="match-canvas" width="900" height="520" aria-label="Top-down soccer match"></canvas>
          <div id="match-result" class="match-result" aria-live="polite"></div>
        </div>
      </section>
    `;

    const canvas = app.root.querySelector("#match-canvas");
    const resultOverlay = app.root.querySelector("#match-result");

    const gameOptions = {
      wins: app.state.wins,
      unlockedPlayers: window.GAME_DATA.allPlayers.filter((player) => app.isUnlocked(player.id)),
      onEnd(result) {
        app.pendingMatchResult = result;
        resultOverlay.classList.add("is-visible");
        resultOverlay.innerHTML = `
          <div class="result-panel">
            ${result.won ? `<div class="confetti match-confetti" aria-hidden="true">${confettiMarkup()}</div>` : ""}
            <p class="game-label">${result.won ? "Match won" : "Match lost"}</p>
            <h2>${result.playerScore} - ${result.aiScore}</h2>
            <p>${result.won ? "You earned 125 coins." : "You earned 10 coins."}</p>
            <button class="primary-btn" type="button" data-action="finish-match">
              Back to lineup
            </button>
          </div>
        `;
      },
    };

    if (USE_REALISM_ENGINE && !USE_CANVAS_ENGINE) {
      import("./match/MatchGame.mjs")
        .then(({ MatchGame }) => {
          if (!app.root.contains(canvas)) return;
          app.currentGame = new MatchGame(canvas, selectedPlayer, gameOptions);
        })
        .catch((error) => {
          console.error("Realism engine failed to load; falling back to canvas engine.", error);
          app.currentGame = new window.SoccerGame(canvas, selectedPlayer, gameOptions);
        });
    } else {
      app.currentGame = new window.SoccerGame(canvas, selectedPlayer, gameOptions);
    }

    app.currentMatchKeyHandler = function (event) {
      if (event.key === "Enter" && app.pendingMatchResult) {
        event.preventDefault();
        app.finishMatch(app.pendingMatchResult);
      }
    };
    window.addEventListener("keydown", app.currentMatchKeyHandler);
  }

  function cleanup(app) {
    if (app.currentGame) {
      app.currentGame.destroy();
      app.currentGame = null;
    }

    if (app.currentMatchKeyHandler) {
      window.removeEventListener("keydown", app.currentMatchKeyHandler);
      app.currentMatchKeyHandler = null;
    }
  }

  function bindActions(app) {
    app.root.onclick = function (event) {
      const target = event.target.closest("[data-action]");
      if (!target) return;

      const action = target.dataset.action;

      if (action === "play") app.setScreen("lineup");
      if (action === "start") app.setScreen("start");
      if (action === "collection") app.setScreen("collection");
      if (action === "lineup") app.setScreen("lineup");
      if (action === "start-match") app.setScreen("match");
      if (action === "open-pack") app.openPack();
      if (action === "buy-pack") app.buyPack(target.dataset.packType);
      if (action === "finish-match") app.finishMatch(app.pendingMatchResult);
      if (action === "reset-save") app.resetSave();
      if (action === "select-player") app.selectPlayer(target.dataset.playerId);
      if (action === "select-draft") app.selectDraft(target.dataset.draftName);
    };
  }

  function render(app) {
    cleanup(app);
    app.pendingMatchResult = null;

    if (app.state.screen === "lineup") renderLineup(app);
    else if (app.state.screen === "collection") renderCollection(app);
    else if (app.state.screen === "pack") renderPack(app);
    else if (app.state.screen === "match") renderMatch(app);
    else renderStart(app);

    bindActions(app);
  }

  window.GameUI = {
    playerCard,
    render,
  };
})();
