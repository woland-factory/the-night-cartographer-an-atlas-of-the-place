import { getConfig } from "../config";
import { demoAtlas, demoWorld, SAMPLE_WORLD_ID } from "../data/demoAtlas";
import type { AtlasFile } from "../model/atlas";
import { createAtlas, createWorld } from "../model/factory";
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
