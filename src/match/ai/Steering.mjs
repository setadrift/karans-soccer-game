export function seek(unit, target, maxSpeed) {
  const dx = target.x - unit.x;
  const dy = target.y - unit.y;
  const length = Math.hypot(dx, dy) || 1;
  return { vx: (dx / length) * maxSpeed, vy: (dy / length) * maxSpeed };
}

export function arrive(unit, target, maxSpeed, slowingRadius = 90) {
  const dx = target.x - unit.x;
  const dy = target.y - unit.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 2) return { vx: 0, vy: 0 };
  const speed = Math.min(maxSpeed, (distance / slowingRadius) * maxSpeed);
  return { vx: (dx / distance) * speed, vy: (dy / distance) * speed };
}
