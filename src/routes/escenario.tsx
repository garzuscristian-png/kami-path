import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useState } from "react";
import { KagoshimaScene } from "@/components/scene/KagoshimaScene";
import type { LootKind } from "@/components/scene/Loot";
import {
  useProgress,
  getObjectiveValue,
  isNodeCompleted,
} from "@/lib/game/progress";
import { sound } from "@/lib/game/audio";
import { CRAFT_RECIPES, type Recipe } from "@/lib/game/crafting";
import { Radar } from "@/components/game/Radar";
import { NODES_BY_ID } from "@/lib/game/nodes";

export const Route = createFileRoute("/escenario")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { nodeId?: string } => ({
    nodeId: typeof search.nodeId === "string" ? search.nodeId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Kami Path — Escenario 3D Japón" },
      {
        name: "description",
        content:
          "Escenario 3D de supervivencia en Japón con combate con katana, crafteo, biomas y exploración.",
      },
    ],
  }),
  component: ScenarioPage,
});

function ScenarioPage() {
  const search = Route.useSearch();
  const activeNodeId = search.nodeId ?? "kyushu-kagoshima";
  const activeNode =
    NODES_BY_ID[activeNodeId] ?? NODES_BY_ID["kyushu-kagoshima"]!;

  const { state, advanceObjective } = useProgress();
  const navigate = useNavigate();

  // Habilidades aprendidas en el árbol de progreso
  const hasForraje = state.learnedSkills.includes("forraje");
  const hasEsgrima = state.learnedSkills.includes("esgrima");
  const hasCartografia = state.learnedSkills.includes("cartografia");

  const [collected, setCollected] = useState(0);
  const [health, setHealth] = useState(100);
  const [stamina, setStamina] = useState(100);
  const [zombiesKilled, setZombiesKilled] = useState(0);
  const [hurt, setHurt] = useState(false);
  const [showCrafting, setShowCrafting] = useState(false);
  const [playerPos, setPlayerPos] = useState({ x: 0, z: 3, angle: 0 });

  // Mejoras fabricadas en la partida
  const [hasSharpenedBlade, setHasSharpenedBlade] = useState(false);
  const [hasOmamori, setHasOmamori] = useState(false);

  const [loot, setLoot] = useState<Record<LootKind, number>>({
    comida: 0,
    medicina: 0,
    chatarra: 0,
    reliquia: 0,
  });

  const onLoot = useCallback(
    (kind: LootKind) => {
      sound.playLoot();
      const bonus = hasForraje && Math.random() < 0.25 ? 1 : 0;
      setLoot((l) => ({ ...l, [kind]: l[kind] + 1 + bonus }));
      if (kind === "medicina") setHealth((h) => Math.min(100, h + 15));

      // Avanzar objetivos de recolección si los hay
      const gatherObj = activeNode.objectives.find((o) => o.kind === "gather");
      if (gatherObj) {
        advanceObjective(activeNode.id, gatherObj.id, 1 + bonus);
      }
    },
    [hasForraje, activeNode, advanceObjective],
  );

  const onHit = useCallback(() => {
    sound.playHurt();
    const damage = hasOmamori ? 9 : 15;
    setHealth((h) => Math.max(0, h - damage));
    setHurt(true);
    window.setTimeout(() => setHurt(false), 350);
  }, [hasOmamori]);

  const onKillZombie = useCallback(
    (_id: number) => {
      setZombiesKilled((k) => k + 1);
      const huntObj = activeNode.objectives.find(
        (o) => o.kind === "hunt" || o.kind === "boss",
      );
      if (huntObj) {
        advanceObjective(activeNode.id, huntObj.id, 1);
      }
    },
    [activeNode, advanceObjective],
  );

  const eatFood = useCallback(() => {
    if (loot.comida <= 0) return;
    sound.playLoot();
    setLoot((l) => ({ ...l, comida: l.comida - 1 }));
    setHealth((h) => Math.min(100, h + 15));
    setStamina((s) => Math.min(100, s + 35));
  }, [loot.comida]);

  const canCraft = useCallback(
    (recipe: Recipe) => {
      if (recipe.cost.madera && collected < recipe.cost.madera) return false;
      if (recipe.cost.chatarra && loot.chatarra < recipe.cost.chatarra)
        return false;
      if (recipe.cost.medicina && loot.medicina < recipe.cost.medicina)
        return false;
      if (recipe.cost.comida && loot.comida < recipe.cost.comida) return false;
      if (recipe.cost.reliquia && loot.reliquia < recipe.cost.reliquia)
        return false;
      if (recipe.id === "hoja_afilada" && hasSharpenedBlade) return false;
      if (recipe.id === "omamori" && hasOmamori) return false;
      return true;
    },
    [collected, loot, hasSharpenedBlade, hasOmamori],
  );

  const craftItem = useCallback(
    (recipe: Recipe) => {
      if (!canCraft(recipe)) return;
      sound.playLoot();

      if (recipe.cost.madera) {
        setCollected((c) => Math.max(0, c - recipe.cost.madera!));
      }
      setLoot((prev) => ({
        ...prev,
        chatarra: prev.chatarra - (recipe.cost.chatarra ?? 0),
        medicina: prev.medicina - (recipe.cost.medicina ?? 0),
        comida: prev.comida - (recipe.cost.comida ?? 0),
        reliquia: prev.reliquia - (recipe.cost.reliquia ?? 0),
      }));

      if (recipe.id === "vendaje") setHealth((h) => Math.min(100, h + 45));
      if (recipe.id === "bento") {
        setHealth((h) => Math.min(100, h + 50));
        setStamina(100);
      }
      if (recipe.id === "hoja_afilada") setHasSharpenedBlade(true);
      if (recipe.id === "omamori") setHasOmamori(true);
    },
    [canCraft],
  );

  const handlePlayerMove = useCallback(
    (x: number, z: number, angle: number) => {
      setPlayerPos({ x, z, angle });
    },
    [],
  );

  const onCollect = useCallback(() => {
    sound.playLoot();
    setCollected((c) => c + 1);
    const gatherObj = activeNode.objectives.find((o) => o.kind === "gather");
    if (gatherObj) {
      advanceObjective(activeNode.id, gatherObj.id, 1);
    }
    const surviveObj = activeNode.objectives.find((o) => o.kind === "survive");
    if (surviveObj) {
      advanceObjective(activeNode.id, surviveObj.id, 1);
    }
  }, [activeNode, advanceObjective]);

  const done = isNodeCompleted(state, activeNode);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "KeyC") {
        eatFood();
      }
      if (e.code === "Tab" || e.code === "KeyB") {
        e.preventDefault();
        setShowCrafting((s) => !s);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.cursor = "auto";
    };
  }, [eatFood]);

  return (
    <main className="fixed inset-0 bg-background select-none">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [8, 6, 12], fov: 55, near: 0.1, far: 4000 }}
      >
        <Suspense fallback={null}>
          <KagoshimaScene
            biome={activeNode.biome}
            onCollect={onCollect}
            onHit={onHit}
            onLoot={onLoot}
            onKillZombie={onKillZombie}
            onStaminaChange={setStamina}
            onPlayerMove={handlePlayerMove}
            damagePerHit={(hasSharpenedBlade ? 2 : 1) + (hasEsgrima ? 1 : 0)}
          />
        </Suspense>
      </Canvas>

      {/* HUD Principal */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-5">
        <div className="flex items-start justify-between">
          <div className="rounded-md border border-border bg-card/85 px-4 py-3 backdrop-blur shadow-md">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {activeNode.name} · {activeNode.region} ({activeNode.biome})
            </p>

            {/* Objetivos del nodo activo */}
            <div className="mt-2 space-y-1.5 w-60">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Objetivos de Zona
              </p>
              {activeNode.objectives.map((obj) => {
                const val = getObjectiveValue(state, activeNode.id, obj.id);
                const objDone = val >= obj.target;
                return (
                  <div key={obj.id} className="rounded bg-secondary/40 p-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={
                          objDone
                            ? "text-node-completed font-medium"
                            : "text-foreground"
                        }
                      >
                        {obj.label}
                      </span>
                      <span className="text-muted-foreground tabular-nums ml-1">
                        {val}/{obj.target}
                      </span>
                    </div>
                    <div className="mt-1 h-1 w-full rounded-full bg-secondary">
                      <div
                        className="h-1 rounded-full bg-primary transition-all"
                        style={{
                          width: `${Math.min(100, (val / obj.target) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Barra de Salud */}
            <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
              <span>Salud</span>
              <span className="font-semibold text-foreground">{health}%</span>
            </div>
            <div className="mt-1 h-1.5 w-60 rounded-full bg-secondary">
              <div
                className="h-1.5 rounded-full bg-destructive transition-all"
                style={{ width: `${health}%` }}
              />
            </div>

            {/* Barra de Aguante / Stamina */}
            <div className="mt-2.5 flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
              <span>Aguante (Katana / Sprint)</span>
              <span className="font-semibold text-foreground">{stamina}%</span>
            </div>
            <div className="mt-1 h-1.5 w-60 rounded-full bg-secondary">
              <div
                className="h-1.5 rounded-full bg-emerald-500 transition-all"
                style={{ width: `${stamina}%` }}
              />
            </div>

            <p className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
              Inventario de Supervivencia
            </p>
            <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-foreground">
              <div className="flex items-center justify-between">
                <span>Comida: {loot.comida}</span>
                {loot.comida > 0 && (
                  <button
                    onClick={eatFood}
                    className="pointer-events-auto ml-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-accent-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                    title="Comer para recuperar salud y aguante (Tecla C)"
                  >
                    Comer (C)
                  </button>
                )}
              </div>
              <span>Medicina: {loot.medicina}</span>
              <span>Madera: {collected}</span>
              <span>Chatarra: {loot.chatarra}</span>
              <span>Reliquias: {loot.reliquia}</span>
            </div>

            {/* Estado de Mejoras y Habilidades */}
            <div className="mt-2.5 flex flex-wrap gap-2 text-[11px]">
              {zombiesKilled > 0 && (
                <span className="rounded bg-secondary/80 px-2 py-0.5 text-muted-foreground">
                  Zombis:{" "}
                  <strong className="text-foreground">{zombiesKilled}</strong>
                </span>
              )}
              {hasSharpenedBlade && (
                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-amber-300 font-medium">
                  ⚔️ Filo Tamahagane (+1 Daño)
                </span>
              )}
              {hasOmamori && (
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-purple-300 font-medium">
                  🧿 Omamori (-40% Daño)
                </span>
              )}
              {hasEsgrima && (
                <span className="rounded bg-red-500/20 px-2 py-0.5 text-red-300 font-medium">
                  🥋 Esgrima (+1 Daño)
                </span>
              )}
              {hasForraje && (
                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-amber-300 font-medium">
                  🌾 Forrajeo (+25% Botín)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="pointer-events-auto">
              <Radar
                playerX={playerPos.x}
                playerZ={playerPos.z}
                playerAngle={playerPos.angle}
              />
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowCrafting((s) => !s)}
                className="pointer-events-auto rounded-md border border-primary/50 bg-primary/20 px-4 py-2 text-sm font-medium text-foreground backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground shadow-sm text-center"
              >
                🔨 Crafteo (Tab)
              </button>
              <button
                onClick={() => navigate({ to: "/" })}
                className="pointer-events-auto rounded-md border border-border bg-card/80 px-4 py-2 text-sm text-foreground backdrop-blur transition-colors hover:bg-secondary text-center"
              >
                Volver al mapa
              </button>
            </div>
          </div>
        </div>

        {/* Modal / Panel de Crafteo Flotante */}
        {showCrafting && (
          <div className="pointer-events-auto self-center max-w-lg w-full rounded-md border border-border bg-card/95 p-5 shadow-2xl backdrop-blur animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-semibold">Taller de Supervivencia</h3>
                <p className="text-xs text-muted-foreground">
                  Combina materiales recolectados para fabricar mejoras y suministros.
                </p>
              </div>
              <button
                onClick={() => setShowCrafting(false)}
                className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {CRAFT_RECIPES.map((r) => {
                const can = canCraft(r);
                const isCraftedUpgrade =
                  (r.id === "hoja_afilada" && hasSharpenedBlade) ||
                  (r.id === "omamori" && hasOmamori);

                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-4 rounded-sm border border-border bg-secondary/30 p-3"
                  >
                    <div>
                      <p className="font-medium text-sm text-foreground">
                        {r.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.description}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        <span>Coste:</span>
                        {r.cost.madera && (
                          <span
                            className={
                              collected >= r.cost.madera
                                ? "text-emerald-400"
                                : "text-destructive"
                            }
                          >
                            Madera: {r.cost.madera} ({collected})
                          </span>
                        )}
                        {r.cost.chatarra && (
                          <span
                            className={
                              loot.chatarra >= r.cost.chatarra
                                ? "text-emerald-400"
                                : "text-destructive"
                            }
                          >
                            Chatarra: {r.cost.chatarra} ({loot.chatarra})
                          </span>
                        )}
                        {r.cost.comida && (
                          <span
                            className={
                              loot.comida >= r.cost.comida
                                ? "text-emerald-400"
                                : "text-destructive"
                            }
                          >
                            Comida: {r.cost.comida} ({loot.comida})
                          </span>
                        )}
                        {r.cost.medicina && (
                          <span
                            className={
                              loot.medicina >= r.cost.medicina
                                ? "text-emerald-400"
                                : "text-destructive"
                            }
                          >
                            Medicina: {r.cost.medicina} ({loot.medicina})
                          </span>
                        )}
                        {r.cost.reliquia && (
                          <span
                            className={
                              loot.reliquia >= r.cost.reliquia
                                ? "text-emerald-400"
                                : "text-destructive"
                            }
                          >
                            Reliquias: {r.cost.reliquia} ({loot.reliquia})
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      disabled={!can}
                      onClick={() => craftItem(r)}
                      className="shrink-0 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-35"
                    >
                      {isCraftedUpgrade ? "Fabricado" : "Fabricar"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-end justify-between">
          <p className="rounded-md border border-border bg-card/80 px-4 py-2 text-xs text-muted-foreground backdrop-blur">
            WASD mover · Shift esprintar ·{" "}
            <strong>Clic / Espacio / F: Tajo con Katana</strong> · Tab: Menú de
            Crafteo · Tecla C: Comer
          </p>
          {done && (
            <div className="rounded-md border border-node-completed bg-card/90 px-5 py-4 backdrop-blur shadow-lg">
              <p className="font-semibold text-node-completed">
                ¡Objetivos de {activeNode.name} cumplidos!
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Zona despejada: regresa al archipiélago para reclamar tus puntos de habilidad.
              </p>
              <Link
                to="/"
                className="mt-3 inline-block rounded-sm bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Volver al mapa
              </Link>
            </div>
          )}
        </div>
      </div>

      {hurt && (
        <div className="pointer-events-none absolute inset-0 z-[6] bg-destructive/25" />
      )}

      {health === 0 && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80">
          <div className="rounded-md border border-border bg-card px-8 py-6 text-center">
            <p className="text-xl font-semibold text-destructive">
              Te han alcanzado
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Los peligros de {activeNode.name} acabaron contigo.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
