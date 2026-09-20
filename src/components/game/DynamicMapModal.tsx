import type { PartnerState } from "@/lib/game/coop";
import type { PlacedDefense } from "@/components/scene/Defenses";

interface DynamicMapModalProps {
  scenery?: import("@/lib/game/landscape").SceneryObject[];
  onClose: () => void;
  playerPos: { x: number; z: number; angle: number };
  partner: PartnerState | null;
  shelterLevel: number;
  defenses: PlacedDefense[];
}

export function DynamicMapModal({
  onClose,
  playerPos,
  partner,
  shelterLevel,
  defenses,
  scenery = [],
}: DynamicMapModalProps) {
  // Conversión de coordenadas de mundo 3D [-60, 60] a porcentaje [0, 100]%
  const toMapPercent = (x: number, z: number) => {
    const px = THREE_Math_clamp(((x + 60) / 120) * 100, 5, 95);
    const pz = THREE_Math_clamp(((z + 60) / 120) * 100, 5, 95);
    return { left: `${px}%`, top: `${pz}%` };
  };

  const legacyZones = [
    {
      id: "nido_zombis",
      name: "Nido de Merodeadores",
      danger: "PELIGRO EXTREMO",
      x: -26,
      z: 26,
      radiusPercent: 22,
      color: "border-red-500 bg-red-600/25",
      desc: "Gran concentración de no-muertos agresivos. En la noche se vuelven letales.",
    },
    {
      id: "volcan_caldera",
      name: "Caldera Volcánica",
      danger: "ALTO RIESGO",
      x: -14,
      z: -48,
      radiusPercent: 18,
      color: "border-amber-500 bg-amber-600/20",
      desc: "Gases tóxicos y terreno inestable cerca de la chimenea de azufre.",
    },
    {
      id: "templo_sombras",
      name: "Recinto del Templo Maldito",
      danger: "AMENAZA MEDIA",
      x: 30,
      z: -4,
      radiusPercent: 16,
      color: "border-purple-500 bg-purple-600/20",
      desc: "Antiguo santuario profanado. Contiene reliquias valiosas custodiadas.",
    },
  ];

  const labels = {
    tower: "Edificio",
    house: "Casa",
    rock: "Formación rocosa",
    tree: "Arboleda",
    field: "Campo",
  };
  const dangerZones = scenery
    .filter((o) => o.kind !== "tree")
    .slice(0, 12)
    .map((o, i) => ({
      id: String(i),
      name: labels[o.kind],
      x: o.x,
      z: o.z,
      radiusPercent: 5,
      danger: "TERRENO",
      color: "border-amber-500 bg-amber-600/20",
      desc: "Elemento del escenario actual; no indica posición de enemigos.",
    }));
  return (
    <div className="pointer-events-auto self-center max-w-2xl w-full rounded-lg border border-amber-900/60 bg-[#161311]/95 p-6 shadow-2xl backdrop-blur animate-in fade-in zoom-in-95 duration-150 text-[#e6dcc6]">
      {/* Cabecera estilo pergamino japonés */}
      <div className="flex items-center justify-between border-b border-amber-900/40 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🗺️</span>
          <div>
            <h3 className="text-base font-bold text-[#f5ecd7] tracking-wider uppercase">
              Mapa Cartográfico Táctico
            </h3>
            <p className="text-xs text-amber-200/60">
              Rastreo satelital/espiritual: zonas de peligro, defensas y santuario seguro.
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-amber-200/60 hover:bg-amber-950/60 hover:text-amber-100"
        >
          ✕
        </button>
      </div>

      {/* Área del mapa en lienzo táctico */}
      <div className="relative mt-4 h-96 w-full rounded-md border-2 border-amber-950/80 bg-[#1e1b17] overflow-hidden shadow-inner">
        {/* Fondo estilizado de la costa / mar */}
        <div className="absolute inset-0 bg-radial from-[#221f1b] to-[#12100e] opacity-90" />

        {/* Mar al norte */}
        <div className="absolute top-0 left-0 right-0 h-1/4 bg-[#182329]/40 border-b border-sky-950/60 flex items-center justify-center">
          <span className="text-[10px] uppercase tracking-widest text-sky-400/40 font-semibold">
            ~ Mar Interior de Kagoshima ~
          </span>
        </div>

        {/* ZONAS DE ALTA PELIGROSIDAD */}
        {dangerZones.map((zone) => {
          const pos = toMapPercent(zone.x, zone.z);
          return (
            <div
              key={zone.id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed ${zone.color} animate-pulse flex items-center justify-center pointer-events-none`}
              style={{
                left: pos.left,
                top: pos.top,
                width: `${zone.radiusPercent * 2}%`,
                height: `${zone.radiusPercent * 2}%`,
              }}
            >
              <div className="text-center">
                <span className="text-xs font-extrabold text-red-400 tracking-wider">
                  ⚠️ {zone.name}
                </span>
                <p className="text-[9px] text-red-200/80 font-medium">{zone.danger}</p>
              </div>
            </div>
          );
        })}

        {/* SANTUARIO SEGURO DE NUESTRA CASA */}
        {(() => {
          const homePos = toMapPercent(0, 3);
          return (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-400/80 bg-emerald-950/40 flex items-center justify-center pointer-events-none"
              style={{
                left: homePos.left,
                top: homePos.top,
                width: "16%",
                height: "16%",
              }}
            >
              <span className="text-[11px] font-bold text-emerald-300 drop-shadow">
                ⛩️ Base Segura
              </span>
            </div>
          );
        })()}

        {/* REFUGIO EN CONSTRUCCIÓN */}
        {(() => {
          const shelterPos = toMapPercent(6.5, 6.0);
          return (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center"
              style={shelterPos}
            >
              <span className="text-base drop-shadow">🏯</span>
              <p className="text-[9px] font-bold text-sky-300 leading-none">
                Refugio Nvl.{shelterLevel}
              </p>
            </div>
          );
        })()}

        {/* DEFENSAS Y BARRICADAS COLOCADAS */}
        {defenses.map((d) => {
          const dPos = toMapPercent(d.x, d.z);
          return (
            <div
              key={d.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-[10px] pointer-events-none"
              style={dPos}
              title={d.kind === "barricada" ? "Barricada" : "Trampa de pinchos"}
            >
              {d.kind === "barricada" ? "🚧" : "🪤"}
            </div>
          );
        })}

        {/* MARCADOR DEL COMPAÑERO CO-OP (SI ESTÁ CONECTADO) */}
        {partner &&
          (() => {
            const partPos = toMapPercent(partner.x, partner.z);
            return (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-20"
                style={partPos}
              >
                <div className="h-3 w-3 rounded-full bg-sky-400 border-2 border-white animate-ping" />
                <span className="text-[9px] font-bold text-sky-300 bg-black/70 px-1 rounded mt-0.5 whitespace-nowrap">
                  👤 {partner.name}
                </span>
              </div>
            );
          })()}

        {/* MARCADOR DEL JUGADOR PRINCIPAL */}
        {(() => {
          const pPos = toMapPercent(playerPos.x, playerPos.z);
          return (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-30"
              style={pPos}
            >
              <div
                className="h-3.5 w-3.5 rounded-full bg-amber-400 border-2 border-white shadow-lg flex items-center justify-center"
                style={{
                  transform: `rotate(${-playerPos.angle}rad)`,
                }}
              >
                <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[5px] border-b-black -mt-1" />
              </div>
              <span className="text-[10px] font-bold text-amber-300 bg-black/80 px-1 rounded mt-0.5">
                Tú
              </span>
            </div>
          );
        })()}
      </div>

      {/* Leyenda táctica */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] border-t border-amber-900/30 pt-3 text-amber-200/80">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span>Santuario Seguro (Casa)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
          <span>Zona Peligro Extremo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>🚧 🪤</span>
          <span>Defensas / Trampas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
          <span>Compañero Ronin</span>
        </div>
      </div>
    </div>
  );
}

function THREE_Math_clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}
