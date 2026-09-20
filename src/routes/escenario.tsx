import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { createLandscape } from "@/lib/game/landscape";
import { WorldContext } from "@/components/scene/WorldContext";
import { FarmPanel, FarmPlots, useFarm } from "@/components/game/Farm";
import { resolveCollisions } from "@/components/scene/WorldCollisions";
import { KagoshimaScene } from "@/components/scene/KagoshimaScene";
import type { LootKind } from "@/components/scene/Loot";
import type { PlacedDefense } from "@/components/scene/Defenses";
import { InventoryModal } from "@/components/game/InventoryModal";
import { DynamicMapModal } from "@/components/game/DynamicMapModal";
import { CoopModal } from "@/components/game/CoopModal";
import { coop, type PartnerState, type CoopPing } from "@/lib/game/coop";
import { useProgress, getObjectiveValue, isNodeCompleted } from "@/lib/game/progress";
import { sound } from "@/lib/game/audio";
import {
  CRAFT_RECIPES,
  SHELTER_UPGRADES,
  type Recipe,
  type ShelterUpgrade,
} from "@/lib/game/crafting";
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
          "Escenario 3D de supervivencia en Japón con combate, crafteo de defensas, inventario RPG, durabilidad de armas, mapa dinámico y modo cooperativo en línea.",
      },
    ],
  }),
  component: ScenarioPage,
});

function ScenarioPage() {
  const search = Route.useSearch();
  const activeNodeId = search.nodeId ?? "kyushu-kagoshima";
  const activeNode = NODES_BY_ID[activeNodeId] ?? NODES_BY_ID["kyushu-kagoshima"]!;

  const { state, advanceObjective } = useProgress();
  const navigate = useNavigate();

  // Habilidades aprendidas
  const hasForraje = state.learnedSkills.includes("forraje");
  const hasEsgrima = state.learnedSkills.includes("esgrima");
  const hasCartografia = state.learnedSkills.includes("cartografia");

  // Recursos del jugador
  const [collected, setCollected] = useState(10);
  const [health, setHealth] = useState(100);
  const [stamina, setStamina] = useState(100);
  const [zombiesKilled, setZombiesKilled] = useState(0);
  const [hurt, setHurt] = useState(false);
  const [playerPos, setPlayerPos] = useState({ x: 0, z: 3, angle: 0 });

  // Mejoras y durabilidad de armas
  const [hasSharpenedBlade, setHasSharpenedBlade] = useState(false);
  const [hasOmamori, setHasOmamori] = useState(false);
  const [shelterLevel, setShelterLevel] = useState(0);
  const [katanaDurability, setKatanaDurability] = useState(100);

  // Inventario y Modales
  const [showCrafting, setShowCrafting] = useState(false);
  const [showShelterModal, setShowShelterModal] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showCoopModal, setShowCoopModal] = useState(false);
  const paused =
    health <= 0 || showCrafting || showShelterModal || showInventory || showMap || showCoopModal;
  const world = useMemo(
    () => createLandscape(activeNode.biome, activeNode.seed),
    [activeNode.biome, activeNode.seed],
  );
  const farm = useFarm(paused);
  const [homeLoaded, setHomeLoaded] = useState(false);
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem("kami-home-level-v1"));
      if (Number.isInteger(saved) && saved >= 0 && saved <= 3) setShelterLevel(saved);
    } catch {
      /* Continue playing when storage is unavailable. */
    }
    setHomeLoaded(true);
  }, []);
  useEffect(() => {
    if (homeLoaded) {
      try {
        localStorage.setItem("kami-home-level-v1", String(shelterLevel));
      } catch {
        /* Browser storage may be unavailable. */
      }
    }
  }, [homeLoaded, shelterLevel]);

  // Defensas y Trampas
  const [defensesStock, setDefensesStock] = useState({
    barricada: 2,
    trampa_pinchos: 2,
  });
  const [defenses, setDefenses] = useState<PlacedDefense[]>([
    {
      id: "init-barr-1",
      kind: "barricada",
      x: -4.5,
      z: 10,
      rotationY: 0.2,
      health: 100,
    },
    {
      id: "init-trap-1",
      kind: "trampa_pinchos",
      x: 3.5,
      z: 12,
      rotationY: 0,
      health: 100,
      isSprung: false,
    },
  ]);

  // Modo Cooperativo
  const [partner, setPartner] = useState<PartnerState | null>(null);
  const [activePing, setActivePing] = useState<CoopPing | null>(null);

  useEffect(() => {
    const unPartner = coop.onPartnerChange(setPartner);
    const unPing = coop.onPingReceived((ping) => {
      setActivePing(ping);
      sound.playLoot();
      setTimeout(() => setActivePing(null), 4000);
    });

    return () => {
      unPartner();
      unPing();
    };
  }, []);

  // Ciclo Día / Noche
  const [isNight, setIsNight] = useState(false);
  const [cycleSeconds, setCycleSeconds] = useState(65);
  const [nightAlert, setNightAlert] = useState<string | null>(null);

  const [loot, setLoot] = useState<Record<LootKind, number>>({
    comida: 3,
    medicina: 2,
    chatarra: 6,
    reliquia: 1,
  });

  // Temporizador automático del ciclo día/noche
  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setCycleSeconds((prev) => {
        if (prev <= 1) {
          setIsNight((night) => {
            const nextNight = !night;
            if (nextNight) {
              setNightAlert(
                "🌙 ¡Ha caído la noche! Los zombis tienen ojos carmesí, son +70% más rápidos y agresivos. Refúgiate en tu casa.",
              );
            } else {
              setNightAlert(
                "☀️ Amanece en Japón. La luz del sol debilita la agresividad de las criaturas.",
              );
            }
            window.setTimeout(() => setNightAlert(null), 5000);
            return nextNight;
          });
          return isNight ? 70 : 45;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isNight, paused]);

  // Detección de santuario seguro (zona de nuestra casa en [0, 3])
  const distToHome = Math.hypot(playerPos.x - 0, playerPos.z - 3);
  const inSafeZone = distToHome < 9.5;

  // Regeneración pasiva del refugio
  useEffect(() => {
    if (!inSafeZone || health <= 0) return;

    const regenTimer = window.setInterval(() => {
      if (shelterLevel >= 1) {
        setStamina((s) => Math.min(100, s + 15));
      }
      if (shelterLevel >= 2) {
        setHealth((h) => Math.min(100, h + 1));
      }
      if (shelterLevel >= 3) {
        setHealth((h) => Math.min(100, h + 3));
        setStamina(100);
      }
    }, 1000);

    return () => window.clearInterval(regenTimer);
  }, [inSafeZone, shelterLevel, health]);
  const onLoot = useCallback(
    (kind: LootKind) => {
      sound.playLoot();
      const bonus = hasForraje && Math.random() < 0.25 ? 1 : 0;
      setLoot((l) => ({ ...l, [kind]: l[kind] + 1 + bonus }));
      if (kind === "medicina") setHealth((h) => Math.min(100, h + 15));

      const gatherObj = activeNode.objectives.find((o) => o.kind === "gather");
      if (gatherObj) {
        advanceObjective(activeNode.id, gatherObj.id, 1 + bonus);
      }
    },
    [hasForraje, activeNode, advanceObjective],
  );

  const onHit = useCallback(() => {
    if (inSafeZone) return;
    sound.playHurt();
    const damage = hasOmamori ? 9 : 15;
    setHealth((h) => Math.max(0, h - damage));
    setHurt(true);
    window.setTimeout(() => setHurt(false), 350);
  }, [hasOmamori, inSafeZone]);

  const onKillZombie = useCallback(
    (_id: number) => {
      setZombiesKilled((k) => k + 1);
      // Desgaste de durabilidad por combate
      setKatanaDurability((d) => Math.max(0, d - 2));

      if (isNight) {
        setCollected((c) => c + 1);
        setLoot((l) => ({ ...l, chatarra: l.chatarra + 1 }));
      }
      const huntObj = activeNode.objectives.find((o) => o.kind === "hunt" || o.kind === "boss");
      if (huntObj) {
        advanceObjective(activeNode.id, huntObj.id, 1);
      }
    },
    [activeNode, advanceObjective, isNight],
  );

  const eatFood = useCallback(() => {
    if (loot.comida <= 0) return;
    sound.playLoot();
    setLoot((l) => ({ ...l, comida: l.comida - 1 }));
    setHealth((h) => Math.min(100, h + 15));
    setStamina((s) => Math.min(100, s + 35));
  }, [loot.comida]);

  const useMedicine = useCallback(() => {
    if (loot.medicina <= 0) return;
    sound.playLoot();
    setLoot((l) => ({ ...l, medicina: l.medicina - 1 }));
    setHealth((h) => Math.min(100, h + 35));
  }, [loot.medicina]);

  const repairKatana = useCallback(() => {
    if (loot.chatarra < 2) return;
    sound.playLoot();
    setLoot((l) => ({ ...l, chatarra: l.chatarra - 2 }));
    setKatanaDurability(100);
  }, [loot.chatarra]);

  const placeDefense = useCallback(
    (kind: "barricada" | "trampa_pinchos") => {
      if (defensesStock[kind] <= 0) return;
      sound.playLoot();

      // Colocar a 2.2 metros delante del jugador
      const forwardX = Math.sin(playerPos.angle);
      const forwardZ = Math.cos(playerPos.angle);
      const x = playerPos.x + forwardX * 2.2;
      const z = playerPos.z + forwardZ * 2.2;
      const checked = resolveCollisions(x, z, 1.4, defenses, shelterLevel, world.obstacles);
      if (Math.hypot(checked[0] - x, checked[1] - z) > 0.01 || world.height(x, z) < 0) return;
      if (Math.hypot(x + 4.5, z - 6) < 5) return;

      setDefensesStock((s) => ({ ...s, [kind]: s[kind] - 1 }));
      setDefenses((prev) => [
        ...prev,
        {
          id: `def-${Date.now()}`,
          kind,
          x,
          z,
          rotationY: playerPos.angle,
          health: 100,
          isSprung: false,
        },
      ]);
    },
    [defensesStock, playerPos, defenses, shelterLevel, world],
  );

  const handleTriggerTrap = useCallback((trapId: string) => {
    setDefenses((prev) => prev.map((d) => (d.id === trapId ? { ...d, isSprung: true } : d)));
  }, []);

  const canCraft = useCallback(
    (recipe: Recipe) => {
      if (recipe.cost.madera && collected < recipe.cost.madera) return false;
      if (recipe.cost.chatarra && loot.chatarra < recipe.cost.chatarra) return false;
      if (recipe.cost.medicina && loot.medicina < recipe.cost.medicina) return false;
      if (recipe.cost.comida && loot.comida < recipe.cost.comida) return false;
      if (recipe.cost.reliquia && loot.reliquia < recipe.cost.reliquia) return false;
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
      if (recipe.id === "toishi_afilar") setKatanaDurability((d) => Math.min(100, d + 50));
      if (recipe.id === "barricada") {
        setDefensesStock((s) => ({ ...s, barricada: s.barricada + 1 }));
      }
      if (recipe.id === "trampa_pinchos") {
        setDefensesStock((s) => ({ ...s, trampa_pinchos: s.trampa_pinchos + 1 }));
      }
      if (recipe.id === "hoja_afilada") setHasSharpenedBlade(true);
      if (recipe.id === "omamori") setHasOmamori(true);
    },
    [canCraft],
  );

  const canUpgradeShelter = useCallback(
    (upgrade: ShelterUpgrade) => {
      if (upgrade.cost.madera && collected < upgrade.cost.madera) return false;
      if (upgrade.cost.chatarra && loot.chatarra < upgrade.cost.chatarra) return false;
      if (upgrade.cost.comida && loot.comida < upgrade.cost.comida) return false;
      if (upgrade.cost.medicina && loot.medicina < upgrade.cost.medicina) return false;
      if (upgrade.cost.reliquia && loot.reliquia < upgrade.cost.reliquia) return false;
      return true;
    },
    [collected, loot],
  );

  const upgradeShelter = useCallback(
    (upgrade: ShelterUpgrade) => {
      if (
        !homeLoaded ||
        !canUpgradeShelter(upgrade) ||
        !inSafeZone ||
        upgrade.level !== shelterLevel + 1
      )
        return;
      sound.playLoot();

      if (upgrade.cost.madera) {
        setCollected((c) => Math.max(0, c - upgrade.cost.madera!));
      }
      setLoot((prev) => ({
        ...prev,
        chatarra: prev.chatarra - (upgrade.cost.chatarra ?? 0),
        comida: prev.comida - (upgrade.cost.comida ?? 0),
        medicina: prev.medicina - (upgrade.cost.medicina ?? 0),
        reliquia: prev.reliquia - (upgrade.cost.reliquia ?? 0),
      }));

      setShelterLevel(upgrade.level);
    },
    [homeLoaded, canUpgradeShelter, inSafeZone, shelterLevel],
  );

  const handlePlayerMove = useCallback(
    (x: number, z: number, angle: number) => {
      setPlayerPos({ x, z, angle });
      coop.updateLocalPlayer(x, z, angle, health, false, 0);
    },
    [health],
  );

  const onCollect = useCallback(() => {
    sound.playLoot();
    setCollected((c) => c + 1);
    const gatherObj = activeNode.objectives.find((o) => o.kind === "gather");
    if (gatherObj) {
      advanceObjective(activeNode.id, gatherObj.id, 1);
    }
  }, [activeNode, advanceObjective]);

  const done = isNodeCompleted(state, activeNode);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "KeyC") eatFood();
      if (e.code === "KeyI") setShowInventory((s) => !s);
      if (e.code === "KeyM") setShowMap((s) => !s);
      if (e.code === "KeyP") setShowCoopModal((s) => !s);
      if (e.code === "KeyB") {
        if (defensesStock.barricada > 0) placeDefense("barricada");
        else if (defensesStock.trampa_pinchos > 0) placeDefense("trampa_pinchos");
        else setShowCrafting(true);
      }
      if (e.code === "Tab") {
        e.preventDefault();
        setShowCrafting((s) => !s);
      }
      if (e.code === "KeyR") setShowShelterModal((s) => !s);
      if (e.code === "KeyT") setIsNight((n) => !n);
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.cursor = "auto";
    };
  }, [eatFood, defensesStock, placeDefense]);

  // Daño infligido por la katana
  const durabilityPenalty = katanaDurability === 0 ? -0.5 : katanaDurability < 35 ? -0.5 : 0;
  const damagePerHit = Math.max(
    0.5,
    1 +
      (hasSharpenedBlade ? 1 : 0) +
      (hasEsgrima ? 1 : 0) +
      (shelterLevel >= 3 && isNight ? 1 : 0) +
      durabilityPenalty,
  );
  return (
    <main className="fixed inset-0 bg-background select-none">
      <Canvas
        frameloop={paused ? "never" : "always"}
        shadows
        dpr={[1, 2]}
        camera={{ position: [8, 6, 12], fov: 55, near: 0.1, far: 4000 }}
      >
        <Suspense fallback={null}>
          <WorldContext.Provider value={world}>
            <FarmPlots farm={farm.farm} />
            <KagoshimaScene
              key={activeNode.id}
              biome={activeNode.biome}
              danger={activeNode.danger}
              seed={activeNode.seed}
              isNight={isNight}
              shelterLevel={shelterLevel}
              defenses={defenses}
              partner={partner}
              onTriggerTrap={handleTriggerTrap}
              onOpenShelterUpgrade={() => setShowShelterModal(true)}
              onCollect={onCollect}
              onHit={onHit}
              onLoot={onLoot}
              onKillZombie={onKillZombie}
              onStaminaChange={setStamina}
              onPlayerMove={handlePlayerMove}
              damagePerHit={damagePerHit}
            />
          </WorldContext.Provider>
        </Suspense>
      </Canvas>
      {!paused && (
        <FarmPanel
          farm={farm.farm}
          act={farm.act}
          x={playerPos.x}
          z={playerPos.z}
          saveError={farm.saveError}
          onEat={() => {
            if (health < 100 && farm.act({ type: "eat" })) setHealth((h) => Math.min(100, h + 20));
          }}
        />
      )}

      {/* Pings y Alertas */}
      {activePing && (
        <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-40 max-w-sm w-full px-4 animate-in fade-in slide-in-from-top-3">
          <div className="rounded-lg border border-sky-500/80 bg-sky-950/90 p-3 shadow-xl backdrop-blur text-center text-xs font-bold text-sky-200">
            📡 Ping de {activePing.sender}: "{activePing.text}"
          </div>
        </div>
      )}

      {nightAlert && (
        <div className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 z-30 max-w-md w-full px-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`rounded-lg border p-4 shadow-xl backdrop-blur text-center text-sm font-medium ${
              isNight
                ? "border-red-500/60 bg-red-950/80 text-red-200"
                : "border-amber-500/60 bg-amber-950/80 text-amber-200"
            }`}
          >
            {nightAlert}
          </div>
        </div>
      )}

      {/* HUD Principal */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-5">
        <div className="flex items-start justify-between">
          <div className="rounded-md border border-border bg-card/90 px-4 py-3 backdrop-blur shadow-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                  {activeNode.name} - {activeNode.region} ({activeNode.biome})
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] font-bold text-amber-400">
                    {"★".repeat(activeNode.danger)}
                    {"☆".repeat(Math.max(0, 5 - activeNode.danger))}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    (Peligro Nivel {activeNode.danger}/5)
                  </span>
                </div>
              </div>
              {inSafeZone && (
                <span className="animate-pulse rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 border border-emerald-500/40">
                  🛡️ Santuario Seguro (Casa)
                </span>
              )}
            </div>

            {/* Ciclo Día / Noche */}
            <div className="mt-2 flex items-center justify-between rounded bg-secondary/50 px-2.5 py-1.5 border border-border/40">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="text-base">{isNight ? "🌙" : "☀️"}</span>
                <span className={isNight ? "text-red-400" : "text-amber-400"}>
                  {isNight ? "Noche Hostil" : "Día Seguro"}
                </span>
                <span className="text-muted-foreground text-[11px] font-normal">
                  ({cycleSeconds}s)
                </span>
              </div>
              <button
                onClick={() => setIsNight((n) => !n)}
                className="pointer-events-auto rounded bg-primary/20 hover:bg-primary hover:text-primary-foreground px-2 py-0.5 text-[10px] font-medium text-foreground transition-colors"
                title="Cambiar ciclo (Tecla T)"
              >
                Alternar (T)
              </button>
            </div>

            {/* Barra de Salud */}
            <div className="mt-2.5 flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
              <span>Salud</span>
              <span className="font-semibold text-foreground">{health}%</span>
            </div>
            <div className="mt-1 h-1.5 w-64 rounded-full bg-secondary">
              <div
                className="h-1.5 rounded-full bg-destructive transition-all"
                style={{ width: `${health}%` }}
              />
            </div>

            {/* Barra de Aguante */}
            <div className="mt-2 flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
              <span>Aguante</span>
              <span className="font-semibold text-foreground">{stamina}%</span>
            </div>
            <div className="mt-1 h-1.5 w-64 rounded-full bg-secondary">
              <div
                className="h-1.5 rounded-full bg-emerald-500 transition-all"
                style={{ width: `${stamina}%` }}
              />
            </div>

            {/* Barra de Durabilidad de la Katana */}
            <div className="mt-2 flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
              <span>Filo Katana</span>
              <span
                className={`font-semibold ${
                  katanaDurability > 50
                    ? "text-sky-300"
                    : katanaDurability > 20
                      ? "text-amber-300"
                      : "text-red-400"
                }`}
              >
                {katanaDurability}%
              </span>
            </div>
            <div className="mt-1 h-1.5 w-64 rounded-full bg-secondary">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  katanaDurability > 50
                    ? "bg-sky-400"
                    : katanaDurability > 20
                      ? "bg-amber-400"
                      : "bg-red-500"
                }`}
                style={{ width: `${katanaDurability}%` }}
              />
            </div>

            {/* Inventario Rápido */}
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-foreground">
              <span>🪵 Madera: {collected}</span>
              <span>🔩 Chatarra: {loot.chatarra}</span>
              <span>🍱 Comida: {loot.comida}</span>
              <span>🌿 Medicina: {loot.medicina}</span>
              <span>🚧 Barricadas: {defensesStock.barricada}</span>
              <span>🪤 Trampas: {defensesStock.trampa_pinchos}</span>
            </div>

            {/* Badges de Estado */}
            <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10px]">
              {partner && (
                <span className="rounded bg-sky-500/20 px-2 py-0.5 text-sky-300 font-semibold border border-sky-500/30">
                  👥 Co-op: {partner.name} ({partner.health}%)
                </span>
              )}
              {shelterLevel > 0 && (
                <span className="rounded bg-sky-500/20 px-2 py-0.5 text-sky-300 font-medium">
                  🏯 Refugio Nvl.{shelterLevel}
                </span>
              )}
              {zombiesKilled > 0 && (
                <span className="rounded bg-secondary/80 px-2 py-0.5 text-muted-foreground">
                  Zombis: {zombiesKilled}
                </span>
              )}
            </div>
          </div>

          {/* Menú Lateral de Acciones y Modales */}
          <div className="flex items-start gap-3">
            <div className="pointer-events-auto">
              <Radar
                points={[
                  { name: "Casa", x: 6.5, z: 6, color: "#eab308" },
                  { name: "Huerto", x: -6, z: 6, color: "#10b981" },
                  ...world.objects
                    .filter((o) => o.kind === "house" || o.kind === "tower")
                    .slice(0, 8)
                    .map((o, i) => ({
                      name: `Edificio ${i + 1}`,
                      x: o.x,
                      z: o.z,
                      color: "#94a3b8",
                    })),
                ]}
                playerX={playerPos.x}
                playerZ={playerPos.z}
                playerAngle={playerPos.angle}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setShowInventory((s) => !s)}
                className="pointer-events-auto rounded-md border border-amber-500/60 bg-amber-950/60 px-3.5 py-1.5 text-xs font-bold text-amber-200 backdrop-blur transition-all hover:bg-amber-700 hover:text-white shadow text-center"
              >
                🎒 Inventario (I)
              </button>
              <button
                onClick={() => setShowMap((s) => !s)}
                className="pointer-events-auto rounded-md border border-amber-900/60 bg-[#1e1b17]/80 px-3.5 py-1.5 text-xs font-bold text-amber-300 backdrop-blur transition-all hover:bg-amber-900 hover:text-white shadow text-center"
              >
                🗺️ Mapa Peligros (M)
              </button>
              <button
                onClick={() => setShowCoopModal((s) => !s)}
                className="pointer-events-auto rounded-md border border-sky-500/60 bg-sky-950/60 px-3.5 py-1.5 text-xs font-bold text-sky-200 backdrop-blur transition-all hover:bg-sky-700 hover:text-white shadow text-center"
              >
                👥 Modo Co-op (P)
              </button>
              <button
                onClick={() => {
                  if (defensesStock.barricada > 0) placeDefense("barricada");
                  else if (defensesStock.trampa_pinchos > 0) placeDefense("trampa_pinchos");
                  else setShowCrafting(true);
                }}
                className="pointer-events-auto rounded-md border border-emerald-500/60 bg-emerald-950/60 px-3.5 py-1.5 text-xs font-bold text-emerald-200 backdrop-blur transition-all hover:bg-emerald-700 hover:text-white shadow text-center"
              >
                🚧 Plantar Defensa (B)
              </button>
              <button
                onClick={() => setShowShelterModal((s) => !s)}
                className="pointer-events-auto rounded-md border border-sky-500/50 bg-sky-950/40 px-3.5 py-1.5 text-xs font-semibold text-sky-300 backdrop-blur transition-all hover:bg-sky-800 hover:text-white shadow text-center"
              >
                🏯 Refugio (R)
              </button>
              <button
                onClick={() => setShowCrafting((s) => !s)}
                className="pointer-events-auto rounded-md border border-primary/50 bg-primary/20 px-3.5 py-1.5 text-xs font-medium text-foreground backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground shadow text-center"
              >
                🔨 Crafteo (Tab)
              </button>
              <button
                onClick={() => navigate({ to: "/" })}
                className="pointer-events-auto rounded-md border border-border bg-card/80 px-3.5 py-1.5 text-xs text-foreground backdrop-blur transition-colors hover:bg-secondary text-center"
              >
                Volver al mapa
              </button>
            </div>
          </div>
        </div>

        {/* MODAL: INVENTARIO RPG */}
        {showInventory && (
          <InventoryModal
            onClose={() => setShowInventory(false)}
            collectedWood={collected}
            loot={loot}
            defensesStock={defensesStock}
            katanaDurability={katanaDurability}
            onEatFood={eatFood}
            onUseMedicine={useMedicine}
            onRepairKatana={repairKatana}
            onPlaceDefense={placeDefense}
          />
        )}

        {/* MODAL: MAPA TÁCTICO */}
        {showMap && (
          <DynamicMapModal
            scenery={world.objects}
            onClose={() => setShowMap(false)}
            playerPos={playerPos}
            partner={partner}
            shelterLevel={shelterLevel}
            defenses={defenses}
          />
        )}

        {/* MODAL: COOPERATIVO ONLINE */}
        {showCoopModal && (
          <CoopModal
            onClose={() => setShowCoopModal(false)}
            partner={partner}
            onSendPing={(text, kind) => coop.sendPing(text, kind)}
          />
        )}

        {/* MODAL: REFUGIO */}
        {showShelterModal && (
          <div className="pointer-events-auto self-center max-w-lg w-full rounded-md border border-sky-500/40 bg-card/95 p-5 shadow-2xl backdrop-blur animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-semibold text-sky-300">
                  🏯 Refugio de Supervivencia (Nivel {shelterLevel}/3)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Construye y mejora tu campamento junto a la casa segura para obtener bendiciones y
                  defensas.
                </p>
              </div>
              <button
                onClick={() => setShowShelterModal(false)}
                className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {SHELTER_UPGRADES.map((upgrade) => {
                const isCurrent = shelterLevel === upgrade.level;
                const isPast = shelterLevel > upgrade.level;
                const isNext = shelterLevel === upgrade.level - 1;
                const can = isNext && canUpgradeShelter(upgrade);

                return (
                  <div
                    key={upgrade.level}
                    className={`rounded-sm border p-3.5 transition-all ${
                      isCurrent
                        ? "border-sky-500 bg-sky-950/30"
                        : isPast
                          ? "border-emerald-500/30 bg-emerald-950/10 opacity-75"
                          : "border-border bg-secondary/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-foreground">{upgrade.name}</p>
                          {isCurrent && (
                            <span className="rounded bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                              ACTUAL
                            </span>
                          )}
                          {isPast && (
                            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                              CONSTRUIDO
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{upgrade.description}</p>

                        <div className="mt-2 space-y-1">
                          {upgrade.perks.map((perk, i) => (
                            <p
                              key={i}
                              className="text-[11px] text-sky-200/90 flex items-center gap-1.5"
                            >
                              {perk}
                            </p>
                          ))}
                        </div>

                        {isNext && (
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                            <span className="text-muted-foreground">Requisitos:</span>
                            {upgrade.cost.madera && (
                              <span
                                className={
                                  collected >= upgrade.cost.madera
                                    ? "text-emerald-400 font-medium"
                                    : "text-destructive font-medium"
                                }
                              >
                                Madera: {upgrade.cost.madera} ({collected})
                              </span>
                            )}
                            {upgrade.cost.chatarra && (
                              <span
                                className={
                                  loot.chatarra >= upgrade.cost.chatarra
                                    ? "text-emerald-400 font-medium"
                                    : "text-destructive font-medium"
                                }
                              >
                                Chatarra: {upgrade.cost.chatarra} ({loot.chatarra})
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {isNext && (
                        <button
                          disabled={!can}
                          onClick={() => upgradeShelter(upgrade)}
                          className="shrink-0 rounded bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white transition-all hover:bg-sky-500 disabled:opacity-35 disabled:cursor-not-allowed shadow"
                        >
                          {upgrade.level === 1 ? "Construir" : "Mejorar"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MODAL: CRAFTEO DE TALLER */}
        {showCrafting && (
          <div className="pointer-events-auto self-center max-w-lg w-full rounded-md border border-border bg-card/95 p-5 shadow-2xl backdrop-blur animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-semibold">Taller de Supervivencia</h3>
                <p className="text-xs text-muted-foreground">
                  Fabrica barricadas, trampas, piedras de afilar y suministros.
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
                      <p className="font-medium text-sm text-foreground">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.description}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        <span>Coste:</span>
                        {r.cost.madera && (
                          <span
                            className={
                              collected >= r.cost.madera ? "text-emerald-400" : "text-destructive"
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

        {/* Barra Inferior de Atajos */}
        <div className="flex items-end justify-between">
          <p className="rounded-md border border-border bg-card/80 px-4 py-2 text-xs text-muted-foreground backdrop-blur">
            WASD mover • Shift esprintar • <strong>Clic: Katana</strong> • I: Inventario • M: Mapa •
            P: Co-op • B: Plantar Defensa • Tab: Taller • R: Refugio • T: Día/Noche
          </p>
          {done && (
            <div className="rounded-md border border-node-completed bg-card/90 px-5 py-4 backdrop-blur shadow-lg">
              <p className="font-semibold text-node-completed">
                ¡Objetivos de {activeNode.name} cumplidos!
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

      {hurt && <div className="pointer-events-none absolute inset-0 z-[6] bg-destructive/25" />}

      {health === 0 && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80">
          <div className="rounded-md border border-border bg-card px-8 py-6 text-center">
            <p className="text-xl font-semibold text-destructive">Te han alcanzado</p>
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
