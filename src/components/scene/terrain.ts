import * as THREE from "three";

export const TERRAIN_SIZE = 140;
export const TERRAIN_SEGMENTS = 160;

/** Zona plana de juego (playa + muelle) alrededor de este centro. */
const FLAT_CENTER_Z = 4;
const FLAT_RADIUS = 18;
const FLAT_FADE = 26;

function smoothstep(e0: number, e1: number, x: number) {
  const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Altura del terreno en cualquier punto del mundo.
 * Plano en la zona jugable central, con colinas suaves hacia el interior
 * y descenso bajo el nivel del mar en la orilla norte.
 */
export function heightAt(x: number, z: number): number {
  // orilla: por debajo de z = -6 el terreno baja hacia el agua
  const shore = smoothstep(-14, -4, z);

  const d = Math.hypot(x, z - FLAT_CENTER_Z);
  const inland = smoothstep(FLAT_RADIUS, FLAT_RADIUS + FLAT_FADE, d);

  const hills =
    Math.sin(x * 0.075) * Math.cos(z * 0.085) * 1.9 +
    Math.sin((x + z) * 0.042) * 2.6 +
    Math.sin(x * 0.19 + 1.3) * Math.sin(z * 0.17) * 0.7;

  const ridge = inland * inland * 7.5;

  const dune = Math.sin(x * 0.35) * Math.cos(z * 0.31) * 0.12;

  return (hills * inland + ridge + dune) * shore + (shore - 1) * 4.5;
}

/** Geometría del terreno desplazada + bandas de color tipo curva de nivel. */
export function createTerrainGeometry(sampleHeight = heightAt) {
  const geo = new THREE.PlaneGeometry(
    TERRAIN_SIZE,
    TERRAIN_SIZE,
    TERRAIN_SEGMENTS,
    TERRAIN_SEGMENTS,
  );
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes["position"] as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const base = new THREE.Color("#b9b0a1");
  const high = new THREE.Color("#8d8577");
  const low = new THREE.Color("#6f7266");
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = sampleHeight(x, z);
    pos.setY(i, y);

    // color por altura
    const t = THREE.MathUtils.clamp((y + 4) / 14, 0, 1);
    tmp.copy(y < 0 ? low : base).lerp(high, t);

    // curvas de nivel: banda oscura cada metro
    const band = Math.abs((((y % 1) + 1) % 1) - 0.5) * 2; // 0 en el borde de la banda
    const line = 1 - smoothstep(0.82, 1, band) * 0.35;
    tmp.multiplyScalar(line);

    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}
