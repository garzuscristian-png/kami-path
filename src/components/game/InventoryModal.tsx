import { useState } from "react";

export interface InventoryItem {
  id: string;
  name: string;
  category: "material" | "consumible" | "defensa" | "arma";
  rarity: "comun" | "raro" | "mitico";
  quantity: number;
  icon: string;
  description: string;
  perk?: string;
  actionLabel?: string;
}

interface InventoryModalProps {
  onClose: () => void;
  collectedWood: number;
  loot: {
    comida: number;
    medicina: number;
    chatarra: number;
    reliquia: number;
  };
  defensesStock: {
    barricada: number;
    trampa_pinchos: number;
  };
  katanaDurability: number;
  onEatFood: () => void;
  onUseMedicine: () => void;
  onRepairKatana: () => void;
  onPlaceDefense: (kind: "barricada" | "trampa_pinchos") => void;
}

export function InventoryModal({
  onClose,
  collectedWood,
  loot,
  defensesStock,
  katanaDurability,
  onEatFood,
  onUseMedicine,
  onRepairKatana,
  onPlaceDefense,
}: InventoryModalProps) {
  const [tab, setTab] = useState<"todos" | "material" | "consumible" | "defensa" | "arma">("todos");
  const [selectedId, setSelectedId] = useState<string>("katana");

  // Construcción de la lista de ítems del inventario
  const items: InventoryItem[] = [
    {
      id: "katana",
      name: "Katana de Samurái",
      category: "arma",
      rarity: katanaDurability > 75 ? "mitico" : katanaDurability > 35 ? "raro" : "comun",
      quantity: 1,
      icon: "⚔️",
      description: "Acero forjado de alta pureza. Tu arma principal para cortar no-muertos.",
      perk: `Durabilidad: ${katanaDurability}% • Filo ${katanaDurability > 75 ? "Óptimo" : katanaDurability > 35 ? "Estándar" : "Mellado"}`,
      actionLabel: "Afilar (+50% Filo)",
    },
    {
      id: "madera",
      name: "Troncos de Cedro / Deriva",
      category: "material",
      rarity: "comun",
      quantity: collectedWood,
      icon: "🪵",
      description: "Madera resistente recolectada en playas y bosques. Sirve para construir el refugio y barricadas.",
    },
    {
      id: "chatarra",
      name: "Chatarra de Acero y Clavos",
      category: "material",
      rarity: "comun",
      quantity: loot.chatarra,
      icon: "🔩",
      description: "Fragmentos metálicos rescatados de navíos hundidos. Esencial para afilar la katana y forjar defensas.",
      actionLabel: loot.chatarra >= 2 ? "Reparar Katana (2)" : undefined,
    },
    {
      id: "comida",
      name: "Ración / Bento Tradicional",
      category: "consumible",
      rarity: "comun",
      quantity: loot.comida,
      icon: "🍱",
      description: "Alimento nutritivo preparado con pescado seco y arroz.",
      perk: "Restaura +15 Salud y +35 Aguante",
      actionLabel: loot.comida > 0 ? "Comer (C)" : undefined,
    },
    {
      id: "medicina",
      name: "Ungüento Herbal Cicatrizante",
      category: "consumible",
      rarity: "raro",
      quantity: loot.medicina,
      icon: "🌿",
      description: "Hierbas medicinales de la ladera montañosa que cierran heridas al instante.",
      perk: "Restaura +35 Salud al instante",
      actionLabel: loot.medicina > 0 ? "Aplicar" : undefined,
    },
    {
      id: "reliquia",
      name: "Espejo / Amuleto Ancestral",
      category: "material",
      rarity: "mitico",
      quantity: loot.reliquia,
      icon: "🪞",
      description: "Reliquia sagrada imbuida con la esencia de los Kami.",
      perk: "Material requerido para santuarios y amuletos Omamori",
    },
    {
      id: "barricada_item",
      name: "Barricada de Estacas (Mitate)",
      category: "defensa",
      rarity: "raro",
      quantity: defensesStock.barricada,
      icon: "🚧",
      description: "Empalizada de estacas afiladas. Frena y repele a los zombis en seco.",
      perk: "Bloquea zombis y les causa daño de retroceso",
      actionLabel: defensesStock.barricada > 0 ? "Plantar en Terreno" : undefined,
    },
    {
      id: "trampa_pinchos_item",
      name: "Trampa de Pinchos de Bambú",
      category: "defensa",
      rarity: "raro",
      quantity: defensesStock.trampa_pinchos,
      icon: "🪤",
      description: "Trampa de suelo con resortes de bambú que se clavan al pisar.",
      perk: "Causa 2.0 de daño crítico e inmoviliza al intruso",
      actionLabel: defensesStock.trampa_pinchos > 0 ? "Plantar en Terreno" : undefined,
    },
  ];

  const filteredItems = items.filter((it) => {
    if (tab === "todos") return true;
    return it.category === tab;
  });

  const selectedItem = items.find((it) => it.id === selectedId) || items[0]!;

  return (
    <div className="pointer-events-auto self-center max-w-2xl w-full rounded-lg border border-border/80 bg-card/95 p-6 shadow-2xl backdrop-blur animate-in fade-in zoom-in-95 duration-150">
      {/* Encabezado */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🎒</span>
          <div>
            <h3 className="text-base font-bold tracking-wide">Inventario del Ronin</h3>
            <p className="text-xs text-muted-foreground">
              Gestiona armas, materiales recolectados, provisiones y defensas.
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          ✕
        </button>
      </div>

      {/* Pestañas de filtrado */}
      <div className="mt-3 flex items-center gap-1.5 border-b border-border pb-2 text-xs">
        {[
          { id: "todos", label: "Todo" },
          { id: "arma", label: "Armas" },
          { id: "material", label: "Materiales" },
          { id: "consumible", label: "Consumibles" },
          { id: "defensa", label: "Defensas" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`rounded px-3 py-1 font-medium transition-colors ${
              tab === t.id
                ? "bg-primary text-primary-foreground font-semibold"
                : "bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Cuadrícula + Panel Lateral */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cuadrícula de 12 slots */}
        <div className="md:col-span-2 grid grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
          {filteredItems.map((item) => {
            const isSelected = item.id === selectedId;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`relative flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-primary/20 shadow-md scale-105"
                    : "border-border/60 bg-secondary/30 hover:border-border hover:bg-secondary/60"
                }`}
              >
                <span className="text-2xl mb-1">{item.icon}</span>
                <span className="text-[11px] font-medium text-center line-clamp-1">
                  {item.name}
                </span>
                <span className="absolute top-1.5 right-1.5 text-[10px] font-bold bg-background/80 px-1.5 rounded text-foreground border border-border/40">
                  x{item.quantity}
                </span>

                {/* Barra de durabilidad en la katana */}
                {item.id === "katana" && (
                  <div className="w-full mt-1.5 h-1 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        katanaDurability > 50
                          ? "bg-emerald-400"
                          : katanaDurability > 20
                            ? "bg-amber-400"
                            : "bg-destructive"
                      }`}
                      style={{ width: `${katanaDurability}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Panel lateral de inspección */}
        <div className="rounded-lg border border-border/70 bg-secondary/20 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{selectedItem.icon}</span>
              <div>
                <h4 className="font-bold text-sm leading-tight">{selectedItem.name}</h4>
                <span
                  className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                    selectedItem.rarity === "mitico"
                      ? "bg-purple-500/20 text-purple-300"
                      : selectedItem.rarity === "raro"
                        ? "bg-sky-500/20 text-sky-300"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {selectedItem.rarity}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              {selectedItem.description}
            </p>

            {selectedItem.perk && (
              <div className="mt-3 rounded bg-secondary/40 p-2 text-[11px] text-sky-200 border border-border/30">
                {selectedItem.perk}
              </div>
            )}
          </div>

          {/* Botones de acción contextuales */}
          <div className="mt-4 space-y-1.5">
            {selectedItem.id === "katana" && (
              <button
                onClick={onRepairKatana}
                disabled={loot.chatarra < 2 || katanaDurability >= 100}
                className="w-full rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity shadow"
              >
                Afilar con Chatarra (2 Chatarra)
              </button>
            )}

            {selectedItem.id === "comida" && selectedItem.quantity > 0 && (
              <button
                onClick={onEatFood}
                className="w-full rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow"
              >
                Comer Bento (+15 HP)
              </button>
            )}

            {selectedItem.id === "medicina" && selectedItem.quantity > 0 && (
              <button
                onClick={onUseMedicine}
                className="w-full rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow"
              >
                Aplicar Medicina (+35 HP)
              </button>
            )}

            {selectedItem.id === "barricada_item" && selectedItem.quantity > 0 && (
              <button
                onClick={() => {
                  onPlaceDefense("barricada");
                  onClose();
                }}
                className="w-full rounded bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 transition-colors shadow"
              >
                Plantar Barricada Aquí (B)
              </button>
            )}

            {selectedItem.id === "trampa_pinchos_item" && selectedItem.quantity > 0 && (
              <button
                onClick={() => {
                  onPlaceDefense("trampa_pinchos");
                  onClose();
                }}
                className="w-full rounded bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 transition-colors shadow"
              >
                Plantar Trampa Aquí
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
