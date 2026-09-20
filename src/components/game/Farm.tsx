import { useEffect, useRef, useState } from "react";
import {
  FARM_POSITIONS,
  GROW_SECONDS,
  newFarm,
  readFarm,
  updateFarm,
  type FarmAction,
  type FarmState,
} from "@/lib/game/farming";
import { useWorld } from "@/components/scene/WorldContext";

export function useFarm(paused: boolean) {
  const [farm, setFarm] = useState<FarmState>(newFarm);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const current = useRef(farm);
  useEffect(() => {
    try {
      current.current = readFarm(JSON.parse(localStorage.getItem("kami-farm-v1") ?? "null"));
      setFarm(current.current);
    } catch {
      setSaveError(true);
    }
    setLoaded(true);
  }, []);
  function act(action: FarmAction) {
    if (!loaded) return false;
    const next = updateFarm(current.current, action);
    if (next === current.current) return false;
    current.current = next;
    setFarm(next);
    try {
      localStorage.setItem("kami-farm-v1", JSON.stringify(next));
    } catch {
      setSaveError(true);
    }
    return true;
  }
  useEffect(() => {
    if (paused || !loaded) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) act({ type: "tick" });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [paused, loaded]);
  return { farm, act, loaded, saveError };
}

export function FarmPlots({ farm }: { farm: FarmState }) {
  const { height } = useWorld();
  return (
    <group>
      {FARM_POSITIONS.map((pos, i) => {
        const p = farm.plots[i]!;
        const grown = p.growth / GROW_SECONDS;
        return (
          <group key={i} position={[pos.x, height(pos.x, pos.z) + 0.08, pos.z]}>
            <mesh receiveShadow>
              <boxGeometry args={[2, 0.16, 2]} />
              <meshStandardMaterial color={p.watered ? "#352719" : "#70503a"} />
            </mesh>
            {[-0.85, 0.85].map((x) => (
              <mesh key={x} position={[x, 0.1, 0]}>
                <boxGeometry args={[0.12, 0.15, 2]} />
                <meshStandardMaterial color="#a1885e" />
              </mesh>
            ))}
            {p.planted &&
              Array.from({ length: 9 }, (_, j) => (
                <mesh
                  key={j}
                  position={[
                    ((j % 3) - 1) * 0.5,
                    0.2 + grown * 0.35,
                    (Math.floor(j / 3) - 1) * 0.5,
                  ]}
                >
                  <coneGeometry args={[0.12 + grown * 0.12, 0.2 + grown * 0.7, 5]} />
                  <meshStandardMaterial color={grown >= 1 ? "#e5bc45" : "#6caa3e"} />
                </mesh>
              ))}
          </group>
        );
      })}
    </group>
  );
}

export function FarmPanel({
  farm,
  act,
  x,
  z,
  onEat,
  saveError,
}: {
  farm: FarmState;
  act: (action: FarmAction) => boolean;
  x: number;
  z: number;
  onEat: () => void;
  saveError: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="pointer-events-auto absolute bottom-20 right-5 z-20 w-72 rounded-lg border border-emerald-700 bg-slate-950/95 p-3 text-white shadow-xl">
      <button
        className="w-full text-left font-semibold text-emerald-300"
        onClick={() => setOpen(!open)}
      >
        🌱 Huerto de casa {open ? "−" : "+"}
      </button>
      {open && (
        <>
          <p className="my-2 text-xs">
            Semillas: {farm.seeds} · Cosecha: {farm.food}. Cada parcela produce 3 alimentos y 2
            semillas tras regarla y esperar 90 s de juego.
          </p>
          <p className="mb-2 text-xs text-slate-400">
            Acércate a los bancales junto a casa. La regadera tiene agua ilimitada en esta versión.
          </p>
          {farm.plots.map((p, index) => {
            const pos = FARM_POSITIONS[index]!;
            const near = Math.hypot(x - pos.x, z - pos.z) < 3.5;
            const type = !p.planted ? "plant" : !p.watered ? "water" : "harvest";
            const ready = !p.planted ? farm.seeds > 0 : !p.watered || p.growth >= GROW_SECONDS;
            return (
              <div key={index} className="my-2 flex items-center justify-between gap-2 text-xs">
                <span>
                  Parcela {index + 1} ·{" "}
                  {p.planted
                    ? !p.watered
                      ? "Seca"
                      : `${Math.floor((p.growth / GROW_SECONDS) * 100)}%`
                    : "Vacía"}
                </span>
                <button
                  className="rounded bg-emerald-800 px-2 py-1 disabled:opacity-40"
                  disabled={!near || !ready}
                  onClick={() => act({ type, index })}
                >
                  {!near
                    ? "Acércate"
                    : type === "plant"
                      ? "Sembrar"
                      : type === "water"
                        ? "Regar"
                        : "Cosechar"}
                </button>
              </div>
            );
          })}
          <button
            className="mt-2 rounded bg-amber-800 px-2 py-1 text-xs disabled:opacity-40"
            disabled={!farm.food}
            onClick={onEat}
          >
            Comer cosecha (+20 salud)
          </button>
          {saveError && (
            <p className="mt-2 text-xs text-red-300">
              No se pudo guardar el huerto en este navegador.
            </p>
          )}
        </>
      )}
    </div>
  );
}
