export class KeeperRules {
  constructor(state) {
    this.state = state;
  }

  update() {
    for (const keeper of this.state.players.filter((unit) => unit.isKeeper)) {
      const distance = Math.hypot(keeper.x - this.state.ball.x, keeper.y - this.state.ball.y);
      if (distance < 26 && this.state.possession.side !== keeper.side) {
        keeper.action = "save";
      }
    }
  }
}
