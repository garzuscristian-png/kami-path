import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { PlayerHandle } from "./Player";
import { heightAt } from "./terrain";
import { sound } from "@/lib/game/audio";

const DETECT = 14;
const LOSE = 20;
const SPEED = 1.9;
const MAX_HEALTH = 3;

export interface ZombieSpawn {
  id: number;
  origin: [number, number, number];
  seed: number;
}

interface ZombieProps {
  spawn: ZombieSpawn;
  player: PlayerHandle;
  damagePerHit?: number;
  onCatch: () => void;
  onKill?: (zombieId: number) => void;
}

/** Zombi errante con combate: detecta, persigue, recibe daño por katana, retrocede y muere. */
export function Zombie({
  spawn,
  player,
  damagePerHit = 1,
  onCatch,
  onKill,
}: ZombieProps) {
  const group = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Mesh>(null);
  const legR = useRef<THREE.Mesh>(null);
  const armL = useRef<THREE.Mesh>(null);
  const armR = useRef<THREE.Mesh>(null);
  const eyes = useRef<THREE.MeshStandardMaterial>(null);

  const chasing = useRef(false);
  const phase = useRef(spawn.seed * 6.28);
  const cooldown = useRef(0);

  // Estados de combate
  const health = useRef(MAX_HEALTH);
  const isDead = useRef(false);
  const deathTimer = useRef(0);
  const hitFlash = useRef(0);
  const knockback = useRef(new THREE.Vector3());
  const lastAttackId = useRef(-1);
  const [removed, setRemoved] = useState(false);

  const flesh = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#6f7f5e").offsetHSL(
          (spawn.seed % 1) * 0.04,
          0,
          0,
        ),
        roughness: 0.95,
      }),
    [spawn.seed],
  );

  const rags = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#3a3730", roughness: 1 }),
    [],
  );

  useFrame((state, rawDelta) => {
    if (removed) return;
    const dt = Math.min(rawDelta, 0.05);
    const g = group.current;
    if (!g) return;

    // Si está muerto, animación de caída / desvanecimiento
    if (isDead.current) {
      deathTimer.current += dt;
      g.rotation.x = Math.min(Math.PI / 2, g.rotation.x + dt * 4);
      g.position.y -= dt * 0.8;
      if (deathTimer.current > 1.2) {
        setRemoved(true);
      }
      return;
    }

    const dx = player.position.x - g.position.x;
    const dz = player.position.z - g.position.z;
    const dist = Math.hypot(dx, dz);

    // Detección de impacto por ataque de la katana del jugador
    if (
      player.isAttacking &&
      player.attackId &&
      player.attackId !== lastAttackId.current
    ) {
      if (dist < 2.5) {
        // Verificar si el jugador está mirando en dirección al zombi
        // Dirección de la mirada del jugador en el plano XZ
        const playerForwardX = Math.sin(player.rotationY);
        const playerForwardZ = Math.cos(player.rotationY);

        // Vector del jugador hacia el zombi
        const toZombieX = (g.position.x - player.position.x) / dist;
        const toZombieZ = (g.position.z - player.position.z) / dist;

        const dot = playerForwardX * toZombieX + playerForwardZ * toZombieZ;

        // Si está en el cono frontal (~90 grados)
        if (dot > 0.15) {
          lastAttackId.current = player.attackId;
          health.current -= damagePerHit;
          hitFlash.current = 0.22;
          sound.playHit();

          // Empujar al zombi hacia atrás (knockback)
          knockback.current.set(toZombieX * 5.5, 0, toZombieZ * 5.5);

          if (health.current <= 0) {
            isDead.current = true;
            sound.playZombieDeath();
            onKill?.(spawn.id);
            return;
          }
        }
      }
    }

    // Aplicar retroceso por golpe
    if (knockback.current.lengthSq() > 0.01) {
      g.position.x += knockback.current.x * dt;
      g.position.z += knockback.current.z * dt;
      knockback.current.multiplyScalar(Math.exp(-10 * dt));
    }

    // Lógica de persecución / deambular
    if (!chasing.current && dist < DETECT) {
      chasing.current = true;
      sound.playZombieGroan();
    } else if (chasing.current && dist > LOSE) {
      chasing.current = false;
    }

    let moveSpeed = 0;
    if (chasing.current && dist > 0.9) {
      const nx = dx / dist;
      const nz = dz / dist;
      moveSpeed = SPEED;
      g.position.x += nx * moveSpeed * dt;
      g.position.z += nz * moveSpeed * dt;
      const yaw = Math.atan2(nx, nz);
      let diff = yaw - g.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      g.rotation.y += diff * Math.min(1, 6 * dt);
    } else if (!chasing.current) {
      const t = state.clock.elapsedTime * 0.25 + spawn.seed * 3;
      const tx = spawn.origin[0] + Math.cos(t) * 3;
      const tz = spawn.origin[2] + Math.sin(t * 1.3) * 3;
      const wx = tx - g.position.x;
      const wz = tz - g.position.z;
      const wd = Math.hypot(wx, wz) || 1;
      moveSpeed = 0.5;
      g.position.x += (wx / wd) * moveSpeed * dt;
      g.position.z += (wz / wd) * moveSpeed * dt;
      const yaw = Math.atan2(wx / wd, wz / wd);
      let diff = yaw - g.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      g.rotation.y += diff * Math.min(1, 3 * dt);
    }

    // Daño al jugador por contacto
    cooldown.current -= dt;
    if (dist < 1.1 && cooldown.current <= 0) {
      cooldown.current = 1.8;
      onCatch();
    }

    // Animación de arrastre de zombi
    phase.current += dt * (1.4 + moveSpeed * 1.6);
    const swing = Math.sin(phase.current) * (0.15 + moveSpeed * 0.18);
    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;
    if (armL.current) armL.current.rotation.x = -1.2 + swing * 0.2;
    if (armR.current) armR.current.rotation.x = -1.1 - swing * 0.2;

    g.position.y =
      Math.max(heightAt(g.position.x, g.position.z), 0) +
      Math.abs(Math.sin(phase.current)) * 0.04 * (moveSpeed > 0.1 ? 1 : 0.2);

    // Destello de golpe o brillo de ojos
    if (hitFlash.current > 0) {
      hitFlash.current -= dt;
      flesh.emissive.set("#ff2222");
      flesh.emissiveIntensity = 1.4;
    } else {
      flesh.emissive.set("#000000");
      flesh.emissiveIntensity = 0;
    }

    if (eyes.current) {
      eyes.current.emissiveIntensity = chasing.current ? 2.8 : 0.5;
    }
  });

  if (removed) return null;

  return (
    <group ref={group} position={spawn.origin} rotation-y={spawn.seed}>
      <group rotation-x={0.16}>
        <mesh ref={legL} position={[-0.15, 0.5, 0]} castShadow material={rags}>
          <capsuleGeometry args={[0.1, 0.4, 4, 6]} />
        </mesh>
        <mesh ref={legR} position={[0.15, 0.5, 0]} castShadow material={rags}>
          <capsuleGeometry args={[0.1, 0.4, 4, 6]} />
        </mesh>
        <mesh position={[0, 1.05, 0]} castShadow material={rags}>
          <capsuleGeometry args={[0.24, 0.42, 4, 8]} />
        </mesh>
        <mesh
          ref={armL}
          position={[-0.33, 1.14, 0.05]}
          castShadow
          material={flesh}
        >
          <capsuleGeometry args={[0.075, 0.4, 4, 6]} />
        </mesh>
        <mesh
          ref={armR}
          position={[0.33, 1.14, 0.05]}
          castShadow
          material={flesh}
        >
          <capsuleGeometry args={[0.075, 0.4, 4, 6]} />
        </mesh>
        <mesh
          position={[0, 1.52, 0.05]}
          rotation-x={0.25}
          castShadow
          material={flesh}
        >
          <sphereGeometry args={[0.18, 12, 10]} />
        </mesh>
        <mesh position={[0, 1.55, 0.21]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial
            ref={eyes}
            color="#0d0d0d"
            emissive="#c93b1f"
            emissiveIntensity={0.5}
          />
        </mesh>
      </group>
    </group>
  );
}
