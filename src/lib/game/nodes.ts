export type ObjectiveKind = "hunt" | "gather" | "survive" | "explore" | "boss";

export interface Objective {
  id: string;
  label: string;
  kind: ObjectiveKind;
  target: number;
}

export type Biome =
  | "coast"
  | "forest"
  | "mountain"
  | "urban"
  | "rural"
  | "volcanic"
  | "snow";

export interface MapNode {
  id: string;
  name: string;
  region: string;
  biome: Biome;
  /** Posición normalizada 0-100 sobre el mapa estilizado de Japón */
  x: number;
  y: number;
  danger: 1 | 2 | 3 | 4 | 5;
  /** Nodos que deben estar completados para desbloquear este */
  requires: string[];
  objectives: Objective[];
  /** Puntos de habilidad otorgados al completar el nodo */
  skillPoints: number;
  /** Semilla base para el escenario 3D (procedural o autoral) */
  seed: number;
  description: string;
}

export const MAP_NODES: MapNode[] = [
  {
    id: "kyushu-kagoshima",
    name: "Puerto de Kagoshima",
    region: "Kyushu",
    biome: "coast",
    x: 20,
    y: 84,
    danger: 1,
    requires: [],
    seed: 1001,
    skillPoints: 2,
    description:
      "Muelles cubiertos de ceniza volcánica. El primer refugio tras el colapso.",
    objectives: [
      { id: "k1", label: "Recolectar restos de red y madera", kind: "gather", target: 12 },
      { id: "k2", label: "Sobrevivir a la marea nocturna", kind: "survive", target: 1 },
    ],
  },
  {
    id: "kyushu-aso",
    name: "Caldera de Aso",
    region: "Kyushu",
    biome: "volcanic",
    x: 25,
    y: 74,
    danger: 3,
    requires: ["kyushu-kagoshima"],
    seed: 1002,
    skillPoints: 3,
    description: "Fumarolas y suelo inestable. El calor atrae criaturas termales.",
    objectives: [
      { id: "a1", label: "Cartografiar las grietas activas", kind: "explore", target: 4 },
      { id: "a2", label: "Abatir merodeadores de azufre", kind: "hunt", target: 6 },
    ],
  },
  {
    id: "chugoku-hiroshima",
    name: "Delta de Hiroshima",
    region: "Chugoku",
    biome: "urban",
    x: 33,
    y: 66,
    danger: 2,
    requires: ["kyushu-kagoshima"],
    seed: 1003,
    skillPoints: 2,
    description: "Canales urbanos inundados y edificios vacíos llenos de chatarra.",
    objectives: [
      { id: "h1", label: "Saquear componentes eléctricos", kind: "gather", target: 8 },
      { id: "h2", label: "Explorar la estación sumergida", kind: "explore", target: 3 },
    ],
  },
  {
    id: "kansai-kyoto",
    name: "Bosque de Arashiyama",
    region: "Kansai",
    biome: "forest",
    x: 46,
    y: 58,
    danger: 3,
    requires: ["chugoku-hiroshima"],
    seed: 1004,
    skillPoints: 3,
    description: "Bambú infinito. La visibilidad es mínima y el sonido engaña.",
    objectives: [
      { id: "ky1", label: "Marcar senderos seguros", kind: "explore", target: 5 },
      { id: "ky2", label: "Cazar jabalíes mutados", kind: "hunt", target: 10 },
    ],
  },
  {
    id: "kansai-osaka",
    name: "Ruinas de Osaka",
    region: "Kansai",
    biome: "urban",
    x: 50,
    y: 64,
    danger: 4,
    requires: ["chugoku-hiroshima", "kansai-kyoto"],
    seed: 1005,
    skillPoints: 4,
    description: "Megaciudad colapsada. Recursos abundantes, enemigos organizados.",
    objectives: [
      { id: "o1", label: "Asegurar el nudo ferroviario", kind: "survive", target: 3 },
      { id: "o2", label: "Recuperar el núcleo del generador", kind: "gather", target: 1 },
      { id: "o3", label: "Derrotar al Capataz de Acero", kind: "boss", target: 1 },
    ],
  },
  {
    id: "chubu-fuji",
    name: "Ladera del Fuji",
    region: "Chubu",
    biome: "mountain",
    x: 62,
    y: 52,
    danger: 4,
    requires: ["kansai-kyoto"],
    seed: 1006,
    skillPoints: 4,
    description: "Altitud extrema, tormentas de ceniza y cuevas de lava selladas.",
    objectives: [
      { id: "f1", label: "Instalar balizas de ascenso", kind: "explore", target: 6 },
      { id: "f2", label: "Resistir la tormenta de ceniza", kind: "survive", target: 2 },
    ],
  },
  {
    id: "kanto-tokyo",
    name: "Bahía de Tokio",
    region: "Kanto",
    biome: "urban",
    x: 70,
    y: 50,
    danger: 5,
    requires: ["kansai-osaka", "chubu-fuji"],
    seed: 1007,
    skillPoints: 5,
    description: "El corazón del brote. Torres inclinadas sobre agua negra.",
    objectives: [
      { id: "t1", label: "Infiltrar el distrito de cuarentena", kind: "explore", target: 4 },
      { id: "t2", label: "Purgar el nido de la torre", kind: "boss", target: 1 },
    ],
  },
  {
    id: "tohoku-tono",
    name: "Valles de Tono",
    region: "Tohoku",
    biome: "rural",
    x: 78,
    y: 36,
    danger: 3,
    requires: ["kanto-tokyo"],
    seed: 1008,
    skillPoints: 3,
    description: "Aldeas agrícolas abandonadas y santuarios de montaña intactos.",
    objectives: [
      { id: "to1", label: "Reactivar tres graneros", kind: "gather", target: 3 },
      { id: "to2", label: "Vigilar el santuario al anochecer", kind: "survive", target: 2 },
    ],
  },
  {
    id: "hokkaido-daisetsu",
    name: "Daisetsuzan",
    region: "Hokkaido",
    biome: "snow",
    x: 86,
    y: 16,
    danger: 5,
    requires: ["tohoku-tono"],
    seed: 1009,
    skillPoints: 6,
    description: "Frío letal y silencio absoluto. La última zona conocida.",
    objectives: [
      { id: "d1", label: "Sobrevivir cinco noches polares", kind: "survive", target: 5 },
      { id: "d2", label: "Rastrear al Oso Blanco de Kamui", kind: "boss", target: 1 },
    ],
  },
];

export const NODES_BY_ID: Record<string, MapNode> = Object.fromEntries(
  MAP_NODES.map((n) => [n.id, n]),
);

export interface MapEdge {
  from: string;
  to: string;
}

export const MAP_EDGES: MapEdge[] = MAP_NODES.flatMap((node) =>
  node.requires.map((from) => ({ from, to: node.id })),
);
