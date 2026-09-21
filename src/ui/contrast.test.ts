import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// A computed WCAG AA lock over the real color pairs the UI ships. The token
// hexes are read from tokens.css at test time, so this guards the shipped
// values: darken or lighten a token below its threshold and this fails.

const css = readFileSync(
  resolve(process.cwd(), "src/ui/tokens.css"),
  "utf8",
);

// Map of CSS custom property name to its hex value, straight from tokens.css.
const tokens: Record<string, string> = {};
for (const m of css.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) {
  tokens[m[1]] = m[2];
}

function token(name: string): string {
  const hex = tokens[name];
  if (!hex) throw new Error(`token not found in tokens.css: --${name}`);
  return hex;
}

// Two non-token literals that also carry text contrast, read from the file so
// the lock still tracks the source.
function literal(hex: string): string {
  expect(css.includes(hex), `expected ${hex} in tokens.css`).toBe(true);
  return hex;
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(fg: string, bg: string): number {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

describe("token color contrast (WCAG AA)", () => {
  const bg = () => token("bg");
  const surface = () => token("surface");
  const surface2 = () => token("surface-2");
  const accent = () => token("accent");

  it("meets 4.5:1 for muted body text on every surface it sits on", () => {
    const muted = token("muted");
    expect(contrast(muted, surface())).toBeGreaterThanOrEqual(4.5);
    expect(contrast(muted, surface2())).toBeGreaterThanOrEqual(4.5);
    expect(contrast(muted, bg())).toBeGreaterThanOrEqual(4.5);
  });

  it("meets 4.5:1 for primary text on surface and background", () => {
    const text = token("text");
    expect(contrast(text, surface())).toBeGreaterThanOrEqual(4.5);
    expect(contrast(text, bg())).toBeGreaterThanOrEqual(4.5);
  });

  it("meets 4.5:1 for the accent last-visit line on surface", () => {
    expect(contrast(accent(), surface())).toBeGreaterThanOrEqual(4.5);
  });

  it("meets 4.5:1 for the primary button label on the accent fill", () => {
    expect(contrast(token("accent-text"), accent())).toBeGreaterThanOrEqual(4.5);
  });

  it("meets 4.5:1 for the map empty body on the parchment", () => {
    // .map-empty__body color, on --map-paper.
    expect(
      contrast(literal("#5b5344"), token("map-paper")),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("meets 4.5:1 for the danger text on the save banner", () => {
    // --danger on the .banner background.
    expect(contrast(token("danger"), literal("#2a1a1a"))).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});
