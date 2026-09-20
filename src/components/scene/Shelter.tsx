import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { PlayerHandle } from "./Player";
import { heightAt } from "./terrain";

interface ShelterProps {
  level: number;
  player: PlayerHandle;
  onOpenUpgrade?: () => void;
  isNight?: boolean;
}

export function Shelter({
  level,
  player,
  onOpenUpgrade,
  isNight = false,
}: ShelterProps) {
  const shelterX = 6.5;
  const shelterZ = 6.0;
  const baseY = heightAt(shelterX, shelterZ);

  const groupRef = useRef<THREE.Group>(null);
  const fireLightRef = useRef<THREE.PointLight>(null);
  const spiritLightRef = useRef<THREE.PointLight>(null);
  const smokeRef = useRef<THREE.Points>(null);
  const spiritPointsRef = useRef<THREE.Points>(null);

  // Smoke particles for campfire
  const smokePositions = useMemo(() => {
    const arr = new Float32Array(40 * 3);
    for (let i = 0; i < 40; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 0.4;
      arr[i * 3 + 1] = Math.random() * 2.5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
    return arr;
  }, []);

  // Holy spirit particles for level 3 sanctuary
  const spiritPositions = useMemo(() => {
    const arr = new Float32Array(60 * 3);
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 1 + Math.random() * 3.5;
      arr[i * 3] = Math.cos(angle) * r;
      arr[i * 3 + 1] = 0.3 + Math.random() * 2.8;
      arr[i * 3 + 2] = Math.sin(angle) * r;
    }
    return arr;
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // Flickering campfire light
    if (fireLightRef.current && level >= 1) {
      fireLightRef.current.intensity =
        (isNight ? 4.2 : 2.5) + Math.sin(t * 12) * 0.5 + Math.cos(t * 19) * 0.3;
    }

    // Sacred spirit light pulse (Level 3)
    if (spiritLightRef.current && level >= 3) {
      spiritLightRef.current.intensity =
        3.5 + Math.sin(t * 2.5) * 0.8 + Math.cos(t * 4.1) * 0.4;
    }

    // Animated smoke particles
    if (smokeRef.current && level >= 1) {
      const attr = smokeRef.current.geometry.attributes["position"];
      if (attr) {
        const arr = attr.array as Float32Array;
        for (let i = 0; i < arr.length; i += 3) {
          arr[i + 1] += delta * 0.9;
          arr[i] += Math.sin(t * 2 + i) * delta * 0.15;
          if (arr[i + 1] > 2.8) {
            arr[i + 1] = 0.2;
            arr[i] = (Math.random() - 0.5) * 0.3;
            arr[i + 2] = (Math.random() - 0.5) * 0.3;
          }
        }
        attr.needsUpdate = true;
      }
    }

    // Animated Kami spirit particles (Level 3)
    if (spiritPointsRef.current && level >= 3) {
      const attr = spiritPointsRef.current.geometry.attributes["position"];
      if (attr) {
        const arr = attr.array as Float32Array;
        for (let i = 0; i < arr.length; i += 3) {
          arr[i + 1] += Math.sin(t * 1.5 + i) * delta * 0.3;
          const a = delta * 0.4;
          const x = arr[i];
          const z = arr[i + 2];
          arr[i] = x * Math.cos(a) - z * Math.sin(a);
          arr[i + 2] = x * Math.sin(a) + z * Math.cos(a);
        }
        attr.needsUpdate = true;
      }
    }
  });

  // Calculate distance to player
  const dist = Math.hypot(
    player.position.x - shelterX,
    player.position.z - shelterZ,
  );
  const isNear = dist < 4.5;

  return (
    <group
      ref={groupRef}
      position={[shelterX, baseY, shelterZ]}
      onClick={(e) => {
        e.stopPropagation();
        onOpenUpgrade?.();
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      {/* Base dirt mound / foundation */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[4.2, 4.8, 0.14, 16]} />
        <meshStandardMaterial
          color={level >= 2 ? "#524b42" : "#726553"}
          roughness={0.95}
        />
      </mesh>

      {/* ================= LEVEL 0: Foundation stakes & boundary ================= */}
      {level === 0 && (
        <group>
          {/* Wooden corner stakes */}
          {[
            [-2.4, -2.4],
            [2.4, -2.4],
            [2.4, 2.4],
            [-2.4, 2.4],
          ].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.45, z]} castShadow>
              <cylinderGeometry args={[0.07, 0.09, 0.9, 6]} />
              <meshStandardMaterial color="#8a7356" roughness={0.9} />
            </mesh>
          ))}
          {/* Stone ring outline for campfire */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.cos(angle) * 0.7, 0.1, Math.sin(angle) * 0.7]}
                castShadow
              >
                <sphereGeometry args={[0.12, 6, 5]} />
                <meshStandardMaterial color="#7a7873" roughness={1} />
              </mesh>
            );
          })}
          {/* Construction Blueprint Signpost */}
          <group position={[0, 0.8, -2.2]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.05, 0.06, 1.6, 6]} />
              <meshStandardMaterial color="#6e573e" />
            </mesh>
            <mesh position={[0, 0.5, 0]} castShadow>
              <boxGeometry args={[1.1, 0.55, 0.06]} />
              <meshStandardMaterial color="#a68865" />
            </mesh>
            {/* Pulsing indicator */}
            <mesh position={[0, 0.5, 0.04]}>
              <planeGeometry args={[0.9, 0.4]} />
              <meshStandardMaterial
                color="#e0b04a"
                emissive="#e09020"
                emissiveIntensity={0.8}
              />
            </mesh>
          </group>
        </group>
      )}

      {/* ================= LEVEL 1: Campfire & Lean-to shelter ================= */}
      {level >= 1 && (
        <group>
          {/* Campfire stone circle */}
          {Array.from({ length: 10 }).map((_, i) => {
            const angle = (i / 10) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.cos(angle) * 0.75, 0.12, Math.sin(angle) * 0.75]}
                castShadow
              >
                <sphereGeometry args={[0.14, 6, 6]} />
                <meshStandardMaterial color="#5e5c57" roughness={0.95} />
              </mesh>
            );
          })}
          {/* Burning logs */}
          {[0, 1.05, 2.1].map((r, i) => (
            <mesh
              key={i}
              position={[0, 0.14, 0]}
              rotation={[0.3, r, 0.2]}
              castShadow
            >
              <cylinderGeometry args={[0.07, 0.08, 0.9, 6]} />
              <meshStandardMaterial color="#30241b" roughness={1} />
            </mesh>
          ))}
          {/* Glowing coals */}
          <mesh position={[0, 0.15, 0]}>
            <sphereGeometry args={[0.32, 8, 6]} />
            <meshStandardMaterial
              color="#ff4514"
              emissive="#ff5511"
              emissiveIntensity={2.5}
            />
          </mesh>
          {/* Warm campfire light */}
          <pointLight
            ref={fireLightRef}
            position={[0, 0.6, 0]}
            color="#ff933b"
            distance={8}
            intensity={3.2}
            castShadow
          />
          {/* Rising campfire smoke */}
          <points ref={smokeRef} position={[0, 0.2, 0]}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[smokePositions, 3]}
              />
            </bufferGeometry>
            <pointsMaterial
              size={0.25}
              color="#544c45"
              transparent
              opacity={0.45}
              depthWrite={false}
            />
          </points>

          {/* Bamboo & straw lean-to shelter (Level 1 only, upgraded in L2) */}
          {level === 1 && (
            <group position={[0, 0, -1.6]}>
              {/* Back posts */}
              {[-1.6, 1.6].map((x) => (
                <mesh key={x} position={[x, 1.1, 0]} castShadow>
                  <cylinderGeometry args={[0.08, 0.1, 2.2, 8]} />
                  <meshStandardMaterial color="#6a533c" roughness={0.9} />
                </mesh>
              ))}
              {/* Slanted shelter roof */}
              <mesh
                position={[0, 1.25, 0.7]}
                rotation-x={-0.65}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[3.5, 0.12, 2.4]} />
                <meshStandardMaterial color="#826f4f" roughness={0.95} />
              </mesh>
              {/* Straw bed mat */}
              <mesh position={[0, 0.1, 0.8]} receiveShadow>
                <boxGeometry args={[2.4, 0.12, 1.5]} />
                <meshStandardMaterial color="#ab9668" roughness={0.9} />
              </mesh>
              {/* Low wooden barricade */}
              {[-2.2, 2.2].map((x) => (
                <mesh key={x} position={[x, 0.45, 0.6]} castShadow>
                  <boxGeometry args={[0.15, 0.9, 1.8]} />
                  <meshStandardMaterial color="#54412f" roughness={1} />
                </mesh>
              ))}
            </group>
          )}
        </group>
      )}

      {/* ================= LEVEL 2: Sturdy Japanese Timber Cabin ================= */}
      {level >= 2 && (
        <group position={[0, 0, -1.8]}>
          {/* Raised stone foundation plinth */}
          <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
            <boxGeometry args={[4.4, 0.44, 3.8]} />
            <meshStandardMaterial color="#615d58" roughness={0.9} />
          </mesh>
          {/* Wooden cabin walls */}
          <mesh position={[0, 1.35, 0]} castShadow receiveShadow>
            <boxGeometry args={[3.8, 1.9, 3.2]} />
            <meshStandardMaterial color="#503d2b" roughness={0.85} />
          </mesh>
          {/* Corner posts */}
          {[
            [-1.9, -1.6],
            [1.9, -1.6],
            [1.9, 1.6],
            [-1.9, 1.6],
          ].map(([x, z], i) => (
            <mesh key={i} position={[x, 1.35, z]} castShadow>
              <boxGeometry args={[0.22, 2.0, 0.22]} />
              <meshStandardMaterial color="#362619" roughness={0.9} />
            </mesh>
          ))}
          {/* Front Shoji Door */}
          <mesh position={[0, 1.2, 1.62]}>
            <planeGeometry args={[1.4, 1.7]} />
            <meshStandardMaterial
              color="#e6dbc7"
              emissive={isNight ? "#ffaa44" : "#4a3311"}
              emissiveIntensity={isNight ? 0.9 : 0.2}
              roughness={0.7}
            />
          </mesh>
          {/* Traditional gabled roof */}
          <mesh
            position={[0, 2.65, 0]}
            rotation-y={Math.PI / 4}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[0.01, 3.6, 1.4, 4, 1]} />
            <meshStandardMaterial
              color={level === 3 ? "#282a30" : "#483e35"}
              roughness={0.8}
            />
          </mesh>
          {/* Hanging Front Lantern */}
          <group position={[1.4, 1.8, 1.85]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.02, 0.02, 0.4, 6]} />
              <meshStandardMaterial color="#221e1a" />
            </mesh>
            <mesh position={[0, -0.22, 0]}>
              <sphereGeometry args={[0.18, 8, 8]} />
              <meshStandardMaterial
                color="#ffcf77"
                emissive="#ff9922"
                emissiveIntensity={isNight ? 2.5 : 1.2}
              />
            </mesh>
            {isNight && (
              <pointLight
                color="#ffab38"
                distance={5.5}
                intensity={2.8}
                position={[0, -0.25, 0]}
              />
            )}
          </group>
          {/* Supply chest on the porch */}
          <mesh position={[-1.2, 0.6, 1.7]} castShadow>
            <boxGeometry args={[0.65, 0.45, 0.45]} />
            <meshStandardMaterial color="#4a3726" roughness={0.8} />
          </mesh>
        </group>
      )}

      {/* ================= LEVEL 3: Kami Fortress Shrine ================= */}
      {level === 3 && (
        <group>
          {/* Sacred Red Torii Gate at entrance */}
          <group position={[0, 0, 2.6]}>
            {/* Main Pillars */}
            {[-1.6, 1.6].map((x) => (
              <mesh key={x} position={[x, 1.6, 0]} castShadow>
                <cylinderGeometry args={[0.14, 0.18, 3.2, 10]} />
                <meshStandardMaterial color="#91271f" roughness={0.65} />
              </mesh>
            ))}
            {/* Top lintels */}
            <mesh position={[0, 3.3, 0]} castShadow>
              <boxGeometry args={[4.4, 0.22, 0.36]} />
              <meshStandardMaterial color="#91271f" roughness={0.65} />
            </mesh>
            <mesh position={[0, 2.9, 0]} castShadow>
              <boxGeometry args={[3.6, 0.15, 0.26]} />
              <meshStandardMaterial color="#91271f" roughness={0.65} />
            </mesh>
            {/* Sacred Shimenawa Rope */}
            <mesh position={[0, 2.6, 0]}>
              <cylinderGeometry
                args={[0.07, 0.07, 2.8, 8]}
                rotation-z={Math.PI / 2}
              />
              <meshStandardMaterial color="#c2b08a" roughness={0.9} />
            </mesh>
          </group>

          {/* Twin Stone Lantern Towers with spirit blue flame */}
          {[-2.8, 2.8].map((x, i) => (
            <group key={i} position={[x, 0, 1.4]}>
              <mesh position={[0, 0.5, 0]} castShadow>
                <cylinderGeometry args={[0.18, 0.24, 1.0, 8]} />
                <meshStandardMaterial color="#666560" roughness={0.95} />
              </mesh>
              <mesh position={[0, 1.15, 0]} castShadow>
                <boxGeometry args={[0.55, 0.45, 0.55]} />
                <meshStandardMaterial color="#666560" roughness={0.95} />
              </mesh>
              {/* Spirit Flame */}
              <mesh position={[0, 1.15, 0]}>
                <sphereGeometry args={[0.16, 8, 8]} />
                <meshStandardMaterial
                  color="#63e4ff"
                  emissive="#00b4d8"
                  emissiveIntensity={3.5}
                />
              </mesh>
              <mesh position={[0, 1.5, 0]} castShadow>
                <coneGeometry args={[0.45, 0.35, 4]} />
                <meshStandardMaterial color="#4a4945" roughness={0.9} />
              </mesh>
            </group>
          ))}

          {/* Spirit blue point light */}
          <pointLight
            ref={spiritLightRef}
            position={[0, 2.2, 0]}
            color="#56cfe1"
            distance={10}
            intensity={3.2}
          />

          {/* Floating Holy Kami spirits particles */}
          <points ref={spiritPointsRef} position={[0, 0.5, 0]}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[spiritPositions, 3]}
              />
            </bufferGeometry>
            <pointsMaterial
              size={0.14}
              color="#72efdd"
              transparent
              opacity={0.8}
              depthWrite={false}
            />
          </points>

          {/* Spiked defensive palisade fence around perimeter */}
          {[-3.6, 3.6].map((x) =>
            Array.from({ length: 6 }).map((_, i) => {
              const z = -3.2 + i * 1.0;
              return (
                <mesh key={`${x}-${i}`} position={[x, 0.8, z]} castShadow>
                  <cylinderGeometry args={[0.02, 0.1, 1.6, 5]} />
                  <meshStandardMaterial color="#3b2b1d" roughness={0.9} />
                </mesh>
              );
            }),
          )}
        </group>
      )}

      {/* ================= 3D Floating Interaction Banner ================= */}
      <group position={[0, level >= 2 ? 3.8 : 2.2, 0]}>
        {/* Subtle glowing ring marker on ground */}
        <mesh
          rotation-x={-Math.PI / 2}
          position={[0, - (level >= 2 ? 3.7 : 2.1) + 0.12, 0]}
        >
          <ringGeometry args={[3.2, 3.4, 24]} />
          <meshBasicMaterial
            color={level === 3 ? "#00f0ff" : level >= 1 ? "#ffb703" : "#90e0ef"}
            transparent
            opacity={isNear ? 0.7 : 0.25}
          />
        </mesh>
      </group>
    </group>
  );
}
