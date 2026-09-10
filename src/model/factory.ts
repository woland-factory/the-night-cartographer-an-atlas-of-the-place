import { APP_VERSION } from "../version";
import {
  ATLAS_FORMAT,
  CURRENT_VERSION,
  type AtlasFile,
  type Entry,
  type Place,
  type Point,
  type Stratum,
  type World,
} from "./atlas";

function uuid(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createAtlas(): AtlasFile {
  return {
    format: ATLAS_FORMAT,
    version: CURRENT_VERSION,
    meta: { createdAt: nowIso(), appVersion: APP_VERSION },
    settings: { activeWorldId: null },
    worlds: [],
  };
}

export function createWorld(name: string): World {
  return {
    id: uuid(),
    name: name.trim(),
    createdAt: nowIso(),
    places: [],
    strata: [],
    currentStratumId: null,
    entries: [],
  };
}

export function createPlace(
  name: string,
  anchor: Point | { shapeRef: string } | null = null,
): Place {
  return {
    id: uuid(),
    name: name.trim(),
    anchor,
    createdAt: nowIso(),
  };
}

export function createStratum(
  shapes: Stratum["shapes"] = [],
  derivedFrom: string | null = null,
  label?: string,
): Stratum {
  return {
    id: uuid(),
    createdAt: nowIso(),
    label,
    shapes,
    derivedFrom,
  };
}

export function createEntry(
  placeId: string,
  date: string,
  body: string,
): Entry {
  return {
    id: uuid(),
    placeId,
    date,
    body,
    createdAt: nowIso(),
  };
}
