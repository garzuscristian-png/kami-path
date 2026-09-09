export type SkillBranch = "supervivencia" | "combate" | "exploracion";

export interface Skill {
  id: string;
  name: string;
  branch: SkillBranch;
  tier: number;
  cost: number;
  description: string;
  /** Habilidades previas requeridas */
  requires: string[];
  /** Nodo del mapa que debe estar completado para poder aprenderla */
  unlockedByNode?: string;
}

export const SKILL_BRANCH_LABEL: Record<SkillBranch, string> = {
  supervivencia: "Supervivencia",
  combate: "Combate",
  exploracion: "Exploración",
};

export const SKILLS: Skill[] = [
  // Supervivencia
  {
    id: "forraje",
    name: "Forrajeo costero",
    branch: "supervivencia",
    tier: 1,
    cost: 1,
    requires: [],
    unlockedByNode: "kyushu-kagoshima",
    description: "+25% de recursos al recolectar en zonas de costa.",
  },
  {
    id: "termorregulacion",
    name: "Termorregulación",
    branch: "supervivencia",
    tier: 2,
    cost: 2,
    requires: ["forraje"],
    unlockedByNode: "kyushu-aso",
    description: "Reduce el daño por calor y frío extremo un 30%.",
  },
  {
    id: "cocina-ritual",
    name: "Cocina ritual",
    branch: "supervivencia",
    tier: 3,
    cost: 3,
    requires: ["termorregulacion"],
    unlockedByNode: "tohoku-tono",
    description: "Los platos cocinados otorgan bonificadores prolongados.",
  },
  {
    id: "aliento-kamui",
    name: "Aliento de Kamui",
    branch: "supervivencia",
    tier: 4,
    cost: 4,
    requires: ["cocina-ritual"],
    unlockedByNode: "hokkaido-daisetsu",
    description: "Inmunidad al frío polar y regeneración lenta en ventisca.",
  },

  // Combate
  {
    id: "esgrima",
    name: "Esgrima improvisada",
    branch: "combate",
    tier: 1,
    cost: 1,
    requires: [],
    unlockedByNode: "kyushu-kagoshima",
    description: "+15% de daño con armas blancas artesanales.",
  },
  {
    id: "contraataque",
    name: "Contraataque",
    branch: "combate",
    tier: 2,
    cost: 2,
    requires: ["esgrima"],
    unlockedByNode: "chugoku-hiroshima",
    description: "Un bloqueo perfecto abre al enemigo durante 2 s.",
  },
  {
    id: "caceria",
    name: "Cacería silenciosa",
    branch: "combate",
    tier: 3,
    cost: 3,
    requires: ["contraataque"],
    unlockedByNode: "kansai-kyoto",
    description: "Ejecuciones sigilosas instantáneas sobre fauna mutada.",
  },
  {
    id: "verdugo",
    name: "Verdugo de acero",
    branch: "combate",
    tier: 4,
    cost: 4,
    requires: ["caceria"],
    unlockedByNode: "kansai-osaka",
    description: "+40% de daño contra enemigos blindados y jefes.",
  },

  // Exploración
  {
    id: "cartografia",
    name: "Cartografía rápida",
    branch: "exploracion",
    tier: 1,
    cost: 1,
    requires: [],
    unlockedByNode: "chugoku-hiroshima",
    description: "Revela puntos de interés cercanos al entrar en un escenario.",
  },
  {
    id: "escalada",
    name: "Escalada asistida",
    branch: "exploracion",
    tier: 2,
    cost: 2,
    requires: ["cartografia"],
    unlockedByNode: "chubu-fuji",
    description: "Permite escalar superficies de roca y estructuras altas.",
  },
  {
    id: "urbex",
    name: "Instinto urbano",
    branch: "exploracion",
    tier: 3,
    cost: 3,
    requires: ["escalada"],
    unlockedByNode: "kanto-tokyo",
    description: "Detecta alijos ocultos dentro de edificios colapsados.",
  },
  {
    id: "senda-oculta",
    name: "Senda oculta",
    branch: "exploracion",
    tier: 4,
    cost: 4,
    requires: ["urbex"],
    unlockedByNode: "hokkaido-daisetsu",
    description: "Abre rutas alternativas entre nodos ya completados.",
  },
];

export const SKILLS_BY_ID: Record<string, Skill> = Object.fromEntries(
  SKILLS.map((s) => [s.id, s]),
);
