import type { Biome } from "./nodes";
import { heightAt as originalHeight } from "../../components/scene/terrain.ts";
export type Obstacle = { x: number; z: number; halfX: number; halfZ: number; rotation: number };
export type SceneryObject = Obstacle & {
  kind: "tree" | "rock" | "house" | "tower" | "field";
  height: number;
};
export function randomSequence(seed: number) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}
export function makeHeight(biome: Biome, seed: number) {
  const phase = (seed % 997) / 37;
  return (x: number, z: number) => {
    // The home, garden and spawn keep the same terrain in every expedition.
    const blend = Math.min(1, Math.max(0, (Math.hypot(x, z - 3) - 14) / 14));
    const t = blend * blend * (3 - 2 * blend);
    const wave = Math.sin(x * 0.08 + phase) * Math.cos(z * 0.09 - phase);
    let y = 0;
    switch (biome) {
      case "urban":
        y = 0.2;
        break;
      case "rural":
        y = Math.round((wave + 1) * 2) * 0.45;
        break;
      case "mountain":
        y = 3 + Math.abs(wave) * 12 + Math.sin(z * 0.12) * 2;
        break;
      case "snow":
        y = 2 + wave * 3 + Math.pow(Math.sin(x * 0.04), 2) * 6;
        break;
      case "volcanic":
        y = 2 + Math.abs(wave) * 5 + Math.max(0, 9 - Math.hypot(x - 25, z - 34) * 0.4);
        break;
      case "forest":
        y = 1.5 + wave * 1.3;
        break;
      default:
        y = z < -4 ? -2 : 0.4 + (wave + 1) * 1.2;
    }
    return originalHeight(x, z) * (1 - t) + y * t;
  };
}
export function createLandscape(biome: Biome, seed: number) {
  const random = randomSequence(seed),
    height = makeHeight(biome, seed);
  const objects: SceneryObject[] = [];
  const count = biome === "forest" ? 180 : biome === "urban" ? 48 : biome === "rural" ? 55 : 85;
  for (let attempt = 0; objects.length < count && attempt < 5000; attempt++) {
    let x = -54 + random() * 108,
      z = -7 + random() * 63;
    if (biome === "urban") {
      x = Math.round(x / 12) * 12;
      z = Math.round(z / 12) * 12;
    }
    if (Math.hypot(x, z - 3) < 17 || height(x, z) < 0) continue;
    if (Math.abs(x) < 3 || Math.abs(z - 24) < 3) continue;
    const roll = random();
    const kind: SceneryObject["kind"] =
      biome === "urban"
        ? "tower"
        : biome === "volcanic" || biome === "mountain"
          ? "rock"
          : biome === "rural"
            ? roll < 0.7
              ? "field"
              : "house"
            : biome === "forest" || biome === "snow"
              ? "tree"
              : roll < 0.35
                ? "house"
                : roll < 0.7
                  ? "rock"
                  : "tree";
    const size = 0.8 + random() * 1.4;
    const halfX = kind === "tree" ? 0.25 : kind === "tower" ? 3.5 : kind === "house" ? 2.5 : size;
    const halfZ = kind === "house" ? 2 : halfX;
    if (
      objects.some(
        (o) =>
          Math.hypot(x - o.x, z - o.z) <
          Math.hypot(halfX, halfZ) + Math.hypot(o.halfX, o.halfZ) + 1,
      )
    )
      continue;
    objects.push({
      x,
      z,
      kind,
      halfX,
      halfZ,
      rotation: biome === "urban" || kind === "field" ? 0 : random() * Math.PI,
      height:
        kind === "tower"
          ? 6 + random() * 14
          : kind === "tree"
            ? 4 + size * 3
            : kind === "house"
              ? 3
              : size * 2.5,
    });
  }
  return {
    objects,
    height,
    biome,
    seed,
    obstacles: objects.filter((o) => o.kind !== "field") as Obstacle[],
  };
}
