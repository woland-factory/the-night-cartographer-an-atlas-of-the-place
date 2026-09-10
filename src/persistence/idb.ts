import { openDB, type IDBPDatabase } from "idb";
import type { AtlasFile } from "../model/atlas";

// Working-state persistence: one object store holding the single working
// atlas under a fixed key. The store autosaves here (debounced). On load,
// the app reads IndexedDB first.

const DB_NAME = "night-cartographer";
const DB_VERSION = 1;
const STORE = "atlas";
const KEY = "working";

let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE)) {
          database.createObjectStore(STORE);
        }
      },
    });
  }
  return dbPromise;
}

export async function loadAtlas(): Promise<AtlasFile | null> {
  const database = await db();
  const value = (await database.get(STORE, KEY)) as AtlasFile | undefined;
  return value ?? null;
}

export async function saveAtlas(atlas: AtlasFile): Promise<void> {
  const database = await db();
  await database.put(STORE, atlas, KEY);
}

export async function clearAtlas(): Promise<void> {
  const database = await db();
  await database.delete(STORE, KEY);
}

// Test helper: drop the cached connection so a fresh IDBFactory is picked up
// between tests.
export function __resetIdbForTests(): void {
  dbPromise = null;
}
