import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach } from "vitest";
import { __resetIdbForTests } from "../persistence/idb";
import { __resetFileHandleForTests } from "../persistence/file";
import { __resetStoreForTests } from "../state/atlasStore";

// Every test starts from a clean database, a reset store, and an empty
// runtime config. IndexedDB state must never leak between tests.
//
// Note: hooks/errors.ts is deliberately NOT imported here. Importing it in a
// setup file would evaluate @sentry/browser before a test's vi.mock could
// replace it. The error hook resets itself in its own test.
beforeEach(() => {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB =
    new IDBFactory();
  __resetIdbForTests();
  __resetStoreForTests();
  __resetFileHandleForTests();
  window.localStorage.clear();
  (window as unknown as { __NC_CONFIG__: unknown }).__NC_CONFIG__ = {};
});
