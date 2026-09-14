// Pure, deterministic mapping from a Shape to its SVG. Kept apart from the
// canvas so the "crooked reads as intentional" rendering is snapshot-testable.
// The atlas feel is the combination of all of these, not any single one:
// vertex-only geometry, Catmull-Rom smoothing, a shared hand-drawn ink filter,
// a translucent district tint, a heavier coastline, and feathered fog.

import type { ReactElement } from "react";
import type { Point, Shape } from "../model/atlas";
import { smoothPath, stringToPoints } from "../model/geometry";
import { STAMPS, tokenColor } from "../model/kit";

// One shared ink filter wobbles every stroke by the same hand. One fog filter
// blurs the uncertain edges. Fixed seeds keep both deterministic.
export const INK_FILTER_ID = "nc-ink";
export const FOG_FILTER_ID = "nc-fog";

const STAMP_BOX = 24;
const STAMP_SIZE = 46;
const LABEL_SIZE = 34;

function firstPoint(shape: Shape): Point {
  const pts = stringToPoints(shape.geometry);
  return pts[0] ?? { x: 500, y: 500 };
}

// The defs every canvas shares: the ink wobble and the fog blur.
export function MapDefs(): ReactElement {
  return (
    <defs>
      <filter id={INK_FILTER_ID} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.02"
          numOctaves={2}
          seed={7}
          result="noise"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="noise"
          scale={2.5}
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
      <filter id={FOG_FILTER_ID} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation={1.6} />
      </filter>
    </defs>
  );
}

// Render one committed shape. The smoothed path is computed here, never stored.
export function renderShape(shape: Shape): ReactElement | null {
  const color = tokenColor(shape.styleToken);
  switch (shape.type) {
    case "district": {
      const d = smoothPath(stringToPoints(shape.geometry), { closed: true });
      return (
        <path
          key={shape.id}
          data-shape-type="district"
          d={d}
          fill={color}
          fillOpacity={0.14}
          stroke={color}
          strokeWidth={3}
          strokeLinejoin="round"
          filter={`url(#${INK_FILTER_ID})`}
        />
      );
    }
    case "road": {
      const d = smoothPath(stringToPoints(shape.geometry), { closed: false });
      return (
        <path
          key={shape.id}
          data-shape-type="road"
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${INK_FILTER_ID})`}
        />
      );
    }
    case "coastline": {
      const d = smoothPath(stringToPoints(shape.geometry), { closed: false });
      return (
        <path
          key={shape.id}
          data-shape-type="coastline"
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${INK_FILTER_ID})`}
        />
      );
    }
    case "fog": {
      const d = smoothPath(stringToPoints(shape.geometry), { closed: false });
      return (
        <path
          key={shape.id}
          data-shape-type="fog"
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeOpacity={0.5}
          strokeDasharray="9 7"
          strokeLinecap="round"
          filter={`url(#${FOG_FILTER_ID})`}
        />
      );
    }
    case "label": {
      const p = firstPoint(shape);
      return (
        <text
          key={shape.id}
          data-shape-type="label"
          x={p.x}
          y={p.y}
          fill={color}
          fontSize={LABEL_SIZE}
          textAnchor="middle"
          dominantBaseline="middle"
          className="map-label"
        >
          {shape.text ?? ""}
        </text>
      );
    }
    case "stamp": {
      const p = firstPoint(shape);
      const glyph = STAMPS.find((s) => s.id === shape.text) ?? STAMPS[0];
      const scale = STAMP_SIZE / STAMP_BOX;
      const offset = (STAMP_BOX * scale) / 2;
      return (
        <g
          key={shape.id}
          data-shape-type="stamp"
          transform={`translate(${p.x - offset} ${p.y - offset}) scale(${scale})`}
          filter={`url(#${INK_FILTER_ID})`}
        >
          <path
            d={glyph.path}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );
    }
    default:
      return null;
  }
}
