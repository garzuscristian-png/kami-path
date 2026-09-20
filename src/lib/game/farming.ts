export const GROW_SECONDS = 90;
export const FARM_POSITIONS = [
  { x: -6, z: 3 },
  { x: -6, z: 6 },
  { x: -3, z: 6 },
  { x: -3, z: 9 },
];
export type Crop = { planted: boolean; watered: boolean; growth: number };
export type FarmState = { version: 1; seeds: number; food: number; plots: Crop[] };
export type FarmAction =
  { type: "tick" } | { type: "plant" | "water" | "harvest"; index: number } | { type: "eat" };
export function newFarm(): FarmState {
  return {
    version: 1,
    seeds: 6,
    food: 0,
    plots: FARM_POSITIONS.map(() => ({ planted: false, watered: false, growth: 0 })),
  };
}
export function readFarm(value: unknown): FarmState {
  const f = value as FarmState | null;
  if (
    !f ||
    f.version !== 1 ||
    !Number.isInteger(f.seeds) ||
    f.seeds < 0 ||
    !Number.isInteger(f.food) ||
    f.food < 0 ||
    !Array.isArray(f.plots) ||
    f.plots.length !== 4 ||
    f.plots.some(
      (p) =>
        !p ||
        typeof p.planted !== "boolean" ||
        typeof p.watered !== "boolean" ||
        !Number.isFinite(p.growth) ||
        p.growth < 0 ||
        p.growth > GROW_SECONDS,
    )
  )
    return newFarm();
  return f;
}
export function updateFarm(f: FarmState, action: FarmAction): FarmState {
  if (action.type === "eat") return f.food > 0 ? { ...f, food: f.food - 1 } : f;
  if (action.type === "tick") {
    if (!f.plots.some((p) => p.planted && p.watered && p.growth < GROW_SECONDS)) return f;
    return {
      ...f,
      plots: f.plots.map((p) =>
        p.planted && p.watered ? { ...p, growth: Math.min(GROW_SECONDS, p.growth + 1) } : p,
      ),
    };
  }
  const plot = f.plots[action.index];
  if (!plot) return f;
  const plots = [...f.plots];
  if (action.type === "plant" && !plot.planted && f.seeds > 0) {
    plots[action.index] = { planted: true, watered: false, growth: 0 };
    return { ...f, seeds: f.seeds - 1, plots };
  }
  if (action.type === "water" && plot.planted && !plot.watered) {
    plots[action.index] = { ...plot, watered: true };
    return { ...f, plots };
  }
  if (action.type === "harvest" && plot.planted && plot.growth >= GROW_SECONDS) {
    plots[action.index] = { planted: false, watered: false, growth: 0 };
    return { ...f, seeds: f.seeds + 2, food: f.food + 3, plots };
  }
  return f;
}
