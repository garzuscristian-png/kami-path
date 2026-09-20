import {
  Cloud,
  Clouds,
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  OrbitControls,
  Sky,
  Stars,
} from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Player, type PlayerHandle } from "./Player";
import { Zombie, type ZombieSpawn, type ZombieArchetype } from "./Zombie";
import { Shelter } from "./Shelter";
import { Defenses, type PlacedDefense } from "./Defenses";
import { CoopTeammate } from "./CoopTeammate";
import { BiomeScenery } from "./BiomeScenery";
import type { PartnerState } from "@/lib/game/coop";
import { createAshSandTexture, createStoneTexture, createWoodTexture } from "./textures";
import { createTerrainGeometry, heightAt } from "./terrain";
import { Trees } from "./Trees";
import { Village } from "./Village";
import { LootItem, useLootSpawns, type LootKind } from "./Loot";
import { BIOME_THEMES } from "@/lib/game/biomes";
import type { Biome } from "@/lib/game/nodes";
import { useWorld } from "./WorldContext";
import { ProceduralLandscape } from "./ProceduralLandscape";
import { isClear } from "./WorldCollisions";

const SEA_LEVEL = -0.35;
const HOME_X = 0;
const HOME_Z = 3;
const HOME_RADIUS = 9.5;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function Terrain({ sand, color = "#ece3d0" }: { sand: THREE.Texture; color?: string }) {
  const { height } = useWorld();
  const geometry = useMemo(() => createTerrainGeometry(height), [height]);
  return (
    <mesh geometry={geometry} position={[0, -0.02, 0]} receiveShadow>
      <meshStandardMaterial map={sand} roughness={1} color={color} vertexColors />
    </mesh>
  );
}

function Sea() {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, SEA_LEVEL, -60]}>
      <planeGeometry args={[320, 240]} />
      <MeshReflectorMaterial
        resolution={512}
        mixBlur={1}
        mixStrength={6}
        blur={[300, 60]}
        roughness={0.85}
        depthScale={1.1}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.3}
        color="#2b3b42"
        metalness={0.4}
      />
    </mesh>
  );
}

function Dock({ wood }: { wood: THREE.Texture }) {
  const planks = useMemo(() => {
    const r = rng(1001);
    return Array.from({ length: 22 }, (_, i) => ({
      z: -1 - i * 0.62,
      tilt: (r() - 0.5) * 0.02,
      shade: 0.85 + r() * 0.3,
    }));
  }, []);

  return (
    <group>
      {planks.map((p, i) => (
        <mesh key={i} position={[0, 0.42, p.z]} rotation-z={p.tilt} castShadow receiveShadow>
          <boxGeometry args={[4.2, 0.12, 0.52]} />
          <meshStandardMaterial
            map={wood}
            roughness={0.9}
            color={new THREE.Color(p.shade * 0.85, p.shade * 0.78, p.shade * 0.7)}
          />
        </mesh>
      ))}
      {[-1.8, 1.8].map((x) => (
        <mesh key={x} position={[x, 0.3, -7.5]} castShadow>
          <boxGeometry args={[0.25, 0.25, 14]} />
          <meshStandardMaterial map={wood} roughness={0.9} color="#6b5540" />
        </mesh>
      ))}
      {Array.from({ length: 8 }).map((_, i) => {
        const z = -1.5 - i * 1.8;
        return [-1.8, 1.8].map((x) => (
          <mesh key={`${i}-${x}`} position={[x, -0.6, z]} castShadow>
            <cylinderGeometry args={[0.16, 0.19, 2.4, 8]} />
            <meshStandardMaterial map={wood} roughness={1} color="#4a3a2b" />
          </mesh>
        ));
      })}
    </group>
  );
}

function Crates({ wood, stone }: { wood: THREE.Texture; stone: THREE.Texture }) {
  const items = useMemo(() => {
    const r = rng(77);
    return Array.from({ length: 9 }, () => ({
      pos: [(r() - 0.5) * 9, 0, 1 + r() * 7] as [number, number, number],
      rot: r() * Math.PI,
      s: 0.5 + r() * 0.45,
      barrel: r() > 0.6,
    }));
  }, []);

  return (
    <group>
      {items.map((it, i) => (
        <mesh
          key={i}
          position={[it.pos[0], it.s / 2, it.pos[2]]}
          rotation-y={it.rot}
          castShadow
          receiveShadow
        >
          {it.barrel ? (
            <cylinderGeometry args={[it.s * 0.45, it.s * 0.45, it.s, 12]} />
          ) : (
            <boxGeometry args={[it.s, it.s, it.s]} />
          )}
          <meshStandardMaterial
            map={it.barrel ? stone : wood}
            roughness={0.85}
            color={it.barrel ? "#6d6a62" : "#7a624a"}
          />
        </mesh>
      ))}
    </group>
  );
}

function Torii() {
  const mat = <meshStandardMaterial color="#6e2320" roughness={0.7} metalness={0.05} />;
  return (
    <group position={[-7.5, SEA_LEVEL, -12]} rotation-y={0.25}>
      {[-1.5, 1.5].map((x) => (
        <mesh key={x} position={[x, 1.6, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.2, 3.6, 10]} />
          {mat}
        </mesh>
      ))}
      <mesh position={[0, 3.5, 0]} castShadow>
        <boxGeometry args={[4.4, 0.22, 0.35]} />
        {mat}
      </mesh>
      <mesh position={[0, 3.05, 0]} castShadow>
        <boxGeometry args={[3.4, 0.16, 0.28]} />
        {mat}
      </mesh>
    </group>
  );
}

function Volcano() {
  const smokeRef = useRef<THREE.Points>(null);
  const smoke = useMemo(() => {
    const r = rng(9);
    const positions = new Float32Array(160 * 3);
    for (let i = 0; i < 160; i++) {
      positions[i * 3] = (r() - 0.5) * 10;
      positions[i * 3 + 1] = 14 + r() * 16;
      positions[i * 3 + 2] = (r() - 0.5) * 6;
    }
    return positions;
  }, []);

  useFrame((_, delta) => {
    const pts = smokeRef.current;
    if (!pts) return;
    const attr = pts.geometry.attributes["position"];
    if (!attr) return;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] += delta * 0.5;
      arr[i] += delta * 0.35;
      if (arr[i + 1] > 32) {
        arr[i + 1] = 14;
        arr[i] = (Math.random() - 0.5) * 6;
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <group position={[-14, SEA_LEVEL, -58]}>
      <mesh>
        <coneGeometry args={[26, 16, 24]} />
        <meshStandardMaterial color="#2f3138" roughness={1} />
      </mesh>
      <points ref={smokeRef} position={[0, 0, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[smoke, 3]} />
        </bufferGeometry>
        <pointsMaterial size={3.2} color="#6b6a68" transparent opacity={0.28} depthWrite={false} />
      </points>
    </group>
  );
}

function BiomeParticles({
  color = "#cfc7ba",
  size = 0.07,
  speedY = -0.5,
}: {
  color?: string;
  size?: number;
  speedY?: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const r = rng(42);
    const arr = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      arr[i * 3] = (r() - 0.5) * 50;
      arr[i * 3 + 1] = r() * 18;
      arr[i * 3 + 2] = (r() - 0.5) * 50 - 5;
    }
    return arr;
  }, []);

  useFrame((state, delta) => {
    const pts = ref.current;
    if (!pts) return;
    const attr = pts.geometry.attributes["position"];
    if (!attr) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] += dt * speedY;
      arr[i] += Math.sin(t * 0.4 + i) * dt * 0.25;
      if (speedY < 0 && arr[i + 1] < -0.5) arr[i + 1] = 18;
      else if (speedY > 0 && arr[i + 1] > 18) arr[i + 1] = -0.5;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={size} color={color} transparent opacity={0.65} depthWrite={false} />
    </points>
  );
}

function NightFireflies() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const r = rng(999);
    const arr = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i++) {
      arr[i * 3] = (r() - 0.5) * 55;
      arr[i * 3 + 1] = 0.5 + r() * 5.5;
      arr[i * 3 + 2] = (r() - 0.5) * 55;
    }
    return arr;
  }, []);

  useFrame((state, delta) => {
    const pts = ref.current;
    if (!pts) return;
    const attr = pts.geometry.attributes["position"];
    if (!attr) return;
    const t = state.clock.elapsedTime;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] += Math.sin(t * 1.5 + i) * delta * 0.4;
      arr[i] += Math.cos(t * 0.8 + i) * delta * 0.3;
      arr[i + 2] += Math.sin(t * 0.9 + i) * delta * 0.3;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.16} color="#d8f878" transparent opacity={0.85} depthWrite={false} />
    </points>
  );
}

function Moon() {
  return (
    <group position={[-42, 48, -75]}>
      <mesh>
        <sphereGeometry args={[7.5, 24, 24]} />
        <meshBasicMaterial color="#f0f5ff" />
      </mesh>
      <mesh>
        <sphereGeometry args={[8.8, 16, 16]} />
        <meshBasicMaterial color="#9ec5ff" transparent opacity={0.18} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function HomeSafeWard() {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.28 + Math.sin(state.clock.elapsedTime * 2) * 0.12;
      }
    }
  });

  const posts = useMemo(() => {
    const out: [number, number][] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      out.push([HOME_X + Math.cos(angle) * HOME_RADIUS, HOME_Z + Math.sin(angle) * HOME_RADIUS]);
    }
    return out;
  }, []);

  return (
    <group>
      <mesh ref={ringRef} rotation-x={-Math.PI / 2} position={[HOME_X, 0.04, HOME_Z]}>
        <ringGeometry args={[HOME_RADIUS - 0.2, HOME_RADIUS + 0.2, 48]} />
        <meshBasicMaterial color="#5bc0be" transparent opacity={0.35} />
      </mesh>

      {posts.map(([x, z], i) => {
        const y = heightAt(x, z);
        return (
          <group key={i} position={[x, y, z]}>
            <mesh position={[0, 0.6, 0]} castShadow>
              <cylinderGeometry args={[0.06, 0.08, 1.2, 6]} />
              <meshStandardMaterial color="#6a4c35" />
            </mesh>
            <mesh position={[0, 1.1, 0]}>
              <boxGeometry args={[0.18, 0.26, 0.18]} />
              <meshStandardMaterial color="#e0fbfc" emissive="#48cae4" emissiveIntensity={1.8} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Driftwood({
  position,
  onCollect,
  player,
}: {
  position: [number, number, number];
  onCollect: () => void;
  player: PlayerHandle;
}) {
  const ref = useRef<THREE.Group>(null);
  const [taken, setTaken] = useState(false);
  const [hover, setHover] = useState(false);
  const collected = useRef(false);

  const collect = () => {
    if (
      collected.current ||
      Math.hypot(player.position.x - position[0], player.position.z - position[2]) > 1.8
    )
      return;
    collected.current = true;
    setTaken(true);
    document.body.style.cursor = "auto";
    onCollect();
  };

  useFrame((state) => {
    if (ref.current && !collected.current) {
      ref.current.position.y =
        position[1] + Math.sin(state.clock.elapsedTime * 1.6 + position[0]) * 0.06;
      const dx = player.position.x - position[0];
      const dz = player.position.z - position[2];
      const d2 = dx * dx + dz * dz;
      const near = d2 < 2.6;
      if (near !== hover) setHover(near);
      if (d2 < 2.25) collect();
    }
  });

  if (taken) return null;

  return (
    <group
      ref={ref}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        collect();
      }}
    >
      <mesh rotation={[0.2, 0.6, 1.4]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.7, 6]} />
        <meshStandardMaterial
          color={hover ? "#c8a06a" : "#6b5740"}
          emissive={hover ? "#7a5a20" : "#211a10"}
          emissiveIntensity={hover ? 0.6 : 0.25}
          roughness={0.9}
        />
      </mesh>
      {hover && <pointLight distance={2.6} intensity={3} color="#e0a860" position={[0, 0.2, 0]} />}
    </group>
  );
}

function FollowCamera({ player }: { player: PlayerHandle }) {
  const ref = useRef<any>(null);
  useFrame(() => {
    const c = ref.current;
    if (!c) return;
    c.target.lerp(
      new THREE.Vector3(player.position.x, player.position.y + 1.2, player.position.z),
      0.15,
    );
    c.update();
  });
  return (
    <OrbitControls
      ref={ref}
      maxPolarAngle={Math.PI / 2.1}
      minDistance={3}
      maxDistance={14}
      enablePan={false}
    />
  );
}

function Horizon() {
  const islands = useMemo(() => {
    const r = rng(555);
    return Array.from({ length: 16 }, () => {
      const a = r() * Math.PI * 2;
      const d = 95 + r() * 60;
      return {
        pos: [Math.cos(a) * d, SEA_LEVEL - 1, Math.sin(a) * d] as [number, number, number],
        radius: 12 + r() * 30,
        height: 8 + r() * 26,
        seg: 5 + Math.floor(r() * 4),
        rot: r() * Math.PI,
        tint: 0.32 + r() * 0.16,
      };
    });
  }, []);

  return (
    <group>
      {islands.map((is, i) => (
        <mesh key={i} position={is.pos} rotation-y={is.rot}>
          <coneGeometry args={[is.radius, is.height, is.seg]} />
          <meshStandardMaterial
            color={new THREE.Color(is.tint * 0.9, is.tint * 0.95, is.tint * 1.15)}
            roughness={1}
            fog
          />
        </mesh>
      ))}
    </group>
  );
}
export function KagoshimaScene({
  biome = "coast",
  danger = 1,
  seed = 1001,
  onCollect,
  onHit,
  onLoot,
  onKillZombie,
  onStaminaChange,
  onPlayerMove,
  damagePerHit = 1,
  shelterLevel = 0,
  defenses = [],
  partner = null,
  isNight = false,
  onOpenShelterUpgrade,
  onTriggerTrap,
}: {
  biome?: Biome;
  danger?: number;
  seed?: number;
  onCollect: () => void;
  onHit: () => void;
  onLoot: (kind: LootKind) => void;
  onKillZombie?: (id: number) => void;
  onStaminaChange?: (stamina: number) => void;
  onPlayerMove?: (x: number, z: number, angle: number) => void;
  damagePerHit?: number;
  shelterLevel?: number;
  defenses?: PlacedDefense[];
  partner?: PartnerState | null;
  isNight?: boolean;
  onOpenShelterUpgrade?: () => void;
  onTriggerTrap?: (trapId: string, zombieId: number) => void;
}) {
  const { height: heightAt, obstacles } = useWorld();
  const theme = BIOME_THEMES[biome] ?? BIOME_THEMES.coast;
  const loot = useLootSpawns(biome, seed);
  const player = useMemo<PlayerHandle>(
    () => ({
      position: new THREE.Vector3(0, 0, 3),
      rotationY: 0,
      isAttacking: false,
      attackId: 0,
    }),
    [],
  );
  const sand = useMemo(() => createAshSandTexture(), []);
  const wood = useMemo(() => createWoodTexture(), []);
  const stone = useMemo(() => createStoneTexture(), []);

  const drifts = useMemo(() => {
    const r = rng(seed + 2024);
    return Array.from({ length: 36 }, (_, i) => {
      const onDock = biome === "coast" && i % 3 === 0;
      const x = onDock ? (r() - 0.5) * 3 : (r() - 0.5) * 34;
      const z = onDock ? -2 - r() * 10 : 1 + r() * 20;
      return {
        id: i,
        pos: [x, onDock ? 0.6 : heightAt(x, z) + 0.18, z] as [number, number, number],
      };
    }).filter((d) => isClear(d.pos[0], d.pos[2], 0.8, obstacles));
  }, [seed, biome, heightAt, obstacles]);

  const zombies = useMemo<ZombieSpawn[]>(() => {
    const r = rng(seed + 3131);
    const count = Math.min(22, Math.max(8, 8 + danger * 2));
    const out: ZombieSpawn[] = [];
    let guard = 0;
    while (out.length < count && guard < 600) {
      guard++;
      const x = (r() - 0.5) * 88;
      const z = 2 + r() * 52;
      if (Math.hypot(x - HOME_X, z - HOME_Z) < HOME_RADIUS + 3) continue;
      if (!isClear(x, z, 1.2, obstacles) || heightAt(x, z) < 0) continue;

      const idx = out.length;
      let archetype: ZombieArchetype = "normal";
      let maxHealth = 3;
      let name = "Caminante";

      if (idx === 0 && danger >= 4) {
        archetype = "boss";
        maxHealth = 12;
        name = "Kensei Corrupto (Jefe)";
      } else if (biome === "volcanic") {
        archetype = "volcanic_crawler";
        maxHealth = 4;
        name = "Rastreador de Cenizas";
      } else if (biome === "forest") {
        archetype = idx % 2 === 0 ? "armored_samurai" : "normal";
        maxHealth = idx % 2 === 0 ? 6 : 3;
        name = idx % 2 === 0 ? "Samurái Acorazado" : "Errante del Bosque";
      } else if (biome === "snow") {
        archetype = idx % 2 === 0 ? "frost_wendigo" : "normal";
        maxHealth = idx % 2 === 0 ? 5 : 3;
        name = idx % 2 === 0 ? "Wendigo Glacial" : "Cuerpo Congelado";
      } else if (biome === "urban") {
        archetype = idx % 2 === 0 ? "toxic_mutant" : "normal";
        maxHealth = idx % 2 === 0 ? 5 : 3;
        name = idx % 2 === 0 ? "Mutante Radiactivo" : "Carroñero Urbano";
      } else if (biome === "mountain") {
        archetype = idx % 3 === 0 ? "armored_samurai" : "normal";
        maxHealth = idx % 3 === 0 ? 6 : 3;
        name = idx % 3 === 0 ? "Guardia Ronin" : "Espíritu de Piedra";
      } else if (biome === "rural") {
        archetype = idx % 3 === 0 ? "volcanic_crawler" : "normal";
        maxHealth = 3;
        name = "Espantapájaros Maldito";
      }

      out.push({
        id: idx,
        origin: [x, 0, z],
        seed: r() * 6.28,
        archetype,
        maxHealth,
        name,
      });
    }
    return out;
  }, [biome, danger, seed]);

  return (
    <>
      <color attach="background" args={[theme.background]} />
      <fog attach="fog" args={[theme.fogColor, theme.fogNear, theme.fogFar]} />
      <Sky
        distance={4500}
        sunPosition={isNight ? [0, -40, -60] : theme.skySun}
        turbidity={theme.skyTurbidity}
        rayleigh={theme.skyRayleigh}
        mieCoefficient={0.02}
        mieDirectionalG={0.85}
        inclination={0.49}
        azimuth={0.25}
      />
      <Stars radius={300} depth={60} count={900} factor={5} fade speed={0.4} />
      <Clouds material={THREE.MeshBasicMaterial} limit={200}>
        <Cloud
          seed={7}
          bounds={[90, 8, 40]}
          volume={26}
          segments={26}
          position={[0, 26, -70]}
          color="#c9bdb3"
          opacity={0.5}
          speed={0.08}
        />
      </Clouds>
      <Horizon />

      <hemisphereLight args={[theme.hemiSky, theme.hemiGround, isNight ? 0.3 : 2.1]} />
      <directionalLight
        position={[12, 10, -6]}
        intensity={isNight ? 0.15 : theme.dirLightIntensity}
        color={theme.dirLightColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <Environment environmentIntensity={isNight ? 0.12 : 1}>
        <Lightformer intensity={1.4} position={[0, 8, -10]} scale={[20, 8, 1]} color="#ffb98a" />
        <Lightformer
          intensity={0.8}
          color="#8fb3c8"
          position={[-8, 3, 4]}
          rotation-y={Math.PI / 2}
          scale={[20, 4, 1]}
        />
      </Environment>

      <Terrain sand={sand} color={theme.groundColor} />
      <ProceduralLandscape />
      <HomeSafeWard />
      {biome === "coast" && (
        <>
          <Sea />
          <Dock wood={wood} />
        </>
      )}
      {biome === "volcanic" && <Volcano />}
      <BiomeParticles
        color={theme.particleColor}
        size={theme.particleSize}
        speedY={theme.particleSpeedY}
      />

      <Shelter
        level={shelterLevel}
        player={player}
        onOpenUpgrade={onOpenShelterUpgrade}
        isNight={isNight}
      />

      <Defenses defenses={defenses} onTriggerTrap={onTriggerTrap} />

      <CoopTeammate partner={partner} />

      <Player
        handle={player}
        defenses={defenses}
        shelterLevel={shelterLevel}
        onStaminaChange={onStaminaChange}
        onPlayerMove={onPlayerMove}
      />

      {zombies.map((z) => (
        <Zombie
          key={z.id}
          spawn={z}
          player={player}
          damagePerHit={damagePerHit}
          isNight={isNight}
          defenses={defenses}
          onTriggerTrap={onTriggerTrap}
          onCatch={onHit}
          onKill={onKillZombie}
        />
      ))}

      {drifts.map((d) => (
        <Driftwood key={d.id} position={d.pos} onCollect={onCollect} player={player} />
      ))}

      {loot.map((l) => (
        <LootItem key={l.id} spawn={l} player={player} onLoot={onLoot} />
      ))}

      <FollowCamera player={player} />
    </>
  );
}
