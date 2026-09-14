import { useSyncExternalStore } from "react";
import { getSaveStatus, subscribe, type SaveStatus } from "./atlasStore";

// Reads the store's device-write status the same way useAtlas reads the atlas:
// over the shared subscribe, so a failed autosave re-renders the banner and a
// recovered save clears it.
export function useSaveStatus(): SaveStatus {
  return useSyncExternalStore(subscribe, getSaveStatus, getSaveStatus);
}
