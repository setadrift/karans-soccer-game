# Bench to Ballon d'Or - Build Spec

## Purpose

Build a simple, playable browser soccer game for a kid-friendly session. The game should be fun quickly: start with terrible fictional bench players, play short matches, win packs, and unlock famous soccer player cards.

This spec is written so an AI coding agent can build the game from scratch in stages.

## Scope Decision

Use plain HTML, CSS, and JavaScript with a canvas-based match screen.

Recommended initial file structure:

```txt
index.html
styles.css
src/
  main.js
  data.js
  game.js
  ui.js
```

If the builder wants the absolute fastest version, it may start as one `index.html` file, but the staged build should eventually split into the files above.

Do not use real club logos, national team logos, official player photos, or copyrighted likenesses. Use names, stats, colors, initials, and simple stylized card art.

## Important Clarifications

- Current implementation update: the match is now 11v11. The player controls one selected captain, and the remaining unlocked cards or bench fillers complete the user's XI against a rival XI.
- The latest requested active legend collection has 20 players. Crossed-out players from the previous 15-card list are intentionally removed from the active card pool, and existing saves should filter those old IDs safely.
- Normalize spelling in the game data:
  - "Nemar" becomes `Neymar`
  - "Ronaldino" becomes `Ronaldinho`
  - "mbappe" becomes `Kylian Mbappé`
  - "vinicius junior" becomes `Vinícius Junior`
  - "Ronaldo" becomes `Cristiano Ronaldo`
- The starting five players are not from the legend list. They are fictional bad players.
- The first version should prioritize a playable loop over realism.

## Game Name

`Bench to Ballon d'Or`

## Target Player Experience

The player should be able to:

1. Open the game on a computer.
2. See a silly starting squad of bad players.
3. Pick a captain.
4. Play a short top-down soccer match.
5. Score goals by moving into/kicking the ball.
6. Win a match.
7. Open a card pack.
8. Unlock a better player.
9. See that card in the collection.
10. Use unlocked players in later matches.

## MVP Win Condition

The MVP is complete when:

- The game runs in a browser.
- The user can navigate Start -> Lineup -> Match -> Pack -> Collection.
- A match is playable with keyboard controls.
- Winning a match grants a card pack.
- Opening a pack unlocks one locked legend card, or grants coins only if the collection is already complete.
- Unlocked cards persist during the browser session.
- The player can select an unlocked card for the next match.

Local storage persistence is strongly preferred but can be added after the first playable version.

## Core Loop

```txt
Start game
Pick captain
Play match
If win: earn 1 pack
Open pack
Unlock a locked legend
Return to lineup
Play again with stronger player
Collect all legend cards
```

## Screens

### 1. Start Screen

Required elements:

- Game title: `Bench to Ballon d'Or`
- Primary button: `Play`
- Secondary button: `Collection`
- Small status line showing:
  - unlocked legend count
  - coin count

Actions:

- `Play` opens Lineup Screen.
- `Collection` opens Collection Screen.

### 2. Lineup Screen

Purpose:

Let the player choose who they control in the match.

Required elements:

- List/grid of available players.
- Starter players are unlocked by default.
- Legend players appear only if unlocked.
- Each player card shows:
  - overall rating
  - position
  - stylized headshot
  - player name in a bottom strip
  - selected captain tag when selected
- Selected captain state.
- Button: `Start Match`
- Button: `Back`

Actions:

- Selecting a player sets `selectedPlayerId`.
- `Start Match` opens Match Screen.

### 3. Match Screen

Purpose:

A simple top-down soccer match.

Required elements:

- Green field.
- Left and right goals.
- User-controlled player.
- AI opponent.
- Ball.
- Scoreboard.
- Match status text.
- Button or key action to return after match ends.

Match rules:

- First to 3 goals wins.
- Player scores by getting the ball into the opponent goal.
- AI scores by getting the ball into the player goal.
- After each goal, reset player, AI, and ball positions.
- When match ends, show result overlay:
  - Win: `You won! Open pack`
  - Loss: `You lost. +10 coins`

Controls:

```txt
W / Arrow Up: move up
A / Arrow Left: move left
S / Arrow Down: move down
D / Arrow Right: move right
Space: kick / power shot
Enter: continue after match result
```

### 4. Pack Opening Screen

Purpose:

Reward the player after winning.

Required elements:

- Pack visual.
- Button: `Open Pack`
- Reveal animation can be simple.
- Revealed card panel.
- Result text:
  - `New card unlocked!`
  - `Collection complete! +50 coins` if all legends are already unlocked.
- Button: `Continue`

MVP pack behavior:

- A win grants exactly 1 pack.
- Opening a pack chooses one locked legend card.
- If all legends are already unlocked, grant 50 coins instead.

Optional later behavior:

- Add rarity-weighted odds.
- Add multiple cards per pack.
- Add duplicate cards.
- Let 100 coins buy one pack.

### 5. Collection Screen

Purpose:

Show progress toward collecting every legend.

Required elements:

- Grid of the active legend cards.
- Locked cards show:
  - silhouette or question mark
  - real overall rating
  - real position
  - player name in a bottom strip
- Unlocked cards show:
  - overall rating
  - position
  - stylized headshot
  - player name in a bottom strip
- Progress text:
  - `Legends unlocked: X / active legend total`
- Button: `Back`

## Player Data

### Stat Scale

Stats use a 1-10 scale.

```txt
1 = awful
5 = average
10 = superstar
```

Stats:

- speed
- shot
- dribble
- defense

Use these stats to affect gameplay:

- `speed` changes movement speed.
- `shot` changes kick strength.
- `dribble` improves close ball control.
- `defense` can slightly reduce AI shove or improve ball stealing.

For MVP, speed and shot must work. Dribble and defense may be displayed first, then wired into gameplay later.

### Starter Players

These five are unlocked at the start.

```js
[
  {
    id: "barry-backpass",
    name: "Barry Backpass",
    rarity: "Starter",
    speed: 3,
    shot: 2,
    dribble: 2,
    defense: 4,
    special: "Accidentally passes backward",
    unlocked: true
  },
  {
    id: "timmy-tackle-late",
    name: "Timmy Tackle-Late",
    rarity: "Starter",
    speed: 4,
    shot: 2,
    dribble: 3,
    defense: 3,
    special: "Slides after the play is over",
    unlocked: true
  },
  {
    id: "dave-own-goal",
    name: "Dave Own-Goal",
    rarity: "Starter",
    speed: 3,
    shot: 3,
    dribble: 2,
    defense: 2,
    special: "Always looks nervous near goal",
    unlocked: true
  },
  {
    id: "carl-misskick",
    name: "Carl Misskick",
    rarity: "Starter",
    speed: 2,
    shot: 4,
    dribble: 2,
    defense: 3,
    special: "Sometimes blasts it sideways",
    unlocked: true
  },
  {
    id: "steve-benchson",
    name: "Steve Benchson",
    rarity: "Starter",
    speed: 2,
    shot: 2,
    dribble: 3,
    defense: 5,
    special: "Elite at warming up",
    unlocked: true
  }
]
```

### Legend Cards

The active legend collection is locked at the start.

Visible card faces should use the researched overall rating and position below. The gameplay stats in the JS objects are still used internally for movement, kicking, and AI balance, but they should not be displayed on the premium cards.

| Player | Overall | Position | Source note |
| --- | ---: | --- | --- |
| Lionel Messi | 119 | RW | User-supplied card rating |
| Lamine Yamal | 119 | RW | User-supplied card rating |
| Neymar | 108 | LW | User-supplied card rating |
| Luis Suárez | 105 | ST | User-supplied card rating |
| Gareth Bale | 117 | RW | User-supplied card rating |
| Ali Daei | 97 | ST | User-supplied card rating |
| Alireza Beiranvand | 78 | G | User-supplied card rating |
| Ronaldinho | 117 | LW | User-supplied card rating |
| Diego Maradona | 117 | RW | User-supplied card rating |
| Iker Casillas | 116 | G | User-supplied card rating |
| Kylian Mbappé | 120 | LW | User-supplied card rating |
| Gianluigi Buffon | 117 | G | User-supplied card rating |
| Zlatan Ibrahimović | 98 | ST | User-supplied card rating |
| Vinícius Junior | 117 | LW | User-supplied card rating |
| Cristiano Ronaldo | 117 | LW | User-supplied card rating |

```js
[
  {
    id: "lionel-messi",
    name: "Lionel Messi",
    rarity: "Legendary",
    speed: 8,
    shot: 9,
    dribble: 10,
    defense: 4,
    special: "Magic Dribble",
    unlocked: false
  },
  {
    id: "lamine-yamal",
    name: "Lamine Yamal",
    rarity: "Legendary",
    speed: 9,
    shot: 8,
    dribble: 9,
    defense: 4,
    special: "Wonderkid Burst",
    unlocked: false
  },
  {
    id: "neymar",
    name: "Neymar",
    rarity: "Legendary",
    speed: 8,
    shot: 8,
    dribble: 10,
    defense: 3,
    special: "Rainbow Flick",
    unlocked: false
  },
  {
    id: "luis-suarez",
    name: "Luis Suárez",
    rarity: "Legendary",
    speed: 7,
    shot: 9,
    dribble: 8,
    defense: 5,
    special: "Clutch Finish",
    unlocked: false
  },
  {
    id: "gareth-bale",
    name: "Gareth Bale",
    rarity: "Legendary",
    speed: 9,
    shot: 9,
    dribble: 7,
    defense: 5,
    special: "Long Sprint Rocket",
    unlocked: false
  },
  {
    id: "ali-daei",
    name: "Ali Daei",
    rarity: "Legendary",
    speed: 6,
    shot: 9,
    dribble: 6,
    defense: 6,
    special: "Header King",
    unlocked: false
  },
  {
    id: "alireza-beiranvand",
    name: "Alireza Beiranvand",
    rarity: "Epic",
    speed: 5,
    shot: 3,
    dribble: 4,
    defense: 10,
    special: "Giant Goalkeeper Throw",
    unlocked: false
  },
  {
    id: "ronaldinho",
    name: "Ronaldinho",
    rarity: "Legendary",
    speed: 8,
    shot: 8,
    dribble: 10,
    defense: 4,
    special: "No-Look Trick",
    unlocked: false
  },
  {
    id: "diego-maradona",
    name: "Diego Maradona",
    rarity: "Legendary",
    speed: 8,
    shot: 9,
    dribble: 10,
    defense: 5,
    special: "Golden Slalom",
    unlocked: false
  },
  {
    id: "iker-casillas",
    name: "Iker Casillas",
    rarity: "Legendary",
    speed: 5,
    shot: 2,
    dribble: 5,
    defense: 10,
    special: "Lightning Save",
    unlocked: false
  },
  {
    id: "kylian-mbappe",
    name: "Kylian Mbappé",
    rarity: "Legendary",
    speed: 10,
    shot: 9,
    dribble: 9,
    defense: 4,
    special: "Turbo Sprint",
    unlocked: false
  },
  {
    id: "gianluigi-buffon",
    name: "Gianluigi Buffon",
    rarity: "Legendary",
    speed: 4,
    shot: 2,
    dribble: 4,
    defense: 10,
    special: "Wall Save",
    unlocked: false
  },
  {
    id: "zlatan-ibrahimovic",
    name: "Zlatan Ibrahimović",
    rarity: "Legendary",
    speed: 7,
    shot: 10,
    dribble: 8,
    defense: 6,
    special: "Acrobatic Thunder",
    unlocked: false
  },
  {
    id: "vinicius-junior",
    name: "Vinícius Junior",
    rarity: "Legendary",
    speed: 10,
    shot: 8,
    dribble: 10,
    defense: 4,
    special: "Wing Blur",
    unlocked: false
  },
  {
    id: "cristiano-ronaldo",
    name: "Cristiano Ronaldo",
    rarity: "Legendary",
    speed: 9,
    shot: 9,
    dribble: 8,
    defense: 5,
    special: "Siu Finish",
    unlocked: false
  }
]
```

## Match Mechanics

### Coordinate System

Use canvas coordinates.

- Field width: 900
- Field height: 520
- Goal width: 18
- Goal height: 140
- Player radius: 16
- Ball radius: 9

Canvas should scale responsively to fit smaller screens while preserving the field aspect ratio.

### Entities

Player:

```txt
x
y
vx
vy
radius
selectedCard
speed
shotPower
```

AI opponent:

```txt
x
y
vx
vy
radius
speed
target
```

Ball:

```txt
x
y
vx
vy
radius
friction
```

### Player Movement

- Keyboard input sets movement direction.
- Normalize diagonal movement so diagonal speed is not faster.
- Movement speed is based on selected card speed.
- Prevent player from leaving the field.

Suggested formula:

```txt
playerMoveSpeed = 2.8 + selectedPlayer.speed * 0.22
```

### Ball Movement

- Ball has velocity.
- Apply friction every frame.
- Bounce off top and bottom walls.
- Bounce off side walls except inside goal mouth.

Suggested:

```txt
ball.vx *= 0.985
ball.vy *= 0.985
```

### Touching And Kicking

When player overlaps ball:

- Push ball slightly away from player.
- If Space is pressed, apply stronger kick in player's facing/movement direction.

Suggested kick strength:

```txt
normal touch = 1.5 + dribble * 0.08
space kick = 4.5 + shot * 0.45
```

If the player is standing still and presses Space near the ball, kick toward the opponent goal.

### AI Opponent

MVP AI should be simple:

- If the ball is on AI side or near midfield, AI moves toward ball.
- If AI touches ball, it kicks toward player's goal.
- AI speed should be moderate so the game is winnable with starter players.

Suggested AI values:

```txt
aiSpeed = 3.0
aiKickPower = 4.5
```

Optional difficulty scaling:

- Easy AI for first 2 wins.
- Medium AI after 3 wins.
- Hard AI after 6 wins.

### Scoring

Player goal:

- Ball crosses right side of field.
- Ball y is within right goal mouth.

AI goal:

- Ball crosses left side of field.
- Ball y is within left goal mouth.

After goal:

- Increment score.
- Show short message.
- Reset positions after a brief delay.

Match ends:

- First side to 3 goals.

## Game State

Use a single state object.

```js
const state = {
  screen: "start",
  coins: 0,
  packs: 0,
  wins: 0,
  losses: 0,
  selectedPlayerId: "barry-backpass",
  unlockedPlayerIds: [
    "barry-backpass",
    "timmy-tackle-late",
    "dave-own-goal",
    "carl-misskick",
    "steve-benchson"
  ],
  lastPackResult: null
};
```

Persist this object to localStorage in Stage 5.

Suggested localStorage key:

```txt
bench-to-ballon-dor-save-v1
```

Add a `Reset Save` button only after localStorage is implemented.

## Rewards

### Match Rewards

Win:

```txt
packs += 1
wins += 1
open Pack Screen
```

Loss:

```txt
coins += 10
losses += 1
return to Lineup Screen
```

### Pack Rewards

MVP algorithm:

1. Create a list of all locked legend cards.
2. If at least one legend is locked:
   - Randomly unlock one locked legend.
3. If all legends are already unlocked:
   - Grant 50 coins.

This avoids frustrating duplicate packs in the earliest version.

Optional later duplicate algorithm:

```txt
locked card: 70%
duplicate: 30%
duplicate reward: 25 coins
all cards unlocked: 50 coins
```

Optional coin purchase:

```txt
100 coins = 1 pack
```

## Visual Direction

Keep it playful and readable.

Recommended style:

- Bright green field.
- White field lines.
- Red/orange user player.
- Blue/purple AI player.
- White ball with simple dark patches or a clean circular ball.
- Cards with rarity colors:
  - Starter: gray
  - Epic: purple
  - Legendary: gold

Card art should be generic and stylized:

- Use initials or simple silhouettes.
- Do not use real player photos or official kits.

## Staged Build Plan

### Stage 1 - Static App Shell

Goal:

Create the basic app with screen navigation and hardcoded data.

Build:

- `index.html`
- `styles.css`
- `src/data.js`
- `src/ui.js`
- `src/main.js`
- Start Screen
- Lineup Screen
- Collection Screen
- All player data

Acceptance:

- App opens in browser.
- User can move between Start, Lineup, and Collection.
- Starter players appear unlocked.
- Legend collection shows the active legend card pool.
- Selecting a starter player updates the selected captain.

### Stage 2 - Playable Match

Goal:

Build the top-down soccer match.

Build:

- `src/game.js`
- Canvas field rendering.
- Player movement.
- AI movement.
- Ball physics.
- Goals and scoring.
- First to 3 ends match.

Acceptance:

- User can move with keyboard.
- Ball moves when touched/kicked.
- Goals can be scored on both sides.
- Match ends at 3 goals.
- Win/loss result is shown.

### Stage 3 - Player Stats Affect Gameplay

Goal:

Connect selected card stats to gameplay.

Build:

- Movement speed based on speed stat.
- Kick strength based on shot stat.
- Dribble stat improves ball control.
- Selected captain is used in Match Screen.

Acceptance:

- Barry Backpass feels slow and weak.
- A high-speed legend feels noticeably faster.
- A high-shot legend kicks harder.

### Stage 4 - Packs And Unlocks

Goal:

Complete the reward loop.

Build:

- Winning gives 1 pack.
- Pack Opening Screen.
- Pack unlock logic.
- Collection updates after pack reveal.
- Newly unlocked legends appear on Lineup Screen.

Acceptance:

- Win match -> pack screen.
- Open pack -> reveal a legend.
- Revealed legend becomes unlocked.
- User can select that legend in the next match.

### Stage 5 - Save Data And Reset

Goal:

Persist progress.

Build:

- Save state to localStorage.
- Load state on page start.
- Reset Save button.

Acceptance:

- Refreshing browser keeps unlocked cards, coins, wins, and selected player.
- Reset Save returns the game to starter state.

### Stage 6 - Difficulty And Progression

Goal:

Make repeated matches more interesting.

Build:

- AI difficulty increases after wins.
- Add win milestones:
  - 1 win: first pack
  - 3 wins: medium AI
  - 6 wins: hard AI
  - all legends unlocked: collection complete message
- Optional coin purchase: 100 coins buys 1 pack.

Acceptance:

- AI gets harder over time.
- The game remains winnable.
- Collection complete state appears after all active legends are unlocked.

### Stage 7 - Polish

Goal:

Make the game feel better without expanding scope too much.

Build:

- Pack reveal animation.
- Better card styling.
- Sound effects if available and non-annoying.
- Simple particle/confetti effect on new legend.
- Improved field lines.
- Mobile-ish layout support, though keyboard desktop is the priority.

Acceptance:

- No screen feels like a placeholder.
- Text is readable.
- Cards and buttons are easy to click.
- The match screen remains the focus.

## One-Shot Build Instructions For An AI Agent

If building the first complete version in one pass, implement Stages 1-5.

Do not overbuild:

- No online multiplayer or real official teams.
- No online multiplayer.
- No real teams.
- No player photos.
- No complicated fouls.
- No substitutions.
- No tournament bracket until the core loop works.

Implementation priorities:

1. Data correctness.
2. Playable match.
3. Win -> pack -> unlock loop.
4. Collection and lineup update.
5. Save/load.
6. Visual polish.

## Testing Checklist

Manual test:

- Open `index.html` or local dev server.
- Start Screen loads.
- Click `Collection`; the active legend cards are shown.
- Go back.
- Click `Play`.
- Select each starter player and confirm selected state changes.
- Start match.
- Move with WASD.
- Move with arrow keys.
- Kick with Space.
- Score a goal.
- Let AI score a goal.
- Win the match.
- Confirm Pack Screen opens.
- Open pack.
- Confirm a legend unlocks.
- Continue to Lineup.
- Confirm unlocked legend appears as selectable.
- Select legend and start another match.
- Confirm legend stats affect movement or kick strength.
- Refresh page after Stage 5.
- Confirm progress persists.
- Use Reset Save.
- Confirm progress clears.

Edge cases:

- Ball cannot get permanently stuck outside field.
- Player cannot leave field.
- AI cannot leave field.
- Pack opening works when only one locked legend remains.
- Pack opening works when all legends are already unlocked.
- Keyboard controls do not scroll the page during a match.

## Done Criteria

The project is ready for the nephew to play when:

- A complete match can be played without console errors.
- Winning a match unlocks a visible card.
- The unlocked player can be used in the next match.
- The collection can eventually reach the full active legend total.
- Restarting the browser does not lose progress after Stage 5.
- The game is understandable without reading this spec.
