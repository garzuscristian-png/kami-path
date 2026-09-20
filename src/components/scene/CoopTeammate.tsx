import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { PartnerState } from "@/lib/game/coop";
import { heightAt } from "./terrain";

interface CoopTeammateProps {
  partner: PartnerState | null;
}

export function CoopTeammate({ partner }: CoopTeammateProps) {
  const group = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Mesh>(null);
  const legR = useRef<THREE.Mesh>(null);
  const armR = useRef<THREE.Group>(null);
  const swordRef = useRef<THREE.Mesh>(null);

  const phase = useRef(0);
  const slashAnim = useRef(0);
  const lastAttackId = useRef(-1);

  useFrame((state, delta) => {
    if (!partner || !group.current) return;

    const g = group.current;
    // Interpolación suave hacia la posición del compañero
    g.position.x = THREE.MathUtils.lerp(g.position.x, partner.x, 0.2);
    g.position.z = THREE.MathUtils.lerp(g.position.z, partner.z, 0.2);
    g.position.y = Math.max(0, heightAt(g.position.x, g.position.z));

    // Rotación suave hacia el ángulo del compañero
    let diff = partner.rotationY - g.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    g.rotation.y += diff * 0.25;

    // Animación de carrera / paso
    const isMoving = partner.status === "explorando" || Math.abs(diff) > 0.05;
    if (isMoving) {
      phase.current += delta * 9;
      const swing = Math.sin(phase.current) * 0.35;
      if (legL.current) legL.current.rotation.x = swing;
      if (legR.current) legR.current.rotation.x = -swing;
    } else {
      if (legL.current) legL.current.rotation.x = 0;
      if (legR.current) legR.current.rotation.x = 0;
    }

    // Animación de ataque con katana
    if (partner.isAttacking && partner.attackId !== lastAttackId.current) {
      lastAttackId.current = partner.attackId;
      slashAnim.current = 1.0;
    }

    if (slashAnim.current > 0) {
      slashAnim.current = Math.max(0, slashAnim.current - delta * 4);
      if (armR.current) {
        armR.current.rotation.x = -Math.PI / 2 + Math.sin(slashAnim.current * Math.PI) * 1.5;
        armR.current.rotation.y = Math.cos(slashAnim.current * Math.PI) * 0.8;
      }
    } else {
      if (armR.current) {
        armR.current.rotation.set(0, 0, 0);
      }
    }
  });

  if (!partner) return null;

  return (
    <group ref={group} position={[partner.x, 0, partner.z]}>
      {/* Halo de Escuadrón / Aura aliada */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.5, 0.65, 24]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
      </mesh>

      {/* Piernas */}
      <mesh ref={legL} position={[-0.14, 0.45, 0]} castShadow>
        <capsuleGeometry args={[0.08, 0.45, 4, 6]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh ref={legR} position={[0.14, 0.45, 0]} castShadow>
        <capsuleGeometry args={[0.08, 0.45, 4, 6]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* Kimono / Torso de combate (Azul zafiro característico de aliado) */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[0.42, 0.6, 0.28]} />
        <meshStandardMaterial color="#0284c7" roughness={0.7} />
      </mesh>
      {/* Fajín Obi blanco */}
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[0.44, 0.12, 0.3]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>

      {/* Cabeza y Sombrero Kasa */}
      <mesh position={[0, 1.45, 0]} castShadow>
        <sphereGeometry args={[0.15, 10, 8]} />
        <meshStandardMaterial color="#fcd34d" roughness={0.8} />
      </mesh>
      {/* Sombrero de paja tradicional */}
      <mesh position={[0, 1.58, 0]} castShadow>
        <coneGeometry args={[0.38, 0.14, 16]} />
        <meshStandardMaterial color="#b49a6a" roughness={0.9} />
      </mesh>

      {/* Brazo Izquierdo */}
      <mesh position={[-0.28, 1.0, 0]} castShadow>
        <capsuleGeometry args={[0.065, 0.4, 4, 6]} />
        <meshStandardMaterial color="#0284c7" />
      </mesh>

      {/* Brazo Derecho con Katana aliada */}
      <group ref={armR} position={[0.28, 1.1, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <capsuleGeometry args={[0.065, 0.4, 4, 6]} />
          <meshStandardMaterial color="#0284c7" />
        </mesh>
        {/* Katana */}
        <mesh
          ref={swordRef}
          position={[0, -0.38, 0.35]}
          rotation-x={Math.PI / 2}
          castShadow
        >
          <boxGeometry args={[0.04, 0.85, 0.015]} />
          <meshStandardMaterial
            color="#e2e8f0"
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>
      </group>

      {/* Indicador superior con nombre y barra de salud */}
      <group position={[0, 1.95, 0]}>
        {/* Fondo de la barra */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[0.9, 0.12]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>
        {/* Relleno de salud verde/celeste */}
        <mesh
          position={[-0.45 + (partner.health / 100) * 0.45, 0, 0.005]}
        >
          <planeGeometry args={[(partner.health / 100) * 0.88, 0.09]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
      </group>
    </group>
  );
}
