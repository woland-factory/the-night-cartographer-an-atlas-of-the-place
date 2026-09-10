import { useSyncExternalStore } from "react";
import { getState, subscribe } from "./atlasStore";

export function useAtlas() {
  return useSyncExternalStore(subscribe, getState, getState);
}
