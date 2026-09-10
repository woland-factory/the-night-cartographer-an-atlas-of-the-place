import { describe, expect, it } from "vitest";
import { fullAtlasFixture } from "../test/fixtures";
import { placeLedger, worldLedger } from "./ledger";

describe("ledger", () => {
  it("derives count and last visit per place, newest first", () => {
    const world = fullAtlasFixture().worlds[0];
    const harbor = placeLedger(world.entries, "p1");
    expect(harbor.count).toBe(2);
    expect(harbor.lastVisit).toBe("2021-05-11");
    expect(harbor.entries.map((e) => e.id)).toEqual(["e2", "e1"]);
  });

  it("returns an empty ledger for a place with no entries", () => {
    const world = fullAtlasFixture().worlds[0];
    const fogStair = placeLedger(world.entries, "p2");
    expect(fogStair.count).toBe(0);
    expect(fogStair.lastVisit).toBeNull();
    expect(fogStair.entries).toEqual([]);
  });

  it("builds a per-place map for the whole world", () => {
    const world = fullAtlasFixture().worlds[0];
    const map = worldLedger(world);
    expect(Object.keys(map).sort()).toEqual(["p1", "p2"]);
    expect(map.p1.count).toBe(2);
    expect(map.p2.count).toBe(0);
  });
});
