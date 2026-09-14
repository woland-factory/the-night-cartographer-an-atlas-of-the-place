import { describe, expect, it, vi } from "vitest";
import { placeLedger } from "../model/ledger";
import { fullAtlasFixture } from "../test/fixtures";
import * as idb from "../persistence/idb";
import {
  addEntry,
  addPlaceAtPoint,
  commitShape,
  getSaveStatus,
  getState,
  importAtlas,
} from "./atlasStore";

function world() {
  return getState()!.worlds[0];
}

describe("addEntry", () => {
  it("appends one entry with the given placeId, trimmed body, and date", () => {
    importAtlas(fullAtlasFixture());
    const before = world().entries.length;

    addEntry("w1", "p1", "2026-09-14", "  the pier at low tide  ");

    const entries = world().entries;
    expect(entries).toHaveLength(before + 1);
    const added = entries[entries.length - 1];
    expect(added.placeId).toBe("p1");
    expect(added.date).toBe("2026-09-14");
    expect(added.body).toBe("the pier at low tide");
  });

  it("produces a new atlas object", () => {
    importAtlas(fullAtlasFixture());
    const before = getState();
    addEntry("w1", "p1", "2026-09-14", "a dream");
    expect(getState()).not.toBe(before);
  });

  it("is a no-op for an unknown place, empty body, or malformed date", () => {
    importAtlas(fullAtlasFixture());
    const before = world().entries.length;

    addEntry("w1", "does-not-exist", "2026-09-14", "x");
    addEntry("w1", "p1", "2026-09-14", "   ");
    addEntry("w1", "p1", "2026/09/14", "x");
    addEntry("w1", "p1", "not-a-date", "x");

    expect(world().entries).toHaveLength(before);
  });
});

describe("addPlaceAtPoint", () => {
  it("mints a point-anchored place, returns its id, and adds no shape or stratum", () => {
    importAtlas(fullAtlasFixture());
    const placesBefore = world().places.length;
    const strataBefore = world().strata.length;

    const id = addPlaceAtPoint("w1", "  The Well  ", { x: 300, y: 400 });

    expect(id).toBeTruthy();
    const place = world().places.find((p) => p.id === id);
    expect(place?.name).toBe("The Well");
    expect(place?.anchor).toEqual({ x: 300, y: 400 });
    expect(world().places).toHaveLength(placesBefore + 1);
    // No shape and no new stratum: a dropped place never touches the map.
    expect(world().strata).toHaveLength(strataBefore);
  });

  it("returns null and adds no place for an empty name", () => {
    importAtlas(fullAtlasFixture());
    const before = world().places.length;
    expect(addPlaceAtPoint("w1", "   ", { x: 1, y: 2 })).toBeNull();
    expect(world().places).toHaveLength(before);
  });
});

describe("entries survive later map revisions (recall foundation)", () => {
  it("keeps an entry resolving to its place after a redraw appends a stratum", () => {
    importAtlas(fullAtlasFixture());
    addEntry("w1", "p1", "2026-09-14", "the pier at low tide");

    const before = placeLedger(world().entries, "p1");
    expect(before.count).toBe(3); // two fixture entries plus the new one

    // Redraw the map: a new stratum, a wholly new revision.
    commitShape("w1", {
      id: "sh-redraw",
      type: "road",
      geometry: "0,0 500,500",
      styleToken: "rust",
    });

    // The place is unchanged and the entry still resolves to it.
    const place = world().places.find((p) => p.id === "p1");
    expect(place?.anchor).toEqual({ x: 50, y: 50 });
    const after = placeLedger(world().entries, "p1");
    expect(after.count).toBe(3);
    expect(after.entries.some((e) => e.body === "the pier at low tide")).toBe(
      true,
    );
  });
});

describe("save status", () => {
  it("goes to error on a rejected autosave and back to idle on a later success", async () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(idb, "saveAtlas").mockResolvedValue(undefined);
    spy.mockRejectedValueOnce(new Error("disk full"));
    try {
      importAtlas(fullAtlasFixture());

      addPlaceAtPoint("w1", "The Well", { x: 10, y: 10 });
      await vi.advanceTimersByTimeAsync(600);
      expect(getSaveStatus()).toBe("error");

      // A later accepted write clears the banner.
      addPlaceAtPoint("w1", "The Tower", { x: 20, y: 20 });
      await vi.advanceTimersByTimeAsync(600);
      expect(getSaveStatus()).toBe("idle");
    } finally {
      spy.mockRestore();
      vi.useRealTimers();
    }
  });
});
