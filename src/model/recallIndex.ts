import type { Entry, Place, World } from "./atlas";

// The recall lookup: the perf spine of the signature moment. Built in ONE
// pass over world.entries and memoized by the world view, so tapping a place
// is an O(1) map lookup returning an already-sorted list. The tap path must
// never scan the corpus: an atlas that grows for a decade has to answer as
// fast as the five-entry demo.

export interface PlaceRecall {
  place: Place;
  count: number;
  lastVisit: string | null; // most recent entry date (YYYY-MM-DD), or null
  entries: Entry[]; // newest-first (date desc, then createdAt desc)
}

export interface RecallIndex {
  // O(1) lookup. Returns the same PlaceRecall object reference on repeated
  // calls for the same id (precomputed, never re-filtered or re-sorted).
  get(placeId: string): PlaceRecall;
  // Every place in the world, ordered by last visit (most recent first),
  // unvisited places last by Place.createdAt ascending.
  ledger: PlaceRecall[];
}

// Same newest-first semantics as placeLedger: date desc, then createdAt desc.
function newestFirst(a: Entry, b: Entry): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  return 0;
}

function byLastVisit(a: PlaceRecall, b: PlaceRecall): number {
  if (a.lastVisit !== null && b.lastVisit !== null) {
    if (a.lastVisit !== b.lastVisit) return a.lastVisit < b.lastVisit ? 1 : -1;
    return 0;
  }
  if (a.lastVisit !== null) return -1;
  if (b.lastVisit !== null) return 1;
  if (a.place.createdAt !== b.place.createdAt) {
    return a.place.createdAt < b.place.createdAt ? -1 : 1;
  }
  return 0;
}

export function buildRecallIndex(world: World): RecallIndex {
  const byPlace = new Map<string, Entry[]>();
  for (const entry of world.entries) {
    const group = byPlace.get(entry.placeId);
    if (group) group.push(entry);
    else byPlace.set(entry.placeId, [entry]);
  }
  for (const group of byPlace.values()) group.sort(newestFirst);

  const recalls = new Map<string, PlaceRecall>();
  for (const place of world.places) {
    const entries = byPlace.get(place.id) ?? [];
    recalls.set(place.id, {
      place,
      count: entries.length,
      lastVisit: entries.length > 0 ? entries[0].date : null,
      entries,
    });
  }

  const ledger = [...recalls.values()].sort(byLastVisit);

  return {
    get(placeId: string): PlaceRecall {
      const recall = recalls.get(placeId);
      // Places are never deleted, so every tapped id is in the map.
      if (!recall) throw new Error("recall: unknown place");
      return recall;
    },
    ledger,
  };
}
