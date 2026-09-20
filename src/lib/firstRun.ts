// The "first run complete" flag for the guided first-success walk. Per-device
// UI state, so it lives in localStorage and never in the atlas file: the file
// the user owns stays free of onboarding state.
//
// Guarded: a storage-blocked browser reads as "complete", so the walk simply
// does not show and nothing ever crashes over it.

const KEY = "nc.firstRunDone";

export function hasCompletedFirstRun(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

export function markFirstRunComplete(): void {
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    // Storage blocked: nothing to persist.
  }
}
