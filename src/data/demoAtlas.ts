import { APP_VERSION } from "../version";
import { ATLAS_FORMAT, CURRENT_VERSION, type AtlasFile, type World } from "../model/atlas";

// The bundled sample atlas. On staging with SEED_DEMO, a fresh visitor lands
// inside it and immediately sees a real place answer back: The Harbor
// carries dated entries across several years, so the elapsed-time readout is
// real and computed at runtime (never hardcoded here).
//
// Ids are fixed strings so the sample is deterministic and can be added to an
// existing atlas exactly once.

export const SAMPLE_WORLD_ID = "sample-harbor-city";

const HARBOR = "sample-place-harbor";
const CLOCKMARKET = "sample-place-clockmarket";
const FOG_STAIR = "sample-place-fog-stair";

// Each call returns a fresh copy so callers can mutate freely.
export function demoWorld(): World {
  return {
    id: SAMPLE_WORLD_ID,
    name: "Harbor City",
    createdAt: "2019-11-02T07:12:00.000Z",
    isSample: true,
    currentStratumId: null,
    strata: [],
    places: [
      {
        id: HARBOR,
        name: "The Harbor",
        anchor: { x: 220, y: 340 },
        createdAt: "2019-11-02T07:12:00.000Z",
      },
      {
        id: CLOCKMARKET,
        name: "The Clockmarket",
        anchor: { x: 140, y: 190 },
        createdAt: "2021-03-14T06:40:00.000Z",
      },
      {
        id: FOG_STAIR,
        name: "The Fog Stair",
        anchor: { x: 300, y: 120 },
        createdAt: "2023-08-27T05:55:00.000Z",
      },
    ],
    entries: [
      {
        id: "sample-entry-harbor-1",
        placeId: HARBOR,
        date: "2019-11-02",
        body: "The water stood still and the cranes leaned in like they were listening.",
        createdAt: "2019-11-02T07:12:00.000Z",
      },
      {
        id: "sample-entry-harbor-2",
        placeId: HARBOR,
        date: "2021-03-14",
        body: "A ferry left without a sound. I knew the far shore though I have never been.",
        createdAt: "2021-03-14T06:40:00.000Z",
      },
      {
        id: "sample-entry-harbor-3",
        placeId: HARBOR,
        date: "2023-08-27",
        body: "The tide was out. Under it, streets, and the smell of warm stone.",
        createdAt: "2023-08-27T05:55:00.000Z",
      },
      {
        id: "sample-entry-harbor-4",
        placeId: HARBOR,
        date: "2025-07-05",
        body: "Same bench at the end of the pier. The gulls remembered me first.",
        createdAt: "2025-07-05T06:20:00.000Z",
      },
      {
        id: "sample-entry-clockmarket-1",
        placeId: CLOCKMARKET,
        date: "2024-01-09",
        body: "Every clock told a different hour and all of them felt correct.",
        createdAt: "2024-01-09T06:05:00.000Z",
      },
    ],
  };
}

export function demoAtlas(): AtlasFile {
  return {
    format: ATLAS_FORMAT,
    version: CURRENT_VERSION,
    meta: { createdAt: "2019-11-02T07:12:00.000Z", appVersion: APP_VERSION },
    settings: { activeWorldId: SAMPLE_WORLD_ID },
    worlds: [demoWorld()],
  };
}
