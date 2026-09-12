import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const SPEED = 4.2;
const ACCEL = 14;
const DAMP = 9;

export interface PlayerHandle {
  position: THREE.Vector3;
}

/** Personaje estilizado low-poly con animación de caminata procedural. */
export function Player({ handle }: { handle: PlayerHandle }) {
  const group = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Mesh>(null);
  const legR = useRef<THREE.Mesh>(null);
  const armL = useRef<THREE.Mesh>(null);
  const armR = useRef<THREE.Mesh>(null);

  const keys = useRef<Record<string, boolean>>({});
  const vel = useRef(new THREE.Vector3());
  const phase = useRef(0);
  const { camera } = useThree();

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

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code))
        e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const g = group.current;
    if (!g) return;

    const k = keys.current;
    const fwd = (k["KeyW"] || k["ArrowUp"] ? 1 : 0) - (k["KeyS"] || k["ArrowDown"] ? 1 : 0);
    const side = (k["KeyD"] || k["ArrowRight"] ? 1 : 0) - (k["KeyA"] || k["ArrowLeft"] ? 1 : 0);

    // dirección relativa a la cámara, proyectada al plano
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0;
    camDir.normalize();
    const right = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();

    const wish = new THREE.Vector3()
      .addScaledVector(camDir, fwd)
      .addScaledVector(right, side);
    const moving = wish.lengthSq() > 0.0001;
    if (moving) wish.normalize();

    const run = k["ShiftLeft"] || k["ShiftRight"] ? 1.7 : 1;
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

    // altura: sobre el muelle o siguiendo el terreno
    const onDock = Math.abs(g.position.x) < 2.1 && g.position.z < -0.6;
    const targetY = onDock ? 0.48 : Math.max(heightAt(g.position.x, g.position.z), 0);
    g.position.y += (targetY - g.position.y) * Math.min(1, 10 * dt);

    const speed = Math.hypot(vel.current.x, vel.current.z);
    if (speed > 0.15) {
      const yaw = Math.atan2(vel.current.x, vel.current.z);
      let diff = yaw - g.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      g.rotation.y += diff * Math.min(1, 12 * dt);
    }

    phase.current += dt * speed * 2.4;
    const swing = Math.sin(phase.current) * Math.min(0.7, speed * 0.22);
    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;
    if (armL.current) armL.current.rotation.x = -swing * 0.8;
    if (armR.current) armR.current.rotation.x = swing * 0.8;
    g.position.y += Math.sin(phase.current * 2) * 0.012 * Math.min(1, speed);

    handle.position.copy(g.position);
  });

  return (
    <group ref={group} position={[0, 0, 3]}>
      {/* piernas */}
      <mesh ref={legL} position={[-0.16, 0.52, 0]} castShadow material={cloth}>
        <capsuleGeometry args={[0.11, 0.42, 4, 8]} />
      </mesh>
      <mesh ref={legR} position={[0.16, 0.52, 0]} castShadow material={cloth}>
        <capsuleGeometry args={[0.11, 0.42, 4, 8]} />
      </mesh>
      {/* torso con abrigo */}
      <mesh position={[0, 1.12, 0]} castShadow material={coat}>
        <capsuleGeometry args={[0.26, 0.44, 4, 10]} />
      </mesh>
      {/* mochila */}
      <mesh position={[0, 1.12, -0.28]} castShadow>
        <boxGeometry args={[0.36, 0.44, 0.22]} />
        <meshStandardMaterial color="#5b4736" roughness={0.9} />
      </mesh>
      {/* brazos */}
      <mesh ref={armL} position={[-0.36, 1.2, 0]} castShadow material={coat}>
        <capsuleGeometry args={[0.08, 0.38, 4, 8]} />
      </mesh>
      <mesh ref={armR} position={[0.36, 1.2, 0]} castShadow material={coat}>
        <capsuleGeometry args={[0.08, 0.38, 4, 8]} />
      </mesh>
      {/* cabeza */}
      <mesh position={[0, 1.6, 0]} castShadow material={skin}>
        <sphereGeometry args={[0.19, 16, 14]} />
      </mesh>
      {/* capucha / gorro */}
      <mesh position={[0, 1.7, -0.02]} castShadow>
        <sphereGeometry args={[0.21, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#2f3841" roughness={0.9} />
      </mesh>
      {/* linterna del personaje */}
      <pointLight position={[0, 1.3, 0.3]} distance={6} intensity={2.2} color="#ffd6a0" />
    </group>
  );
}
