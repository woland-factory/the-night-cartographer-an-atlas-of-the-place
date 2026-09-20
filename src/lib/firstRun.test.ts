import { afterEach, describe, expect, it } from "vitest";
import { hasCompletedFirstRun, markFirstRunComplete } from "./firstRun";

// The per-device first-run flag. It reads back what it writes, and a
// storage-blocked browser reads as "complete" so the walk simply never shows.

// Simulate a browser that blocks storage (Safari private mode throws on the
// localStorage accessor itself) by replacing the window property for one test.
function withBlockedStorage(run: () => void) {
  const original = Object.getOwnPropertyDescriptor(window, "localStorage");
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get() {
      throw new Error("storage blocked");
    },
  });
  try {
    run();
  } finally {
    if (original) Object.defineProperty(window, "localStorage", original);
  }
}

afterEach(() => {
  window.localStorage.clear();
});

describe("first-run flag", () => {
  it("defaults to not-complete on a fresh device", () => {
    expect(hasCompletedFirstRun()).toBe(false);
  });

  it("reads back complete after it is marked", () => {
    markFirstRunComplete();
    expect(hasCompletedFirstRun()).toBe(true);
  });

  it("reads as complete when storage throws, so the walk stays hidden", () => {
    withBlockedStorage(() => {
      expect(hasCompletedFirstRun()).toBe(true);
    });
  });

  it("does not throw when marking fails on blocked storage", () => {
    withBlockedStorage(() => {
      expect(() => markFirstRunComplete()).not.toThrow();
    });
  });
});
