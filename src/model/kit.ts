// The constrained kit: a fixed, frozen set of tools, ink swatches, and stamp
// glyphs. There is no tool, color, or stamp outside these enumerations, by
// design. A crooked amateur line reads as an intentional atlas because the kit
// is small and the rendering is shared, not because the user has a paint app.

import type { ShapeType } from "./atlas";

// Boundary caps so pathological input cannot bloat a stratum. Enforced where
// shapes and labels are created.
export const MAX_LABEL_LENGTH = 80;
export const MAX_VERTICES = 200;

export type PaletteToken = "ink" | "sea" | "moss" | "rust" | "plum" | "fog";

export type StampId =
  | "tower"
  | "tree"
  | "bridge"
  | "mountain"
  | "well"
  | "compass";

// How a tool places its geometry: an area closes into a polygon, a line stays
// an open polyline, a point is a single placement.
export type ToolKind = "area" | "line" | "point";

export interface ToolDef {
  type: ShapeType;
  kind: ToolKind;
  defaultToken: PaletteToken;
}

// The six tools, one per ShapeType, in toolbar order. Frozen: no tool exists
// outside this set.
export const TOOLS: readonly ToolDef[] = Object.freeze([
  { type: "district", kind: "area", defaultToken: "ink" },
  { type: "road", kind: "line", defaultToken: "rust" },
  { type: "coastline", kind: "line", defaultToken: "sea" },
  { type: "label", kind: "point", defaultToken: "ink" },
  { type: "stamp", kind: "point", defaultToken: "ink" },
  { type: "fog", kind: "line", defaultToken: "fog" },
] as const);

export interface Swatch {
  token: PaletteToken;
  hex: string;
}

// The fixed ink palette. Every hex clears WCAG AA contrast against the
// parchment ground (--map-paper, #e8dfc8). There is no arbitrary color picker.
export const PALETTE: readonly Swatch[] = Object.freeze([
  { token: "ink", hex: "#2b2620" },
  { token: "sea", hex: "#35617a" },
  { token: "moss", hex: "#566343" },
  { token: "rust", hex: "#8c4f33" },
  { token: "plum", hex: "#6b4a63" },
  { token: "fog", hex: "#605d50" },
] as const);

const PALETTE_BY_TOKEN: Record<PaletteToken, string> = Object.freeze(
  Object.fromEntries(PALETTE.map((s) => [s.token, s.hex])) as Record<
    PaletteToken,
    string
  >,
);

// Resolve a style token to its hex, falling back to ink for any unknown token
// (for example an older file written before this palette existed).
export function tokenColor(token: string): string {
  return PALETTE_BY_TOKEN[token as PaletteToken] ?? PALETTE_BY_TOKEN.ink;
}

export interface StampDef {
  id: StampId;
  // A monoline path drawn in a 24x24 box, placed centered on the drop point.
  path: string;
}

// The fixed stamp set: six monoline glyphs. No upload, no custom glyphs.
export const STAMPS: readonly StampDef[] = Object.freeze([
  {
    id: "tower",
    path: "M9 21 L9 8 L12 3 L15 8 L15 21 M9 12 L15 12 M9 16 L15 16",
  },
  {
    id: "tree",
    path: "M12 21 L12 14 M12 14 C7 14 6 9 9 7 C8 3 16 3 15 7 C18 9 17 14 12 14",
  },
  {
    id: "bridge",
    path: "M3 16 C3 10 21 10 21 16 M3 16 L3 19 M21 16 L21 19 M8 13 L8 16 M12 11 L12 16 M16 13 L16 16",
  },
  {
    id: "mountain",
    path: "M3 19 L10 7 L14 14 L16 11 L21 19 Z M8 12 L11.5 12",
  },
  {
    id: "well",
    path: "M5 10 L5 20 L19 20 L19 10 M4 10 L20 10 M8 4 L8 10 M16 4 L16 10 M8 4 L16 4 M12 10 L12 20",
  },
  {
    id: "compass",
    path: "M12 3 A9 9 0 1 0 12 21 A9 9 0 1 0 12 3 M12 6 L14 12 L12 18 L10 12 Z",
  },
] as const);

export function toolFor(type: ShapeType): ToolDef {
  return TOOLS.find((t) => t.type === type) ?? TOOLS[0];
}
