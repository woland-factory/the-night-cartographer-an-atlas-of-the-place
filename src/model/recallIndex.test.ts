import { describe, expect, it } from "vitest";
import type { Entry, Place, World } from "./atlas";
import { buildRecallIndex } from "./recallIndex";

function place(id: string, createdAt: string): Place {
  return { id, name: `Place ${id}`, anchor: { x: 100, y: 100 }, createdAt };
}

function entry(
  id: string,
  placeId: string,
  date: string,
  createdAt = `${date}T07:00:00.000Z`,
): Entry {
  return { id, placeId, date, body: `body ${id}`, createdAt };
}

function world(places: Place[], entries: Entry[]): World {
  return {
    id: "w1",
    name: "Harbor City",
    createdAt: "2019-01-01T00:00:00.000Z",
    places,
    strata: [],
    currentStratumId: null,
    entries,
  };
}

// Days since an epoch mapped to a YYYY-MM-DD string, for the large corpus.
function dateFromDay(day: number): string {
  const d = new Date(Date.UTC(2000, 0, 1 + day));
  return d.toISOString().slice(0, 10);
}

describe("buildRecallIndex", () => {
  it("groups, counts, and orders entries per place; empty for unvisited", () => {
    const w = world(
      [place("A", "2019-01-01T00:00:00.000Z"), place("B", "2019-02-01T00:00:00.000Z")],
      [entry("e1", "A", "2021-05-11"), entry("e2", "A", "2019-11-02")],
    );
    const index = buildRecallIndex(w);

    const a = index.get("A");
    expect(a.count).toBe(2);
    expect(a.lastVisit).toBe("2021-05-11");
    expect(a.entries.map((e) => e.id)).toEqual(["e1", "e2"]);

    const b = index.get("B");
    expect(b.count).toBe(0);
    expect(b.lastVisit).toBeNull();
    expect(b.entries).toEqual([]);

    expect(index.ledger.map((r) => r.place.id)).toEqual(["A", "B"]);
  });

  it("returns the same precomputed references on repeated get calls", () => {
    const w = world(
      [place("A", "2019-01-01T00:00:00.000Z")],
      [entry("e1", "A", "2021-05-11"), entry("e2", "A", "2019-11-02")],
    );
    const index = buildRecallIndex(w);
    const first = index.get("A");
    const second = index.get("A");
    // Same object AND same entries array: no per-call re-filter or re-sort.
    expect(second).toBe(first);
    expect(second.entries).toBe(first.entries);
  });

  it("breaks same-date ties by createdAt, newest first, stably", () => {
    const w = world(
      [place("A", "2019-01-01T00:00:00.000Z")],
      [
        entry("early", "A", "2021-05-11", "2021-05-11T06:00:00.000Z"),
        entry("late", "A", "2021-05-11", "2021-05-11T09:00:00.000Z"),
        entry("older", "A", "2020-01-01"),
      ],
    );
    const index = buildRecallIndex(w);
    expect(index.get("A").entries.map((e) => e.id)).toEqual([
      "late",
      "early",
      "older",
    ]);
  });

  it("orders the ledger by last visit desc, unvisited last by createdAt asc", () => {
    const w = world(
      [
        place("neverB", "2020-06-01T00:00:00.000Z"),
        place("recent", "2019-01-01T00:00:00.000Z"),
        place("neverA", "2020-01-01T00:00:00.000Z"),
        place("older", "2019-01-01T00:00:00.000Z"),
      ],
      [
        entry("e1", "older", "2020-03-03"),
        entry("e2", "recent", "2024-12-24"),
        entry("e3", "recent", "2021-01-01"),
      ],
    );
    const index = buildRecallIndex(w);
    expect(index.ledger.map((r) => r.place.id)).toEqual([
      "recent",
      "older",
      "neverA",
      "neverB",
    ]);
  });

  it("stays correct and ordered on a large corpus (5000 entries, 50 places)", () => {
    const places = Array.from({ length: 50 }, (_, i) =>
      place(`p${i}`, "2019-01-01T00:00:00.000Z"),
    );
    // Round-robin: place p_i gets entries on days i, i+50, i+100, ...
    const entries = Array.from({ length: 5000 }, (_, i) =>
      entry(`e${i}`, `p${i % 50}`, dateFromDay(i)),
    );
    const index = buildRecallIndex(world(places, entries));

    for (let i = 0; i < 50; i++) {
      const recall = index.get(`p${i}`);
      expect(recall.count).toBe(100);
      expect(recall.lastVisit).toBe(dateFromDay(4950 + i));
      // Newest-first throughout the group.
      for (let j = 1; j < recall.entries.length; j++) {
        expect(
          recall.entries[j - 1].date > recall.entries[j].date,
        ).toBe(true);
      }
    }

    // The ledger is last-visit descending: p49, p48, ... p0.
    expect(index.ledger.map((r) => r.place.id)).toEqual(
      Array.from({ length: 50 }, (_, i) => `p${49 - i}`),
    );
  });
});
