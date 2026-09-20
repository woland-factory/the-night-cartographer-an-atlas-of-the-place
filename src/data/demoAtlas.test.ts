import { describe, expect, it } from "vitest";
import { demoShapes, demoWorld } from "./demoAtlas";

// The sample world's three-stratum chain: the map grew as the visits accrued.
// The newest snapshot must stay byte-identical to demoShapes() so every render,
// seed, and e2e assertion about the sample map holds.

function shapeIds(shapes: { id: string }[]): string[] {
  return shapes.map((s) => s.id);
}

describe("demo sample-world strata", () => {
  it("is a three-stratum chain in ascending append order", () => {
    const strata = demoWorld().strata;
    expect(strata).toHaveLength(3);

    const dates = strata.map((s) => s.createdAt);
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);

    expect(strata[0].derivedFrom).toBeNull();
    expect(strata[1].derivedFrom).toBe(strata[0].id);
    expect(strata[2].derivedFrom).toBe(strata[1].id);
  });

  it("names the newest stratum as current, deep-equal to demoShapes()", () => {
    const world = demoWorld();
    const newest = world.strata[world.strata.length - 1];
    expect(world.currentStratumId).toBe(newest.id);
    expect(newest.shapes).toEqual(demoShapes());
  });

  it("holds only the harbor and coast in the 2019 survey", () => {
    const s1 = demoWorld().strata[0];
    expect(shapeIds(s1.shapes)).toEqual([
      "sample-shape-harbor-district",
      "sample-shape-harbor-label",
      "sample-shape-coastline",
    ]);
  });

  it("adds the clockmarket, road, and tower stamp in the 2021 survey", () => {
    const s2 = demoWorld().strata[1];
    const ids = shapeIds(s2.shapes);
    for (const id of [
      "sample-shape-clockmarket-district",
      "sample-shape-clockmarket-label",
      "sample-shape-road",
      "sample-shape-stamp-tower",
    ]) {
      expect(ids).toContain(id);
    }
    // The fog stair arrives only in the newest survey.
    expect(ids).not.toContain("sample-shape-fogstair-district");
    expect(ids).not.toContain("sample-shape-fog-edge");
  });

  it("gives The Harbor multiple dated entries across several years, so recall answers back", () => {
    const world = demoWorld();
    const harbor = world.places.find((p) => p.name === "The Harbor");
    expect(harbor).toBeDefined();

    const harborEntries = world.entries.filter((e) => e.placeId === harbor!.id);
    // Recall demonstrates elapsed history only if there is real history to show.
    expect(harborEntries.length).toBeGreaterThanOrEqual(2);

    const years = new Set(harborEntries.map((e) => e.date.slice(0, 4)));
    expect(years.size).toBeGreaterThanOrEqual(2);
  });
});
