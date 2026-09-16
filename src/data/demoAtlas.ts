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

const SAMPLE_STRATUM_1 = "sample-stratum-1";
const SAMPLE_STRATUM_2 = "sample-stratum-2";
const SAMPLE_STRATUM_3 = "sample-stratum-3";

// Each map shape as its own fresh copy. The vertices are deliberately crooked:
// the shared rendering turns them into a coherent atlas, which is the proof a
// staging visitor sees. Districts link to the three sample places by placeId;
// the coordinates live in the canvas 0..1000 space. Naming each piece lets the
// dated strata below compose subsets of the exact same definitions, so an
// earlier survey can never drift from the whole.
const shape = {
  harborDistrict: (): Shape => ({
    id: "sample-shape-harbor-district",
    type: "district",
    geometry: "160,560 380,600 424,762 296,824 178,742",
    styleToken: "ink",
    placeId: HARBOR,
  }),
  harborLabel: (): Shape => ({
    id: "sample-shape-harbor-label",
    type: "label",
    geometry: "292,694",
    styleToken: "ink",
    text: "The Harbor",
  }),
  clockmarketDistrict: (): Shape => ({
    id: "sample-shape-clockmarket-district",
    type: "district",
    geometry: "214,214 424,196 470,362 300,404 206,338",
    styleToken: "moss",
    placeId: CLOCKMARKET,
  }),
  clockmarketLabel: (): Shape => ({
    id: "sample-shape-clockmarket-label",
    type: "label",
    geometry: "324,300",
    styleToken: "ink",
    text: "The Clockmarket",
  }),
  fogstairDistrict: (): Shape => ({
    id: "sample-shape-fogstair-district",
    type: "district",
    geometry: "602,182 822,224 838,384 664,402 588,300",
    styleToken: "plum",
    placeId: FOG_STAIR,
  }),
  fogstairLabel: (): Shape => ({
    id: "sample-shape-fogstair-label",
    type: "label",
    geometry: "712,300",
    styleToken: "ink",
    text: "The Fog Stair",
  }),
  coastline: (): Shape => ({
    id: "sample-shape-coastline",
    type: "coastline",
    geometry: "72,864 232,884 384,838 520,886 668,858 812,880",
    styleToken: "sea",
  }),
  road: (): Shape => ({
    id: "sample-shape-road",
    type: "road",
    geometry: "300,636 342,520 300,420 324,360",
    styleToken: "rust",
  }),
  fogEdge: (): Shape => ({
    id: "sample-shape-fog-edge",
    type: "fog",
    geometry: "556,120 662,86 782,142 884,108",
    styleToken: "fog",
  }),
  towerStamp: (): Shape => ({
    id: "sample-shape-stamp-tower",
    type: "stamp",
    geometry: "334,262",
    styleToken: "ink",
    text: "tower",
  }),
  bridgeStamp: (): Shape => ({
    id: "sample-shape-stamp-bridge",
    type: "stamp",
    geometry: "452,842",
    styleToken: "ink",
    text: "bridge",
  }),
};

// The 2019 survey: the harbor and its coast, nothing more.
function stratum1Shapes(): Shape[] {
  return [shape.harborDistrict(), shape.harborLabel(), shape.coastline()];
}

// The 2021 survey adds the clockmarket, the road up to it, and the tower stamp.
function stratum2Shapes(): Shape[] {
  return [
    shape.harborDistrict(),
    shape.harborLabel(),
    shape.coastline(),
    shape.clockmarketDistrict(),
    shape.clockmarketLabel(),
    shape.road(),
    shape.towerStamp(),
  ];
}

// The whole map as it stands today: the newest sample stratum is exactly this.
//
// Exported so the render tests and the showcase fixture use the exact geometry
// the sample world ships with. Order is fixed and load-bearing: stratum 3
// deep-equals this list.
export function demoShapes(): Shape[] {
  return [
    shape.harborDistrict(),
    shape.harborLabel(),
    shape.clockmarketDistrict(),
    shape.clockmarketLabel(),
    shape.fogstairDistrict(),
    shape.fogstairLabel(),
    shape.coastline(),
    shape.road(),
    shape.fogEdge(),
    shape.towerStamp(),
    shape.bridgeStamp(),
  ];
}

// Three dated revisions telling the story the sample entries already tell: the
// map grew as the visits accrued. Append order is the timeline; createdAt is
// only the label. The newest snapshot is byte-identical to demoShapes().
function demoStrata(): Stratum[] {
  return [
    {
      id: SAMPLE_STRATUM_1,
      createdAt: "2019-11-02T07:12:00.000Z",
      label: "first survey",
      derivedFrom: null,
      shapes: stratum1Shapes(),
    },
    {
      id: SAMPLE_STRATUM_2,
      createdAt: "2021-03-14T06:40:00.000Z",
      label: "the clockmarket",
      derivedFrom: SAMPLE_STRATUM_1,
      shapes: stratum2Shapes(),
    },
    {
      id: SAMPLE_STRATUM_3,
      createdAt: "2023-08-27T05:55:00.000Z",
      label: "the fog stair",
      derivedFrom: SAMPLE_STRATUM_2,
      shapes: demoShapes(),
    },
  ];
}

// Each call returns a fresh copy so callers can mutate freely.
export function demoWorld(): World {
  return {
    id: SAMPLE_WORLD_ID,
    name: "Harbor City",
    createdAt: "2019-11-02T07:12:00.000Z",
    isSample: true,
    currentStratumId: SAMPLE_STRATUM_3,
    strata: demoStrata(),
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
