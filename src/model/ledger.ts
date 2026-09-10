import type { Entry, World } from "./atlas";

// The ledger is DERIVED, never stored. It computes, per place, the entry
// count and the most recent entry date. The read-only recall readout (and,
// in a later EPIC, the signature panel) consume this.

export interface PlaceLedger {
  count: number;
  lastVisit: string | null; // the most recent entry's date (YYYY-MM-DD)
  entries: Entry[]; // newest-first, by date then createdAt
}

function sortNewestFirst(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    // Same dream date: fall back to createdAt so ordering is stable.
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return 0;
  });
}

export function placeLedger(entries: Entry[], placeId: string): PlaceLedger {
  const forPlace = sortNewestFirst(entries.filter((e) => e.placeId === placeId));
  return {
    count: forPlace.length,
    lastVisit: forPlace.length > 0 ? forPlace[0].date : null,
    entries: forPlace,
  };
}

export function worldLedger(world: World): Record<string, PlaceLedger> {
  const byPlace: Record<string, PlaceLedger> = {};
  for (const place of world.places) {
    byPlace[place.id] = placeLedger(world.entries, place.id);
  }
  return byPlace;
}
