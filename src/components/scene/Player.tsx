import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { heightAt } from "./terrain";
import { resolveCollisions } from "./Collisions";
import { sound } from "@/lib/game/audio";

const SPEED = 4.2;
const ACCEL = 14;
const DAMP = 9;
const ATTACK_DURATION = 0.28;

export interface PlayerHandle {
  position: THREE.Vector3;
  rotationY: number;
  isAttacking: boolean;
  attackId: number;
}

interface PlayerProps {
  handle: PlayerHandle;
  defenses?: { x: number; z: number; kind: string }[];
  shelterLevel?: number;
  onAttack?: () => void;
  onStaminaChange?: (stamina: number) => void;
  onPlayerMove?: (x: number, z: number, angle: number) => void;
}

/** Personaje estilizado low-poly con katana, animaciones y resolución de colisiones sólidas. */
export function Player({
  handle,
  defenses = [],
  shelterLevel = 0,
  onAttack,
  onStaminaChange,
  onPlayerMove,
}: PlayerProps) {
  const group = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Mesh>(null);
  const legR = useRef<THREE.Mesh>(null);
  const armL = useRef<THREE.Mesh>(null);
  const armR = useRef<THREE.Group>(null);

  const keys = useRef<Record<string, boolean>>({});
  const vel = useRef(new THREE.Vector3());
  const phase = useRef(0);
  const { camera } = useThree();

  // Sistema de combate y ataque
  const attackTimer = useRef(0);
  const attackId = useRef(0);
  const [isAttackingMesh, setIsAttackingMesh] = useState(false);

  // Sistema de aguante (stamina)
  const stamina = useRef(100);
  const lastReportedStamina = useRef(100);

  const cloth = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#3d4a55", roughness: 0.85 }),
    [],
  );
  const coat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#8c3b32", roughness: 0.75 }),
    [],
  );
  const skin = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#d8ab86", roughness: 0.7 }),
    [],
  );

  const triggerAttack = () => {
    if (attackTimer.current > 0) return;
    if (stamina.current < 12) return;

    stamina.current = Math.max(0, stamina.current - 12);
    attackTimer.current = ATTACK_DURATION;
    attackId.current++;
    setIsAttackingMesh(true);
    sound.playSlash();
    onAttack?.();
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)
      ) {
        e.preventDefault();
      }
      if (e.code === "Space" || e.code === "KeyF" || e.code === "KeyE") {
        e.preventDefault();
        triggerAttack();
      }
    };

    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    const handlePointerDown = (e: MouseEvent) => {
      if (e.button === 0) {
        triggerAttack();
      }
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const g = group.current;
    if (!g) return;

    const k = keys.current;
    const fwd =
      (k["KeyW"] || k["ArrowUp"] ? 1 : 0) -
      (k["KeyS"] || k["ArrowDown"] ? 1 : 0);
    const side =
      (k["KeyD"] || k["ArrowRight"] ? 1 : 0) -
      (k["KeyA"] || k["ArrowLeft"] ? 1 : 0);

    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0;
    camDir.normalize();
    const right = new THREE.Vector3()
      .crossVectors(camDir, new THREE.Vector3(0, 1, 0))
      .normalize();

    const wish = new THREE.Vector3()
      .addScaledVector(camDir, fwd)
      .addScaledVector(right, side);
    const moving = wish.lengthSq() > 0.0001;
    if (moving) wish.normalize();

    const wantsRun = (k["ShiftLeft"] || k["ShiftRight"]) && moving;
    const canRun = wantsRun && stamina.current > 5;
    const run = canRun ? 1.7 : 1;

    if (canRun) {
      stamina.current = Math.max(0, stamina.current - 22 * dt);
    } else if (!wantsRun && attackTimer.current <= 0) {
      stamina.current = Math.min(100, stamina.current + 25 * dt);
    }

    const roundedStamina = Math.round(stamina.current);
    if (Math.abs(roundedStamina - lastReportedStamina.current) >= 1) {
      lastReportedStamina.current = roundedStamina;
      onStaminaChange?.(roundedStamina);
    }

    const target = wish.multiplyScalar(SPEED * run);
    vel.current.x += (target.x - vel.current.x) * Math.min(1, ACCEL * dt);
    vel.current.z += (target.z - vel.current.z) * Math.min(1, ACCEL * dt);
    if (!moving) {
      const d = Math.exp(-DAMP * dt);
      vel.current.x *= d;
      vel.current.z *= d;
    }

    // Comprobación y resolución de colisiones sólidas con el entorno y barricadas
    const nextX = g.position.x + vel.current.x * dt;
    const nextZ = g.position.z + vel.current.z * dt;
    const [resolvedX, resolvedZ] = resolveCollisions(
      nextX,
      nextZ,
      0.45,
      defenses,
      shelterLevel,
    );

    g.position.x = resolvedX;
    g.position.z = resolvedZ;

    // Altura del terreno
    const onDock = Math.abs(g.position.x) < 2.1 && g.position.z < -0.6;
    const targetY = onDock
      ? 0.48
      : Math.max(heightAt(g.position.x, g.position.z), 0);
    g.position.y += (targetY - g.position.y) * Math.min(1, 10 * dt);

    const speed = Math.hypot(vel.current.x, vel.current.z);
    if (speed > 0.15) {
      const yaw = Math.atan2(vel.current.x, vel.current.z);
      let diff = yaw - g.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      g.rotation.y += diff * Math.min(1, 12 * dt);
    }

    // Animación de caminata
    phase.current += dt * speed * 2.4;
    const swing = Math.sin(phase.current) * Math.min(0.7, speed * 0.22);
    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;
    if (armL.current) armL.current.rotation.x = -swing * 0.8;

    // Animación de ataque con katana
    if (attackTimer.current > 0) {
      attackTimer.current -= dt;
      const t = 1 - Math.max(0, attackTimer.current / ATTACK_DURATION);
      if (armR.current) {
        armR.current.rotation.x = -1.6 + Math.sin(t * Math.PI) * 2.4;
        armR.current.rotation.y = 0.6 - Math.sin(t * Math.PI) * 1.6;
        armR.current.rotation.z = Math.sin(t * Math.PI) * 0.8;
      }
    } else {
      if (isAttackingMesh) setIsAttackingMesh(false);
      if (armR.current) {
        armR.current.rotation.x = swing * 0.8;
        armR.current.rotation.y = 0;
        armR.current.rotation.z = 0;
      }
    }

    handle.position.copy(g.position);
    handle.rotationY = g.rotation.y;
    handle.isAttacking = attackTimer.current > 0;
    handle.attackId = attackId.current;

    onPlayerMove?.(g.position.x, g.position.z, g.rotation.y);
  });

  return (
    <group ref={group} position={[0, 0, 3]}>
      {/* Sombra proyectada */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0.03, 0]}
        material={new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.35 })}
      >
        <circleGeometry args={[0.38, 16]} />
      </mesh>

      {/* Piernas */}
      <mesh ref={legL} position={[-0.14, 0.45, 0]} castShadow material={cloth}>
        <capsuleGeometry args={[0.08, 0.45, 4, 6]} />
      </mesh>
      <mesh ref={legR} position={[0.14, 0.45, 0]} castShadow material={cloth}>
        <capsuleGeometry args={[0.08, 0.45, 4, 6]} />
      </mesh>

      {/* Torso y Haori rojo */}
      <mesh position={[0, 1.0, 0]} castShadow material={coat}>
        <boxGeometry args={[0.42, 0.6, 0.28]} />
      </mesh>
      {/* Fajín Obi */}
      <mesh position={[0, 0.85, 0]} material={cloth}>
        <boxGeometry args={[0.44, 0.12, 0.3]} />
      </mesh>

      {/* Cabeza */}
      <mesh position={[0, 1.45, 0]} castShadow material={skin}>
        <sphereGeometry args={[0.15, 10, 8]} />
      </mesh>

      {/* Cinta de samurái en la frente */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.155, 0.155, 0.05, 12]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>

      {/* Brazo izquierdo */}
      <mesh ref={armL} position={[-0.28, 1.0, 0]} castShadow material={coat}>
        <capsuleGeometry args={[0.065, 0.4, 4, 6]} />
      </mesh>

      {/* Brazo derecho con Katana */}
      <group ref={armR} position={[0.28, 1.1, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow material={coat}>
          <capsuleGeometry args={[0.065, 0.4, 4, 6]} />
        </mesh>
        {/* Katana de combate */}
        <mesh
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
        {/* Tsuba (guarda de la espada) */}
        <mesh position={[0, -0.38, 0.0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.02, 8]} rotation-x={Math.PI / 2} />
          <meshStandardMaterial color="#b45309" metalness={0.8} />
        </mesh>
      </group>
    </group>
  );
}
