import { describe, expect, it } from "vitest";
import { PALETTE, STAMPS, TOOLS, tokenColor } from "./kit";
import type { ShapeType } from "./atlas";

const EXPECTED_TOOLS: ShapeType[] = [
  "district",
  "road",
  "coastline",
  "label",
  "stamp",
  "fog",
];

const EXPECTED_STAMPS = [
  "tower",
  "tree",
  "bridge",
  "mountain",
  "well",
  "compass",
];

describe("the constrained kit", () => {
  it("has exactly the six tools, one per ShapeType", () => {
    expect(TOOLS.map((t) => t.type)).toEqual(EXPECTED_TOOLS);
  });

  it("has exactly the six stamps", () => {
    expect(STAMPS.map((s) => s.id)).toEqual(EXPECTED_STAMPS);
  });

  it("freezes the tool, palette, and stamp enumerations", () => {
    expect(Object.isFrozen(TOOLS)).toBe(true);
    expect(Object.isFrozen(PALETTE)).toBe(true);
    expect(Object.isFrozen(STAMPS)).toBe(true);
  });

  it("resolves every palette token to a hex and falls back to ink", () => {
    for (const swatch of PALETTE) {
      expect(tokenColor(swatch.token)).toBe(swatch.hex);
    }
    expect(tokenColor("not-a-token")).toBe(tokenColor("ink"));
  });

  it("keeps every palette hex above WCAG AA contrast on the parchment ground", () => {
    // The map ground is --map-paper (#e8dfc8). Every ink swatch must read
    // clearly against it. 4.5:1 is the strict text threshold; lines and fills
    // only need 3:1, so this is the conservative bar.
    const paper = relativeLuminance("#e8dfc8");
    for (const swatch of PALETTE) {
      const ink = relativeLuminance(swatch.hex);
      const ratio = (Math.max(paper, ink) + 0.05) / (Math.min(paper, ink) + 0.05);
      expect(ratio, `${swatch.token} contrast`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

function relativeLuminance(hex: string): number {
  const n = hex.replace("#", "");
  const channels = [0, 2, 4].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
