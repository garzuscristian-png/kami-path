import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { PlayerHandle } from "./Player";
import { heightAt } from "./terrain";
import { ZONES } from "./Village";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export type LootKind = "comida" | "medicina" | "chatarra" | "reliquia";

const KIND_COLOR: Record<LootKind, string> = {
  comida: "#c8a23e",
  medicina: "#5fbfa0",
  chatarra: "#9aa3ad",
  reliquia: "#d06a3c",
};

export interface LootSpawn {
  id: number;
  kind: LootKind;
  pos: [number, number, number];
  zone: string;
}

/** Reparte botín dentro de las zonas habitadas. */
export function useLootSpawns(): LootSpawn[] {
  return useMemo(() => {
    const r = rng(90210);
    const out: LootSpawn[] = [];
    let id = 0;
    for (const zone of ZONES) {
      const count = zone.id === "templo" ? 7 : 8;
      for (let i = 0; i < count; i++) {
        const a = r() * Math.PI * 2;
        const d = zone.radius * (0.2 + r() * 0.8);
        const x = zone.center[0] + Math.cos(a) * d;
        const z = zone.center[2] + Math.sin(a) * d;
        const y = heightAt(x, z);
        if (y < 0.2) continue;
        const roll = r();
        const kind: LootKind =
          zone.id === "templo"
            ? roll > 0.55
              ? "reliquia"
              : "medicina"
            : roll > 0.66
              ? "comida"
              : roll > 0.33
                ? "chatarra"
                : "medicina";
        out.push({ id: id++, kind, pos: [x, y + 0.3, z], zone: zone.id });
      }
    }
    return out;
  }, []);
}

export function LootItem({
  spawn,
  player,
  onLoot,
}: {
  spawn: LootSpawn;
  player: PlayerHandle;
  onLoot: (kind: LootKind) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const [taken, setTaken] = useState(false);
  const [near, setNear] = useState(false);
  const done = useRef(false);

  const take = () => {
    if (done.current) return;
    done.current = true;
    setTaken(true);
    document.body.style.cursor = "auto";
    onLoot(spawn.kind);
  };

  useFrame((state) => {
    const g = ref.current;
    if (!g || done.current) return;
    g.rotation.y += 0.012;
    g.position.y =
      spawn.pos[1] + Math.sin(state.clock.elapsedTime * 1.8 + spawn.id) * 0.07;
    const dx = player.position.x - spawn.pos[0];
    const dz = player.position.z - spawn.pos[2];
    const d2 = dx * dx + dz * dz;
    const isNear = d2 < 3.2;
    if (isNear !== near) setNear(isNear);
    if (d2 < 2.25) take();
  });

  if (taken) return null;
  const color = KIND_COLOR[spawn.kind];

  return (
    <group
      ref={ref}
      position={spawn.pos}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        take();
      }}
    >
      <mesh castShadow rotation={[0.3, 0, 0.2]}>
        {spawn.kind === "reliquia" ? (
          <octahedronGeometry args={[0.26, 0]} />
        ) : spawn.kind === "medicina" ? (
          <boxGeometry args={[0.34, 0.22, 0.24]} />
        ) : spawn.kind === "comida" ? (
          <cylinderGeometry args={[0.16, 0.16, 0.3, 10]} />
        ) : (
          <dodecahedronGeometry args={[0.22, 0]} />
        )}
        <meshStandardMaterial
          color={color}
          emissive={new THREE.Color(color)}
          emissiveIntensity={near ? 1.1 : 0.45}
          roughness={0.55}
          metalness={0.25}
        />
      </mesh>
      {near && (
        <pointLight distance={3.5} intensity={3} color={color} position={[0, 0.25, 0]} />
      )}
    </group>
  );
}
