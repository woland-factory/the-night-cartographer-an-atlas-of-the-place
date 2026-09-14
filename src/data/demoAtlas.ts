import { APP_VERSION } from "../version";
import {
  ATLAS_FORMAT,
  CURRENT_VERSION,
  type AtlasFile,
  type Shape,
  type Stratum,
  type World,
} from "../model/atlas";

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

const DEMO_STRATUM_ID = "sample-stratum-1";

// One hand-authored, deliberately crooked map revision. The vertices are not
// tidy on purpose: the shared rendering turns them into a coherent atlas, which
// is the proof a staging visitor sees. Districts link to the three sample
// places by placeId; the coordinates live in the canvas 0..1000 space.
//
// Exported so the render tests and the showcase fixture use the exact geometry
// the sample world ships with.
export function demoShapes(): Shape[] {
  return [
    {
      id: "sample-shape-harbor-district",
      type: "district",
      geometry: "160,560 380,600 424,762 296,824 178,742",
      styleToken: "ink",
      placeId: HARBOR,
    },
    {
      id: "sample-shape-harbor-label",
      type: "label",
      geometry: "292,694",
      styleToken: "ink",
      text: "The Harbor",
    },
    {
      id: "sample-shape-clockmarket-district",
      type: "district",
      geometry: "214,214 424,196 470,362 300,404 206,338",
      styleToken: "moss",
      placeId: CLOCKMARKET,
    },
    {
      id: "sample-shape-clockmarket-label",
      type: "label",
      geometry: "324,300",
      styleToken: "ink",
      text: "The Clockmarket",
    },
    {
      id: "sample-shape-fogstair-district",
      type: "district",
      geometry: "602,182 822,224 838,384 664,402 588,300",
      styleToken: "plum",
      placeId: FOG_STAIR,
    },
    {
      id: "sample-shape-fogstair-label",
      type: "label",
      geometry: "712,300",
      styleToken: "ink",
      text: "The Fog Stair",
    },
    {
      id: "sample-shape-coastline",
      type: "coastline",
      geometry: "72,864 232,884 384,838 520,886 668,858 812,880",
      styleToken: "sea",
    },
    {
      id: "sample-shape-road",
      type: "road",
      geometry: "300,636 342,520 300,420 324,360",
      styleToken: "rust",
    },
    {
      id: "sample-shape-fog-edge",
      type: "fog",
      geometry: "556,120 662,86 782,142 884,108",
      styleToken: "fog",
    },
    {
      id: "sample-shape-stamp-tower",
      type: "stamp",
      geometry: "334,262",
      styleToken: "ink",
      text: "tower",
    },
    {
      id: "sample-shape-stamp-bridge",
      type: "stamp",
      geometry: "452,842",
      styleToken: "ink",
      text: "bridge",
    },
  ];
}

function demoStratum(): Stratum {
  return {
    id: DEMO_STRATUM_ID,
    createdAt: "2019-11-02T07:12:00.000Z",
    label: "first survey",
    derivedFrom: null,
    shapes: demoShapes(),
  };
}

// Each call returns a fresh copy so callers can mutate freely.
export function demoWorld(): World {
  return {
    id: SAMPLE_WORLD_ID,
    name: "Harbor City",
    createdAt: "2019-11-02T07:12:00.000Z",
    isSample: true,
    currentStratumId: DEMO_STRATUM_ID,
    strata: [demoStratum()],
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
