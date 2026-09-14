# EPIC SPEC — The map kit (constrained stylized drawing)

*The Night Cartographer: an atlas of the places you only visit in dreams.*

This EPIC builds the drawing surface: an SVG canvas and a constrained kit
(labeled district polygons, roads, a coastline tool, text labels, a fixed
stamp set, and fog/uncertain edges). Stylized rendering makes an amateur's
crooked lines read as an intentional atlas. Every committed edit appends a
new stratum (the palimpsest foundation), and naming a district mints a
durable place. It is fully usable by touch at 390px.

It builds directly on EPIC 1's data model (`src/model/atlas.ts`),
append-only `Stratum`/`Shape` types, the `atlasStore`, and the existing
`WorldView`. No schema version bump and no data migration: the `Stratum`
and `Shape` shapes already validate in `schema.ts`, so this EPIC fills
them in for real for the first time.

---

## Quality differentiator (this app must win here)

**Recall: the map answers back.** Touch any place and the atlas instantly
returns everything you wrote there before, with the time since your last
visit. Paper cannot answer. A dream-journal app has no places to answer
from. Obsidian answers only if you hand-wired every link yourself.

**What this EPIC owes the differentiator.** Recall has nothing to answer
from until places exist on a map. This EPIC does not build recall (that is
EPIC 4, and "no recall yet" is a binding non-goal here), but it lays the
two things recall stands on:

1. **Every named district mints a durable `place`.** Naming a district
   creates a `Place` with a stable `id` and an `anchor` point that outlives
   every future redraw. Recall in EPIC 4 will index entries by that
   `placeId`. If naming does not create a stable, redraw-proof identity
   here, recall breaks two EPICs later and cannot be patched without a
   migration.
2. **A stranger can put a place on the map inside the first minute.** The
   empty canvas leads straight to drawing and naming one district, so the
   first place recall can answer from is reachable fast. Do not add the
   recall panel, the on-map tap-to-recall, or any elapsed-time readout on
   the canvas. The EPIC 1 read-only places readout below the map stays
   exactly as it is.

---

## Scope

### In scope
- **A map canvas** (`MapCanvas`): a responsive SVG with a fixed coordinate
  space (viewBox `0 0 1000 1000`), mounted as the primary surface of an
  opened world, above the existing EPIC 1 places readout.
- **The constrained kit** (`MapKit`): a fixed set of six tools matching the
  six `ShapeType`s: `district`, `road`, `coastline`, `label`, `stamp`,
  `fog`. Single-select. No tool exists outside this set.
- **Vertex-based drawing** (no raster, no freehand pixels): tap the canvas
  to drop successive vertices with a live preview; `Finish` commits.
  Districts close into polygons; roads, coastlines, and fog edges commit as
  open polylines. Stamps and labels are single-point placements.
- **A fixed palette**: a small enumerated set of named ink swatches
  (below). The user may pick one swatch per shape. There is no arbitrary
  color picker and no `<input type="color">` anywhere.
- **A fixed stamp set**: an enumerated set of six inline SVG glyphs. No
  upload, no custom stamps.
- **Stylized rendering** that turns crooked vertex chains into a coherent
  atlas: smoothing (Catmull-Rom through the vertices), a shared hand-drawn
  "ink" SVG filter, a parchment ground, a district hatch/tint fill, a
  feathered treatment for fog edges, and a map-style label font.
- **The append-only palimpsest**: each committed edit appends a new
  `Stratum` that is a full snapshot of the map at that revision. Prior
  strata are never mutated or deleted. `currentStratumId` points at the
  newest; `derivedFrom` links to the previous.
- **District naming → place creation**: finishing a district offers an
  inline name field. A name creates a `Place` (stable `id`, `anchor` =
  district centroid) and links the district shape's `placeId`.
- **Undo**: `Undo point` removes the last uncommitted vertex; `Cancel`
  discards the in-progress shape; `Undo` reverts the last committed edit by
  appending a stratum equal to the previous snapshot (palimpsest-safe,
  never a truncation).
- **A designed empty-canvas state**: a fresh world's canvas shows a short,
  positive, product-voice prompt that leads to drawing the first district.
- **A seeded showcase map on the sample world**: give the demo world one
  hand-authored, deliberately imperfect stratum whose districts link to its
  three existing places, plus a coastline, a road, a fog edge, stamps, and
  labels. This is both the first-run atlas a staging visitor sees and the
  rendered proof that crooked input reads as a coherent place.
- **Keyboard operability**: every kit control is keyboard-reachable and
  labeled; the canvas is focusable with a keyboard point-placement fallback
  (a reticle moved by arrow keys, `Enter` to place a vertex).
- Updated `ATLAS_FORMAT.md`, `copy.ts`, and styles; a full copy sweep.

### Out of scope (non-goals — building any of these is a defect)
- **No time-scrub UI.** Strata are recorded (data only). No slider, no
  playback, no per-stratum navigation. That is EPIC 5.
- **No image import as a base map.** No uploading a photo or scan to trace
  or pin onto. No file input on the canvas.
- **No recall.** No on-map tap that opens entries, no elapsed-time readout
  on the canvas, no recall panel, no per-place answer-back at draw time.
  The EPIC 1 read-only places readout stays unchanged. That surface is
  EPIC 4.
- **No entry composer, no pinning entries.** Writing dated entries is
  EPIC 3. This EPIC creates places, not entries.
- **No freehand pixel/raster brush, no `<canvas>` raster drawing, no
  arbitrary color picker, no layers panel.** The kit is constrained by
  design.
- **No pan/zoom** on the canvas. The fixed viewBox scales to fit the
  viewport. Adding pan/zoom is gold-plating and out of scope.
- **No shape selection/editing UI beyond naming a district and the undo
  controls above.** No drag-to-move vertices, no per-shape delete panel, no
  reshape after commit. Redrawing means drawing a new shape in a new
  stratum. Keep the surface small (this is the plan's highest build risk).
- **No procedural or automatic map generation, no AI.**

### The one scope judgment this spec makes (read before building)
The sample world currently carries places and entries but no drawn
geometry, so on the map it would render as blank. This EPIC gives the
sample **one hand-authored stratum** so a staging visitor sees a real
hand-drawn atlas and the "crooked reads as intentional" criterion is
demonstrable on the live app. This is seed geometry only, exactly like
EPIC 1 seeded entries. It is NOT the EPIC 6 guided walkthrough and must
not grow into one: no coach marks, no first-success path, no tour. Author
the stratum's shapes and labels, wire their `placeId`s to the three
existing sample places, and stop.

---

## Technical design

### Coordinate space and the drawing model
- The canvas is an SVG with `viewBox="0 0 1000 1000"`, `width=100%`, and a
  fixed aspect (a square that fits the column). Pointer and keyboard
  positions are mapped from client coordinates into this 0–1000 space using
  `getScreenCTM().inverse()` (or `getBoundingClientRect` math), so drawing
  is resolution-independent and identical across viewport sizes.
- **Geometry is stored as honest vertices, stylized at render time.**
  `Shape.geometry` holds a space-separated list of `"x,y"` vertices for
  line/area shapes (`district`, `road`, `coastline`, `fog`) and a single
  `"x,y"` for point shapes (`stamp`, `label`). The smoothed SVG path is
  computed by the renderer, never stored. This keeps the file honest and
  re-stylable and lets EPIC 5 replay strata.
- `Shape.text` holds the label string for `label` shapes and the glyph id
  (one of the fixed stamp set) for `stamp` shapes.
- `Shape.styleToken` holds the chosen palette key (below).
- `Shape.placeId` is set only on a district shape that has been named.

### The fixed palette (no picker)
Define in `src/model/kit.ts` as a frozen, enumerated array. Starting set
(the implementer may tune the hex values to the atlas theme, but the set
stays fixed, enumerated, and swatch-selected — never a picker):

| token  | role                        | hex (starting) |
|--------|-----------------------------|----------------|
| `ink`  | default line / district edge| `#2b2620`      |
| `sea`  | coastline / water           | `#35617a`      |
| `moss` | parks, green land           | `#5c6b4a`      |
| `rust` | roads, paths                | `#9c5b3b`      |
| `plum` | special districts           | `#6b4a63`      |
| `fog`  | fog / uncertain edges       | `#8a8577`      |

- Canvas ground is a parchment tone (`--map-paper`, starting `#e8dfc8`) so
  dark ink reads as a printed atlas. The canvas is a bright parchment panel
  inside the app's dark chrome; the map is the product's focal surface.
- Each tool has a sensible default token (`district`→`ink`,
  `road`→`rust`, `coastline`→`sea`, `label`→`ink`, `stamp`→`ink`,
  `fog`→`fog`). The swatch row lets the user pick another token for the
  shape being drawn.
- Every palette hex must clear WCAG AA contrast against `--map-paper`.

### The fixed stamp set
Define in `kit.ts` as a frozen array of six glyphs, each an inline
monoline SVG path drawn in a small local box and placed at the drop point:
`tower`, `tree`, `bridge`, `mountain`, `well`, `compass`. Exact glyph art
is the implementer's, but the SET is fixed and enumerated. No upload, no
custom glyph entry.

### Stylized rendering (the craft — how crooked reads as intentional)
All of the following ship together; the atlas feel is their combination,
not any single one. Keep each cheap and deterministic.

1. **Vertex-only geometry.** Points are placed deliberately, so segments
   are intentional, never a raster scrawl.
2. **Smoothing.** `smoothPath(points, { closed })` in
   `src/model/geometry.ts` converts the vertices to a cubic-bezier `d`
   string via a Catmull-Rom spline (fixed tension). Two points render as a
   straight line; three or more render as gentle curves. This turns jagged
   corners into a drawn-by-hand line. It is a pure, deterministic function.
3. **Shared ink filter.** One SVG `<filter>` in the canvas `<defs>` applies
   a subtle hand-drawn wobble to strokes (`feTurbulence` with a fixed
   `seed` + small `feDisplacementMap`, e.g. `baseFrequency ~0.02`,
   `scale ~2.5`). Fixed seed keeps it deterministic. Applied uniformly so
   every line looks sketched by the same hand.
4. **District fill.** A translucent parchment tint or a faint hatch
   `<pattern>` so districts read as areas, not just outlines.
5. **Coastline.** A slightly heavier smoothed stroke in `sea`. No water
   fill (which side is sea is ambiguous and out of scope).
6. **Fog edges.** Rendered feathered and uncertain: reduced opacity, a
   dashed stroke, and a light blur (`feGaussianBlur`) so the boundary reads
   as half-remembered, honoring the plan's "false precision" risk.
7. **Labels.** A serif or map-style font, centered on the anchor point,
   with subtle letter-spacing.
8. **Stamps.** The fixed glyph, ink-colored, centered on the drop point.

Keep the `shape → SVG` mapping in a pure module (`src/ui/mapRender.ts` or
equivalent) so it is snapshot-testable and deterministic.

### The strata engine (append-only, immutable prior revisions)
Pure helpers in `src/model/strata.ts` (or added to `factory.ts`), each
taking a `World` and returning a NEW `World` with an appended stratum,
never mutating the input or any prior stratum:

- `currentShapes(world): Shape[]` — the shapes of the stratum whose id is
  `currentStratumId`, or `[]` when there is none.
- `snapshotWith(world, nextShapes): World` — append a `Stratum` whose
  `shapes = nextShapes`, `derivedFrom = world.currentStratumId`, set
  `currentStratumId` to the new id. Prior strata are copied by reference,
  never edited.
- `commitShape(world, shape): World` — `snapshotWith(world,
  [...currentShapes(world), shape])`.
- `undoLastEdit(world): World` — append a stratum whose `shapes` equal the
  snapshot *before* the current one (the `derivedFrom` chain), or `[]` if
  the current stratum is the first. This is a new revision, not a deletion.

Invariant tests must prove that after any of these, every previously
existing `Stratum` object is deep-equal to a clone captured before the
call (nothing prior mutated), and `strata.length` increased by exactly one.

### District naming → place creation
- Finishing a district shows an inline name field (labeled, keyboard
  reachable). Entering a name and confirming:
  1. Creates a `Place` via `createPlace(name, centroid)` where
     `centroid = polygonCentroid(points)` (a stable `Point`, so the place's
     location survives redraws that give the district new shape ids).
  2. Sets the committed district shape's `placeId` to that place id.
  3. Adds the place to `world.places`.
  For a freshly drawn district this happens in the same commit, so the
  common path is one stratum: the district shape (with `placeId`) plus the
  new place, in one appended snapshot.
- Skipping the name commits an unnamed district (a valid shape, no place).
- Naming a previously committed district later is allowed and appends a new
  stratum carrying a `placeId`-updated copy of that district shape; the
  place is added to `world.places`. Prior strata keep the unnamed copy.
- **Places live at `world.places`, never inside strata**, so a place's `id`
  and `anchor` are already independent of any stratum. Redrawing the map
  (new strata, new shape ids) never touches `world.places`. This is the
  redraw-proof identity recall depends on.

### Store mutations (`src/state/atlasStore.ts`)
Add, mirroring the existing `set(...)` immutable-update pattern (each
produces a new atlas object and schedules the debounced autosave):
- `commitShape(worldId, shape)` — replace the world with
  `commitShape(world, shape)`.
- `nameDistrict(worldId, shapeId, name)` — create the place, set the
  shape's `placeId`, append the stratum, add the place. When called as part
  of a fresh district finish, prefer a single combined commit path so only
  one stratum is appended.
- `undoLastEdit(worldId)` — replace the world with `undoLastEdit(world)`.

Draw-tool selection, in-progress vertices, and the reticle position are
**local component state** in `MapCanvas`, never in the store (they are
transient and must never persist or append a stratum until `Finish`).

### Boundary safety (security hygiene for a local, no-network app)
There are no server routes. The boundaries are user input into shapes and
the import path:
- Cap label text length (for example 80 chars) and vertex count per shape
  (for example 200) at creation time in the kit/factory. Reject or trim
  beyond the cap so pathological input cannot bloat a stratum.
- Render all label text and district names through React text nodes (auto
  escaped). Never use `dangerouslySetInnerHTML`. Geometry is only ever set
  as the `d` attribute of a `<path>` or `x/y` of `<text>`/`<use>`; SVG path
  data cannot execute script.
- Tighten `schema.ts` optionally with the same caps (max string lengths,
  max array sizes) so an imported file with absurd shapes is rejected with
  the existing friendly "unreadable" reason rather than accepted.
- No PII, no atlas content, and no label/geometry text is ever logged.

### UI composition (`src/ui/WorldView.tsx`)
An opened world renders, top to bottom:
1. The existing back toolbar and world heading (unchanged).
2. **`MapCanvas`** (primary surface): the parchment SVG rendering
   `currentShapes(world)`. When there are no shapes, it shows the designed
   empty-canvas state (below) as the screen's single primary call to
   action.
3. **`MapKit`** (the tool palette): a bottom, thumb-reachable toolbar with
   the six tools (single-select segmented control), the swatch row, the
   stamp picker (shown when the stamp tool is active), and the contextual
   controls `Finish` / `Undo point` / `Cancel` while a shape is in
   progress, plus `Undo` for the last committed edit.
4. **The EPIC 1 places readout** (unchanged) — *only when the world has at
   least one place*. When a world has no places yet, do not render the old
   places-readout empty block; the canvas empty state is the single leading
   action (QUALITY BAR §7, one primary action per screen). New named
   districts appear here automatically as places with the existing
   "Pin your first morning here." line (no entries yet). Do not add recall
   or elapsed time to the canvas.

### Mobile-first and one primary action (QUALITY BAR §2, §7)
- Single column, usable at 390px, no horizontal scroll. The canvas scales
  to the column width; the kit toolbar wraps within the viewport.
- Every kit control has `min-height: 44px` and comfortable touch spacing.
- One primary action at a time: while a shape is in progress the primary
  button is `Finish`; otherwise the selected tool is the highlighted
  single-select state and the empty-state CTA is the only primary. Tool
  buttons are a subordinate segmented control, not six competing primaries.

### Accessibility (QUALITY BAR §6)
- Every kit button, swatch, and stamp is a real `<button>` with an
  accessible name (visible label or `aria-label`), a visible focus state,
  and AA contrast.
- The name field is a labeled `<input>`.
- The canvas is focusable (`tabindex=0`) with an `aria-label` and a short
  keyboard hint, and supports a **keyboard point-placement fallback**: with
  a line/area tool active and the canvas focused, arrow keys move a visible
  reticle in coarse steps (for example 20 units, larger with `Shift`),
  `Enter` places a vertex at the reticle, and the `Finish` button (already
  keyboard-reachable) commits. This makes every drawing action reachable
  without a pointer, satisfying "keyboard reaches everything a mouse can."
  Exact-pixel freehand placement is pointer-native and is not required.

### Perceived speed (QUALITY BAR §1)
- Vertex placement, reticle motion, tool/swatch selection, and preview are
  local React state and update within one frame (well under 100ms).
- Commit is synchronous into the store (optimistic); autosave stays the
  existing 500ms debounce.
- Rendering reads only `currentShapes(world)` (one stratum), so map render
  cost is bounded by the current shape count and is **independent of edit
  history length**. Strata history grows the file but never the hot render
  path. Note in code and README that the palimpsest's growth is the
  product's durable value, not a leak.

### Designed empty-canvas state (QUALITY BAR §3, §4)
When `currentShapes(world)` is empty, the canvas center shows a short,
positive prompt in the product's voice with a single call to action that
selects the district tool. Pre-swept copy in `copy.ts`:
- title: `"Draw your first district."`
- body: `"Pick a shape, then tap the map to place each corner."`
- action: `"Start a district"` (selects the district tool).

### Copy (all new strings in `src/copy.ts`, pre-swept and safe to ship)
Add a `map` section. Positive, short, no em-dashes, no banned vocabulary,
no negative empty-state phrasing:
- Tool labels: `"District"`, `"Road"`, `"Coastline"`, `"Label"`,
  `"Stamp"`, `"Fog edge"`.
- In-progress: `"Finish"`, `"Undo point"`, `"Cancel"`.
- Committed-edit undo: `"Undo"`.
- District name: field label `"District name"`, placeholder
  `"The Harbor"`, confirm `"Name it"`, skip `"Skip"`.
- Group labels (aria): kit `"Map tools"`, swatches `"Ink color"`, stamps
  `"Stamps"`.
- Canvas: `aria-label` `"Map canvas. Pick a tool, then place points to
  draw."` and a short keyboard hint such as `"Arrow keys move the marker.
  Enter places a point."`
- Empty-canvas title/body/action as above.
Sweep these plus the demo shape labels (below) mechanically before
finishing.

### The seeded showcase stratum (`src/data/demoAtlas.ts`)
Give `demoWorld()` one stratum (set `currentStratumId` to its id) whose
shapes are deliberately hand-crooked yet read as a coherent place:
- A district polygon per existing sample place, each linked by `placeId` to
  `sample-place-harbor`, `sample-place-clockmarket`, and
  `sample-place-fog-stair`, with a matching `label` shape.
- A `coastline` near The Harbor (token `sea`), a `road` linking two
  districts (token `rust`), a `fog` edge by The Fog Stair (token `fog`),
  and one or two `stamp`s (for example `tower`, `bridge`).
- Fixed ids and fixed vertex coordinates (deterministic; no runtime
  randomness). Deliberately imperfect vertices so the render proves the
  stylization. All label text pre-swept.
This stratum doubles as the "crooked amateur test map" the render tests and
the required screenshot artifact use. Adding it must not break EPIC 1 tests
(entries and recall readout are unchanged; the round-trip fixture is
separate).

### ATLAS_FORMAT.md update
Update the `Shape` and `Stratum` sections to document what EPIC 2 actually
writes: `geometry` as space-separated `"x,y"` vertices for line/area
shapes and a single `"x,y"` for point shapes; `text` as the label string
for `label` and the glyph id for `stamp`; `styleToken` as one of the fixed
palette keys; `placeId` set on named districts; and that editing appends a
new stratum (full snapshot) while prior strata are immutable. No version
bump (no shapes existed in any prior file).

### Files to create / touch
```
src/model/geometry.ts     NEW  smoothPath, polygonCentroid, points<->string
src/model/kit.ts          NEW  TOOLS, PALETTE, STAMPS, defaults, caps (all frozen)
src/model/strata.ts       NEW  currentShapes, snapshotWith, commitShape, undoLastEdit
src/state/atlasStore.ts   EDIT commitShape/nameDistrict/undoLastEdit mutations
src/ui/mapRender.ts       NEW  pure Shape -> SVG props (path d, class, token->color)
src/ui/MapCanvas.tsx      NEW  SVG canvas, defs (filters/patterns/glyphs), tap+keyboard
src/ui/MapKit.tsx         NEW  tool palette, swatches, stamp picker, finish/undo/cancel
src/ui/WorldView.tsx      EDIT mount MapCanvas+MapKit; gate the old readout on places>0
src/ui/tokens.css         EDIT map palette tokens, parchment canvas, kit toolbar styles
src/copy.ts               EDIT the map section (strings above)
src/data/demoAtlas.ts     EDIT add the seeded showcase stratum
src/model/schema.ts       EDIT optional caps (max string/array sizes)
ATLAS_FORMAT.md           EDIT document geometry/text/styleToken/placeId conventions
src/test/fixtures.ts      EDIT the crooked showcase fixture (reuse demo stratum)
```

---

## Ordered task list (each item independently checkable)

1. **Geometry + kit definitions (pure).** `geometry.ts`
   (`smoothPath(points,{closed})` → cubic-bezier `d`, `polygonCentroid`,
   `pointsToString`/`stringToPoints`); `kit.ts` (frozen `TOOLS`, `PALETTE`,
   `STAMPS`, per-tool defaults, label/vertex caps).
   *AC:* `smoothPath` is deterministic (equal input → identical output) and
   emits curve commands for ≥3 points and a straight line for 2; the
   palette and stamp set are frozen enumerations; two crooked point sets
   round-trip through `pointsToString`/`stringToPoints` exactly.

2. **Strata engine (pure, append-only).** `strata.ts` with `currentShapes`,
   `snapshotWith`, `commitShape`, `undoLastEdit`.
   *AC:* `commitShape` and `undoLastEdit` each increase `strata.length` by
   exactly one, advance `currentStratumId`, set `derivedFrom` to the prior
   id, and leave every prior `Stratum` deep-equal to a pre-captured clone
   (no mutation, no deletion). `undoLastEdit` restores the previous
   snapshot as a new stratum.

3. **Store mutations.** `commitShape`, `nameDistrict`, `undoLastEdit` in
   `atlasStore.ts` using the pure engine and the existing immutable `set`.
   *AC:* calling each produces a new atlas object, emits to subscribers, and
   schedules autosave; `nameDistrict` adds a `Place` to `world.places` and
   links the district's `placeId`; a fresh district finish appends exactly
   one stratum.

4. **Map renderer + defs (pure + deterministic).** `mapRender.ts` mapping a
   `Shape` to SVG props; canvas `<defs>` with the shared ink filter, the
   district fill pattern, the fog blur, and the six stamp glyphs.
   *AC:* rendering the crooked showcase fixture is deterministic and, in a
   snapshot, uses only palette tokens, applies smoothing (curve commands,
   not only `L`), references the ink filter, and gives fog shapes the
   feathered treatment (dashed + reduced opacity + blur).

5. **MapCanvas component.** Renders `currentShapes`, handles canvas taps to
   drop vertices (line/area) or a single point (stamp/label) with a live
   preview, the keyboard reticle fallback, and the designed empty state.
   *AC:* selecting a tool and tapping places vertices with a visible
   preview; `Finish` commits the right `ShapeType`; a stamp tap drops the
   chosen glyph; a label tap opens the text field and commits a label; a
   fresh world shows the empty-canvas copy; the canvas is focusable and
   arrow+`Enter` places a vertex.

6. **MapKit toolbar.** The six tools (single-select), swatch row, stamp
   picker, contextual `Finish`/`Undo point`/`Cancel`, and `Undo`.
   Mobile-first, ~44px targets, one primary action.
   *AC:* the DOM contains no `<input type="color">`, no raster `<canvas>`,
   no file input, and no layers-panel control; swatches render exactly the
   fixed palette count and stamps exactly the fixed set; every kit button is
   ≥44px and keyboard-reachable with a visible focus state; only one primary
   control is present at a time.

7. **District naming → durable place; wire WorldView.** Inline name field
   on district finish creating a `Place` (stable id, centroid anchor) and
   linking `placeId`; mount `MapCanvas`+`MapKit`; gate the EPIC 1 readout on
   `places.length > 0`.
   *AC:* naming a district creates a place with a stable id and a centroid
   anchor; appending further strata (redraw) or an `Undo` leaves that place
   in `world.places` with the same id and anchor; an entry referencing that
   `placeId` still resolves through `placeLedger`. On-map tap never opens
   recall (non-goal held).

8. **Demo showcase stratum + styles + docs + copy sweep.** Add the seeded
   stratum to `demoAtlas`; add map tokens/parchment/kit styles; add the
   `map` copy section; update `ATLAS_FORMAT.md`; run the mechanical copy
   sweep over `copy.ts`, the demo labels, and `ATLAS_FORMAT.md`. Capture a
   screenshot of the rendered showcase map as an artifact.
   *AC:* the sample world renders a coherent hand-drawn atlas (screenshot
   artifact attached); `npm run build`, `npm run lint`, `npm test` pass; the
   copy sweep finds no "—"/"–", no banned vocabulary, and no negative
   empty-state phrasing in any user-visible string; `ATLAS_FORMAT.md`
   matches what the code writes; EPIC 1 tests still pass.

---

## Test plan (which automated test proves each planner criterion)

Use the existing `vitest` + `@testing-library/react` + `jsdom` stack.

- **Draw and label a district, draw a road and a coastline, drop a stamp,
  mark a fog edge, using only the fixed kit** (planner AC 1):
  `mapCanvas.test.tsx` drives each tool through select → place → `Finish`
  and asserts a committed shape of the matching `ShapeType` in
  `currentShapes`; naming the district creates the linked place.
  `kit.test.ts` asserts the tool set is exactly the six and frozen.

- **No raster brush, no color picker beyond the palette, no layers panel**
  (planner AC 2): `mapKit.test.tsx` asserts the rendered kit has no
  `<input type="color">`, no raster `<canvas>`, no file input, and no
  layers control; swatches equal the fixed palette count; stamps equal the
  fixed set.

- **A crooked amateur test map renders as a coherent, atlas-like place**
  (planner AC 3): `mapRender.test.ts` renders the crooked showcase fixture
  deterministically and asserts smoothing is applied, only palette tokens
  are used, the ink filter is referenced, and fog uses the feathered
  treatment. The human-judgment half is backed by a **required screenshot
  artifact** of the rendered sample map, declared in `result.json`.

- **Naming a district creates a place with a stable id that survives
  redrawing** (planner AC 4): `placeIdentity.test.ts` names a district
  (place `P`, centroid anchor), then appends further strata and an `Undo`,
  and asserts `P` remains in `world.places` with the same id and anchor and
  that an entry on `P` still resolves via `placeLedger`.

- **Every edit appends a stratum; no edit mutates or deletes a prior
  stratum's shapes** (planner AC 5): `strata.test.ts` proves `strata.length`
  grows by one per commit/name/undo, `currentStratumId`/`derivedFrom`
  advance correctly, and every prior `Stratum` is deep-equal to a clone
  captured before the call.

- **Drawing and labeling fully operable by touch at 390px, ~44px targets,
  no horizontal scroll, one unambiguous primary action** (planner AC 6):
  `mapKit.test.tsx` asserts every control is ≥44px, keyboard-reachable, and
  focus-visible, and that only one primary control renders at a time; a
  `mapCanvas.test.tsx` case focuses the canvas and asserts arrow+`Enter`
  places a vertex (keyboard parity). A structural check asserts the layout
  is single-column with no fixed width exceeding the 390px column.

- **The empty canvas shows a designed state in the product's voice with
  positive phrasing** (planner AC 7): `mapCanvas.test.tsx` renders a fresh
  world and asserts the empty-canvas title/body/action from `copy.ts`; the
  existing `copy.test` sweep extends to the new `map` strings and the demo
  labels and asserts zero hits for "—"/"–", banned vocabulary, and negative
  empty-state phrasing.

**Definition of done:** `npm run build`, `npm run lint`, and `npm test` all
pass; the sample world renders a coherent hand-drawn atlas captured as a
screenshot artifact; the copy sweep is clean; `ATLAS_FORMAT.md` matches the
code; and no non-goal (time-scrub, image import, recall, pan/zoom, raster
brush, color picker, layers) shipped.

---

## Risks and guardrails
- **Drawing-surface jank (the plan's highest build risk).** The defense is
  scope, not effort. Vertex-tap drawing, a fixed viewBox, no pan/zoom, no
  post-commit reshape, and a frozen kit are all binding. If the surface
  drifts toward a general drawing app, it fails the bar.
- **Palimpsest growth.** Each edit appends a full snapshot. That is the
  product's durable value, not a leak. Keep the hot render path reading only
  the current stratum so render cost never scales with history. Do not cap
  or prune strata (that would destroy EPIC 5 and the point of the product).
- **False precision.** Fog edges ship here, feathered, so a half-remembered
  place can stay honest. Do not defer them.
- **Place identity.** Places live at `world.places` with centroid anchors,
  never inside strata. A map edit must never touch `world.places` except to
  add a newly named place. Getting this wrong quietly breaks recall in
  EPIC 4.
- **Recall creep.** It is tempting to light up a district on tap with its
  entries. That is EPIC 4 and a binding non-goal here. On-map tap only
  draws; the EPIC 1 readout stays as the honest recall until EPIC 4.
