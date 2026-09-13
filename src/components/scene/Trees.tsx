import { useMemo } from "react";
import * as THREE from "three";
import { heightAt } from "./terrain";
import { ZONES } from "./Village";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface TreeData {
  pos: [number, number, number];
  scale: number;
  rot: number;
  kind: 0 | 1;
  tint: number;
}

/** Bosque de cedros y pinos japoneses distribuido por el terreno. */
export function Trees({ count = 130 }: { count?: number }) {
  const trees = useMemo<TreeData[]>(() => {
    const r = rng(8123);
    const out: TreeData[] = [];
    let guard = 0;
    while (out.length < count && guard < count * 20) {
      guard++;
      const x = (r() - 0.5) * 128;
      const z = (r() - 0.5) * 128 + 6;
      // fuera de la playa jugable y del muelle
      const d = Math.hypot(x, z - 4);
      if (d < 20) continue;
      // deja libres las zonas habitadas (aldea, templo, granjas)
      if (
        ZONES.some(
          (zone) =>
            Math.hypot(x - zone.center[0], z - zone.center[2]) < zone.radius + 3,
        )
      )
        continue;
      const y = heightAt(x, z);
      if (y < 0.4) continue; // nada dentro del agua
      out.push({
        pos: [x, y - 0.1, z],
        scale: 0.8 + r() * 1.1,
        rot: r() * Math.PI * 2,
        kind: r() > 0.45 ? 1 : 0,
        tint: r(),
      });
    }
    return out;
  }, [count]);

  const trunkMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#4a3a2c", roughness: 1 }),
    [],
  );
  const leafMats = useMemo(
    () =>
      ["#2f4433", "#38513a", "#27392c", "#425a3c"].map(
        (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true }),
      ),
    [],
  );

  return (
    <group>
      {trees.map((t, i) => {
        const leaf = leafMats[Math.floor(t.tint * leafMats.length)] ?? leafMats[0]!;
        return (
          <group key={i} position={t.pos} rotation-y={t.rot} scale={t.scale}>
            <mesh position={[0, 1.1, 0]} castShadow material={trunkMat}>
              <cylinderGeometry args={[0.13, 0.22, 2.2, 6]} />
            </mesh>
            {t.kind === 0 ? (
              <>
                <mesh position={[0, 2.6, 0]} castShadow material={leaf}>
                  <coneGeometry args={[1.25, 2.4, 7]} />
                </mesh>
                <mesh position={[0, 3.8, 0]} castShadow material={leaf}>
                  <coneGeometry args={[0.9, 1.9, 7]} />
                </mesh>
              </>
            ) : (
              <>
                <mesh position={[0, 2.7, 0]} castShadow material={leaf}>
                  <icosahedronGeometry args={[1.25, 0]} />
                </mesh>
                <mesh position={[0.5, 2.1, 0.35]} castShadow material={leaf}>
                  <icosahedronGeometry args={[0.75, 0]} />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}
