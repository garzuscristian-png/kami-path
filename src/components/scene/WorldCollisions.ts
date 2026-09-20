import type { Obstacle } from "@/lib/game/landscape";
export function resolveBox(x: number, z: number, radius: number, box: Obstacle): [number, number] {
  const c = Math.cos(box.rotation),
    s = Math.sin(box.rotation);
  let lx = (x - box.x) * c - (z - box.z) * s;
  let lz = (x - box.x) * s + (z - box.z) * c;
  const qx = Math.max(-box.halfX, Math.min(box.halfX, lx)),
    qz = Math.max(-box.halfZ, Math.min(box.halfZ, lz));
  const dx = lx - qx,
    dz = lz - qz,
    d = Math.hypot(dx, dz);
  if (d >= radius) return [x, z];
  if (d > 0.00001) {
    lx += (dx / d) * (radius - d);
    lz += (dz / d) * (radius - d);
  } else if (box.halfX - Math.abs(lx) < box.halfZ - Math.abs(lz))
    lx = (lx >= 0 ? 1 : -1) * (box.halfX + radius);
  else lz = (lz >= 0 ? 1 : -1) * (box.halfZ + radius);
  return [box.x + lx * c + lz * s, box.z - lx * s + lz * c];
}
export function resolveCollisions(
  x: number,
  z: number,
  radius = 0.45,
  defenses: { x: number; z: number; kind: string; rotationY?: number }[] = [],
  shelterLevel = 0,
  obstacles: Obstacle[] = [],
): [number, number] {
  const boxes = [...obstacles];
  if (shelterLevel >= 2) boxes.push({ x: 6.5, z: 6, halfX: 1.9, halfZ: 1.6, rotation: 0 });
  for (const d of defenses)
    if (d.kind === "barricada")
      boxes.push({ x: d.x, z: d.z, halfX: 1.1, halfZ: 0.25, rotation: d.rotationY ?? 0 });
  for (let pass = 0; pass < 3; pass++)
    for (const box of boxes) [x, z] = resolveBox(x, z, radius, box);
  return [Math.max(-59, Math.min(59, x)), Math.max(-12.5, Math.min(59, z))];
}
export function moveWithCollisions(
  x: number,
  z: number,
  dx: number,
  dz: number,
  radius: number,
  defenses: Parameters<typeof resolveCollisions>[3],
  shelter: number,
  obstacles: Obstacle[],
): [number, number] {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / Math.max(0.1, radius * 0.5)));
  for (let i = 0; i < steps; i++)
    [x, z] = resolveCollisions(
      x + dx / steps,
      z + dz / steps,
      radius,
      defenses,
      shelter,
      obstacles,
    );
  return [x, z];
}
export function isClear(x: number, z: number, radius: number, obstacles: Obstacle[]) {
  return obstacles.every((b) => {
    const p = resolveBox(x, z, radius, b);
    return Math.hypot(p[0] - x, p[1] - z) < 0.001;
  });
}
