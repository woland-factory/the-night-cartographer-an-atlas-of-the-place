import { APP_VERSION } from "../version";
import {
  ATLAS_FORMAT,
  CURRENT_VERSION,
  type AtlasFile,
  type Entry,
  type Place,
  type Shape,
  type Stratum,
  type World,
} from "../model/atlas";

// A full atlas with places, a stratum carrying SVG-path shapes, and entries.
// Written as an explicit literal (no undefined fields) so round-trip
// deep-equality is unambiguous.
export function fullAtlasFixture(): AtlasFile {
  return {
    format: ATLAS_FORMAT,
    version: CURRENT_VERSION,
    meta: { createdAt: "2020-01-01T00:00:00.000Z", appVersion: APP_VERSION },
    settings: { activeWorldId: "w1" },
    worlds: [
      {
        id: "w1",
        name: "Harbor City",
        createdAt: "2020-01-01T00:00:00.000Z",
        isSample: false,
        currentStratumId: "s1",
        strata: [
          {
            id: "s1",
            createdAt: "2020-01-02T00:00:00.000Z",
            label: "first draft",
            derivedFrom: null,
            shapes: [
              {
                id: "sh1",
                type: "district",
                geometry: "120,140 360,120 400,360 160,380",
                styleToken: "ink",
                text: "The Harbor",
                placeId: "p1",
              },
              {
                id: "sh2",
                type: "coastline",
                geometry: "40,620 200,660 360,600 520,640",
                styleToken: "sea",
              },
            ],
          },
        ],
        places: [
          {
            id: "p1",
            name: "The Harbor",
            anchor: { x: 50, y: 50 },
            createdAt: "2020-01-01T00:00:00.000Z",
          },
          {
            id: "p2",
            name: "The Fog Stair",
            anchor: { shapeRef: "sh2" },
            createdAt: "2020-01-03T00:00:00.000Z",
          },
        ],
        entries: [
          {
            id: "e1",
            placeId: "p1",
            date: "2020-02-01",
            body: "The tide was out and the streets ran under the water.",
            createdAt: "2020-02-01T07:00:00.000Z",
          },
          {
            id: "e2",
            placeId: "p1",
            date: "2021-05-11",
            body: "Same bench, older gulls.",
            createdAt: "2021-05-11T06:30:00.000Z",
          },
        ],
      },
    ],
  };
}

// A years-deep atlas for the perf locks: many places, thousands of entries
// weighted onto the busiest place, and many append-only strata. Fully
// deterministic (a fixed epoch, no Date.now, no random) so the node-count and
// ordering assertions are stable. Test-only: never imported by production.
const STRESS_EPOCH = Date.UTC(2015, 0, 1);
const DAY_MS = 86_400_000;

// The busiest place is index 0. Two of every three entries land there, spread
// across the whole timeline, so its history is genuinely large and years-deep.
function stressPlaceIndex(n: number, placeCount: number): number {
  if (placeCount <= 1 || n % 3 !== 2) return 0;
  return 1 + (Math.floor(n / 3) % (placeCount - 1));
}

export function stressWorld(opts?: {
  places?: number; // default 12
  entries?: number; // default 3000, weighted onto the first place
  strata?: number; // default 30
}): World {
  const placeCount = opts?.places ?? 12;
  const entryCount = opts?.entries ?? 3000;
  const strataCount = opts?.strata ?? 30;
  const spanDays = 3652; // about ten calendar years

  const places: Place[] = [];
  for (let i = 0; i < placeCount; i++) {
    places.push({
      id: `sp${i}`,
      name: `District ${i + 1}`,
      anchor: { x: 100 + i * 20, y: 100 + i * 15 },
      createdAt: new Date(STRESS_EPOCH + i * DAY_MS).toISOString(),
    });
  }

  // Append-only strata: each survey adds the next district shape, then holds,
  // so both the current-stratum render and the time-scrub replay run at scale.
  const strata: Stratum[] = [];
  for (let s = 0; s < strataCount; s++) {
    const drawn = Math.min(s + 1, placeCount);
    const shapes: Shape[] = [];
    for (let i = 0; i < drawn; i++) {
      const x = 100 + i * 20;
      const y = 100 + i * 15;
      shapes.push({
        id: `sp${i}-district`,
        type: "district",
        geometry: `${x},${y} ${x + 40},${y} ${x + 40},${y + 50} ${x},${y + 50}`,
        styleToken: "ink",
        placeId: `sp${i}`,
      });
    }
    strata.push({
      id: `stratum-${s}`,
      createdAt: new Date(STRESS_EPOCH + s * 30 * DAY_MS).toISOString(),
      label: `Survey ${s + 1}`,
      derivedFrom: s === 0 ? null : `stratum-${s - 1}`,
      shapes,
    });
  }

  // Dates climb with n (spread across ~10 years); createdAt is strictly
  // increasing and unique, so newest-first ordering is never ambiguous.
  const entries: Entry[] = [];
  for (let n = 0; n < entryCount; n++) {
    const placeIndex = stressPlaceIndex(n, placeCount);
    const dayOffset = Math.floor((n * spanDays) / entryCount);
    const date = new Date(STRESS_EPOCH + dayOffset * DAY_MS)
      .toISOString()
      .slice(0, 10);
    entries.push({
      id: `entry-${n}`,
      placeId: `sp${placeIndex}`,
      date,
      body: `Visit ${n + 1} at District ${placeIndex + 1}`,
      createdAt: new Date(STRESS_EPOCH + n * 1000).toISOString(),
    });
  }

  return {
    id: "stress-world",
    name: "Stress Atlas",
    createdAt: new Date(STRESS_EPOCH).toISOString(),
    isSample: false,
    places,
    strata,
    currentStratumId: `stratum-${strataCount - 1}`,
    entries,
  };
}

export function stressAtlas(): AtlasFile {
  return {
    format: ATLAS_FORMAT,
    version: CURRENT_VERSION,
    meta: {
      createdAt: new Date(STRESS_EPOCH).toISOString(),
      appVersion: APP_VERSION,
    },
    settings: { activeWorldId: "stress-world" },
    worlds: [stressWorld()],
  };
}
