import { describe, expect, it } from "vitest";
import { commitShape, currentShapes, undoLastEdit } from "./strata";
import { createWorld } from "./factory";
import type { Shape, World } from "./atlas";

function district(id: string): Shape {
  return {
    id,
    type: "district",
    geometry: "10,10 90,10 90,90 10,90",
    styleToken: "ink",
  };
}

// Deep clone via JSON so the "prior strata never mutated" check compares
// values, not references.
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertPriorStrataUntouched(before: World, after: World) {
  for (const prior of before.strata) {
    const stillThere = after.strata.find((s) => s.id === prior.id);
    expect(stillThere, `stratum ${prior.id} survives`).toBeTruthy();
    expect(stillThere).toEqual(prior);
  }
}

describe("strata engine (append-only)", () => {
  it("commitShape appends exactly one stratum and advances the pointer", () => {
    const world = createWorld("Harbor City");
    const before = clone(world);

    const next = commitShape(world, district("sh1"));

    expect(next.strata.length).toBe(before.strata.length + 1);
    const head = next.strata[next.strata.length - 1];
    expect(next.currentStratumId).toBe(head.id);
    expect(head.derivedFrom).toBe(before.currentStratumId);
    expect(currentShapes(next).map((s) => s.id)).toEqual(["sh1"]);
    // The input world is never mutated.
    expect(world).toEqual(before);
  });

  it("never mutates or deletes a prior stratum across many commits", () => {
    let world = createWorld("Harbor City");
    world = commitShape(world, district("sh1"));
    const snapshot = clone(world);

    world = commitShape(world, district("sh2"));
    assertPriorStrataUntouched(snapshot, world);

    world = commitShape(world, district("sh3"));
    assertPriorStrataUntouched(snapshot, world);

    expect(currentShapes(world).map((s) => s.id)).toEqual([
      "sh1",
      "sh2",
      "sh3",
    ]);
  });

  it("undoLastEdit appends a stratum restoring the previous snapshot", () => {
    let world = createWorld("Harbor City");
    world = commitShape(world, district("sh1"));
    world = commitShape(world, district("sh2"));
    const before = clone(world);

    const undone = undoLastEdit(world);

    // A new revision, not a deletion.
    expect(undone.strata.length).toBe(before.strata.length + 1);
    expect(currentShapes(undone).map((s) => s.id)).toEqual(["sh1"]);
    assertPriorStrataUntouched(before, undone);
  });

  it("undoing the first edit restores an empty map, still as a new stratum", () => {
    let world = createWorld("Harbor City");
    world = commitShape(world, district("sh1"));
    const before = clone(world);

    const undone = undoLastEdit(world);

    expect(undone.strata.length).toBe(before.strata.length + 1);
    expect(currentShapes(undone)).toEqual([]);
  });

  it("currentShapes is empty for a world with no strata", () => {
    expect(currentShapes(createWorld("Empty"))).toEqual([]);
  });
});
