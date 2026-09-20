import { ZONES } from "./Village";

export interface CircleCollider {
  x: number;
  z: number;
  radius: number;
}

export interface BoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

// Colisionadores estáticos principales del mundo (Casas, Templo, Torii, Rocas)
const STATIC_CIRCLE_COLLIDERS: CircleCollider[] = [
  // Torii principal en la entrada costera
  { x: -7.5, z: -12, radius: 1.5 },
  // Recinto del Templo de la montaña (salón principal y pilares)
  { x: 30, z: -4, radius: 6.5 },
  { x: 30, z: 15, radius: 1.8 }, // torii del templo
  // Pilares y rocas de la ladera
  { x: -14, z: -50, radius: 8.0 }, // base del volcán
  // Aldea pesquera (grupos de casas)
  { x: -26, z: 26, radius: 4.8 },
  { x: -22, z: 32, radius: 3.8 },
  { x: -31, z: 22, radius: 3.8 },
  { x: -20, z: 21, radius: 3.8 },
  // Casas de labranza
  { x: 6, z: 44, radius: 4.2 },
  { x: 12, z: 48, radius: 3.6 },
  { x: 1, z: 41, radius: 3.6 },
  // Cajas y barriles del muelle (evitar pasar a través)
  { x: -2.8, z: 4.2, radius: 1.2 },
  { x: 3.1, z: 3.8, radius: 1.2 },
];

/**
 * Resuelve colisiones para un círculo (jugador o zombi) contra todos los colisionadores estáticos y defensas.
 * Retorna las coordenadas [newX, newZ] deslizadas para que el movimiento sea suave.
 */
export function resolveCollisions(
  currX: number,
  currZ: number,
  entityRadius: number = 0.45,
  dynamicDefenses: { x: number; z: number; kind: string }[] = [],
  shelterLevel: number = 0,
): [number, number] {
  let x = currX;
  let z = currZ;

  // 1. Límites del mundo
  x = Math.max(-60, Math.min(60, x));
  z = Math.max(-13, Math.min(60, z));

  // 2. Colisión con Refugio si está construido (Nivel 2 y 3 tienen paredes sólidas)
  if (shelterLevel >= 2) {
    const shelterX = 6.5;
    const shelterZ = 6.0;
    const sRad = 2.4;
    const dx = x - shelterX;
    const dz = z - shelterZ;
    const dist = Math.hypot(dx, dz);
    const minDist = sRad + entityRadius;
    if (dist < minDist && dist > 0.001) {
      x = shelterX + (dx / dist) * minDist;
      z = shelterZ + (dz / dist) * minDist;
    }
  }

  // 3. Colisión con colisionadores estáticos circulares
  for (const col of STATIC_CIRCLE_COLLIDERS) {
    const dx = x - col.x;
    const dz = z - col.z;
    const dist = Math.hypot(dx, dz);
    const minDist = col.radius + entityRadius;

    if (dist < minDist && dist > 0.001) {
      // Empujar hacia afuera a lo largo de la normal de colisión
      x = col.x + (dx / dist) * minDist;
      z = col.z + (dz / dist) * minDist;
    }
  }

  // 4. Colisión con Barricadas colocadas por el jugador
  for (const def of dynamicDefenses) {
    if (def.kind === "barricada") {
      const dx = x - def.x;
      const dz = z - def.z;
      const dist = Math.hypot(dx, dz);
      const minDist = 1.3 + entityRadius;

      if (dist < minDist && dist > 0.001) {
        x = def.x + (dx / dist) * minDist;
        z = def.z + (dz / dist) * minDist;
      }
    }
  }

  return [x, z];
}
