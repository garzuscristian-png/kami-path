import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { heightAt } from "./terrain";

export interface PlacedDefense {
  id: string;
  kind: "barricada" | "trampa_pinchos";
  x: number;
  z: number;
  rotationY: number;
  health: number;
  isSprung?: boolean;
}

interface DefensesProps {
  defenses: PlacedDefense[];
  onTriggerTrap?: (id: string) => void;
  onDestroyDefense?: (id: string) => void;
}

export function Defenses({
  defenses,
}: DefensesProps) {
  return (
    <group>
      {defenses.map((d) => {
        const y = heightAt(d.x, d.z);
        if (d.kind === "barricada") {
          return (
            <BarricadeMesh
              key={d.id}
              position={[d.x, y, d.z]}
              rotationY={d.rotationY}
              health={d.health}
            />
          );
        }
        return (
          <SpikeTrapMesh
            key={d.id}
            position={[d.x, y, d.z]}
            isSprung={!!d.isSprung}
          />
        );
      })}
    </group>
  );
}

function BarricadeMesh({
  position,
  rotationY,
  health,
}: {
  position: [number, number, number];
  rotationY: number;
  health: number;
}) {
  return (
    <group position={position} rotation-y={rotationY}>
      {/* 4 Estacas de madera afiladas en abanico */}
      {[-0.9, -0.3, 0.3, 0.9].map((x, i) => (
        <mesh
          key={i}
          position={[x, 0.65, 0]}
          rotation-x={0.25 * (i % 2 === 0 ? 1 : -1)}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[0.02, 0.09, 1.4, 6]} />
          <meshStandardMaterial color="#5c4532" roughness={0.9} />
        </mesh>
      ))}

      {/* Travesaño horizontal */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[2.2, 0.12, 0.12]} />
        <meshStandardMaterial color="#423122" roughness={0.9} />
      </mesh>
      {/* Cuerdas de cáñamo */}
      {[-0.6, 0.6].map((x, i) => (
        <mesh key={i} position={[x, 0.55, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.14, 8]} />
          <meshStandardMaterial color="#b39c76" />
        </mesh>
      ))}

      {/* Indicador de integridad si está dañada */}
      {health < 100 && (
        <mesh position={[0, 1.35, 0]}>
          <planeGeometry args={[0.8, 0.08]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      )}
    </group>
  );
}

function SpikeTrapMesh({
  position,
  isSprung,
}: {
  position: [number, number, number];
  isSprung: boolean;
}) {
  return (
    <group position={position}>
      {/* Base de tierra y follaje disimulado */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[1.5, 0.04, 1.5]} />
        <meshStandardMaterial color={isSprung ? "#3d2b1f" : "#4a5d3c"} roughness={1} />
      </mesh>

      {/* Pinchos de bambú afilados */}
      {Array.from({ length: 9 }).map((_, i) => {
        const row = Math.floor(i / 3) - 1;
        const col = (i % 3) - 1;
        return (
          <mesh
            key={i}
            position={[col * 0.4, isSprung ? 0.45 : 0.12, row * 0.4]}
            castShadow
          >
            <coneGeometry args={[0.045, isSprung ? 0.75 : 0.25, 5]} />
            <meshStandardMaterial
              color={isSprung ? "#b53a25" : "#84934e"}
              roughness={0.7}
            />
          </mesh>
        );
      })}

      {/* Destello de activación si fue activada */}
      {isSprung && (
        <pointLight color="#ff4422" distance={2.5} intensity={1.8} position={[0, 0.3, 0]} />
      )}
    </group>
  );
}
