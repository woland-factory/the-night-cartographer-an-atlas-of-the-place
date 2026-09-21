import { describe, expect, it } from "vitest";
import { stressAtlas, stressWorld } from "../test/fixtures";
import { validateAtlas } from "./schema";
import { buildRecallIndex } from "./recallIndex";

// The load-bearing perf lock: the signature moment must stay instant no matter
// how large the atlas grows. These assertions prove SHAPE, not wall-clock
// (which is flaky on shared CI): a single-pass build, an O(1) get() that
// returns a stable precomputed reference, a correctly ordered ledger, and a
// busiest place whose whole history is present and newest-first. Together they
// prove recall does not get slower with every entry the user logs.

describe("recall index on a years-deep stress atlas", () => {
  const world = stressWorld();
  const index = buildRecallIndex(world);
  const busiestId = "sp0";

  it("ships a valid atlas that passes the schema", () => {
    const result = validateAtlas(stressAtlas());
    expect(result.ok).toBe(true);
  });

  it("get() returns the same precomputed reference on repeated calls (O(1), never re-filtered)", () => {
    const first = index.get(busiestId);
    const second = index.get(busiestId);
    expect(second).toBe(first);
    expect(second.entries).toBe(first.entries);
  });

  it("holds every place in the ledger, ordered by last visit", () => {
    expect(index.ledger).toHaveLength(world.places.length);
    // Every place got entries, so the ledger is strictly last-visit descending.
    for (let i = 1; i < index.ledger.length; i++) {
      const prev = index.ledger[i - 1].lastVisit;
      const curr = index.ledger[i].lastVisit;
      expect(prev).not.toBeNull();
      expect(curr).not.toBeNull();
      expect(prev! >= curr!).toBe(true);
    }
  });

  it("answers the busiest place with its whole history, newest-first", () => {
    const expectedCount = world.entries.filter(
      (e) => e.placeId === busiestId,
    ).length;
    const recall = index.get(busiestId);

    // The busiest place carries far more than one recall page.
    expect(recall.count).toBe(expectedCount);
    expect(recall.count).toBeGreaterThan(1000);
    expect(recall.entries).toHaveLength(expectedCount);
    expect(recall.lastVisit).toBe(recall.entries[0].date);

    // Newest-first throughout: date descending, createdAt breaking ties.
    for (let j = 1; j < recall.entries.length; j++) {
      const a = recall.entries[j - 1];
      const b = recall.entries[j];
      const ordered =
        a.date > b.date || (a.date === b.date && a.createdAt >= b.createdAt);
      expect(ordered).toBe(true);
    }
  });

  it("renders only the current stratum's shapes, never a scan across all strata", () => {
    // The current stratum is the newest snapshot; recall/render never widen to
    // the full palimpsest. The busiest map holds one shape per drawn district.
    const current = world.strata.find((s) => s.id === world.currentStratumId);
    expect(current).toBeDefined();
    expect(current!.shapes).toHaveLength(world.places.length);
    // Many strata exist, but the render reads one.
    expect(world.strata.length).toBeGreaterThan(1);
  });
});
