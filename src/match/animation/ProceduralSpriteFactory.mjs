export function spriteSeedForPlayer(player) {
  const value = Array.from(player.id || player.name || "player").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return {
    skinTone: ["#e4b083", "#d49a6a", "#bf7c50", "#8f5b3d"][value % 4],
    hair: ["#111827", "#3f2a1d", "#f8fafc", "#7c2d12"][value % 4],
    boot: ["#facc15", "#38bdf8", "#f97316", "#f8fafc"][value % 4],
  };
}
