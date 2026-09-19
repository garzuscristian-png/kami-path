export interface Recipe {
  id: string;
  name: string;
  description: string;
  cost: {
    madera?: number;
    chatarra?: number;
    medicina?: number;
    comida?: number;
    reliquia?: number;
  };
  kind: "consumable" | "upgrade";
}

export const CRAFT_RECIPES: Recipe[] = [
  {
    id: "vendaje",
    name: "Vendaje reforzado",
    description: "Cura 45 puntos de salud al instante.",
    cost: { medicina: 1, madera: 1 },
    kind: "consumable",
  },
  {
    id: "bento",
    name: "Ración caliente (Bento)",
    description: "Recupera 50 de salud y llena la barra de aguante al 100%.",
    cost: { comida: 2, madera: 1 },
    kind: "consumable",
  },
  {
    id: "hoja_afilada",
    name: "Afilado de Katana (Acero Tamahagane)",
    description: "Mejora el filo: los zombis caen de 2 golpes en vez de 3.",
    cost: { chatarra: 2, madera: 2 },
    kind: "upgrade",
  },
  {
    id: "omamori",
    name: "Amuleto de Protección (Omamori)",
    description: "Reduce el daño recibido un 40% y regenera el aguante más rápido.",
    cost: { reliquia: 1, chatarra: 1 },
    kind: "upgrade",
  },
];
