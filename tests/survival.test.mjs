import test from "node:test";
import assert from "node:assert/strict";
import { createLandscape, makeHeight } from "../src/lib/game/landscape.ts";
import {
  isClear,
  resolveBox,
  moveWithCollisions,
} from "../src/components/scene/WorldCollisions.ts";
import { newFarm, updateFarm, readFarm } from "../src/lib/game/farming.ts";

test("same seed recreates scenery; biomes and seeds change it", () => {
  assert.deepEqual(createLandscape("forest", 4).objects, createLandscape("forest", 4).objects);
  assert.notDeepEqual(createLandscape("forest", 4).objects, createLandscape("forest", 5).objects);
  assert.ok(createLandscape("urban", 4).objects.every((o) => o.kind === "tower"));
  assert.ok(createLandscape("forest", 4).objects.every((o) => o.kind === "tree"));
  assert.ok(createLandscape("rural", 4).objects.some((o) => o.kind === "field"));
});
test("home terrain and garden remain fixed in all seven biomes", () => {
  for (const b of ["coast", "forest", "urban", "rural", "mountain", "snow", "volcanic"]) {
    for (const [x, z] of [
      [6.5, 6],
      [-6, 3],
      [-6, 6],
      [-3, 6],
      [-3, 9],
      [0, 3],
    ]) {
      assert.equal(makeHeight(b, 82)(x, z), makeHeight("coast", 4)(x, z));
      assert.ok(isClear(x, z, 1, createLandscape(b, 82).obstacles));
    }
  }
});
test("center penetration resolves even without a collision normal", () => {
  const b = { x: 20, z: 20, halfX: 2, halfZ: 1, rotation: Math.PI / 4 };
  const p = resolveBox(20, 20, 0.45, b);
  assert.ok(isClear(...p, 0.449, [b]));
});
test("sprint cannot tunnel through a thin barricade", () => {
  const p = moveWithCollisions(
    20,
    15,
    0,
    10,
    0.45,
    [{ x: 20, z: 20, kind: "barricada", rotationY: 0 }],
    0,
    [],
  );
  assert.ok(p[1] <= 19.31);
});
test("diagonal movement slides along walls", () => {
  const b = { x: 20, z: 20, halfX: 2, halfZ: 5, rotation: 0 };
  const p = moveWithCollisions(17, 18, 2, 2, 0.45, [], 0, [b]);
  assert.ok(p[0] <= 17.551);
  assert.ok(p[1] > 19.9);
});
test("unwatered crops do not grow; harvest is atomic and repeat-safe", () => {
  let f = updateFarm(newFarm(), { type: "plant", index: 0 });
  for (let i = 0; i < 100; i++) f = updateFarm(f, { type: "tick" });
  assert.equal(f.plots[0].growth, 0);
  assert.equal(updateFarm(f, { type: "harvest", index: 0 }), f);
  f = updateFarm(f, { type: "water", index: 0 });
  for (let i = 0; i < 90; i++) f = updateFarm(f, { type: "tick" });
  f = updateFarm(f, { type: "harvest", index: 0 });
  assert.equal(f.food, 3);
  assert.equal(f.seeds, 7);
  assert.equal(updateFarm(f, { type: "harvest", index: 0 }), f);
  assert.deepEqual(readFarm(JSON.parse(JSON.stringify(f))), f);
  assert.deepEqual(readFarm({ version: 1, seeds: -1 }), newFarm());
});
