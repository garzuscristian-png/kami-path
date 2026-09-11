import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useState } from "react";
import { KagoshimaScene } from "@/components/scene/KagoshimaScene";
import { useProgress } from "@/lib/game/progress";

export const Route = createFileRoute("/escenario")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Puerto de Kagoshima — Escenario 3D" },
      {
        name: "description",
        content:
          "Primer escenario 3D del survival: el muelle volcánico de Kagoshima con objetos recolectables.",
      },
      { property: "og:title", content: "Puerto de Kagoshima — Escenario 3D" },
      {
        property: "og:description",
        content:
          "Explora el puerto ceniciento, recoge restos de madera y completa el primer objetivo.",
      },
    ],
  }),
  component: ScenarioPage,
});

const TARGET = 12;

function ScenarioPage() {
  const [collected, setCollected] = useState(0);
  const [night, setNight] = useState(false);
  const [health, setHealth] = useState(100);
  const [hurt, setHurt] = useState(false);

  const onHit = useCallback(() => {
    setHealth((h) => Math.max(0, h - 15));
    setHurt(true);
    window.setTimeout(() => setHurt(false), 350);
  }, []);
  const { advanceObjective } = useProgress();
  const navigate = useNavigate();

  const onCollect = useCallback(() => {
    setCollected((c) => {
      const next = Math.min(TARGET, c + 1);
      advanceObjective("kyushu-kagoshima", "k1");
      if (next >= TARGET) {
        advanceObjective("kyushu-kagoshima", "k2");
        setNight(true);
      }
      return next;
    });
  }, [advanceObjective]);

  const done = collected >= TARGET;

  useEffect(() => {
    return () => {
      document.body.style.cursor = "auto";
    };
  }, []);

  return (
    <main className="fixed inset-0 bg-background">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [8, 6, 12], fov: 55, near: 0.1, far: 4000 }}
      >
        <Suspense fallback={null}>
          <KagoshimaScene onCollect={onCollect} onHit={onHit} />
        </Suspense>
      </Canvas>

      {/* HUD */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-5">
        <div className="flex items-start justify-between">
          <div className="rounded-md border border-border bg-card/80 px-4 py-3 backdrop-blur">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Puerto de Kagoshima · Kyushu
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              Madera y restos: {collected}/{TARGET}
            </p>
            <div className="mt-2 h-1.5 w-56 rounded-full bg-secondary">
              <div
                className="h-1.5 rounded-full bg-primary transition-all"
                style={{ width: `${(collected / TARGET) * 100}%` }}
              />
            </div>
            <p className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
              Salud
            </p>
            <div className="mt-1 h-1.5 w-56 rounded-full bg-secondary">
              <div
                className="h-1.5 rounded-full bg-destructive transition-all"
                style={{ width: `${health}%` }}
              />
            </div>
          </div>
          <button
            onClick={() => navigate({ to: "/" })}
            className="pointer-events-auto rounded-md border border-border bg-card/80 px-4 py-2 text-sm text-foreground backdrop-blur transition-colors hover:bg-secondary"
          >
            Volver al mapa
          </button>
        </div>

        <div className="flex items-end justify-between">
          <p className="rounded-md border border-border bg-card/80 px-4 py-2 text-xs text-muted-foreground backdrop-blur">
            WASD o flechas para moverte · Shift para correr · Arrastra para girar
            la cámara · Recoge los restos brillantes y huye de los zombis
          </p>
          {done && (
            <div className="rounded-md border border-node-completed bg-card/90 px-5 py-4 backdrop-blur">
              <p className="font-semibold text-node-completed">
                Marea nocturna superada
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Objetivos completados: la zona está lista para ser cerrada.
              </p>
              <Link
                to="/"
                className="mt-3 inline-block rounded-sm bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Reclamar en el mapa
              </Link>
            </div>
          )}
        </div>
      </div>

      {night && (
        <div className="pointer-events-none absolute inset-0 z-[5] bg-background/45" />
      )}

      {hurt && (
        <div className="pointer-events-none absolute inset-0 z-[6] bg-destructive/25" />
      )}

      {health === 0 && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80">
          <div className="rounded-md border border-border bg-card px-8 py-6 text-center">
            <p className="text-xl font-semibold text-destructive">Te han alcanzado</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Los zombis del puerto acabaron contigo.
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
