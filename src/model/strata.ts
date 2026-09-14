// The strata engine: append-only, immutable prior revisions (the palimpsest).
// Every edit appends a new Stratum that is a full snapshot of the map at that
// revision. Prior strata are never mutated or deleted. currentStratumId points
// at the newest; derivedFrom links to the previous.
//
// These are pure helpers: each takes a World and returns a NEW World, never
// mutating the input or any prior stratum.

import type { Shape, World } from "./atlas";
import { createStratum } from "./factory";

// The shapes of the current stratum, or an empty list when there is none. This
// is the only stratum the hot render path ever reads, so render cost is bounded
// by the current shape count, never by the length of the edit history.
export function currentShapes(world: World): Shape[] {
  const current = world.strata.find((s) => s.id === world.currentStratumId);
  return current ? current.shapes : [];
}

// Append a stratum whose shapes are nextShapes, linked to the current one.
// Prior strata are carried by reference, never edited.
export function snapshotWith(world: World, nextShapes: Shape[]): World {
  const stratum = createStratum(nextShapes, world.currentStratumId ?? null);
  return {
    ...world,
    strata: [...world.strata, stratum],
    currentStratumId: stratum.id,
  };
}

// Append a stratum equal to the current shapes plus one more.
export function commitShape(world: World, shape: Shape): World {
  return snapshotWith(world, [...currentShapes(world), shape]);
}

// Revert the last committed edit by appending a stratum equal to the snapshot
// before the current one (following derivedFrom), or an empty map if the
// current stratum is the first. This is a new revision, never a truncation, so
// the palimpsest stays intact and EPIC 5 can still replay every revision.
export function undoLastEdit(world: World): World {
  const current = world.strata.find((s) => s.id === world.currentStratumId);
  const previousId = current?.derivedFrom ?? null;
  const previous = previousId
    ? world.strata.find((s) => s.id === previousId)
    : undefined;
  return snapshotWith(world, previous ? previous.shapes : []);
}
