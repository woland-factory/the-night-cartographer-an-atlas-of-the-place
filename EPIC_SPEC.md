# EPIC SPEC — Palimpsest time-scrub

*The Night Cartographer: an atlas of the places you only visit in dreams.*

This EPIC builds the **time scrub**: a control under the map that replays a
world's append-only strata across their dates, so the user watches their
geography mutate over the years without ever losing a version. The palimpsest
data has existed since EPIC 2 (every map edit appends a full-snapshot
`Stratum`; nothing is ever mutated or deleted) — this EPIC gives that
accumulated history its first surface.

The mechanic in one sentence: drag the scrub and the map re-renders exactly as
it stood at that revision's date; the place markers stay put and still answer
back, because places and entries are the identity layer that outlives every
redraw.

This EPIC adds **no schema change, no version bump, and no migration**. The
strata are already dated, ordered, and complete snapshots; the scrub is a pure
read over them.

---

## Quality differentiator (this app must win here)

**Recall: the map answers back.** Touch any place and the atlas instantly
returns everything you wrote there before, with the time since your last
visit. Paper cannot answer. A dream-journal app has no places to answer from.
Obsidian answers only if you hand-wired every link yourself.

**What this EPIC owes the differentiator.** The scrub is recall's temporal
sibling: it lets the map answer *"what did you look like back then"* the same
way the panel answers *"what happened here"*. Two obligations follow. First,
**recall must keep answering while scrubbed**: a place marker tapped at any
scrub position opens the full recall panel for that place — every entry, the
true elapsed time — because entries key on `placeId`, never on a stratum or a
coordinate. Breaking that association while the geography changes underfoot is
the one way this EPIC can damage the differentiator, and planner AC 3 exists
to forbid it. Second, **the answer must stay instant**: scrubbing is a
synchronous re-render of a pre-stored snapshot (no computation, no fetch, no
diffing), so moving the control repaints within a frame at any history length.

---

## Scope

### In scope

- **The `TimeScrub` control** (`src/ui/TimeScrub.tsx`, NEW): a labeled control
  under the map, shown whenever the world has at least one stratum.
  - **Two or more strata:** a native `<input type="range">` whose positions
    are the strata in **array (append) order** — `min=0`,
    `max=strata.length - 1`, `step=1` — defaulting to the newest (the "now"
    position). A visible readout beside it shows `copy.timeScrub.now` ("Now")
    at the newest position, or "Map as of {formatted date}" (from that
    stratum's `createdAt`) at any earlier one. When a past stratum is viewed,
    a **"Back to now"** button appears and returns the scrub to the newest
    position in one tap.
  - **Exactly one stratum:** the degraded state, designed rather than broken
    (planner AC 5): the same rail rendered with a single marked point and the
    text "Drawn {formatted date}". No slider thumb, no range input, nothing
    draggable — a single point in time, stated as such.
  - **Zero strata:** the control does not render at all; the map's existing
    "Draw your first district" empty state remains the single primary.
  - Keyboard and a11y: the range input is natively keyboard-operable (arrow
    keys step one stratum; Home/End jump to oldest/newest). It carries an
    accessible label ("Map history") and `aria-valuetext` equal to the visible
    readout, so a screen reader hears "Map as of 2 November 2019", never a
    bare index. Visible focus state; the whole control usable at 390px with a
    thumb whose touch target is ≥44px.
- **Viewing a past stratum is read-only** (see "Scope judgments" below): while
  the scrub sits on any position other than newest, the map renders that
  stratum's shapes, the drawing toolbar (`MapKit`) is not shown, and canvas
  taps place nothing. Place markers stay visible and stay tappable, and
  tapping one opens its recall panel exactly as at "now". Opening the composer
  ("Write a dream", or the recall panel's "Write a dream here") first returns
  the scrub to "now", so every write lands on the current map.
- **`MapCanvas` viewed-shapes mode** (`src/ui/MapCanvas.tsx`, EDIT): a new
  optional prop that makes the canvas render a supplied shape list instead of
  `currentShapes(world)` and suppresses all drawing interaction while it is
  set. Markers, marker taps, and marker keyboard handling are unchanged.
- **`WorldView` wiring** (`src/ui/WorldView.tsx`, EDIT): the viewed-stratum
  state (`number | null`, `null` = now) lives here, is passed to `TimeScrub`
  and `MapCanvas`, resets to now whenever the composer opens, and resets when
  the active world changes. Scrubbing never calls the store: the state is
  plain React state, so no autosave is scheduled and the atlas object is
  untouched (planner AC 2's purity half).
- **Sample-world strata backfill** (`src/data/demoAtlas.ts`, EDIT — see scope
  judgment 1): the sample world's single stratum becomes a chain of **three
  dated strata** (2019 → 2021 → 2023) whose newest snapshot is byte-identical
  to today's `demoShapes()`. A staging visitor can then actually watch Harbor
  City grow — districts appearing survey by survey — instead of meeting the
  degraded single-point state.
- **New copy** (`src/copy.ts`, a `timeScrub` section) plus the mechanical copy
  sweep over every string this EPIC touches (including the new sample stratum
  labels, which `copy.test.ts` already sweeps automatically).
- **Tests**: unit tests for the control's three states and keyboard operation;
  integration tests proving re-render, purity, restore-exactly, and the
  recall-association invariant; one e2e case scrubbing the sample world on the
  production build.

### Out of scope (non-goals — building any of these is a defect)

- **No branching or alternate timelines.** (Planner non-goal.) The past is
  read-only: no editing while scrubbed back, no "restore this version", no
  "continue from here", no forking `derivedFrom` chains. Every write happens
  at "now" and appends to the single timeline, exactly as today.
- **No per-shape diff view.** (Planner non-goal.) No highlighting of what
  changed between strata, no added/removed shape markers, no side-by-side
  comparison, no onion-skin overlay of adjacent revisions.
- **No animation beyond the scrub.** (Planner non-goal.) No autoplay button,
  no timelapse mode, no transition tweens between strata — the render switches
  instantly when the value changes. (The instant switch is also what keeps the
  control honest and fast.)
- **No strata management.** No renaming, labeling, deleting, or pruning
  revisions from the UI; no strata list view. The scrub reads; it never
  writes.
- **No changes to the drawing kit, the composer, recall, the ledger, or the
  file format** beyond the wiring named above. The recall surfaces from EPIC 4
  are reused untouched.
- **No history for places or entries.** The scrub replays geography (strata)
  only. Places and entries are timeless identity data and render the same at
  every position; do not filter markers or recall content by the viewed date
  (see scope judgment 2).

### Scope judgments this spec makes (read before building)

1. **The sample world grows two more strata.** The planner's scope block is
   silent about the demo, but the QUALITY BAR's first-run clause is binding:
   the deployed app must demonstrate a feature with real output, and "a sample
   that yields zero findings demonstrates nothing". Today the sample world has
   exactly one stratum, so on staging the scrub would only ever show its
   degraded single-point state — a time machine with nowhere to go. Backfilling
   the sample to three dated strata (whose newest snapshot is exactly the
   current map, so every existing render/seed/e2e assertion still holds) is
   bringing this EPIC's work up to the written bar, not drift. It stays
   minimal: same shapes, same places, same entries, just distributed across a
   dated chain that matches the story the entries already tell.
2. **Markers and recall ignore the viewed date.** A place minted in 2023 still
   shows its marker while viewing the 2019 map, and tapping it returns all its
   entries. This is deliberate, not sloppiness: places are the stable identity
   layer that survives redrawing (the core invariant in `src/model/atlas.ts`),
   and showing them over old geography is precisely what proves planner AC 3
   ("entries remain correctly associated as the geography under them
   changes"). Filtering markers by date would be a diff-flavored feature the
   non-goals exclude, and it would need per-place history the model rightly
   does not keep.
3. **The past is read-only.** The planner forbids branching; letting the user
   draw while viewing an old stratum either silently edits "now" while showing
   "then" (a lie) or forks the timeline (the non-goal). Hiding the kit and
   inerting the canvas while scrubbed back is the smallest rule that keeps
   both scrubbing pure (planner AC 2) and the timeline single. Returning to
   "now" is always one tap or one End keypress away.

---

## Technical design

### Data model (no changes, no migration)

`CURRENT_VERSION` stays `1`. The scrub is a pure read over fields that have
shipped since EPIC 2:

- `Stratum { id; createdAt /* ISO */; label?; shapes; derivedFrom? }` — each
  one a full snapshot of the map at that revision.
- `World.strata` is **append-only**: every committed edit (including undo,
  which appends a reverting snapshot) pushes to the end. Array order is
  therefore commit order and is the scrub's timeline. Do not sort by
  `createdAt` (a device clock that jumped would scramble a history the array
  already records truthfully) and do not walk `derivedFrom` (equivalent but
  more code for the same order).
- `World.currentStratumId` always names the last element; the newest scrub
  position and `currentShapes(world)` agree by construction.

Date labels come from `formatDate` in `src/lib/date.ts` applied to
`stratum.createdAt.slice(0, 10)` — the same timezone-free formatting the rest
of the app uses ("2 November 2019"). No new date code.

`ATLAS_FORMAT.md` needs no format change. Optionally add one sentence under
"Stratum" noting the array order is the replay order; if touched, sweep it.

### `TimeScrub` component (`src/ui/TimeScrub.tsx`, NEW)

```
interface TimeScrubProps {
  strata: Stratum[];             // world.strata, append order, length >= 1
  value: number | null;          // viewed index; null = now (the last index)
  onScrub: (index: number | null) => void;  // reports the last index as null
}
```

- **Multi-stratum state** (`strata.length >= 2`): a visible "Map history"
  label, the range input (controlled: rendered value is
  `value ?? strata.length - 1`; `onChange` maps the max position back to
  `null`), the readout, and (only when `value !== null`) the "Back to now"
  button calling `onScrub(null)`.
  - Readout text: `value === null` → `copy.timeScrub.now`; else
    `` `${copy.timeScrub.viewingPrefix} ${formatDate(...)}` `` ("Map as of
    14 March 2021"). The same string feeds the input's `aria-valuetext` so
    sight and screen reader hear the same thing.
  - The input's accessible name is `copy.timeScrub.label` ("Map history").
    Native range semantics give arrow-key stepping and Home/End for free; do
    not reimplement a slider from divs.
- **Single-stratum state** (`strata.length === 1`): no input. The rail with
  one marked point and the text
  `` `${copy.timeScrub.drawnPrefix} ${formatDate(...)}` `` ("Drawn
  2 November 2019"). Nothing focusable beyond normal document flow; nothing
  looks draggable.
- The component is presentation-only: no store imports, no world access beyond
  its props.

### `MapCanvas` viewed-shapes mode (`src/ui/MapCanvas.tsx`, EDIT)

Add one optional prop:

```
// When set, the canvas shows this past snapshot read-only: these shapes render
// instead of the current stratum's, the kit and drawing interactions are
// suppressed, and only place markers stay interactive.
viewedShapes?: Shape[] | null;
```

With `viewedShapes` set (non-null):

- `shapes` renders from `viewedShapes` instead of `currentShapes(world)`.
- `MapKit` is not rendered; `placeAt` returns early (canvas taps and
  reticle-Enter place nothing); the reticle and in-progress-drawing preview
  never show (there is no drawing in the past).
- The map empty-state CTA ("Draw your first district") never shows, even if
  the viewed stratum is empty — a sparse past is history, not an invitation.
- Place markers render and behave exactly as today: `canPick` keeps its
  existing rule (`pickable && !drawing && !busy && !dropping`; none of the
  latter can be true while viewing the past), taps and Enter open recall via
  `onPickPlace`.

With `viewedShapes` null/undefined, nothing changes from the shipped behavior.
Keep the edit small: one prop, a handful of conditions. Do not restructure the
component.

### `WorldView` wiring (`src/ui/WorldView.tsx`, EDIT)

- State: `const [viewedStratum, setViewedStratum] = useState<number | null>(null)`
  (`null` = now). Reset to `null` when the active world changes (key the
  component by `world.id` or reset in an effect on `world.id` — whichever is
  the smaller change given how `App` mounts it).
- Derived: `const viewedShapes = viewedStratum === null ? null :
  (world.strata[viewedStratum]?.shapes ?? null)` — the defensive `?? null`
  clamps a stale index to "now" rather than crashing.
- Render `<TimeScrub strata={world.strata} value={viewedStratum}
  onScrub={setViewedStratum} />` directly below `MapCanvas`, only when
  `world.strata.length > 0`. Pass `viewedShapes` to `MapCanvas`.
- **Writes return to now:** `openCompose` sets `viewedStratum` to `null`
  before opening the sheet. That single reset covers every write path — the
  world-view "Write a dream" button, the recall panel's "Write a dream here",
  and the drop-a-new-place detour (which is only reachable from the composer).
  Drawing needs no reset because the kit only renders at "now".
- **Purity:** scrubbing calls only `setViewedStratum`. No `atlasStore`
  function runs, so no `set()`, no autosave, no atlas object change. Returning
  to now re-renders from the untouched `currentShapes(world)` — restoration is
  exact by construction, and the tests prove it (planner AC 2).
- Everything else (recall panel, visit ledger, composer, hint, save-error
  banner) stays exactly as shipped.

### Sample-world strata backfill (`src/data/demoAtlas.ts`, EDIT)

Replace the single `demoStratum()` with a three-stratum chain telling the
story the sample entries already tell — the map grew as the visits accrued:

| id | createdAt | label | shapes |
|---|---|---|---|
| `sample-stratum-1` | `2019-11-02T07:12:00.000Z` | `first survey` | harbor district, harbor label, coastline |
| `sample-stratum-2` | `2021-03-14T06:40:00.000Z` | `the clockmarket` | + clockmarket district, clockmarket label, road, tower stamp |
| `sample-stratum-3` | `2023-08-27T05:55:00.000Z` | `the fog stair` | + fog stair district, fog stair label, fog edge, bridge stamp |

- `derivedFrom`: stratum 1 → `null`, 2 → 1, 3 → 2. `currentStratumId` becomes
  `sample-stratum-3`.
- **Binding constraint:** stratum 3's shape list is exactly `demoShapes()` —
  same shape ids, same geometry strings, same order — so every existing
  assertion about the rendered sample map (`mapRender.test.tsx`,
  `seed.test.tsx`, the e2e smoke flow, the showcase fixture) passes untouched.
  Earlier strata are strict prefixes/subsets built from the same shape
  definitions (factor `demoShapes()` into named pieces internally so the
  subsets cannot drift from the whole).
- Places and entries are unchanged. The stratum labels above are user-visible
  file content and are already swept by `copy.test.ts` (it flat-maps demo
  strata labels); the three labels listed are sweep-clean — keep them exactly
  or re-sweep whatever replaces them.
- Note for a returning device: an atlas already saved in IndexedDB keeps the
  old single-stratum sample (a saved atlas is never overwritten). That world
  simply shows the designed single-point state. No migration is needed or
  wanted.

### Quality bar, mapped to this EPIC

- **Perceived speed (§1).** Scrub position is controlled React state; each
  change synchronously re-renders one pre-stored snapshot. No debounce, no
  async, no per-move computation — render cost is bounded by the viewed
  stratum's shape count (schema-capped at 2,000), independent of history
  length. Feedback is the repaint itself, within a frame.
- **Mobile-first (§2).** The control spans the map's width at 390px with no
  horizontal scroll; the range thumb's touch target is ≥44px (size the thumb
  or pad its hit area in CSS); readout and button wrap below the rail if the
  row is tight.
- **Designed states (§3).** Zero strata: control absent, existing empty CTA
  rules. One stratum: the single-point state, stated positively ("Drawn
  {date}"), nothing broken or disabled-looking. There is no loading state (the
  data is already in memory) and no error state (a pure read of local state
  cannot fail); note both deliberate absences in the PR.
- **First-run (§4).** Covered by the backfilled sample: a staging visitor who
  drags the visible "Map history" control watches districts appear across
  three dated surveys within seconds. No new walkthrough step — the recall
  hint remains the product's one coach mark; a labeled, visible slider under
  the map is self-evident (§7).
- **Security (§5).** No route, no network, no mutation, no storage. Dates and
  labels render through React text nodes. Nothing is logged.
- **Accessibility (§6).** Native range input with an accessible name, date-
  valued `aria-valuetext`, visible focus, arrow/Home/End operation; "Back to
  now" is a real button. Keyboard reaches everything a pointer can (planner
  AC 4).
- **Radical simplicity (§7).** The whole surface is one labeled rail, one
  readout, one conditional button. No explanatory paragraph, no tooltip, no
  legend.
- **Copy (§8).** New strings below; mechanical sweep over `copy.ts`,
  `demoAtlas.ts` labels, and any touched doc before finishing
  (`copy.test.ts` enforces the first two automatically).

### Copy (`src/copy.ts`, new `timeScrub` section — pre-swept)

```
timeScrub: {
  label: "Map history",
  now: "Now",
  backToNow: "Back to now",
  viewingPrefix: "Map as of",
  drawnPrefix: "Drawn",
},
```

Composed at render: "Map as of 14 March 2021", "Drawn 2 November 2019". All
strings checked: no em-dash or en-dash, none of the banned vocabulary, no
negative phrasing. `copy.test.ts` walks the whole `copy` object, so the new
section is swept automatically; run the sweep again over the final diff.

### Files to create / touch

```
src/ui/TimeScrub.tsx        NEW   the control: range/single-point states, readout, back-to-now
src/ui/timeScrub.test.tsx   NEW   three states, keyboard, aria-valuetext, callbacks
src/ui/MapCanvas.tsx        EDIT  viewedShapes prop: render override, kit/drawing suppressed
src/ui/mapCanvas.test.tsx   EDIT  add viewed-mode cases (kit absent, taps inert, markers live)
src/ui/WorldView.tsx        EDIT  viewedStratum state, TimeScrub mount, reset-on-compose, purity
src/ui/tokens.css           EDIT  rail, thumb (≥44px hit), readout, single-point styles, focus
src/copy.ts                 EDIT  timeScrub section
src/data/demoAtlas.ts       EDIT  three-stratum chain; newest snapshot identical to demoShapes()
src/ui/seed.test.tsx        EDIT  only if a landing assertion collides; landing content is unchanged
e2e/smoke.spec.ts           EDIT  add the scrub replay case on the sample world
ATLAS_FORMAT.md             EDIT  optional one-line replay-order note under Stratum; sweep if touched
```

---

## Ordered task list (each item independently checkable)

1. **TimeScrub component (pure UI).** The three states, the readout, the
   back-to-now button, native-range keyboard behavior, `aria-valuetext`.
   *AC:* with three strata dated 2019/2021/2023 and `value=null`, the readout
   shows "Now", the input's value is 2, and no "Back to now" button renders;
   `onChange` to position 0 calls `onScrub(0)`; with `value=0` the readout and
   `aria-valuetext` both read "Map as of 2 November 2019" and "Back to now"
   renders and calls `onScrub(null)`; changing the input to its max calls
   `onScrub(null)` (not `onScrub(2)`); with one stratum there is no range
   input and the text reads "Drawn 2 November 2019"; the input's accessible
   name is "Map history".

2. **MapCanvas viewed-shapes mode.** The `viewedShapes` prop with drawing
   fully suppressed and markers fully alive.
   *AC:* with `viewedShapes` set to a past snapshot, the SVG renders exactly
   those shapes (not the current stratum's), `MapKit` is absent, clicking the
   canvas commits nothing and adds no vertex, the empty CTA does not appear
   for an empty viewed list, and clicking a place marker still calls
   `onPickPlace` with the place id; with the prop unset, all existing
   `mapCanvas.test.tsx` cases pass unchanged.

3. **WorldView wiring: scrub state, purity, restore, write-resets.**
   *AC (integration, on a world with ≥2 strata where the newest stratum has a
   shape the oldest lacks):* scrubbing to the oldest position removes that
   shape from the rendered map and scrubbing back to "Now" renders the current
   stratum exactly (same shape set as before any scrubbing); after a scrub
   round-trip, `getState()` returns the identical atlas object (reference
   equality — no store write, no autosave scheduled) and the world's `strata`
   array is deep-equal to its pre-scrub snapshot; while viewing a past
   stratum, tapping a place marker opens the recall panel listing that place's
   full entry history (planner AC 3); opening the composer via "Write a dream"
   returns the map to "Now", and an entry saved then appears in recall as
   usual; the control renders only when the world has strata.

4. **Sample-world backfill.** The three-stratum chain.
   *AC:* `demoWorld().strata` has length 3 with `createdAt` in ascending
   append order and the `derivedFrom` chain 1←2←3; `currentStratumId` names
   the last stratum, whose `shapes` deep-equal `demoShapes()` in the same
   order; the 2019 stratum contains the harbor district, harbor label, and
   coastline only; the 2021 stratum adds the clockmarket district and label,
   the road, and the tower stamp; all existing seed, render, recall, and copy
   tests pass without weakening (labels swept by `copy.test.ts`).

5. **Styles + copy + sweep.** Rail/readout/button styles mobile-first, thumb
   hit ≥44px, visible focus, AA contrast; the `timeScrub` copy section; the
   mechanical sweep.
   *AC:* at 390px the control fits with no horizontal scroll; focus on the
   range input and the button is visible; `copy.test.ts` passes over the new
   strings and demo labels; `npm run build`, `npm run lint`, and `npm test`
   all pass.

6. **E2E replay on the production build.** Extend `e2e/smoke.spec.ts`.
   *AC:* the test opens the sample atlas, finds the "Map history" slider,
   moves it to the oldest position (keyboard `Home` on the focused slider),
   asserts the readout "Map as of 2 November 2019" and that a newest-only
   shape (the Fog Stair map label inside the canvas) is gone while The
   Harbor's marker still opens its recall panel with the 2025 entry, then
   returns via "Back to now" (or `End`) and asserts the Fog Stair label is
   back and the readout shows "Now". The two existing smoke tests pass
   unchanged.

---

## Test plan (which automated test proves each planner criterion)

Existing stack: `vitest` + `@testing-library/react` + `jsdom` for units and
integration, Playwright (`e2e/smoke.spec.ts`) for the production build.

- **"A slider or equivalent control scrubs the map through its dated strata;
  moving it re-renders the geography as it stood at that date"** —
  `timeScrub.test.tsx` proves positions map to strata in append order with
  date readouts; the WorldView integration test (task 3) proves moving the
  value swaps the rendered SVG to the viewed stratum's exact shape set; the
  e2e case proves it end to end on the built app with real dates.

- **"Scrubbing never alters stored strata; returning to 'now' restores the
  current map exactly"** — the integration test snapshots the world before
  scrubbing, scrubs across every position and back, then asserts (a) the
  store atlas is reference-identical (no write path ran) and the `strata`
  array deep-equals the snapshot, and (b) the rendered shape set at "Now"
  equals `currentShapes(world)` exactly. `mapCanvas.test.tsx` viewed-mode
  cases prove no commit can even be issued while viewing the past (kit
  absent, taps inert).

- **"Entries pinned to places remain correctly associated as the geography
  under them changes across strata"** — the integration test scrubs the
  sample world to 2019 (before the Clockmarket district existed), taps The
  Harbor's marker, and asserts the recall panel lists all four harbor entries
  including the 2025 one; a second case taps a place whose district only
  exists in the newest stratum while viewing the oldest, and still gets its
  full history. (Association is by `placeId`; these tests pin that invariant
  against any date-filtering regression.)

- **"The control is discoverable, labeled, keyboard-operable, and usable at
  390px"** — `timeScrub.test.tsx` asserts the accessible name "Map history",
  the visible label text, `aria-valuetext` carrying the date, and that arrow
  key / Home / End interaction on the native input fires the right `onScrub`
  values. Discoverability is structural: the control is rendered in the world
  view's main flow directly under the map (the integration test asserts its
  presence on a strata-bearing world). The 390px fit, ≥44px thumb, and focus
  visibility are layout contracts confirmed in CSS and noted in the PR; the
  e2e run exercises the real control.

- **"With a single stratum the control degrades gracefully, shown as a single
  point in time rather than broken"** — `timeScrub.test.tsx` asserts the
  one-stratum render: no range input in the document, the "Drawn
  2 November 2019" text present, nothing labeled "Back to now". An
  integration case on a world with exactly one stratum asserts the world view
  shows this state and the map renders normally.

- **Copy is clean (QUALITY BAR §8)** — `copy.test.ts` automatically sweeps
  the new `timeScrub` strings and the sample stratum labels for dashes,
  banned vocabulary, and negative phrasing.

**Definition of done:** `npm run build`, `npm run lint`, and `npm test` pass
(every prior suite included), and the Playwright smoke suite passes with the
new replay case; on a multi-strata world the scrub replays each dated
revision and returns to an exact "Now"; scrubbing performs zero store writes;
recall answers in full at every scrub position; the single-stratum and
zero-strata states are the designed ones; the control is labeled,
keyboard-operable, and comfortable at 390px; the sample world demonstrates
the replay on staging without hand-crafted input; the copy sweep is clean;
and no non-goal (branching, restore-from-past, diff view, autoplay/animation,
strata management, date-filtered markers or recall) shipped.

---

## Risks and guardrails

- **The silent-write trap.** The one catastrophic bug this EPIC could ship is
  a write that lands while the user is looking at the past — an edit that
  appears to change 2019 (a lie) or invisibly changes "now" (data loss by
  confusion). The guardrails are structural, not behavioral: the kit is not
  rendered in the past, `placeAt` exits before any commit, and the composer
  resets the scrub before opening. The purity test (reference-identical store
  after a scrub round-trip) makes any regression loud.
- **Ordering by the wrong axis.** Sorting strata by `createdAt` looks
  equivalent and is not: a device clock that jumped backwards would scramble
  a history the append-only array records truthfully. Array order is the
  timeline; `createdAt` is only the label. Undo strata (snapshots equal to an
  older revision) are honest positions on that timeline, not anomalies —
  scrubbing across one simply shows the map returning to an earlier look,
  which is exactly what happened.
- **Recall keyed off the viewed date.** It will feel natural to "help" by
  filtering markers or entries to the viewed date. That is the per-shape-diff
  slope and it breaks the product's core invariant that places and entries
  outlive geography. Markers and recall ignore the scrub position; the
  association tests pin this.
- **A slider rebuilt from divs.** A custom slider means reimplementing
  keyboard stepping, focus, and ARIA, and usually failing at least one. The
  native range input already does all of it; style it instead of replacing
  it.
- **Demo drift.** The backfill must keep the newest sample stratum
  byte-identical to `demoShapes()` and touch nothing else in the sample; the
  moment it "improves" geometry, entries, or places, existing seed/render/e2e
  assertions weaken and EPIC 6's first-run ground shifts. The deep-equal AC
  in task 4 is binding.
- **Gold-plating.** No timelapse autoplay, no transition easing, no stratum
  thumbnails, no history list. The scrub, the readout, the return button —
  that is the whole surface, and it is enough to make a years-old atlas feel
  like strata of one place.
