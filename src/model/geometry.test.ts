import { describe, expect, it } from "vitest";
import {
  pointsToString,
  polygonCentroid,
  smoothPath,
  stringToPoints,
} from "./geometry";
import type { Point } from "./atlas";

const crookedA: Point[] = [
  { x: 12, y: 8 },
  { x: 190.5, y: 44 },
  { x: 210.25, y: 300 },
  { x: 40, y: 260.75 },
];

const crookedB: Point[] = [
  { x: 0, y: 0 },
  { x: 33.3, y: 12.9 },
  { x: -5.5, y: 88.125 },
];

describe("smoothPath", () => {
  it("is deterministic: equal input yields identical output", () => {
    expect(smoothPath(crookedA, { closed: true })).toBe(
      smoothPath(crookedA, { closed: true }),
    );
    expect(smoothPath(crookedB, { closed: false })).toBe(
      smoothPath(crookedB, { closed: false }),
    );
  });

  it("emits curve commands for three or more points", () => {
    const d = smoothPath(crookedA, { closed: true });
    expect(d).toContain("C");
    expect(d.trimEnd().endsWith("Z")).toBe(true);
  });

  it("emits a straight line for exactly two points", () => {
    const d = smoothPath(
      [
        { x: 10, y: 10 },
        { x: 90, y: 40 },
      ],
      { closed: false },
    );
    expect(d).toBe("M 10 10 L 90 40");
    expect(d).not.toContain("C");
  });

  it("handles a single point and an empty list", () => {
    expect(smoothPath([{ x: 5, y: 7 }])).toBe("M 5 7");
    expect(smoothPath([])).toBe("");
  });
});

describe("pointsToString / stringToPoints", () => {
  it("round-trips crooked point sets exactly", () => {
    for (const pts of [crookedA, crookedB]) {
      expect(stringToPoints(pointsToString(pts))).toEqual(pts);
    }
  });

  it("drops malformed pairs without throwing", () => {
    expect(stringToPoints("10,20 garbage 30,40")).toEqual([
      { x: 10, y: 20 },
      { x: 30, y: 40 },
    ]);
    expect(stringToPoints("   ")).toEqual([]);
  });
});

describe("polygonCentroid", () => {
  it("returns the center of a square", () => {
    const c = polygonCentroid([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]);
    expect(c.x).toBeCloseTo(5);
    expect(c.y).toBeCloseTo(5);
  });

  it("falls back to the average for degenerate input", () => {
    expect(polygonCentroid([{ x: 4, y: 6 }])).toEqual({ x: 4, y: 6 });
    const c = polygonCentroid([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
    expect(c).toEqual({ x: 5, y: 0 });
  });
});
