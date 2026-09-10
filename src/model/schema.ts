import { z } from "zod";
import { ATLAS_FORMAT, type AtlasFile } from "./atlas";

// Boundary validation for imported files. The schema mirrors atlas.ts. It
// stays permissive about forward-compatible fields (strata/shapes) so an
// atlas written by a later EPIC still parses here.

const pointSchema = z.object({ x: z.number(), y: z.number() });

const anchorSchema = z.union([
  pointSchema,
  z.object({ shapeRef: z.string() }),
  z.null(),
]);

const placeSchema = z.object({
  id: z.string(),
  name: z.string(),
  anchor: anchorSchema,
  createdAt: z.string(),
});

const shapeSchema = z.object({
  id: z.string(),
  type: z.enum(["district", "road", "coastline", "label", "stamp", "fog"]),
  geometry: z.string(),
  styleToken: z.string(),
  text: z.string().optional(),
  placeId: z.string().optional(),
});

const stratumSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  label: z.string().optional(),
  shapes: z.array(shapeSchema),
  derivedFrom: z.string().nullable().optional(),
});

const entrySchema = z.object({
  id: z.string(),
  placeId: z.string(),
  date: z.string(),
  body: z.string(),
  createdAt: z.string(),
});

const worldSchema = z.object({
  id: z.string(),
  name: z.string(),
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
