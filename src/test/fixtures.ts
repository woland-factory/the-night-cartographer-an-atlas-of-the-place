import { APP_VERSION } from "../version";
import { ATLAS_FORMAT, CURRENT_VERSION, type AtlasFile } from "../model/atlas";

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
