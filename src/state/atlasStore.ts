import { getConfig } from "../config";
import { demoAtlas, demoWorld, SAMPLE_WORLD_ID } from "../data/demoAtlas";
import type { AtlasFile, Point, Shape, World } from "../model/atlas";
import {
  createAtlas,
  createEntry,
  createPlace,
  createWorld,
} from "../model/factory";
import { polygonCentroid, stringToPoints } from "../model/geometry";
import { MAX_BODY } from "../model/schema";
import {
  commitShape as commitShapeInWorld,
  currentShapes,
  snapshotWith,
  undoLastEdit as undoLastEditInWorld,
} from "../model/strata";
import { reportError } from "../hooks/errors";
import { loadAtlas, saveAtlas } from "../persistence/idb";

// The single source of truth. An in-memory atlas plus subscribe, wired for
// React via useSyncExternalStore. Every mutation produces a new atlas object
// (so React sees a change) and schedules a debounced autosave to IndexedDB.

type Listener = () => void;

// The device-write status, surfaced so the world view can show a designed,
// actionable banner when a genuine autosave fails. The entry is already in
// memory (optimistic), so this only reports a real persistence failure.
export type SaveStatus = "idle" | "saving" | "error";

const SAVE_DEBOUNCE_MS = 500;

let atlas: AtlasFile | null = null;
let saveStatus: SaveStatus = "idle";
const listeners = new Set<Listener>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function emit(): void {
  for (const listener of listeners) listener();
}

function setSaveStatus(next: SaveStatus): void {
  if (saveStatus === next) return;
  saveStatus = next;
  emit();
}

export function getSaveStatus(): SaveStatus {
  return saveStatus;
}

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const current = atlas;
    if (!current) return;
    setSaveStatus("saving");
    saveAtlas(current).then(
      () => setSaveStatus("idle"),
      (err: unknown) => {
        // Report the failure without ever handing atlas content to the tracker.
        reportError(err instanceof Error ? err : new Error("atlas save failed"));
        setSaveStatus("error");
      },
    );
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

// Pin one morning's entry to a place. The composer prevents bad input; the
// store re-checks (defense in depth): the placeId must exist in this world, the
// date must be YYYY-MM-DD, and the body must be non-empty after trimming. The
// body is stored trimmed and capped. Optimistic and synchronous: the caller
// can read the new entry immediately.
export function addEntry(
  worldId: string,
  placeId: string,
  date: string,
  body: string,
): void {
  if (!atlas) return;
  const world = atlas.worlds.find((w) => w.id === worldId);
  if (!world) return;
  if (!world.places.some((p) => p.id === placeId)) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  const trimmed = body.trim().slice(0, MAX_BODY);
  if (!trimmed) return;
  replaceWorld(worldId, (w) => ({
    ...w,
    entries: [...w.entries, createEntry(placeId, date, trimmed)],
  }));
}

// Mint a bare place at a dropped point (a Point anchor, no district shape and
// no new stratum) and return its id so the composer can select it. A dropped
// place lands in world.places exactly like a district-born place, so recall
// survives later redraws. Returns null (and does nothing) for an empty name.
export function addPlaceAtPoint(
  worldId: string,
  name: string,
  point: Point,
): string | null {
  if (!atlas) return null;
  const world = atlas.worlds.find((w) => w.id === worldId);
  if (!world) return null;
  if (!name.trim()) return null;
  const place = createPlace(name, point);
  replaceWorld(worldId, (w) => ({ ...w, places: [...w.places, place] }));
  return place.id;
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
  saveStatus = "idle";
}
