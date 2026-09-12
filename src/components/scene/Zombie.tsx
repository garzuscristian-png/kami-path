import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { PlayerHandle } from "./Player";
import { heightAt } from "./terrain";

const DETECT = 14;
const LOSE = 20;
const SPEED = 1.9;

export interface ZombieSpawn {
  id: number;
  origin: [number, number, number];
  seed: number;
}

/** Zombi errante: patrulla hasta detectar al jugador y entonces lo persigue. */
export function Zombie({
  spawn,
  player,
  onCatch,
}: {
  spawn: ZombieSpawn;
  player: PlayerHandle;
  onCatch: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Mesh>(null);
  const legR = useRef<THREE.Mesh>(null);
  const armL = useRef<THREE.Mesh>(null);
  const armR = useRef<THREE.Mesh>(null);
  const eyes = useRef<THREE.MeshStandardMaterial>(null);

  const chasing = useRef(false);
  const phase = useRef(spawn.seed * 6.28);
  const cooldown = useRef(0);

  const flesh = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#6f7f5e").offsetHSL((spawn.seed % 1) * 0.04, 0, 0),
        roughness: 0.95,
      }),
    [spawn.seed],
  );
  const rags = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#3a3730", roughness: 1 }),
    [],
  );

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const g = group.current;
    if (!g) return;

    const dx = player.position.x - g.position.x;
    const dz = player.position.z - g.position.z;
    const dist = Math.hypot(dx, dz);

    if (!chasing.current && dist < DETECT) chasing.current = true;
    else if (chasing.current && dist > LOSE) chasing.current = false;

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
      // deambular lento alrededor del punto de aparición
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

    cooldown.current -= dt;
    if (dist < 1.1 && cooldown.current <= 0) {
      cooldown.current = 2;
      onCatch();
    }

    // animación de arrastre
    phase.current += dt * (1.4 + moveSpeed * 1.6);
    const swing = Math.sin(phase.current) * (0.15 + moveSpeed * 0.18);
    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;
    if (armL.current) armL.current.rotation.x = -1.2 + swing * 0.2;
    if (armR.current) armR.current.rotation.x = -1.1 - swing * 0.2;
    g.position.y =
      Math.max(heightAt(g.position.x, g.position.z), 0) +
      Math.abs(Math.sin(phase.current)) * 0.04 * (moveSpeed > 0.1 ? 1 : 0.2);
    if (eyes.current) {
      eyes.current.emissiveIntensity = chasing.current ? 2.6 : 0.5;
    }
  });

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
        <mesh ref={armL} position={[-0.33, 1.14, 0.05]} castShadow material={flesh}>
          <capsuleGeometry args={[0.075, 0.4, 4, 6]} />
        </mesh>
        <mesh ref={armR} position={[0.33, 1.14, 0.05]} castShadow material={flesh}>
          <capsuleGeometry args={[0.075, 0.4, 4, 6]} />
        </mesh>
        <mesh position={[0, 1.52, 0.05]} rotation-x={0.25} castShadow material={flesh}>
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
