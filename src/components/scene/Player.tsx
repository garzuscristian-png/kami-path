import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { heightAt } from "./terrain";
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
  onAttack?: () => void;
  onStaminaChange?: (stamina: number) => void;
  onPlayerMove?: (x: number, z: number, angle: number) => void;
}

/** Personaje estilizado low-poly con katana y animación procedural de caminata y ataque. */
export function Player({
  handle,
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
    if (attackTimer.current > 0) return; // cooldown en curso
    if (stamina.current < 12) return; // sin estamina

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
        // Clic izquierdo para atacar
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

    // Dirección relativa a la cámara
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

    // Gestión de sprint y estamina
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

    g.position.x += vel.current.x * dt;
    g.position.z += vel.current.z * dt;
    g.position.x = THREE.MathUtils.clamp(g.position.x, -62, 62);
    g.position.z = THREE.MathUtils.clamp(g.position.z, -13.5, 62);

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

    // Animación de ataque o balanceo de brazo derecho
    if (attackTimer.current > 0) {
      attackTimer.current -= dt;
      const t = 1 - Math.max(0, attackTimer.current / ATTACK_DURATION);
      if (armR.current) {
        armR.current.rotation.x = -1.6 + Math.sin(t * Math.PI) * 2.4;
        armR.current.rotation.y = 0.6 - Math.sin(t * Math.PI) * 1.6;
        armR.current.rotation.z = -0.4 + Math.cos(t * Math.PI) * 0.8;
      }
      if (attackTimer.current <= 0) {
        setIsAttackingMesh(false);
      }
    } else {
      if (armR.current) {
        armR.current.rotation.x = swing * 0.8;
        armR.current.rotation.y = 0;
        armR.current.rotation.z = 0;
      }
    }

    g.position.y += Math.sin(phase.current * 2) * 0.012 * Math.min(1, speed);

    // Sincronizar estado con el handle externo
    handle.position.copy(g.position);
    handle.rotationY = g.rotation.y;
    handle.isAttacking = attackTimer.current > 0;
    handle.attackId = attackId.current;

    if (onPlayerMove && speed > 0.04) {
      onPlayerMove(g.position.x, g.position.z, g.rotation.y);
    }
  });

  return (
    <group ref={group} position={[0, 0, 3]}>
      {/* Piernas */}
      <mesh ref={legL} position={[-0.16, 0.52, 0]} castShadow material={cloth}>
        <capsuleGeometry args={[0.11, 0.42, 4, 8]} />
      </mesh>
      <mesh ref={legR} position={[0.16, 0.52, 0]} castShadow material={cloth}>
        <capsuleGeometry args={[0.11, 0.42, 4, 8]} />
      </mesh>

      {/* Torso con abrigo tradicional */}
      <mesh position={[0, 1.12, 0]} castShadow material={coat}>
        <capsuleGeometry args={[0.26, 0.44, 4, 10]} />
      </mesh>

      {/* Mochila de viajero */}
      <mesh position={[0, 1.12, -0.28]} castShadow>
        <boxGeometry args={[0.36, 0.44, 0.22]} />
        <meshStandardMaterial color="#5b4736" roughness={0.9} />
      </mesh>

      {/* Brazo izquierdo */}
      <mesh ref={armL} position={[-0.36, 1.2, 0]} castShadow material={coat}>
        <capsuleGeometry args={[0.08, 0.38, 4, 8]} />
      </mesh>

      {/* Brazo derecho con KATANA */}
      <group ref={armR} position={[0.36, 1.2, 0]}>
        <mesh position={[0, -0.18, 0]} castShadow material={coat}>
          <capsuleGeometry args={[0.08, 0.38, 4, 8]} />
        </mesh>

        {/* Katana en la mano */}
        <group position={[0, -0.36, 0.1]} rotation={[0.4, 0, -0.15]}>
          {/* Empuñadura (Tsuka) */}
          <mesh position={[0, -0.1, 0]} castShadow>
            <cylinderGeometry args={[0.024, 0.024, 0.22, 8]} />
            <meshStandardMaterial color="#1a1c20" roughness={0.8} />
          </mesh>
          {/* Guarda dorada (Tsuba) */}
          <mesh position={[0, 0.012, 0]} castShadow>
            <cylinderGeometry args={[0.065, 0.065, 0.015, 12]} />
            <meshStandardMaterial
              color="#d4a34b"
              metalness={0.85}
              roughness={0.3}
            />
          </mesh>
          {/* Hoja metálica (Ha) */}
          <mesh position={[0, 0.46, 0]} castShadow>
            <boxGeometry args={[0.016, 0.9, 0.05]} />
            <meshStandardMaterial
              color="#e6ebf2"
              metalness={0.95}
              roughness={0.15}
            />
          </mesh>
          {/* Filo reflectante con emisión sutil */}
          <mesh position={[0, 0.46, 0.026]}>
            <boxGeometry args={[0.005, 0.88, 0.005]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={0.3}
            />
          </mesh>

          {/* Efecto visual de arco de tajo (Slash FX) al golpear */}
          {isAttackingMesh && (
            <mesh position={[0, 0.45, 0.35]} rotation={[0, Math.PI / 2, 0]}>
              <ringGeometry args={[0.25, 0.85, 16, 1, 0, Math.PI * 0.85]} />
              <meshBasicMaterial
                color="#ffe5cc"
                transparent
                opacity={0.8}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
        </group>
      </group>

      {/* Cabeza */}
      <mesh position={[0, 1.6, 0]} castShadow material={skin}>
        <sphereGeometry args={[0.19, 16, 14]} />
      </mesh>

      {/* Sombrero / Capucha tradicional (Kasa) */}
      <mesh position={[0, 1.74, 0]} castShadow>
        <coneGeometry args={[0.42, 0.16, 16]} />
        <meshStandardMaterial color="#6e573f" roughness={0.95} />
      </mesh>

      {/* Linterna portátil que ilumina el frente */}
      <pointLight
        position={[0, 1.2, 0.35]}
        distance={7}
        intensity={2.6}
        color="#ffd6a0"
      />
    </group>
  );
}
