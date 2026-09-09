import { createFileRoute, Link } from "@tanstack/react-router";
import { NODES_BY_ID } from "@/lib/game/nodes";
import { SKILLS, SKILL_BRANCH_LABEL, type SkillBranch } from "@/lib/game/skills";
import { availablePoints, skillStatus, useProgress } from "@/lib/game/progress";

export const Route = createFileRoute("/habilidades")({
  head: () => ({
    meta: [
      { title: "Árbol de habilidades — Japón Survival 3D" },
      {
        name: "description",
        content:
          "Árbol de habilidades vinculado a la exploración: cada rama se desbloquea al completar zonas del mapa de nodos.",
      },
      { property: "og:title", content: "Árbol de habilidades — Japón Survival 3D" },
      {
        property: "og:description",
        content:
          "Supervivencia, combate y exploración: gasta puntos ganados al completar nodos del archipiélago.",
      },
    ],
  }),
  component: SkillsPage,
});

const BRANCHES: SkillBranch[] = ["supervivencia", "combate", "exploracion"];

function SkillsPage() {
  const { state, hydrated, learnSkill } = useProgress();

  return (
    <main
      className="min-h-screen text-foreground"
      style={{ backgroundImage: "var(--ink-grain)" }}
    >
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">技 · Habilidades</h1>
          <p className="text-sm text-muted-foreground">
            Cada rama avanza con la exploración del archipiélago
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="rounded-sm bg-secondary px-2 py-1">
            Puntos: <strong>{hydrated ? availablePoints(state) : 0}</strong>
          </span>
          <Link
            to="/"
            className="rounded-sm bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:opacity-90"
          >
            Volver al mapa
          </Link>
        </div>
      </header>

      <div className="grid gap-6 p-6 md:grid-cols-3">
        {BRANCHES.map((branch) => (
          <section key={branch} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              {SKILL_BRANCH_LABEL[branch]}
            </h2>
            {SKILLS.filter((s) => s.branch === branch)
              .sort((a, b) => a.tier - b.tier)
              .map((skill) => {
                const status = skillStatus(state, skill);
                const node = skill.unlockedByNode
                  ? NODES_BY_ID[skill.unlockedByNode]
                  : undefined;
                return (
                  <article
                    key={skill.id}
                    className={`rounded-md border p-4 transition-colors ${
                      status === "learned"
                        ? "border-node-completed bg-card"
                        : status === "learnable"
                          ? "border-primary bg-card"
                          : "border-border bg-card/50 opacity-70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium">{skill.name}</h3>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        Nv.{skill.tier} · {skill.cost} pts
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {skill.description}
                    </p>
                    {node && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Requiere explorar: {node.name}
                      </p>
                    )}
                    <button
                      disabled={status !== "learnable"}
                      onClick={() => learnSkill(skill.id)}
                      className="mt-3 w-full rounded-sm bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                      {status === "learned"
                        ? "Aprendida"
                        : status === "blocked_node"
                          ? "Zona sin explorar"
                          : status === "blocked_skill"
                            ? "Falta habilidad previa"
                            : status === "no_points"
                              ? "Puntos insuficientes"
                              : "Aprender"}
                    </button>
                  </article>
                );
              })}
          </section>
        ))}
      </div>
    </main>
  );
}
