import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Biome } from "@/lib/game/nodes";
import { heightAt } from "./terrain";

interface BiomeSceneryProps {
  biome: Biome;
}

export function BiomeScenery({ biome }: BiomeSceneryProps) {
  switch (biome) {
    case "volcanic":
      return <VolcanicScenery />;
    case "forest":
      return <ForestScenery />;
    case "snow":
      return <SnowScenery />;
    case "urban":
      return <UrbanScenery />;
    case "rural":
      return <RuralScenery />;
    case "mountain":
      return <MountainScenery />;
    case "coast":
    default:
      return <CoastScenery />;
  }
}

/** Escenario Costero: Barcas encalladas, redes de pesca y restos marinos */
function CoastScenery() {
  const boats = [
    { x: -14, z: 1.5, rot: 0.35, scale: 1.2 },
    { x: 16, z: 2.2, rot: -0.4, scale: 1.0 },
    { x: 24, z: -2.5, rot: 0.8, scale: 1.4 },
  ];

  return (
    <group>
      {boats.map((b, i) => {
        const y = heightAt(b.x, b.z);
        return (
          <group key={i} position={[b.x, y + 0.3, b.z]} rotation-y={b.rot} scale={b.scale}>
            {/* Casco de barca pesquera tradicional (Wasen) */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[4.2, 0.7, 1.4]} />
              <meshStandardMaterial color="#544130" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.4, 0]} castShadow>
              <cylinderGeometry args={[0.08, 0.09, 3.2, 6]} />
              <meshStandardMaterial color="#3b2b1d" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Escenario Volcánico: Grietas de lava incandescente, monolitos de basalto y fumarolas */
function VolcanicScenery() {
  const fissures = [
    { x: -18, z: 18, rot: 0.5, length: 14 },
    { x: 12, z: 24, rot: -0.7, length: 12 },
    { x: -5, z: 38, rot: 0.2, length: 16 },
  ];

  const basaltSpikes = [
    { x: -12, z: 22, h: 5 },
    { x: -15, z: 28, h: 7 },
    { x: 16, z: 30, h: 6 },
    { x: 8, z: 42, h: 8 },
    { x: -22, z: 40, h: 9 },
  ];

  return (
    <group>
      {/* Grietas de lava con resplandor naranja */}
      {fissures.map((f, i) => {
        const y = heightAt(f.x, f.z);
        return (
          <group key={i} position={[f.x, y + 0.05, f.z]} rotation-y={f.rot}>
            <mesh rotation-x={-Math.PI / 2}>
              <planeGeometry args={[f.length, 1.4]} />
              <meshStandardMaterial
                color="#ff3300"
                emissive="#ff5500"
                emissiveIntensity={2.8}
                roughness={0.4}
              />
            </mesh>
            <pointLight color="#ff4400" intensity={3.5} distance={10} position={[0, 0.5, 0]} />
          </group>
        );
      })}

      {/* Espículas de basalto y obsidiana */}
      {basaltSpikes.map((s, i) => {
        const y = heightAt(s.x, s.z);
        return (
          <mesh key={i} position={[s.x, y + s.h / 2, s.z]} castShadow receiveShadow>
            <coneGeometry args={[1.2, s.h, 5]} />
            <meshStandardMaterial color="#1a1816" roughness={0.3} metalness={0.4} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Escenario Bosque Sagrado: Arboledas de bambú gigante, cerezos sakura y camino de toriis */
function ForestScenery() {
  const petalsRef = useRef<THREE.Points>(null);

  // Bambúes gigantes
  const bambooStalks = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let i = 0; i < 35; i++) {
      const a = (i / 35) * Math.PI * 2;
      const r = 18 + (i % 5) * 4;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r + 15;
      if (Math.hypot(x, z - 3) < 12) continue; // dejar casa libre
      arr.push([x, heightAt(x, z), z]);
    }
    return arr;
  }, []);

  // Pétalos flotantes de cerezo sakura
  const petalPositions = useMemo(() => {
    const arr = new Float32Array(250 * 3);
    for (let i = 0; i < 250; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 60;
      arr[i * 3 + 1] = 0.5 + Math.random() * 12;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 60 + 10;
    }
    return arr;
  }, []);

  useFrame((state, delta) => {
    if (petalsRef.current) {
      const attr = petalsRef.current.geometry.attributes["position"];
      if (attr) {
        const arr = attr.array as Float32Array;
        const t = state.clock.elapsedTime;
        for (let i = 0; i < arr.length; i += 3) {
          arr[i + 1] -= delta * 0.7;
          arr[i] += Math.sin(t + i) * delta * 0.4;
          if (arr[i + 1] < 0.2) arr[i + 1] = 12;
        }
        attr.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      {/* Cañas de bambú gigante */}
      {bambooStalks.map(([x, y, z], i) => (
        <group key={i} position={[x, y + 4.5, z]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.22, 0.25, 9, 8]} />
            <meshStandardMaterial color="#4d7c0f" roughness={0.7} />
          </mesh>
          {/* Nudos de bambú */}
          {[-3, -1, 1, 3].map((ny) => (
            <mesh key={ny} position={[0, ny, 0]}>
              <cylinderGeometry args={[0.26, 0.26, 0.12, 8]} />
              <meshStandardMaterial color="#365314" />
            </mesh>
          ))}
        </group>
      ))}

      {/* Pétalos sakura */}
      <points ref={petalsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[petalPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.18} color="#f472b6" transparent opacity={0.8} />
      </points>
    </group>
  );
}

/** Escenario Polar / Nieve: Ventisca de nieve, pinos cargados de escarcha y estatuas Jizo */
function SnowScenery() {
  const jizos = [
    { x: -8, z: 12 },
    { x: 14, z: 16 },
    { x: 5, z: 32 },
  ];

  return (
    <group>
      {/* Estatuas Jizo protectoras de piedra con gorro de nieve */}
      {jizos.map((p, i) => {
        const y = heightAt(p.x, p.z);
        return (
          <group key={i} position={[p.x, y, p.z]}>
            {/* Cuerpo de piedra con babero rojo tradicional */}
            <mesh position={[0, 0.4, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.25, 0.8, 8]} />
              <meshStandardMaterial color="#64748b" />
            </mesh>
            <mesh position={[0, 0.55, 0.15]}>
              <boxGeometry args={[0.28, 0.2, 0.05]} />
              <meshStandardMaterial color="#dc2626" />
            </mesh>
            {/* Cabeza */}
            <mesh position={[0, 0.95, 0]} castShadow>
              <sphereGeometry args={[0.18, 8, 8]} />
              <meshStandardMaterial color="#64748b" />
            </mesh>
            {/* Gorro de nieve acumulada */}
            <mesh position={[0, 1.1, 0]}>
              <sphereGeometry args={[0.19, 8, 6]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.9} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Escenario Urbano / Ruinas: Hormigón, andamios caídos y barriles oxidados */
function UrbanScenery() {
  const debris = [
    { x: -16, z: 14, w: 4, h: 0.6, d: 2.5, rot: 0.3 },
    { x: 12, z: 18, w: 3, h: 0.8, d: 3, rot: -0.4 },
    { x: -8, z: 32, w: 5, h: 0.5, d: 2, rot: 0.7 },
  ];

  const barrels = [
    { x: -12, z: 11 },
    { x: -13, z: 12 },
    { x: 15, z: 20 },
  ];

  return (
    <group>
      {/* Bloques de hormigón agrietado */}
      {debris.map((b, i) => {
        const y = heightAt(b.x, b.z);
        return (
          <mesh key={i} position={[b.x, y + b.h / 2, b.z]} rotation-y={b.rot} castShadow receiveShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color="#475569" roughness={0.95} />
          </mesh>
        );
      })}

      {/* Barriles industriales oxidados */}
      {barrels.map((b, i) => {
        const y = heightAt(b.x, b.z);
        return (
          <mesh key={i} position={[b.x, y + 0.5, b.z]} castShadow receiveShadow>
            <cylinderGeometry args={[0.35, 0.35, 1.0, 10]} />
            <meshStandardMaterial color="#78350f" roughness={0.8} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Escenario Rural: Espantapájaros de paja, carretas de labranza y aperos */
function RuralScenery() {
  const scarecrows = [
    { x: -10, z: 16, rot: 0.2 },
    { x: 12, z: 24, rot: -0.3 },
  ];

  return (
    <group>
      {scarecrows.map((s, i) => {
        const y = heightAt(s.x, s.z);
        return (
          <group key={i} position={[s.x, y, s.z]} rotation-y={s.rot}>
            {/* Poste central y brazos de madera */}
            <mesh position={[0, 1.1, 0]} castShadow>
              <cylinderGeometry args={[0.05, 0.06, 2.2, 6]} />
              <meshStandardMaterial color="#713f12" />
            </mesh>
            <mesh position={[0, 1.4, 0]} rotation-z={Math.PI / 2} castShadow>
              <cylinderGeometry args={[0.04, 0.04, 1.4, 6]} />
              <meshStandardMaterial color="#713f12" />
            </mesh>
            {/* Cuerpo de paja */}
            <mesh position={[0, 1.2, 0]} castShadow>
              <capsuleGeometry args={[0.18, 0.5, 4, 6]} />
              <meshStandardMaterial color="#ca8a04" roughness={1} />
            </mesh>
            {/* Cabeza y sombrero kasa */}
            <mesh position={[0, 1.7, 0]} castShadow>
              <sphereGeometry args={[0.14, 6, 6]} />
              <meshStandardMaterial color="#eab308" />
            </mesh>
            <mesh position={[0, 1.82, 0]} castShadow>
              <coneGeometry args={[0.35, 0.12, 8]} />
              <meshStandardMaterial color="#a16207" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Escenario Montaña: Rocas escarpadas y banderas de plegarias flameando */
function MountainScenery() {
  const rocks = [
    { x: -18, z: 20, s: 3.5 },
    { x: 22, z: 25, s: 4.2 },
    { x: -4, z: 40, s: 5.0 },
  ];

  return (
    <group>
      {rocks.map((r, i) => {
        const y = heightAt(r.x, r.z);
        return (
          <mesh key={i} position={[r.x, y + r.s / 2, r.z]} castShadow receiveShadow>
            <dodecahedronGeometry args={[r.s, 0]} />
            <meshStandardMaterial color="#475569" roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}
