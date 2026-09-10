// The atlas data model. These types are both the working state and the
// on-disk file format (one JSON document per atlas).
//
// The load-bearing invariant for recall: a `Place` keeps its `id` across
// every future map revision, and an `Entry` references a `placeId`, never a
// shape or a coordinate. Recall must still answer after the map is redrawn.

export const ATLAS_FORMAT = "night-cartographer-atlas" as const;
export const CURRENT_VERSION = 1 as const;

export interface AtlasFile {
  format: typeof ATLAS_FORMAT; // fixed discriminator
  version: number; // schema version; migrations bump this
  meta: { createdAt: string; appVersion: string }; // ISO 8601; semver string
  settings: { activeWorldId: string | null };
  worlds: World[];
}

export interface World {
  id: string; // crypto.randomUUID()
  name: string;
  createdAt: string; // ISO 8601
  isSample?: boolean; // true only for the seeded demo world
  places: Place[];
  strata: Stratum[]; // append-only map revisions (no UI this EPIC)
  currentStratumId: string | null;
  entries: Entry[];
}

export interface Point {
  x: number;
  y: number;
}

export interface Place {
  // the stable identity recall indexes against
  id: string;
  name: string;
  anchor: Point | { shapeRef: string } | null;
  createdAt: string;
}

export interface Stratum {
  // one dated map revision, append-only
  id: string;
  createdAt: string;
  label?: string;
  shapes: Shape[];
  derivedFrom?: string | null;
}

export type ShapeType =
  | "district"
  | "road"
  | "coastline"
  | "label"
  | "stamp"
  | "fog";

export interface Shape {
  id: string;
  type: ShapeType;
  geometry: string; // SVG path 'd' string, or serialized points
  styleToken: string; // key into a fixed palette (defined in EPIC 2)
  text?: string;
  placeId?: string; // links a district shape to a place
}

export interface Entry {
  id: string;
  placeId: string; // recall indexes entries by this
  date: string; // the dream's date, YYYY-MM-DD
  body: string;
  createdAt: string; // ISO 8601 timestamp
}
