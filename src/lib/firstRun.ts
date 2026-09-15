// The "first recall seen" flag for the coach mark. Per-device UI state, so it
// lives in localStorage and never in the atlas file: the file the user owns
// stays free of onboarding state.
//
// Guarded: a storage-blocked browser reads as "seen", so the hint simply does
// not show and nothing ever crashes over it.

const KEY = "nc.recallHintSeen";

export function hasSeenRecallHint(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

export function markRecallHintSeen(): void {
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    // Storage blocked: nothing to persist.
  }
}
