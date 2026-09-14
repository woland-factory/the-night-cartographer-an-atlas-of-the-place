import { getConfig } from "../config";
import { demoAtlas, demoWorld, SAMPLE_WORLD_ID } from "../data/demoAtlas";
import type { AtlasFile, Shape, World } from "../model/atlas";
import { createAtlas, createPlace, createWorld } from "../model/factory";
import { polygonCentroid, stringToPoints } from "../model/geometry";
import {
  commitShape as commitShapeInWorld,
  currentShapes,
  snapshotWith,
  undoLastEdit as undoLastEditInWorld,
} from "../model/strata";
import { loadAtlas, saveAtlas } from "../persistence/idb";

// The single source of truth. An in-memory atlas plus subscribe, wired for
// React via useSyncExternalStore. Every mutation produces a new atlas object
// (so React sees a change) and schedules a debounced autosave to IndexedDB.

type Listener = () => void;

const SAVE_DEBOUNCE_MS = 500;

let atlas: AtlasFile | null = null;
const listeners = new Set<Listener>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function emit(): void {
  for (const listener of listeners) listener();
}

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (atlas) void saveAtlas(atlas);
  }, SAVE_DEBOUNCE_MS);
}

function set(next: AtlasFile, persist = true): void {
  atlas = next;
  emit();
  if (persist) scheduleSave();
}

export function getState(): AtlasFile | null {
  return atlas;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// On startup: read IndexedDB first. A saved atlas is never overwritten. If
// there is none and SEED_DEMO is on, load and auto-open the sample. If there
// is none and SEED_DEMO is off, start with an empty atlas (the designed
// empty state).
export async function init(): Promise<void> {
  const saved = await loadAtlas();
  if (saved) {
    set(saved, false);
    return;
  }

  if (getConfig().seedDemo) {
    set(demoAtlas(), true);
    return;
  }

  set(createAtlas(), false);
}

export function addWorld(name: string): void {
  if (!atlas) return;
  const world = createWorld(name);
  set({ ...atlas, worlds: [...atlas.worlds, world] });
}

export function openWorld(worldId: string): void {
  if (!atlas) return;
  set({ ...atlas, settings: { ...atlas.settings, activeWorldId: worldId } });
}

export function closeWorld(): void {
  if (!atlas) return;
  set({ ...atlas, settings: { ...atlas.settings, activeWorldId: null } });
}

// Add the sample world alongside any existing worlds (never replacing them)
// and open it. Adding is idempotent thanks to the fixed sample id.
export function openSample(): void {
  if (!atlas) return;
  const hasSample = atlas.worlds.some((w) => w.id === SAMPLE_WORLD_ID);
  const worlds = hasSample ? atlas.worlds : [...atlas.worlds, demoWorld()];
  set({
    ...atlas,
    worlds,
    settings: { ...atlas.settings, activeWorldId: SAMPLE_WORLD_ID },
  });
}

// Replace one world in place, producing a new atlas object. Every map mutation
// runs through here so subscribers see a change and autosave is scheduled.
function replaceWorld(worldId: string, update: (world: World) => World): void {
  if (!atlas) return;
  const worlds = atlas.worlds.map((w) => (w.id === worldId ? update(w) : w));
  set({ ...atlas, worlds });
}

// Commit a finished shape (road, coastline, fog edge, stamp, label, or an
// unnamed district). Appends exactly one stratum.
export function commitShape(worldId: string, shape: Shape): void {
  replaceWorld(worldId, (world) => commitShapeInWorld(world, shape));
}

// Commit a freshly drawn district and, when a name is given, mint its place in
// the SAME stratum: the district shape carries the new place's id and the place
// is added to world.places with a centroid anchor. This is the common path, so
// naming a fresh district appends exactly one stratum. An empty name commits an
// unnamed district (a valid shape, no place).
export function commitDistrict(
  worldId: string,
  shape: Shape,
  name: string,
): void {
  const trimmed = name.trim();
  replaceWorld(worldId, (world) => {
    if (!trimmed) return commitShapeInWorld(world, shape);
    const anchor = polygonCentroid(stringToPoints(shape.geometry));
    const place = createPlace(trimmed, anchor);
    const named: Shape = { ...shape, placeId: place.id };
    const next = commitShapeInWorld(world, named);
    return { ...next, places: [...next.places, place] };
  });
}

// Name a district that was already committed. Appends a new stratum carrying a
// placeId-updated copy of that district; prior strata keep the unnamed copy.
export function nameDistrict(
  worldId: string,
  shapeId: string,
  name: string,
): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  replaceWorld(worldId, (world) => {
    const shapes = currentShapes(world);
    const target = shapes.find((s) => s.id === shapeId);
    if (!target || target.type !== "district") return world;
    const anchor = polygonCentroid(stringToPoints(target.geometry));
    const place = createPlace(trimmed, anchor);
    const nextShapes = shapes.map((s) =>
      s.id === shapeId ? { ...s, placeId: place.id } : s,
    );
    const next = snapshotWith(world, nextShapes);
    return { ...next, places: [...next.places, place] };
  });
}

// Revert the last committed edit by appending a stratum equal to the previous
// snapshot. Palimpsest-safe: never a deletion.
export function undoLastEdit(worldId: string): void {
  replaceWorld(worldId, (world) => undoLastEditInWorld(world));
}

// Import replaces the working atlas with the imported one.
export function importAtlas(next: AtlasFile): void {
  set(next, true);
}

// Test helper: reset in-memory state and any pending save between tests.
export function __resetStoreForTests(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  atlas = null;
}
