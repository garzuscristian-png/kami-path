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
  kind: "consumable" | "upgrade" | "defense";
}

export interface ShelterUpgrade {
  level: number;
  name: string;
  subtitle: string;
  description: string;
  perks: string[];
  cost: {
    madera?: number;
    chatarra?: number;
    medicina?: number;
    comida?: number;
    reliquia?: number;
  };
}

export const SHELTER_UPGRADES: ShelterUpgrade[] = [
  {
    level: 1,
    name: "Campamento con Fogata",
    subtitle: "Nivel 1: Hoguera de piedras y lona rústica",
    description: "Construye una fogata cálida y un toldo de supervivencia. Acelera la recuperación de aguante en tu base.",
    perks: [
      "🔥 Fogata con brasas humeantes para las noches frías",
      "⚡ Regeneración de aguante +50% dentro del santuario",
      "🛡️ Marca el perímetro seguro de tu hogar",
    ],
    cost: { madera: 4, chatarra: 2 },
  },
  {
    level: 2,
    name: "Cabaña de Ciprés Reforzada",
    subtitle: "Nivel 2: Muros de troncos y farol guardián",
    description: "Una sólida vivienda japonesa con techo a dos aguas y farolillo protector. Confiere curación pasiva en casa.",
    perks: [
      "🏠 Cabaña estructurada con tejado japonés y cofre",
      "❤️ Regeneración pasiva de vida (+1 HP cada 2 segundos)",
      "🏮 Farol que disuade a las hordas nocturnas a mayor distancia",
    ],
    cost: { madera: 8, chatarra: 5, comida: 2 },
  },
  {
    level: 3,
    name: "Santuario Fortaleza de los Kami",
    subtitle: "Nivel 3: Empalizada defensiva, Torii sagrado y fuego fatuo",
    description: "Santuario impenetrable bendecido por los espíritus. Otorga bonificación de combate nocturno y curación sagrada.",
    perks: [
      "⛩️ Torii con linternas de fuego fatuo y empalizada defensiva",
      "⚔️ Filo bendito: +1 daño de Katana contra zombis de noche",
      "✨ Regeneración sagrada rápida (+3 HP/s y Stamina ilimitada en base)",
    ],
    cost: { madera: 14, chatarra: 8, medicina: 2, reliquia: 1 },
  },
];

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
    id: "toishi_afilar",
    name: "Piedra de Afilar (Toishi)",
    description: "Restaura +50% de durabilidad y filo a tu Katana.",
    cost: { chatarra: 2 },
    kind: "consumable",
  },
  {
    id: "barricada",
    name: "Barricada de Estacas (Mitate)",
    description: "Empalizada defensiva que bloquea el paso a los zombis.",
    cost: { madera: 3, chatarra: 1 },
    kind: "defense",
  },
  {
    id: "trampa_pinchos",
    name: "Trampa de Pinchos de Bambú (Otoshiana)",
    description: "Trampa de suelo oculta que causa 2 de daño crítico e inmoviliza al zombi.",
    cost: { madera: 2, chatarra: 2 },
    kind: "defense",
  },
  {
    id: "hoja_afilada",
    name: "Afilado de Katana (Acero Tamahagane)",
    description: "Mejora permanente: aumenta el daño base de tu katana.",
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
