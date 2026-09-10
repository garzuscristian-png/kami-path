import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapView } from "@/components/game/MapView";
import { MAP_NODES, NODES_BY_ID, type MapNode } from "@/lib/game/nodes";
import {
  availablePoints,
  getObjectiveValue,
  isNodeCompleted,
  nodeStatus,
  useProgress,
} from "@/lib/game/progress";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mapa de nodos — Japón Survival 3D" },
      {
        name: "description",
        content:
          "Mapa de progresión por nodos conectados para un survival 3D ambientado en Japón: desbloquea zonas completando objetivos y gana puntos de habilidad.",
      },
      { property: "og:title", content: "Mapa de nodos — Japón Survival 3D" },
      {
        property: "og:description",
        content:
          "Sistema de nodos conectados, objetivos por zona y árbol de habilidades vinculado a la exploración.",
      },
    ],
  }),
  component: MapPage,
});

const STATUS_LABEL = {
  locked: "Bloqueado",
  available: "Disponible",
  in_progress: "En curso",
  completed: "Completado",
} as const;

function MapPage() {
  const { state, hydrated, advanceObjective, completeNode, resetProgress } = useProgress();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>("kyushu-kagoshima");

  const selected: MapNode | null = selectedId ? (NODES_BY_ID[selectedId] ?? null) : null;
  const status = selected ? nodeStatus(state, selected) : null;
  const completedCount = useMemo(
    () => MAP_NODES.filter((n) => isNodeCompleted(state, n)).length,
    [state],
  );

  return (
    <main
      className="min-h-screen text-foreground"
      style={{ backgroundImage: "var(--ink-grain)" }}
    >
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            列島 · Archipiélago
          </h1>
          <p className="text-sm text-muted-foreground">
            Progresión por nodos conectados — survival 3D en Japón
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            Zonas {completedCount}/{MAP_NODES.length}
          </span>
          <span className="rounded-sm bg-secondary px-2 py-1">
            Puntos: <strong>{hydrated ? availablePoints(state) : 0}</strong>
          </span>
          <Link
            to="/habilidades"
            className="rounded-sm bg-primary px-3 py-1.5 font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Árbol de habilidades
          </Link>
          <button
            onClick={resetProgress}
            className="rounded-sm border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            Reiniciar
          </button>
        </div>
      </header>

      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_380px]">
        <section className="min-h-[60vh] rounded-md border border-border bg-card/60">
          <MapView
            state={state}
            selectedId={selectedId}
            onSelect={(n) => setSelectedId(n.id)}
          />
        </section>

        <aside className="rounded-md border border-border bg-card p-5">
          {!selected ? (
            <p className="text-sm text-muted-foreground">
              Selecciona un punto del mapa.
            </p>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {selected.region} · {selected.biome}
                </p>
                <h2 className="mt-1 text-xl font-semibold">{selected.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selected.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-sm bg-secondary px-2 py-1">
                  {STATUS_LABEL[status!]}
                </span>
                <span className="rounded-sm bg-secondary px-2 py-1">
                  Peligro {"★".repeat(selected.danger)}
                </span>
                <span className="rounded-sm bg-secondary px-2 py-1">
                  +{selected.skillPoints} pts
                </span>
                <span className="rounded-sm bg-secondary px-2 py-1">
                  seed {selected.seed}
                </span>
              </div>

              {status === "locked" && (
                <p className="rounded-sm border border-border p-3 text-sm text-muted-foreground">
                  Requiere completar:{" "}
                  {selected.requires.map((r) => NODES_BY_ID[r]?.name).join(", ")}
                </p>
              )}

              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Objetivos
                </h3>
                {selected.objectives.map((o) => {
                  const value = getObjectiveValue(state, selected.id, o.id);
                  const done = value >= o.target;
                  return (
                    <div key={o.id} className="rounded-sm border border-border p-3">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className={done ? "text-node-completed" : undefined}>
                          {o.label}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {value}/{o.target}
                        </span>
                      </div>
                      <div className="mt-2 h-1 w-full rounded-full bg-secondary">
                        <div
                          className="h-1 rounded-full bg-primary transition-all"
                          style={{ width: `${(value / o.target) * 100}%` }}
                        />
                      </div>
                      <button
                        disabled={status === "locked" || done}
                        onClick={() => advanceObjective(selected.id, o.id)}
                        className="mt-2 rounded-sm border border-border px-2 py-1 text-xs transition-colors hover:bg-secondary disabled:opacity-40"
                      >
                        Simular progreso +1
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <button
                  disabled={status === "locked" || status === "completed"}
                  onClick={() => completeNode(selected.id)}
                  className="flex-1 rounded-sm bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  Completar zona
                </button>
                <button
                  disabled={status === "locked"}
                  onClick={() => {
                    if (selected.id === "kyushu-kagoshima")
                      navigate({ to: "/escenario" });
                  }}
                  className="flex-1 rounded-sm border border-border px-3 py-2 text-sm transition-colors hover:bg-secondary disabled:opacity-40"
                  title={
                    selected.id === "kyushu-kagoshima"
                      ? "Entrar al puerto de Kagoshima (3D)"
                      : "Escenario pendiente: se generará con esta semilla y bioma"
                  }
                >
                  Entrar al escenario
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                El botón de escenario está listo para conectar el mundo 3D usando la
                semilla y el bioma del nodo.
              </p>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
