import { useMemo } from "react";
import * as THREE from "three";
import { heightAt } from "./terrain";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Zonas habitadas: pueblo pesquero y recinto del templo. */
export const ZONES = [
  { id: "aldea", name: "Aldea pesquera", center: [-26, 0, 26] as const, radius: 16 },
  { id: "templo", name: "Templo de la montaña", center: [30, 0, -4] as const, radius: 14 },
  { id: "granjas", name: "Casas de labranza", center: [6, 0, 44] as const, radius: 13 },
];

interface HouseData {
  pos: [number, number, number];
  rot: number;
  w: number;
  d: number;
  h: number;
  wall: number;
  ruined: boolean;
}

function useHouses() {
  return useMemo<HouseData[]>(() => {
    const r = rng(5150);
    const out: HouseData[] = [];
    for (const zone of ZONES) {
      if (zone.id === "templo") continue;
      const count = zone.id === "aldea" ? 9 : 6;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + r() * 0.5;
        const d = zone.radius * (0.35 + r() * 0.62);
        const x = zone.center[0] + Math.cos(a) * d;
        const z = zone.center[2] + Math.sin(a) * d;
        const y = heightAt(x, z);
        if (y < 0.2) continue;
        out.push({
          pos: [x, y, z],
          rot: a + Math.PI / 2 + (r() - 0.5) * 0.5,
          w: 4 + r() * 2.4,
          d: 3.4 + r() * 2,
          h: 2.1 + r() * 0.8,
          wall: r(),
          ruined: r() > 0.7,
        });
      }
    }
    return out;
  }, []);
}

function Minka({ data, mats }: { data: HouseData; mats: Record<string, THREE.Material> }) {
  const { w, d, h } = data;
  const roofH = 1.5 + h * 0.22;
  return (
    <group position={data.pos} rotation-y={data.rot}>
      {/* plataforma de piedra */}
      <mesh position={[0, 0.16, 0]} receiveShadow material={mats["stone"]!}>
        <boxGeometry args={[w + 0.9, 0.34, d + 0.9]} />
      </mesh>
      {/* cuerpo enlucido */}
      <mesh position={[0, 0.33 + h / 2, 0]} castShadow receiveShadow material={mats["plaster"]!}>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      {/* vigas oscuras */}
      {[-w / 2 + 0.12, w / 2 - 0.12].map((x) => (
        <mesh key={x} position={[x, 0.33 + h / 2, 0]} castShadow material={mats["beam"]!}>
          <boxGeometry args={[0.18, h, d + 0.06]} />
        </mesh>
      ))}
      <mesh position={[0, 0.33 + h - 0.12, 0]} material={mats["beam"]!}>
        <boxGeometry args={[w + 0.08, 0.2, d + 0.08]} />
      </mesh>
      {/* puerta corredera shoji */}
      <mesh position={[0, 0.33 + h * 0.42, d / 2 + 0.02]} material={mats["shoji"]!}>
        <planeGeometry args={[w * 0.52, h * 0.7]} />
      </mesh>
      {/* tejado a dos aguas */}
      {!data.ruined && (
        <mesh
          position={[0, 0.33 + h + roofH / 2 - 0.1, 0]}
          rotation-y={Math.PI / 4}
          castShadow
          material={mats["roof"]!}
        >
          <cylinderGeometry args={[0.001, w * 0.78, roofH, 4, 1]} />
        </mesh>
      )}
      {data.ruined && (
        <mesh
          position={[0.4, 0.33 + h + roofH * 0.25, -0.2]}
          rotation={[0.5, 0.6, 0.35]}
          castShadow
          material={mats["roof"]!}
        >
          <boxGeometry args={[w * 0.9, 0.16, d * 0.8]} />
        </mesh>
      )}
      {/* alero */}
      <mesh position={[0, 0.33 + h + 0.06, 0]} castShadow material={mats["beam"]!}>
        <boxGeometry args={[w + 1.1, 0.12, d + 1.1]} />
      </mesh>
      {/* farol de papel */}
      <mesh position={[w / 2 - 0.2, 0.33 + h * 0.85, d / 2 + 0.35]} material={mats["lantern"]!}>
        <sphereGeometry args={[0.2, 10, 8]} />
      </mesh>
      <pointLight
        position={[w / 2 - 0.2, 0.33 + h * 0.85, d / 2 + 0.35]}
        distance={6}
        intensity={2.2}
        color="#ffb765"
      />
    </group>
  );
}

function TempleGrounds({ mats }: { mats: Record<string, THREE.Material> }) {
  const zone = ZONES[1]!;
  const [cx, , cz] = zone.center;
  const base = heightAt(cx, cz);

  const steps = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        z: cz + 7.5 + i * 0.9,
        y: base + 0.9 - i * 0.16,
      })),
    [base, cz],
  );

  const lanterns = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const z = cz + 7 + i * 2.1;
      for (const x of [cx - 3.4, cx + 3.4]) out.push([x, heightAt(x, z), z]);
    }
    return out;
  }, [cx, cz]);

  return (
    <group>
      {/* plataforma del recinto */}
      <mesh position={[cx, base + 0.45, cz]} receiveShadow material={mats["stone"]!}>
        <boxGeometry args={[18, 0.9, 16]} />
      </mesh>

      {/* escalinata */}
      {steps.map((s, i) => (
        <mesh key={i} position={[cx, s.y, s.z]} receiveShadow material={mats["stone"]!}>
          <boxGeometry args={[7, 0.3, 0.95]} />
        </mesh>
      ))}

      {/* salón principal */}
      <group position={[cx, base + 0.9, cz - 1]}>
        {/* pilares */}
        {[-4.2, -1.4, 1.4, 4.2].map((x) =>
          [-3.4, 3.4].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, 1.7, z]} castShadow material={mats["pillar"]!}>
              <cylinderGeometry args={[0.26, 0.3, 3.4, 10]} />
            </mesh>
          )),
        )}
        {/* muros */}
        <mesh position={[0, 1.7, -3.6]} castShadow receiveShadow material={mats["plaster"]!}>
          <boxGeometry args={[9.6, 3.4, 0.4]} />
        </mesh>
        {[-3.5, 3.5].map((x) => (
          <mesh key={x} position={[x, 1.7, 0]} castShadow receiveShadow material={mats["plaster"]!}>
            <boxGeometry args={[2.6, 3.4, 7.4]} />
          </mesh>
        ))}
        {/* suelo interior */}
        <mesh position={[0, 0.08, 0]} receiveShadow material={mats["beam"]!}>
          <boxGeometry args={[9.6, 0.18, 7.4]} />
        </mesh>
        {/* tejado curvo en capas */}
        <mesh position={[0, 3.7, 0]} castShadow material={mats["roof"]!}>
          <boxGeometry args={[12.4, 0.4, 10]} />
        </mesh>
        <mesh position={[0, 4.5, 0]} rotation-y={Math.PI / 4} castShadow material={mats["roof"]!}>
          <cylinderGeometry args={[0.4, 8.6, 2.2, 4, 1]} />
        </mesh>
        <mesh position={[0, 5.75, 0]} castShadow material={mats["pillar"]!}>
          <cylinderGeometry args={[0.1, 0.14, 1, 8]} />
        </mesh>
        {/* puerta */}
        <mesh position={[0, 1.3, 3.72]} material={mats["shoji"]!}>
          <planeGeometry args={[3.6, 2.4]} />
        </mesh>
        <pointLight position={[0, 1.8, 1]} distance={12} intensity={3} color="#ffc98a" />
      </group>

      {/* torii de entrada */}
      <group position={[cx, heightAt(cx, cz + 19), cz + 19]}>
        {[-2.2, 2.2].map((x) => (
          <mesh key={x} position={[x, 2.2, 0]} castShadow material={mats["torii"]!}>
            <cylinderGeometry args={[0.22, 0.28, 4.4, 10]} />
          </mesh>
        ))}
        <mesh position={[0, 4.5, 0]} castShadow material={mats["torii"]!}>
          <boxGeometry args={[6.2, 0.3, 0.5]} />
        </mesh>
        <mesh position={[0, 3.9, 0]} castShadow material={mats["torii"]!}>
          <boxGeometry args={[5, 0.22, 0.38]} />
        </mesh>
      </group>

      {/* linternas de piedra del camino */}
      {lanterns.map((p, i) => (
        <group key={i} position={p}>
          <mesh position={[0, 0.35, 0]} castShadow material={mats["stone"]!}>
            <cylinderGeometry args={[0.18, 0.26, 0.7, 6]} />
          </mesh>
          <mesh position={[0, 0.9, 0]} castShadow material={mats["stone"]!}>
            <boxGeometry args={[0.5, 0.45, 0.5]} />
          </mesh>
          <mesh position={[0, 1.25, 0]} castShadow material={mats["stone"]!}>
            <coneGeometry args={[0.45, 0.35, 4]} />
          </mesh>
          <pointLight position={[0, 0.9, 0]} distance={5} intensity={1.4} color="#ffcf95" />
        </group>
      ))}
    </group>
  );
}

/** Aldea japonesa, casas de labranza y recinto del templo. */
export function Village() {
  const houses = useHouses();

  const mats = useMemo<Record<string, THREE.Material>>(
    () => ({
      plaster: new THREE.MeshStandardMaterial({ color: "#cfc4ae", roughness: 0.95 }),
      beam: new THREE.MeshStandardMaterial({ color: "#3b2d21", roughness: 0.9 }),
      roof: new THREE.MeshStandardMaterial({
        color: "#3a3f46",
        roughness: 0.8,
        flatShading: true,
      }),
      stone: new THREE.MeshStandardMaterial({ color: "#7d7a70", roughness: 1 }),
      shoji: new THREE.MeshStandardMaterial({
        color: "#e6dcc2",
        roughness: 0.6,
        emissive: new THREE.Color("#4a3a20"),
        emissiveIntensity: 0.5,
        side: THREE.DoubleSide,
      }),
      pillar: new THREE.MeshStandardMaterial({ color: "#7b3b30", roughness: 0.8 }),
      torii: new THREE.MeshStandardMaterial({ color: "#8c2f28", roughness: 0.7 }),
      lantern: new THREE.MeshStandardMaterial({
        color: "#e8a765",
        emissive: new THREE.Color("#c26a20"),
        emissiveIntensity: 1.2,
        roughness: 0.6,
      }),
    }),
    [],
  );

  return (
    <group>
      {houses.map((h, i) => (
        <Minka key={i} data={h} mats={mats} />
      ))}
      <TempleGrounds mats={mats} />
    </group>
  );
}
