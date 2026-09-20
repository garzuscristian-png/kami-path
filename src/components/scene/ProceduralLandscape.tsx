import { useWorld } from "./WorldContext";
export function ProceduralLandscape() {
  const { objects, height, biome } = useWorld();
  return (
    <group>
      {objects.map((o, i) => (
        <group key={i} position={[o.x, height(o.x, o.z), o.z]} rotation-y={o.rotation}>
          {o.kind === "tree" ? (
            <>
              <mesh position={[0, o.height / 2, 0]} castShadow>
                <boxGeometry args={[0.5, o.height, 0.5]} />
                <meshStandardMaterial color="#58432d" />
              </mesh>
              {[0.5, 0.72, 0.9].map((h) => (
                <mesh key={h} position={[0, o.height * h, 0]} castShadow>
                  <coneGeometry args={[2.6 * (1.3 - h), o.height * 0.48, 7]} />
                  <meshStandardMaterial color={biome === "snow" ? "#dce9eb" : "#24492d"} />
                </mesh>
              ))}
            </>
          ) : o.kind === "field" ? (
            <>
              <mesh position={[0, 0.05, 0]} receiveShadow>
                <boxGeometry args={[o.halfX * 2, 0.1, o.halfZ * 2]} />
                <meshStandardMaterial color="#514327" />
              </mesh>
              {[-0.6, 0, 0.6].map((x) => (
                <mesh key={x} position={[x, 0.35, 0]}>
                  <boxGeometry args={[0.15, 0.6, o.halfZ * 2]} />
                  <meshStandardMaterial color="#b5ad48" />
                </mesh>
              ))}
            </>
          ) : (
            <>
              <mesh position={[0, o.height / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[o.halfX * 2, o.height, o.halfZ * 2]} />
                <meshStandardMaterial
                  color={
                    o.kind === "rock"
                      ? biome === "volcanic"
                        ? "#302826"
                        : "#757e86"
                      : o.kind === "tower"
                        ? "#596168"
                        : "#997650"
                  }
                  roughness={0.95}
                />
              </mesh>
              {o.kind === "house" && (
                <mesh position={[0, o.height + 0.7, 0]} rotation-y={Math.PI / 4} castShadow>
                  <coneGeometry args={[4, 1.5, 4]} />
                  <meshStandardMaterial color="#303b46" />
                </mesh>
              )}
              {o.kind === "tower" &&
                Array.from({ length: Math.floor(o.height / 2.5) }, (_, floor) => (
                  <mesh key={floor} position={[0, 1.5 + floor * 2.5, o.halfZ + 0.01]}>
                    <boxGeometry args={[o.halfX * 1.5, 0.7, 0.03]} />
                    <meshStandardMaterial color="#abc3ca" metalness={0.4} roughness={0.3} />
                  </mesh>
                ))}
            </>
          )}
        </group>
      ))}
    </group>
  );
}
