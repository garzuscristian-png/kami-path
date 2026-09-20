import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { PlayerHandle } from "./Player";
import type { Biome } from "@/lib/game/nodes";
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
  name?: string;
}

/** Reparte botín temático según la naturaleza y fauna del bioma activo. */
export function useLootSpawns(biome: Biome = "coast", seed: number = 90210): LootSpawn[] {
  return useMemo(() => {
    const r = rng(seed + 42);
    const out: LootSpawn[] = [];
    let id = 0;

    for (const zone of ZONES) {
      const count = zone.id === "templo" ? 8 : 10;
      for (let i = 0; i < count; i++) {
        const a = r() * Math.PI * 2;
        const d = zone.radius * (0.2 + r() * 0.8);
        const x = zone.center[0] + Math.cos(a) * d;
        const z = zone.center[2] + Math.sin(a) * d;
        const y = heightAt(x, z);
        if (y < 0.2) continue;

        const roll = r();
        let kind: LootKind = "chatarra";
        let name = "Chatarra";

        if (biome === "volcanic") {
          // Abundante obsidiana y azufre
          if (roll > 0.6) {
            kind = "reliquia";
            name = "Cristal de Obsidiana";
          } else if (roll > 0.25) {
            kind = "chatarra";
            name = "Acero Fundido y Azufre";
          } else {
            kind = "comida";
            name = "Carne Ahumada";
          }
        } else if (biome === "forest") {
          // Abundantes hierbas medicinales y reliquias Shinto
          if (roll > 0.55) {
            kind = "medicina";
            name = "Hierbas de Arashiyama";
          } else if (roll > 0.3) {
            kind = "reliquia";
            name = "Amuleto Shinto";
          } else {
            kind = "comida";
            name = "Brotes de Bambú";
          }
        } else if (biome === "snow") {
          // Pieles, hielo sagrado y pescado
          if (roll > 0.6) {
            kind = "comida";
            name = "Pescado de Hielo";
          } else if (roll > 0.3) {
            kind = "medicina";
            name = "Bálsamo Térmico";
          } else {
            kind = "reliquia";
            name = "Cristal de Escarcha";
          }
        } else if (biome === "urban") {
          // Abundante chatarra industrial y raciones
          if (roll > 0.4) {
            kind = "chatarra";
            name = "Componentes Eléctricos";
          } else if (roll > 0.15) {
            kind = "comida";
            name = "Ración Militar Sellada";
          } else {
            kind = "medicina";
            name = "Inyector Médico";
          }
        } else if (biome === "rural") {
          // Abundante comida
          if (roll > 0.45) {
            kind = "comida";
            name = "Saco de Arroz Tradicional";
          } else if (roll > 0.2) {
            kind = "chatarra";
            name = "Herramienta de Forja";
          } else {
            kind = "medicina";
            name = "Cataplasma de Campo";
          }
        } else {
          // Costa por defecto
          if (zone.id === "templo") {
            kind = roll > 0.5 ? "reliquia" : "medicina";
            name = kind === "reliquia" ? "Concha Sagrada" : "Algas Medicinales";
          } else {
            kind = roll > 0.66 ? "comida" : roll > 0.33 ? "chatarra" : "medicina";
            name = kind === "comida" ? "Pescado Seco" : kind === "chatarra" ? "Restos de Red" : "Medicina";
          }
        }

        out.push({ id: id++, kind, pos: [x, y + 0.3, z], zone: zone.id, name });
      }
    }
    return out;
  }, [biome, seed]);
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
      onClick={(e) => {
        e.stopPropagation();
        take();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setNear(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setNear(false);
        document.body.style.cursor = "auto";
      }}
    >
      <mesh castShadow>
        <boxGeometry args={[0.34, 0.34, 0.34]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={near ? 0.9 : 0.3}
          roughness={0.4}
        />
      </mesh>
      {near && (
        <pointLight color={color} intensity={2.5} distance={3.5} position={[0, 0.2, 0]} />
      )}
    </group>
  );
}
