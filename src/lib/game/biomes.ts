import type { Biome } from "./nodes";

export interface BiomeTheme {
  background: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  skySun: [number, number, number];
  skyTurbidity: number;
  skyRayleigh: number;
  hemiSky: string;
  hemiGround: string;
  dirLightColor: string;
  dirLightIntensity: number;
  particleColor: string;
  particleSize: number;
  particleSpeedY: number;
  groundColor: string;
  particleLabel: string;
}

export const BIOME_THEMES: Record<Biome, BiomeTheme> = {
  coast: {
    background: "#5a5c68",
    fogColor: "#6a6c76",
    fogNear: 30,
    fogFar: 190,
    skySun: [24, 6, -60],
    skyTurbidity: 9,
    skyRayleigh: 2.4,
    hemiSky: "#bcc4d4",
    hemiGround: "#5a5348",
    dirLightColor: "#ffc18f",
    dirLightIntensity: 3.2,
    particleColor: "#cfc7ba",
    particleSize: 0.07,
    particleSpeedY: -0.5,
    groundColor: "#ece3d0",
    particleLabel: "Ceniza volcánica",
  },
  volcanic: {
    background: "#2e1a17",
    fogColor: "#421e1a",
    fogNear: 20,
    fogFar: 150,
    skySun: [15, 4, -50],
    skyTurbidity: 16,
    skyRayleigh: 4.5,
    hemiSky: "#d96543",
    hemiGround: "#331612",
    dirLightColor: "#ff6a3d",
    dirLightIntensity: 3.5,
    particleColor: "#ff7b47",
    particleSize: 0.09,
    particleSpeedY: 0.8, // ascuas subiendo
    groundColor: "#4a3532",
    particleLabel: "Ascuas y calor de magma",
  },
  forest: {
    background: "#233328",
    fogColor: "#2b3b30",
    fogNear: 25,
    fogFar: 160,
    skySun: [20, 15, -40],
    skyTurbidity: 7,
    skyRayleigh: 1.8,
    hemiSky: "#93b89b",
    hemiGround: "#344537",
    dirLightColor: "#d2e6cb",
    dirLightIntensity: 2.8,
    particleColor: "#b2e38b",
    particleSize: 0.08,
    particleSpeedY: 0.15, // espíritus kami flotando
    groundColor: "#5b6e58",
    particleLabel: "Espíritus del bosque (Kami)",
  },
  mountain: {
    background: "#404652",
    fogColor: "#525968",
    fogNear: 35,
    fogFar: 200,
    skySun: [30, 20, -50],
    skyTurbidity: 5,
    skyRayleigh: 1.2,
    hemiSky: "#cbd7e8",
    hemiGround: "#50545c",
    dirLightColor: "#ffe7cf",
    dirLightIntensity: 3.6,
    particleColor: "#e6ecf5",
    particleSize: 0.07,
    particleSpeedY: -0.8,
    groundColor: "#8f96a3",
    particleLabel: "Viento de cumbre",
  },
  snow: {
    background: "#6e7785",
    fogColor: "#828c9b",
    fogNear: 20,
    fogFar: 130,
    skySun: [10, 8, -45],
    skyTurbidity: 8,
    skyRayleigh: 2.0,
    hemiSky: "#e1eaf5",
    hemiGround: "#919aa6",
    dirLightColor: "#f0f5fc",
    dirLightIntensity: 3.4,
    particleColor: "#ffffff",
    particleSize: 0.1,
    particleSpeedY: -1.2, // ventisca de nieve
    groundColor: "#e5ecf5",
    particleLabel: "Ventisca polar",
  },
  urban: {
    background: "#353942",
    fogColor: "#424752",
    fogNear: 25,
    fogFar: 160,
    skySun: [18, 12, -40],
    skyTurbidity: 12,
    skyRayleigh: 3.2,
    hemiSky: "#a1aab8",
    hemiGround: "#42464d",
    dirLightColor: "#e0dcd5",
    dirLightIntensity: 2.6,
    particleColor: "#a3abb8",
    particleSize: 0.06,
    particleSpeedY: -1.8, // lluvia urbana ácida
    groundColor: "#61656e",
    particleLabel: "Lluvia ácida",
  },
  rural: {
    background: "#484d43",
    fogColor: "#53594e",
    fogNear: 30,
    fogFar: 180,
    skySun: [25, 14, -50],
    skyTurbidity: 7,
    skyRayleigh: 2.1,
    hemiSky: "#c6d1bf",
    hemiGround: "#52594a",
    dirLightColor: "#ffebc7",
    dirLightIntensity: 3.0,
    particleColor: "#ebdcc0",
    particleSize: 0.06,
    particleSpeedY: -0.4,
    groundColor: "#9c9684",
    particleLabel: "Polvo de campos",
  },
};
