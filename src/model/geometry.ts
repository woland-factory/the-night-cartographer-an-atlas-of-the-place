// Pure geometry helpers. Vertices are stored honest (a list of points) and
// stylized at render time, so these functions are the bridge between the two:
// smoothing a crooked vertex chain into a hand-drawn curve, finding a stable
// centroid for a place anchor, and serializing points to and from the string
// stored in Shape.geometry.

import type { Point } from "./atlas";

// Catmull-Rom tension. Fixed so smoothing is deterministic for a given input.
const TENSION = 1;

// Round to 2 decimals so the emitted path is stable and compact. Kept as a
// number first so "-0" never appears in the output.
function fmt(n: number): string {
  return String(Math.round(n * 100) / 100 + 0);
}

// Serialize points to a space-separated list of "x,y" pairs. This is what a
// Shape.geometry holds for line and area shapes; point shapes hold one pair.
export function pointsToString(points: Point[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

// Parse the geometry string back into points. Malformed pairs are dropped so a
// hand-edited or truncated file never throws here.
export function stringToPoints(geometry: string): Point[] {
  const trimmed = geometry.trim();
  if (!trimmed) return [];
  return trimmed
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return { x, y };
    })
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
}

// Convert a vertex chain to a cubic-bezier `d` string via a Catmull-Rom
// spline. Two points render as a straight line; three or more render as gentle
// curves, which is what turns jagged corners into a drawn-by-hand line. Pure
// and deterministic: equal input always yields identical output.
export function smoothPath(
  points: Point[],
  opts: { closed?: boolean } = {},
): string {
  const closed = opts.closed ?? false;
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
  if (n === 2) {
    return (
      `M ${fmt(points[0].x)} ${fmt(points[0].y)} ` +
      `L ${fmt(points[1].x)} ${fmt(points[1].y)}`
    );
  }

  const at = (i: number): Point => {
    if (closed) return points[((i % n) + n) % n];
    return points[Math.max(0, Math.min(n - 1, i))];
  };

  let d = `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
  const segments = closed ? n : n - 1;
  for (let i = 0; i < segments; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const cp1x = p1.x + ((p2.x - p0.x) / 6) * TENSION;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * TENSION;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * TENSION;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * TENSION;
    d +=
      ` C ${fmt(cp1x)} ${fmt(cp1y)}, ${fmt(cp2x)} ${fmt(cp2y)}, ` +
      `${fmt(p2.x)} ${fmt(p2.y)}`;
  }
  if (closed) d += " Z";
  return d;
}

// The area-weighted centroid of a polygon. Used as a place anchor so the
// place's location survives redraws that give the district a new shape id. For
// a degenerate polygon (fewer than three points or near-zero area) it falls
// back to the average of the vertices.
export function polygonCentroid(points: Point[]): Point {
  const n = points.length;
  if (n === 0) return { x: 0, y: 0 };
  if (n < 3) return averagePoint(points);

  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const cross = a.x * b.y - b.x * a.y;
    area += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  area /= 2;
  if (Math.abs(area) < 1e-7) return averagePoint(points);
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

function averagePoint(points: Point[]): Point {
  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 },
  );
  return { x: sum.x / points.length, y: sum.y / points.length };
}
