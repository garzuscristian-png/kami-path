import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { PlayerHandle } from "./Player";
import type { PlacedDefense } from "./Defenses";
import { heightAt } from "./terrain";
import { sound } from "@/lib/game/audio";

export type ZombieArchetype =
  | "normal"
  | "volcanic_crawler"
  | "armored_samurai"
  | "frost_wendigo"
  | "toxic_mutant"
  | "boss";

export interface ZombieSpawn {
  id: number;
  origin: [number, number, number];
  seed: number;
  archetype?: ZombieArchetype;
  maxHealth?: number;
  name?: string;
}

interface ZombieProps {
  spawn: ZombieSpawn;
  player: PlayerHandle;
  damagePerHit?: number;
  isNight?: boolean;
  defenses?: PlacedDefense[];
  onTriggerTrap?: (trapId: string, zombieId: number) => void;
  onCatch: () => void;
  onKill?: (zombieId: number) => void;
}

const HOME_X = 0;
const HOME_Z = 3;
const HOME_SAFE_RADIUS = 9.5;

export function Zombie({
  spawn,
  player,
  damagePerHit = 1,
  isNight = false,
  defenses = [],
  onTriggerTrap,
  onCatch,
  onKill,
}: ZombieProps) {
  const archetype = spawn.archetype || "normal";
  const isBoss = archetype === "boss";
  const isArmored = archetype === "armored_samurai";
  const isVolcanic = archetype === "volcanic_crawler";
  const isFrost = archetype === "frost_wendigo";
  const isToxic = archetype === "toxic_mutant";

  const maxHp = spawn.maxHealth || (isBoss ? 12 : isArmored ? 6 : isFrost || isToxic ? 4 : 3);
  const baseSpeed = isBoss ? 1.6 : isVolcanic ? 2.5 : isArmored ? 1.5 : 1.9;
  const nightSpeed = isBoss ? 2.5 : isVolcanic ? 3.8 : isArmored ? 2.6 : 3.25;

  const group = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Mesh>(null);
  const legR = useRef<THREE.Mesh>(null);
  const armL = useRef<THREE.Mesh>(null);
  const armR = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.MeshStandardMaterial>(null);

  const chasing = useRef(false);
  const phase = useRef(spawn.seed * 6.28);
  const cooldown = useRef(0);

  const health = useRef(maxHp);
  const [currentHp, setCurrentHp] = useState(maxHp);
  const isDead = useRef(false);
  const deathTimer = useRef(0);
  const hitFlash = useRef(0);
  const knockback = useRef(new THREE.Vector3());
  const lastAttackId = useRef(-1);
  const [removed, setRemoved] = useState(false);

  // Material de la piel según arquetipo
  const flesh = useMemo(() => {
    if (isBoss) {
      return new THREE.MeshStandardMaterial({ color: "#450a0a", roughness: 0.8 });
    }
    if (isVolcanic) {
      return new THREE.MeshStandardMaterial({
        color: "#1c1917",
        emissive: new THREE.Color("#ea580c"),
        emissiveIntensity: 0.6,
        roughness: 0.9,
      });
    }
    if (isFrost) {
      return new THREE.MeshStandardMaterial({
        color: "#93c5fd",
        roughness: 0.4,
        emissive: new THREE.Color("#38bdf8"),
        emissiveIntensity: 0.3,
      });
    }
    if (isToxic) {
      return new THREE.MeshStandardMaterial({
        color: "#4d7c0f",
        roughness: 0.9,
        emissive: new THREE.Color("#65a30d"),
        emissiveIntensity: 0.4,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#6f7f5e").offsetHSL((spawn.seed % 1) * 0.04, 0, 0),
      roughness: 0.95,
    });
  }, [isBoss, isVolcanic, isFrost, isToxic, spawn.seed]);

  const rags = useMemo(() => {
    if (isBoss || isArmored) {
      return new THREE.MeshStandardMaterial({ color: "#1e293b", metalness: 0.7, roughness: 0.4 });
    }
    return new THREE.MeshStandardMaterial({ color: "#3a3730", roughness: 1 });
  }, [isBoss, isArmored]);

  useFrame((state, rawDelta) => {
    if (removed) return;
    const dt = Math.min(rawDelta, 0.05);
    const g = group.current;
    if (!g) return;

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

    const playerDistToHome = Math.hypot(player.position.x - HOME_X, player.position.z - HOME_Z);
    const zombieDistToHome = Math.hypot(g.position.x - HOME_X, g.position.z - HOME_Z);
    const playerInSafeZone = playerDistToHome < HOME_SAFE_RADIUS;
    const zombieNearSafeZone = zombieDistToHome < HOME_SAFE_RADIUS;

    // Ataque del jugador
    if (player.isAttacking && player.attackId && player.attackId !== lastAttackId.current) {
      if (dist < 2.6 * (isBoss ? 1.4 : 1.0)) {
        const playerForwardX = Math.sin(player.rotationY);
        const playerForwardZ = Math.cos(player.rotationY);
        const toZombieX = (g.position.x - player.position.x) / dist;
        const toZombieZ = (g.position.z - player.position.z) / dist;
        const dot = playerForwardX * toZombieX + playerForwardZ * toZombieZ;

        if (dot > 0.15) {
          lastAttackId.current = player.attackId;
          health.current -= damagePerHit;
          setCurrentHp(Math.max(0, health.current));
          hitFlash.current = 0.22;
          sound.playHit();

          const kbForce = isBoss ? 2.0 : isArmored ? 3.5 : 5.5;
          knockback.current.set(toZombieX * kbForce, 0, toZombieZ * kbForce);

          if (health.current <= 0) {
            isDead.current = true;
            sound.playZombieDeath();
            onKill?.(spawn.id);
            return;
          }
        }
      }
    }

    // Interacción con defensas
    if (defenses && defenses.length > 0) {
      for (const d of defenses) {
        const dxD = g.position.x - d.x;
        const dzD = g.position.z - d.z;
        const distD = Math.hypot(dxD, dzD);

        if (d.kind === "barricada" && distD < 1.6) {
          const nxD = dxD / (distD || 1);
          const nzD = dzD / (distD || 1);
          knockback.current.set(nxD * 4.5, 0, nzD * 4.5);
          hitFlash.current = 0.2;
          health.current -= 0.5;
          setCurrentHp(Math.max(0, health.current));
          sound.playHit();

          if (health.current <= 0) {
            isDead.current = true;
            sound.playZombieDeath();
            onKill?.(spawn.id);
            return;
          }
        } else if (d.kind === "trampa_pinchos" && !d.isSprung && distD < 1.2) {
          onTriggerTrap?.(d.id, spawn.id);
          health.current -= 2.0;
          setCurrentHp(Math.max(0, health.current));
          hitFlash.current = 0.4;
          sound.playHit();
          knockback.current.set(0, 2.5, 0);

          if (health.current <= 0) {
            isDead.current = true;
            sound.playZombieDeath();
            onKill?.(spawn.id);
            return;
          }
        }
      }
    }

    // Aplicar retroceso
    if (knockback.current.lengthSq() > 0.01) {
      g.position.x += knockback.current.x * dt;
      g.position.z += knockback.current.z * dt;
      knockback.current.multiplyScalar(Math.exp(-10 * dt));
    }

    const currentDetect = isNight ? 32 : 15;
    const currentLose = isNight ? 44 : 22;
    const currentSpeed = isNight ? nightSpeed : baseSpeed;

    if (playerInSafeZone || zombieNearSafeZone) {
      chasing.current = false;
    } else if (!chasing.current && dist < currentDetect) {
      chasing.current = true;
      sound.playZombieGroan();
    } else if (chasing.current && dist > currentLose) {
      chasing.current = false;
    }

    let moveSpeed = 0;
    if (chasing.current && dist > (isBoss ? 1.6 : 0.9) && !playerInSafeZone) {
      const nx = dx / dist;
      const nz = dz / dist;
      moveSpeed = currentSpeed;
      g.position.x += nx * moveSpeed * dt;
      g.position.z += nz * moveSpeed * dt;
      const yaw = Math.atan2(nx, nz);
      let diff = yaw - g.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      g.rotation.y += diff * Math.min(1, 8 * dt);
    } else if (zombieNearSafeZone) {
      const awayX = (g.position.x - HOME_X) / (zombieDistToHome || 1);
      const awayZ = (g.position.z - HOME_Z) / (zombieDistToHome || 1);
      moveSpeed = 1.2;
      g.position.x += awayX * moveSpeed * dt;
      g.position.z += awayZ * moveSpeed * dt;
    }

    // Golpe al jugador
    cooldown.current -= dt;
    if (dist < (isBoss ? 1.8 : 1.1) && cooldown.current <= 0 && !playerInSafeZone) {
      cooldown.current = isNight ? 1.1 : 1.7;
      onCatch();
    }

    // Animación
    phase.current += dt * (1.4 + moveSpeed * 1.6);
    const swing = Math.sin(phase.current) * (0.15 + moveSpeed * 0.18);
    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;
    if (armL.current) armL.current.rotation.x = -1.2 + swing * 0.2;
    if (armR.current) armR.current.rotation.x = -1.1 - swing * 0.2;

    g.position.y = Math.max(heightAt(g.position.x, g.position.z), 0);

    // Flash de golpe
    if (hitFlash.current > 0) {
      hitFlash.current -= dt;
      flesh.emissive.set("#ff2222");
      flesh.emissiveIntensity = 2.0;
    } else {
      if (isVolcanic) {
        flesh.emissive.set("#ea580c");
        flesh.emissiveIntensity = 0.6;
      } else if (isFrost) {
        flesh.emissive.set("#38bdf8");
        flesh.emissiveIntensity = 0.3;
      } else if (isToxic) {
        flesh.emissive.set("#65a30d");
        flesh.emissiveIntensity = 0.4;
      } else {
        flesh.emissive.set("#000000");
        flesh.emissiveIntensity = 0;
      }
    }

    if (eyes.current) {
      if (isFrost) {
        eyes.current.emissive.set("#38bdf8");
        eyes.current.emissiveIntensity = 3.5;
      } else if (isNight || isVolcanic || isBoss) {
        eyes.current.emissive.set("#ff0022");
        eyes.current.emissiveIntensity = chasing.current ? 4.8 : 2.5;
      } else {
        eyes.current.emissive.set("#c93b1f");
        eyes.current.emissiveIntensity = chasing.current ? 2.5 : 0.8;
      }
    }
  });

  if (removed) return null;

  const scale = isBoss ? 1.55 : 1.0;

  return (
    <group ref={group} position={spawn.origin} scale={scale} rotation-y={spawn.seed}>
      {/* Barra de vida para Élites, Samuráis y Boss */}
      {(isBoss || isArmored) && (
        <group position={[0, 2.1, 0]}>
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[1.0, 0.12]} />
            <meshBasicMaterial color="#0f172a" />
          </mesh>
          <mesh position={[-0.5 + (currentHp / maxHp) * 0.5, 0, 0.005]}>
            <planeGeometry args={[(currentHp / maxHp) * 0.98, 0.09]} />
            <meshBasicMaterial color={isBoss ? "#ef4444" : "#f59e0b"} />
          </mesh>
        </group>
      )}

      <group rotation-x={0.16}>
        <mesh ref={legL} position={[-0.15, 0.5, 0]} castShadow material={rags}>
          <capsuleGeometry args={[0.1, 0.4, 4, 6]} />
        </mesh>
        <mesh ref={legR} position={[0.15, 0.5, 0]} castShadow material={rags}>
          <capsuleGeometry args={[0.1, 0.4, 4, 6]} />
        </mesh>

        {/* Torso */}
        <mesh position={[0, 1.05, 0]} castShadow material={rags}>
          <capsuleGeometry args={[0.24, 0.42, 4, 8]} />
        </mesh>

        {/* Armadura Samurái en pecho si es Samurái o Boss */}
        {(isArmored || isBoss) && (
          <mesh position={[0, 1.08, 0.04]} castShadow>
            <boxGeometry args={[0.52, 0.5, 0.3]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
          </mesh>
        )}

        <mesh ref={armL} position={[-0.33, 1.14, 0.05]} castShadow material={flesh}>
          <capsuleGeometry args={[0.075, 0.4, 4, 6]} />
        </mesh>

        <group ref={armR} position={[0.33, 1.14, 0.05]}>
          <mesh castShadow material={flesh}>
            <capsuleGeometry args={[0.075, 0.4, 4, 6]} />
          </mesh>
          {/* Espada corrupta si es Samurái o Boss */}
          {(isArmored || isBoss) && (
            <mesh position={[0, -0.35, 0.35]} rotation-x={Math.PI / 2} castShadow>
              <boxGeometry args={[0.05, isBoss ? 1.4 : 0.9, 0.02]} />
              <meshStandardMaterial color="#713f12" metalness={0.7} />
            </mesh>
          )}
        </group>

        {/* Cabeza */}
        <mesh position={[0, 1.52, 0.05]} rotation-x={0.25} castShadow material={flesh}>
          <sphereGeometry args={[0.18, 12, 10]} />
        </mesh>

        {/* Yelmo Kabuto con cuernos para Samuráis y Boss */}
        {(isArmored || isBoss) && (
          <group position={[0, 1.62, 0.05]}>
            <mesh castShadow>
              <coneGeometry args={[0.26, 0.22, 8]} />
              <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.3} />
            </mesh>
            {/* Cuernos de dragón / cresta dorada */}
            <mesh position={[0, 0.14, 0.12]}>
              <boxGeometry args={[0.22, 0.08, 0.04]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.9} />
            </mesh>
          </group>
        )}

        {/* Ojos brillantes */}
        <mesh position={[0, 1.55, 0.21]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial
            ref={eyes}
            color="#0d0d0d"
            emissive={isFrost ? "#38bdf8" : isNight ? "#ff0022" : "#c93b1f"}
            emissiveIntensity={2.5}
          />
        </mesh>
      </group>
    </group>
  );
}
