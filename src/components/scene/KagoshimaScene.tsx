import { Environment, Lightformer, OrbitControls, MeshReflectorMaterial } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  createAshSandTexture,
  createStoneTexture,
  createWoodTexture,
} from "./textures";

const SEA_LEVEL = -0.35;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function Ground({ sand }: { sand: THREE.Texture }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 6]} receiveShadow>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial map={sand} roughness={1} color="#c9c0af" />
    </mesh>
  );
}

function Sea() {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, SEA_LEVEL, -16]}>
      <planeGeometry args={[160, 120]} />
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
        <mesh
          key={i}
          position={[0, 0.42, p.z]}
          rotation-z={p.tilt}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[4.2, 0.12, 0.52]} />
          <meshStandardMaterial
            map={wood}
            roughness={0.9}
            color={new THREE.Color(p.shade * 0.85, p.shade * 0.78, p.shade * 0.7)}
          />
        </mesh>
      ))}
      {/* vigas longitudinales */}
      {[-1.8, 1.8].map((x) => (
        <mesh key={x} position={[x, 0.3, -7.5]} castShadow>
          <boxGeometry args={[0.25, 0.25, 14]} />
          <meshStandardMaterial map={wood} roughness={0.9} color="#6b5540" />
        </mesh>
      ))}
      {/* pilotes */}
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
      pos: [
        (r() - 0.5) * 9,
        0,
        1 + r() * 7,
      ] as [number, number, number],
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
  const mat = (
    <meshStandardMaterial color="#6e2320" roughness={0.7} metalness={0.05} />
  );
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
      arr[i + 1]! += delta * 0.5;
      arr[i]! += delta * 0.35;
      if (arr[i + 1]! > 32) {
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
        <pointsMaterial
          size={3.2}
          color="#6b6a68"
          transparent
          opacity={0.28}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

function AshParticles() {
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
      arr[i + 1]! -= dt * 0.5;
      arr[i]! += Math.sin(t * 0.4 + i) * dt * 0.25;
      if (arr[i + 1]! < -0.5) arr[i + 1] = 18;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.07}
        color="#cfc7ba"
        transparent
        opacity={0.55}
        depthWrite={false}
      />
    </points>
  );
}

function Driftwood({
  position,
  onCollect,
}: {
  position: [number, number, number];
  onCollect: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const [taken, setTaken] = useState(false);
  const [hover, setHover] = useState(false);

  useFrame((state) => {
    if (ref.current && !taken) {
      ref.current.position.y =
        position[1] + Math.sin(state.clock.elapsedTime * 1.6 + position[0]) * 0.06;
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
        setTaken(true);
        document.body.style.cursor = "auto";
        onCollect();
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
      <pointLight
        distance={2.4}
        intensity={hover ? 3 : 1.2}
        color="#e0a860"
        position={[0, 0.2, 0]}
      />
    </group>
  );
}

export function KagoshimaScene({ onCollect }: { onCollect: () => void }) {
  const sand = useMemo(() => createAshSandTexture(), []);
  const wood = useMemo(() => createWoodTexture(), []);
  const stone = useMemo(() => createStoneTexture(), []);

  const drifts = useMemo(() => {
    const r = rng(2024);
    return Array.from({ length: 12 }, (_, i) => {
      const onDock = i % 3 === 0;
      return {
        id: i,
        pos: [
          onDock ? (r() - 0.5) * 3 : (r() - 0.5) * 16,
          onDock ? 0.6 : 0.18,
          onDock ? -2 - r() * 10 : 1 + r() * 9,
        ] as [number, number, number],
      };
    });
  }, []);

  return (
    <>
      <color attach="background" args={["#5a5c68"]} />
      <fog attach="fog" args={["#5a5c68", 20, 75]} />

      <hemisphereLight args={["#aab0c0", "#4a4238", 1.15]} />
      <directionalLight
        position={[12, 10, -6]}
        intensity={3.2}
        color="#ffc18f"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <Environment>
        <Lightformer intensity={1.4} position={[0, 8, -10]} scale={[20, 8, 1]} color="#ffb98a" />
        <Lightformer
          intensity={0.8}
          color="#8fb3c8"
          position={[-8, 3, 4]}
          rotation-y={Math.PI / 2}
          scale={[20, 4, 1]}
        />
      </Environment>

      <Ground sand={sand} />
      <Sea />
      <Dock wood={wood} />
      <Crates wood={wood} stone={stone} />
      <Torii />
      <Volcano />
      <AshParticles />

      {drifts.map((d) => (
        <Driftwood key={d.id} position={d.pos} onCollect={onCollect} />
      ))}

      <OrbitControls
        target={[0, 1, -2]}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={4}
        maxDistance={30}
        enablePan={false}
      />
    </>
  );
}
