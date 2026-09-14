// One-off: render the seeded showcase stratum to a standalone SVG using the
// exact production render code, so the artifact is honest proof that crooked
// input reads as a coherent atlas. Run with:
//   npx vite-node scripts/render-showcase.tsx
// Not part of the test suite; it writes an artifact under artifacts/.

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { demoShapes } from "../src/data/demoAtlas";
import { MapDefs, renderShape } from "../src/ui/mapRender";

const PAPER = "#e8dfc8";

const svg = renderToStaticMarkup(
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1000 1000"
    width={1000}
    height={1000}
  >
    <MapDefs />
    <rect x={0} y={0} width={1000} height={1000} fill={PAPER} />
    {demoShapes().map(renderShape)}
  </svg>,
);

// The map-label class is styled in CSS; inline the serif family so the
// standalone file renders labels the same way the app does.
const styled = svg.replace(
  'class="map-label"',
  'class="map-label" font-family="Georgia, Times New Roman, serif"',
);

const dir = resolve(process.cwd(), "artifacts");
mkdirSync(dir, { recursive: true });
const out = resolve(dir, "showcase-map.svg");
writeFileSync(out, `<?xml version="1.0" encoding="UTF-8"?>\n${styled}\n`);
console.log(`wrote ${out}`);
