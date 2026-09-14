import { z } from "zod";
import { ATLAS_FORMAT, type AtlasFile } from "./atlas";
import { MAX_LABEL_LENGTH } from "./kit";

// Boundary validation for imported files. The schema mirrors atlas.ts. It
// stays permissive about forward-compatible fields (strata/shapes) so an
// atlas written by a later EPIC still parses here, while capping the sizes that
// pathological input could bloat. The palimpsest (strata count) is never
// capped: its growth is the product's durable value, not a leak.
const MAX_NAME = 200;
const MAX_GEOMETRY = 20_000;
const MAX_BODY = 20_000;
const MAX_SHAPES_PER_STRATUM = 2_000;

const pointSchema = z.object({ x: z.number(), y: z.number() });

const anchorSchema = z.union([
  pointSchema,
  z.object({ shapeRef: z.string() }),
  z.null(),
]);

const placeSchema = z.object({
  id: z.string(),
  name: z.string().max(MAX_NAME),
  anchor: anchorSchema,
  createdAt: z.string(),
});

const shapeSchema = z.object({
  id: z.string(),
  type: z.enum(["district", "road", "coastline", "label", "stamp", "fog"]),
  geometry: z.string().max(MAX_GEOMETRY),
  styleToken: z.string().max(MAX_NAME),
  text: z.string().max(MAX_LABEL_LENGTH).optional(),
  placeId: z.string().optional(),
});

const stratumSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  label: z.string().max(MAX_NAME).optional(),
  shapes: z.array(shapeSchema).max(MAX_SHAPES_PER_STRATUM),
  derivedFrom: z.string().nullable().optional(),
});

const entrySchema = z.object({
  id: z.string(),
  placeId: z.string(),
  date: z.string(),
  body: z.string().max(MAX_BODY),
  createdAt: z.string(),
});

const worldSchema = z.object({
  id: z.string(),
  name: z.string().max(MAX_NAME),
  createdAt: z.string(),
  isSample: z.boolean().optional(),
  places: z.array(placeSchema),
  strata: z.array(stratumSchema),
  currentStratumId: z.string().nullable(),
  entries: z.array(entrySchema),
});

export const atlasFileSchema = z.object({
  format: z.literal(ATLAS_FORMAT),
  version: z.number().int().positive(),
  meta: z.object({ createdAt: z.string(), appVersion: z.string() }),
  settings: z.object({ activeWorldId: z.string().nullable() }),
  worlds: z.array(worldSchema),
});

export type ParsedAtlas = z.infer<typeof atlasFileSchema>;

export function validateAtlas(
  value: unknown,
): { ok: true; atlas: AtlasFile } | { ok: false; reason: string } {
  const result = atlasFileSchema.safeParse(value);
  if (!result.success) {
    return { ok: false, reason: "shape" };
  }
  return { ok: true, atlas: result.data as AtlasFile };
}
