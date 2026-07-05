export function findBestPasserTarget(state, passer) {
  const teammates = passer.side === "home" ? state.homeTeam : state.awayTeam;
  const attackingDirection = passer.side === "home" ? 1 : -1;
  return teammates
    .filter((unit) => unit !== passer && !unit.isKeeper)
    .map((unit) => {
      const forward = (unit.x - passer.x) * attackingDirection;
      const separation = Math.hypot(unit.x - passer.x, unit.y - passer.y);
      return { unit, score: forward * 0.7 - Math.abs(unit.y - passer.y) * 0.18 + Math.min(separation, 180) };
    })
    .sort((a, b) => b.score - a.score)[0]?.unit;
}
