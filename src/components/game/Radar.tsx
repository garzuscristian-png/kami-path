import React from "react";

interface RadarProps {
  points?: { name: string; x: number; z: number; color: string }[];
  playerX: number;
  playerZ: number;
  playerAngle: number;
}

const POIS = [
  { name: "Aldea", x: -26, z: 26, color: "#eab308" },
  { name: "Templo", x: 30, z: -4, color: "#ef4444" },
  { name: "Granjas", x: 6, z: 44, color: "#10b981" },
  { name: "Muelle", x: 0, z: -2, color: "#38bdf8" },
];

export function Radar({ playerX, playerZ, playerAngle, points = POIS }: RadarProps) {
  const radarRadius = 46;
  const maxRange = 60; // radio de detección en unidades del mundo

  return (
    <div className="relative flex flex-col items-center rounded-lg border border-border bg-card/85 p-2.5 backdrop-blur shadow-md">
      <div className="flex w-full items-center justify-between pb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Cartografía</span>
        <span className="font-semibold text-primary">N</span>
      </div>

      <div
        className="relative overflow-hidden rounded-full border border-primary/40 bg-background/80"
        style={{ width: radarRadius * 2, height: radarRadius * 2 }}
      >
        {/* Anillos concéntricos del radar */}
        <div className="absolute inset-2 rounded-full border border-border/40" />
        <div className="absolute inset-6 rounded-full border border-border/30" />

        {/* Ejes del compás */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] -translate-x-1/2 bg-border/40" />
        <div className="absolute top-1/2 left-0 right-0 h-[1px] -translate-y-1/2 bg-border/40" />

        {/* Marcador del jugador en el centro */}
        <div
          className="absolute left-1/2 top-1/2 -ml-1.5 -mt-2 h-0 w-0 border-x-[5px] border-x-transparent border-b-[9px] border-b-primary"
          style={{
            transform: `rotate(${(-playerAngle * 180) / Math.PI}deg)`,
            transformOrigin: "center 70%",
          }}
        />

        {/* Puntos de interés proyectados en el radar */}
        {points.map((poi) => {
          const dx = poi.x - playerX;
          const dz = poi.z - playerZ;
          const dist = Math.hypot(dx, dz);
          if (dist > maxRange) return null;

          const scale = (radarRadius - 6) / maxRange;
          const px = radarRadius + dx * scale;
          const py = radarRadius + dz * scale;

          return (
            <div
              key={poi.name}
              className="absolute -ml-1 -mt-1 h-2 w-2 rounded-full ring-2 ring-background transition-transform"
              style={{
                left: `${px}px`,
                top: `${py}px`,
                backgroundColor: poi.color,
              }}
              title={`${poi.name} (${Math.round(dist)}m)`}
            />
          );
        })}
      </div>

      <div className="mt-1.5 flex gap-2 text-[9px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#eab308]" /> Aldea
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ef4444]" /> Templo
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#38bdf8]" /> Muelle
        </span>
      </div>
    </div>
  );
}
