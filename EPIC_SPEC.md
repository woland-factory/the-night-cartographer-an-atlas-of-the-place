# EPIC SPEC — Recall (the signature moment)

*The Night Cartographer: an atlas of the places you only visit in dreams.*

This EPIC builds **recall**: touch a place and the atlas instantly hands back
everything you ever wrote there, newest first, with the time since your last
visit and how many times you have been. It is the product's signature moment
and the one dimension it must win. Every other EPIC exists to feed this one.

Recall is delivered as three connected surfaces on the world view:

1. **The recall panel** — a sheet that opens the instant you tap a place (a map
   marker or a ledger row) and lists that place's dated entries newest first,
   with a "Last visit here: 14 months ago" line and the visit count.
2. **The visit ledger** — the world view's list of places ordered by last
   visit, each row showing when you were last there and how many times, tapping
   any row into its recall panel.
3. **Answer-back at write time** — saving a new entry opens that place's recall
   panel in the same gesture, so the map answers back the moment you write.

This EPIC builds directly on shipped work and adds **no schema version bump and
no data migration**. `Entry`, `Place`, `placeLedger`, `worldLedger`,
`elapsedLabel`, the `atlasStore`, the `MapCanvas` place markers/`onPickPlace`,
the seeded demo world, and the sheet/dialog UI pattern all already exist. This
EPIC turns the tap that today opens the composer into the tap that answers back,
adds a place-indexed lookup so the answer is instant at any corpus size, and
gives the world view a proper visit ledger.

---

## Quality differentiator (this app must win here)

**Recall: the map answers back.** Touch any place and the atlas instantly
returns everything you wrote there before, with the time since your last visit.
Paper cannot answer. A dream-journal app has no places to answer from. Obsidian
answers only if you hand-wired every link yourself.

**What this EPIC owes the differentiator.** This is the EPIC where the
differentiator is either won or lost. It has the craft budget. Three things must
be true and excellent: the answer must be **instant** (the panel is on screen
within 100ms of the tap and stays instant after years of entries, because the
lookup is indexed by `placeId` and never scans the whole corpus on a tap); the
answer must be **complete and true** (every entry ever pinned to that place, in
the right order, with a correct human elapsed time, matching the underlying
data); and the moment must be **discoverable in the first minute** (a first-time
visitor is led to make one place answer back without documentation). If recall
is slow, wrong, or hidden, the product loses on the only axis that matters.

---

## Scope

### In scope

- **The recall panel** (`RecallPanel`, NEW): a modal sheet (bottom sheet at
  phone widths, centered dialog on wider screens, reusing the existing sheet
  pattern) that opens when a place is tapped. For a place **with** history it
  shows, top to bottom:
  - the **place name** as the dialog heading;
  - a prominent **"Last visit here: {elapsed} ago"** line computed at render
    from the most recent entry's date (never stored);
  - the **visit count** ("1 visit" / "{n} visits");
  - the **entries, newest first**, each showing its formatted date as the
    primary line and a subtle per-entry elapsed time ("14 months ago") as a
    secondary line, then the entry body. Per-entry elapsed is required by the
    north star ("and how long ago each was") and is what makes the corpus feel
    like a ledger of returns, not a text dump. Keep it visibly secondary to the
    date so the panel does not clutter.
  - a **"Write a dream here"** action that opens the composer already pinned to
    this place (so recall and writing are one loop).
- **Designed panel states** (QUALITY BAR §3, and planner AC 3):
  - **Exactly one prior entry**: the singular "1 visit", a single "Last visit
    here:" line, and that one entry. Never "1 result" or a plural glitch.
  - **No history yet**: a designed, positive invite state that leads to the
    first entry via the same "Write a dream here" action. Never a "0 results"
    dead end, never negative empty-state phrasing.
- **The visit ledger** (`VisitLedger`, NEW): the world view's list of the
  world's places **ordered by last visit** (most recent first; places never
  visited fall to the bottom, ordered by `Place.createdAt`). Each row is a real
  button showing the place name, its "Last visit here: {elapsed} ago" line and
  visit count (or the first-entry invite for an unvisited place), and opens that
  place's recall panel on tap/Enter. This **replaces** the world view's current
  always-expanded per-place entry dump (see "The one scope judgment" below).
- **Answer-back at write time** (planner AC 4): when the composer saves an
  entry, the composer closes and that place's **recall panel opens** in the same
  gesture, showing the just-written entry at the top with "Last visit here:
  today" and the incremented count. This holds whether the place had prior
  history or this is its first entry.
- **A place-indexed recall lookup** (`buildRecallIndex`, NEW): a derived,
  single-pass index grouping a world's entries by `placeId` into newest-first
  lists, so a tap is an O(1) map lookup returning an already-sorted list, and
  the recency-ordered ledger is produced in one pass. Built once per world and
  memoized, so taps never trigger a full scan. This is the perf spine of planner
  AC 2.
- **Map tap now opens recall** (`MapCanvas` wiring change, small): tapping a
  place marker (when not mid-draw and not dropping) opens the **recall panel**
  for that place. The composer is reached from the world view's "Write a dream"
  button and from the panel's "Write a dream here" action.
- **First-recall coach mark** (minimal, required by QUALITY BAR §4 and the
  differentiator's "reachable in the first minute"): a single dismissible,
  one-sentence hint on the world view that points the user to tap a place, shown
  only when the active world has at least one place with history and only until
  the user's first recall-panel open (or an explicit dismiss), then never again.
  Its "seen" flag lives in `localStorage`, outside the atlas file, so the user's
  owned atlas stays clean. Scope is exactly this one hint for this one moment.
- **New copy** in `src/copy.ts` (a `recall` section), reusing the existing,
  already-swept `worldView.lastVisitPrefix`, `worldView.visitOne`,
  `worldView.visitManySuffix`, and `worldView.placeNoEntries` strings, plus a
  full mechanical copy sweep.

### Out of scope (non-goals — building any of these is a defect)

- **No search across worlds.** (Plan non-goal.) The panel and ledger answer for
  one place in the current world. No global search box, no cross-world query, no
  "find entries mentioning X".
- **No AI summary of entries.** (Plan non-goal.) The panel lists the raw dated
  entries. No synthesis, no theme extraction, no interpretation, no LLM call of
  any kind on this path.
- **No separate export of the recall view.** (Plan non-goal.) The whole atlas is
  already saved to the owned file by the existing file-save path. Do not add a
  "share/print/export this place's recall" surface.
- **No editing or deleting entries** in the panel. Recall reads; it does not
  mutate entries. (Same boundary EPIC 3 drew; record an edit surface as a
  follow-up if you believe it is needed.)
- **No time-scrub / palimpsest timeline.** Recall reads `world.entries`, never a
  stratum. The map-history scrubber is a later EPIC. Do not touch strata here.
- **No new entry-composer features.** The composer is reused as-is (with one
  additive `onSaved` callback). Do not add fields, media, tags, mood, or any
  dream-analysis surface.
- **No changes to drawing, tools, palette, strata, or district naming** beyond
  repurposing the existing `onPickPlace` marker tap to open recall instead of
  the composer.
- **No general onboarding system.** The coach mark is one hint for the recall
  moment only. Do not build a multi-screen tour, a settings toggle for it, or a
  reusable tooltip framework.

### The one scope judgment this spec makes (read before building)

Today the world view renders a `PlaceCard` per place that **always** shows that
place's full entry list inline. This EPIC **replaces** that always-expanded dump
with the **visit ledger** (compact rows, ordered by last visit) plus the
**on-demand recall panel** (the full entries, shown when you tap). This is
required, not optional, for two reasons:

1. **It is the signature moment.** The differentiator is *touch and it answers
   back*. An always-visible dump has no "answer back" — the entries are just
   sitting there. Moving them behind the tap is what creates the moment the
   product must win on.
2. **Radical simplicity (QUALITY BAR §7).** Keeping the always-expanded cards
   *and* adding a ledger *and* a panel would be three overlapping surfaces for
   the same data. The world view gets one primary overview (the ledger) and one
   detail surface (the panel).

The existing `seed.test.tsx` asserts entry bodies render on the initial world
view. It must be updated (see Test plan) to assert the ledger's "Last visit
here:" overview on landing and the entry body **after** opening the panel. This
is a required, in-scope test change, not a regression.

---

## Technical design

### Data model (no migration, no version bump)

No type changes. `CURRENT_VERSION` stays `1`. Recall is entirely derived from
existing fields:

- `Entry { id; placeId; date /* YYYY-MM-DD */; body; createdAt /* ISO */ }`.
- `Place { id; name; anchor; createdAt }` — `id` is the stable identity recall
  indexes against and survives any redraw (invariant already documented in
  `src/model/atlas.ts`).
- The elapsed label is computed at render by `elapsedLabel(fromISO, nowISO)`
  (already returns "today" / "yesterday" / "N days ago" / "N months ago" /
  "N years ago"). Never stored.

The atlas file written after this EPIC is byte-compatible with every prior
build; no `ATLAS_FORMAT.md` change is required (the `Entry` shape and the
"ledger is derived, never stored" note already cover recall). Only touch
`ATLAS_FORMAT.md` if you add clarifying wording, and if so, sweep it.

### Recall index (`src/model/recallIndex.ts`, NEW) — the perf spine

The current `worldLedger(world)` calls `placeLedger` once per place, and each
call runs `entries.filter(...)` over the whole array — O(places × entries), a
full scan of the corpus on every build. That cannot back a 100ms tap that
"does not slow as entries accumulate". Add a single-pass index:

```
export interface PlaceRecall {
  place: Place;
  count: number;
  lastVisit: string | null;   // most recent entry date (YYYY-MM-DD), or null
  entries: Entry[];           // newest-first (date desc, then createdAt desc)
}

export interface RecallIndex {
  // O(1) lookup. Returns the same PlaceRecall object reference on repeated
  // calls for the same id (precomputed, never re-filtered or re-sorted per call).
  get(placeId: string): PlaceRecall;
  // Every place in the world, ordered by last visit (most recent first),
  // unvisited places last by Place.createdAt ascending.
  ledger: PlaceRecall[];
}

export function buildRecallIndex(world: World): RecallIndex;
```

Build in one pass: group `world.entries` into a `Map<placeId, Entry[]>`, sort
each group newest-first exactly once, then build one `PlaceRecall` per
`world.places` and the recency-ordered `ledger`. `get` is a `Map` lookup that
returns the precomputed `PlaceRecall` (a place with no entries returns
`{ place, count: 0, lastVisit: null, entries: [] }`). Sorting reuses the same
newest-first comparator semantics `placeLedger` already uses (date desc, then
`createdAt` desc, stable).

**Hot-path rule:** the index is built once per world and **memoized in
`WorldView`** with `useMemo(() => buildRecallIndex(world), [world])`. A tap does
not mutate `world`, so its identity is stable between taps and the memo holds;
only a write rebuilds the index (off the tap path, on the already-debounced save
path). Opening the panel is then a synchronous `index.get(placeId)` plus a React
render, with no fetch and no await, so it lands within 100ms structurally.

Keep the existing `src/model/ledger.ts` (`placeLedger`, `worldLedger`) and its
tests as they are; other callers (the composer's place ordering) may keep using
`placeLedger`, which is off the tap hot path. Do not delete or rewrite it.

### Interaction and world-view state (`src/ui/WorldView.tsx`, EDIT)

Lift a single "active sheet" view state so exactly one sheet is open at a time
and the map behind it is inert:

```
type View =
  | { kind: "none" }
  | { kind: "recall"; placeId: string }
  | { kind: "compose"; placeId: string | null }
  | { kind: "dropping"; placeId: string | null; capturedPoint: Point | null };
```

(The `compose`/`dropping` shape mirrors the existing composer state; fold the
current `ComposerState` into this union or keep them adjacent, whichever is the
smaller change. Preserve the existing drop-a-new-place flow exactly.)

Transitions:

- **Tap a place marker** (`MapCanvas onPickPlace`, when not mid-draw / not
  dropping) → `{ kind: "recall", placeId }`.
- **Tap a ledger row** → `{ kind: "recall", placeId }`.
- **"Write a dream"** world-view button → `{ kind: "compose", placeId: null }`
  (unchanged behavior: opens the composer with no place preselected).
- **Recall panel "Write a dream here"** → `{ kind: "compose", placeId }` (the
  panel's place preselected).
- **Composer save** → the composer calls `onSaved(placeId)`; WorldView goes to
  `{ kind: "recall", placeId }` (answer-back at write time).
- **Composer cancel / Escape / scrim**, **recall close / Escape / scrim** →
  `{ kind: "none" }`.

`MapCanvas` `pickable` is `view.kind === "none"` (markers inert while any sheet
is open). The existing drop flow (`dropping`, `onDropPoint`, `addPlaceAtPoint`)
is preserved unchanged inside the `compose`/`dropping` states.

### `RecallPanel` component (`src/ui/RecallPanel.tsx`, NEW)

A modal dialog reusing the composer's sheet mechanics: `role="dialog"`,
`aria-modal="true"`, labelled by the place-name heading, focus moved into it on
open, focus trapped, `Escape` closes, focus returned to the opener (the tapped
marker or ledger row) on close, scrim tap closes. Props:

```
interface RecallPanelProps {
  recall: PlaceRecall;              // from index.get(placeId)
  onWriteHere: (placeId: string) => void;
  onClose: () => void;
}
```

Layout, top to bottom:

1. **Header**: the place name (`<h2>`, the dialog's label) and a close control
   (`aria-label` = `copy.recall.close`).
2. **Body** (scrollable):
   - If `recall.count > 0`:
     - `copy.worldView.lastVisitPrefix` + " " + `elapsedLabel(recall.lastVisit, now)`
       (for example "Last visit here: 14 months ago"), where `now =
       new Date().toISOString()`.
     - the visit count via the existing rule: `count === 1 ?
       copy.worldView.visitOne : "{count} {copy.worldView.visitManySuffix}"`.
     - an ordered list (`<ol>`, `list-style: none`) of `recall.entries`
       (newest-first), each `<li>` with the formatted date (primary), the
       per-entry `elapsedLabel(entry.date, now)` (secondary, muted), and the
       entry body. Reuse the existing `.entry` / `.entry__date` / `.entry__body`
       styles; add one muted class for the per-entry elapsed line.
   - If `recall.count === 0`: the designed invite state —
     `copy.recall.emptyTitle` + `copy.recall.emptyBody`, positive voice, no dead
     end.
3. **Action**: a single primary **"Write a dream here"** button
   (`copy.recall.writeHere`) calling `onWriteHere(recall.place.id)`. In the
   empty state this is the one obvious next step; with history it sits below the
   entries as the one primary action.

Date formatting: reuse the existing `formatDate` helper's logic ("2 November
2019"); extract it to a shared spot if the composer/world-view copy of it would
otherwise be duplicated, or copy the small function. Keep it timezone-free
(split the `YYYY-MM-DD` string; never `new Date(date)` for formatting).

### `VisitLedger` component (`src/ui/VisitLedger.tsx`, NEW)

Renders `index.ledger` as a list of place buttons under a heading
(`copy.recall.ledgerHeading`). Each row is a real `<button>` (accessible name =
place name, visible focus, ≥44px tap height) that calls `onOpen(place.id)`:

- Visited place: place name, "Last visit here: {elapsed} ago", and the visit
  count.
- Unvisited place (`count === 0`): place name and the existing
  `copy.worldView.placeNoEntries` invite ("Pin your first morning here.").

The ledger is the world view's overview and is what makes "places by last visit"
viewable and matching the underlying entries (planner AC 5). It shows only when
the world has at least one place; a brand-new empty world keeps the map's
existing "Start a district" empty CTA as its single primary.

### `WorldView` changes (`src/ui/WorldView.tsx`, EDIT)

- Build `const index = useMemo(() => buildRecallIndex(world), [world])`.
- Replace the current `PlaceCard` map (the always-expanded per-place entry dump)
  with `<VisitLedger index={index} onOpen={openRecall} />`.
- Render `<RecallPanel recall={index.get(view.placeId)} onWriteHere={...}
  onClose={...} />` when `view.kind === "recall"`, and the existing
  `EntryComposer` when `view.kind === "compose" | "dropping"`.
- Keep the "Write a dream" primary button and the save-error banner exactly as
  they are.
- Pass `onPickPlace={openRecall}` and `pickable={view.kind === "none"}` to
  `MapCanvas`.
- Mount the first-recall coach mark (below).

### `EntryComposer` changes (`src/ui/EntryComposer.tsx`, EDIT — minimal)

Add one prop `onSaved(placeId: string): void`. In `handleSave`, after
`addEntry(world.id, placeId, date, body)` succeeds, call `onSaved(placeId)`
instead of (or in addition to) `onClose()`; WorldView uses it to open the recall
panel for that place. Cancel/Escape/scrim keep calling `onClose`. No other
composer change.

### `MapCanvas` changes (`src/ui/MapCanvas.tsx`, EDIT — wiring/comment only)

The marker rendering, `onPickPlace`, `pickable`, `dropping`, and `onDropPoint`
already exist and are correct. The only change is semantic: `onPickPlace` now
opens the recall panel (WorldView decides). Update the `onPickPlace` prop comment
to say it opens recall for that place. Do not change the drawing surface, the
drop-capture flow, or marker inertness while drawing/dropping.

### First-recall coach mark (minimal; QUALITY BAR §4, planner differentiator)

A single hint that leads a first-time visitor to the signature moment:

- **Content**: one imperative sentence, `copy.recall.hint` ("Tap a place to see
  what you wrote there."), with a dismiss control `copy.recall.hintDismiss`
  ("Got it").
- **When shown**: only when `view.kind === "none"`, the world has at least one
  place with history (`index.ledger.some((r) => r.count > 0)`), and the "seen"
  flag is unset. It appears near the ledger/map so it points at the real
  controls, not as a full-screen overlay.
- **When it goes away for good**: the moment the user first opens a recall panel
  (by marker tap or ledger row) OR taps "Got it". Persist a "seen" flag so a
  returning user never sees it again.
- **Persistence**: a tiny guarded helper `src/lib/firstRun.ts` exposing
  `hasSeenRecallHint(): boolean` and `markRecallHintSeen(): void` over
  `localStorage` (key e.g. `nc.recallHintSeen`), wrapped in try/catch so a
  storage-blocked browser degrades to simply not showing the hint (never
  crashes). The flag lives in `localStorage`, **not** in the atlas file, so the
  user's owned atlas stays free of onboarding state.
- **Skippable**: the "Got it" control dismisses it at any time; it is never
  modal and never blocks the map or the ledger.

This is the whole first-run obligation for this EPIC: point at the one moment
and get out of the way. It is not an essay and not a tour.

### Designed states (QUALITY BAR §3)

- **Empty (place with no history):** the panel's positive invite
  (`copy.recall.emptyTitle` + `emptyBody`) with "Write a dream here" as the one
  action. No "0 results", no blank region, no dead end.
- **Empty (world with no places):** unchanged — the map's existing "Start a
  district" CTA remains the single primary; the ledger and coach mark do not
  show until there is a place.
- **Loading:** recall opens from already-loaded in-memory state with no fetch,
  so a spinner would be dishonest; the panel layout is present immediately. The
  app-level first-load skeleton (`LoadingShell`) already covers the only genuine
  async load. Note this deliberate absence in the PR so a reviewer does not read
  it as a gap.
- **Error:** recall is a pure read of in-memory state and cannot fail, so it has
  no error surface of its own. The existing save-error banner (a real
  device-write failure, on the write path) stays exactly as shipped.

### Perceived speed and mobile-first (QUALITY BAR §1, §2; planner AC 2, AC 6)

- The tap → panel path is synchronous: `index.get(placeId)` (O(1)) plus a React
  render. No fetch, no timer, no full scan. It stays within 100ms at any corpus
  size because the only per-corpus work (grouping/sorting) happens once at
  index-build time, off the tap path.
- The panel is single-column and fully usable at 390px with no horizontal
  scroll; the entry list scrolls within the sheet while the header and the
  "Write a dream here" action stay reachable. Every control (close, ledger rows,
  "Write a dream here") is ≥44px in its tappable dimension with comfortable
  spacing. Long entry bodies wrap and never cause horizontal overflow.
- The ledger and panel render from local memoized state; interactions update
  within one frame.

### Accessibility (QUALITY BAR §6; planner AC 6 dismiss)

- The panel is a labelled modal dialog with focus moved in on open, a focus
  trap, `Escape` to close, and focus returned to the opener on close. The close
  control is a real `<button>` with an accessible name and a visible focus
  state, and is reachable by keyboard (planner AC 6: "its dismiss is obvious and
  keyboard-reachable").
- Ledger rows and "Write a dream here" are real `<button>`s with accessible
  names and visible focus. Place markers are already keyboard-focusable (from
  EPIC 3) and now open recall; keyboard reaches everything a pointer can.
- Semantic structure: the place name is a real heading; the entry list is an
  `<ol>`; AA contrast on all text, including the muted per-entry elapsed line.

### Security / boundary hygiene (QUALITY BAR §5; local, no-network app)

- Recall is read-only over in-memory state; it adds no route, no network call,
  and no mutation. The core loop stays fully offline.
- All entry bodies, place names, dates, and elapsed labels render through React
  text nodes (auto-escaped). Never `dangerouslySetInnerHTML`.
- No atlas content, entry bodies, place names, dates, or coordinates are ever
  logged. `localStorage` holds only the boolean-ish "recall hint seen" flag, no
  atlas data.

### Copy (all new strings in `src/copy.ts`, pre-swept and safe to ship)

Add a `recall` section. Reuse the existing swept strings for the last-visit
prefix, visit counts, and the unvisited-place invite; do not duplicate them.

```
recall: {
  close: "Close",
  writeHere: "Write a dream here",
  emptyTitle: "The first dream goes here.",
  emptyBody: "Pin a morning to this place. It remembers from then on.",
  ledgerHeading: "Places",
  hint: "Tap a place to see what you wrote there.",
  hintDismiss: "Got it",
},
```

Reused (already in `copy.worldView`, already swept): `lastVisitPrefix` ("Last
visit here:"), `visitOne` ("1 visit"), `visitManySuffix` ("visits"),
`placeNoEntries` ("Pin your first morning here.").

All new strings above have been swept: no `"—"`/`"–"`, none of the banned
vocabulary (seamlessly, effortlessly, unlock, elevate, empower, leverage,
robust, dive in, and their kin), and no negative empty-state phrasing ("no",
"nothing", "don't", "unable", "something went wrong"). The empty state is a
positive invite, not "no entries yet". Sweep again mechanically over the final
`copy.ts` before finishing; `copy.test.ts` walks the whole `copy` object and
checks every string automatically.

### Files to create / touch

```
src/model/recallIndex.ts      NEW   buildRecallIndex(world): single-pass, placeId-indexed
src/model/recallIndex.test.ts NEW   index correctness, ordering, O(1) reference-stability
src/ui/RecallPanel.tsx        NEW   the recall sheet (entries, elapsed, states, a11y)
src/ui/recallPanel.test.tsx   NEW   panel content, one/none states, dismiss, 390px structure
src/ui/VisitLedger.tsx        NEW   places-by-last-visit list, rows open recall
src/ui/visitLedger.test.tsx   NEW   ordering matches entries; unvisited invite; row opens panel
src/lib/firstRun.ts           NEW   hasSeenRecallHint / markRecallHintSeen (guarded localStorage)
src/ui/WorldView.tsx          EDIT  view-state union, memoized index, ledger+panel, coach mark, wiring
src/ui/EntryComposer.tsx      EDIT  onSaved(placeId) callback after a successful save
src/ui/MapCanvas.tsx          EDIT  onPickPlace comment (now opens recall); no behavior change
src/ui/tokens.css             EDIT  panel reuse, per-entry elapsed line, ledger rows, coach-mark hint
src/copy.ts                   EDIT  recall section
src/ui/seed.test.tsx          EDIT  landing asserts ledger overview; entry body asserted after tap
ATLAS_FORMAT.md               EDIT  only if clarifying wording is added (optional); sweep if touched
```

---

## Ordered task list (each item independently checkable)

1. **Recall index (pure).** `buildRecallIndex(world)` returning `{ get, ledger }`
   as specified: single pass, entries grouped by `placeId` and sorted
   newest-first once, `get` O(1) returning the precomputed `PlaceRecall`, and
   `ledger` ordered by last visit (unvisited last by `createdAt`).
   *AC:* for a world where place A has entries dated 2021-05-11 and 2019-11-02
   and place B has none: `get(A).count === 2`, `get(A).lastVisit === "2021-05-11"`,
   `get(A).entries` is newest-first; `get(B)` is `{ count: 0, lastVisit: null,
   entries: [] }`; `ledger` lists A before B; `get(A)` called twice returns the
   **same array reference** (proving no per-call re-filter/re-sort). A
   large-corpus case (e.g. 5,000 entries across 50 places) returns correct,
   correctly-ordered results.

2. **RecallPanel component.** The dialog/sheet with the last-visit line, visit
   count, newest-first entries (each with formatted date, secondary per-entry
   elapsed, and body), the empty invite state, the "Write a dream here" action,
   and full dialog a11y (label, focus trap, Escape, focus restore, scrim close).
   *AC:* given a `PlaceRecall` with two entries the panel shows the place name
   heading, a "Last visit here: … ago" line, "2 visits", both entries
   newest-first each with a date and an elapsed line, and a "Write a dream here"
   button; with one entry it shows "1 visit" and exactly one entry; with zero it
   shows `copy.recall.emptyTitle`/`emptyBody` and no entry list and no "0
   results"; Escape and the close button both call `onClose`; "Write a dream
   here" calls `onWriteHere` with the place id.

3. **VisitLedger component.** Places ordered by last visit; visited rows show the
   last-visit line and count; unvisited rows show the invite; each row opens
   recall.
   *AC:* given places with mixed history, rows render most-recent-visit first
   with unvisited places last; a visited row shows "Last visit here: … ago" and
   the count; an unvisited row shows `copy.worldView.placeNoEntries`; clicking a
   row calls `onOpen` with that place id.

4. **WorldView wiring + answer-back + coach mark.** The view-state union, the
   memoized index, ledger + panel mounted, marker tap → recall, composer
   `onSaved` → recall, and the first-recall coach mark.
   *AC:* on a world with a place that has history, tapping its marker or ledger
   row opens the recall panel for that place; the "Write a dream" button still
   opens the composer with no place preselected; opening the composer, typing,
   picking that place, and saving closes the composer and opens the recall panel
   showing the new entry at the top with "Last visit here: today" and an
   incremented count (answer-back at write time); the coach mark shows on first
   visit when a place has history, disappears after the first panel open or
   "Got it", and does not reappear after `markRecallHintSeen`.

5. **EntryComposer + MapCanvas edits.** Add `onSaved(placeId)` (called after a
   successful `addEntry`); update the `onPickPlace` comment. No other behavior
   change; the drop-a-new-place flow and drawing surface are untouched.
   *AC:* saving in the composer calls `onSaved` with the pinned place id;
   cancel/Escape/scrim still call `onClose` and do not call `onSaved`; the
   existing composer and map-canvas tests still pass (with the marker-tap
   integration now routed to recall in WorldView).

6. **Styles + copy + sweep.** Panel reuse of the sheet styles, the muted
   per-entry elapsed line, ledger row styles, and the coach-mark hint
   (mobile-first, ≥44px, AA contrast, visible focus); add the `recall` copy
   section; run the mechanical sweep.
   *AC:* the panel is single-column and usable at 390px with no horizontal
   scroll and a scrollable entry list; every control is ≥44px and focus-visible;
   the copy sweep (`copy.test.ts`) finds no `"—"`/`"–"`, no banned vocabulary,
   and no negative empty-state phrasing across the new strings; `npm run build`,
   `npm run lint`, and `npm test` pass (including the updated `seed.test.tsx` and
   all prior EPIC suites).

---

## Test plan (which automated test proves each planner criterion)

Use the existing `vitest` + `@testing-library/react` + `jsdom` stack. Add
`recallIndex.test.ts`, `recallPanel.test.tsx`, `visitLedger.test.tsx`; update
`seed.test.tsx`; `copy.test.ts` coverage is automatic.

- **Tapping a place with prior entries opens a panel, newest-first, each with
  its date and a human elapsed time, copy clean** (planner AC 1):
  `recallPanel.test.tsx` asserts, for a two-entry `PlaceRecall`, the newest-first
  order, each entry's formatted date and per-entry elapsed line, the "Last visit
  here: … ago" header, and the visit count. A WorldView/integration case (in
  `seed.test.tsx` or a worldView test) taps The Harbor's marker/ledger row and
  asserts the panel opens showing the newest entry body. `copy.test.ts` proves
  the new strings carry no banned filler or em-dashes.

- **Panel within 100ms; indexed by placeId; no full scan on the hot path**
  (planner AC 2): `recallIndex.test.ts` proves `get` returns the precomputed,
  reference-stable `PlaceRecall` (same array object on repeated calls, so no
  per-call filter/sort), builds in a single pass, and stays correct on a
  large-corpus fixture. The panel-open path is asserted to be synchronous (the
  integration test opens the panel and finds content with no timer/await). The
  structural guarantee (memoized index + O(1) `get` + synchronous render)
  documents the sub-100ms wall-clock; note it in the PR (avoid a flaky timing
  assertion).

- **A place with exactly one entry, and a place with none, each show a correct
  designed state** (planner AC 3): `recallPanel.test.tsx` asserts the one-entry
  case renders "1 visit" and exactly one entry (no plural glitch, no "1
  result"), and the zero case renders the positive invite copy with the "Write a
  dream here" action and no entry list and no "0 results" dead end.

- **Placing a new entry at a place with history shows recall in the same
  gesture** (planner AC 4): an integration test opens the composer on a world
  where the target place already has entries, types a body, selects that place,
  and clicks Save; asserts the composer closed and the recall panel for that
  place is now open, with the just-written entry at the top and the count
  incremented. A second case covers a place with no prior history (first entry →
  panel shows the single new entry).

- **The per-world visit ledger (places by last visit) is viewable and matches
  the entries** (planner AC 5): `visitLedger.test.tsx` builds the index from a
  fixture with mixed visit history and asserts the rendered row order matches
  last-visit-descending (unvisited last), each row's count and last-visit line
  match `buildRecallIndex`/`placeLedger` for that place, and clicking a row opens
  its recall. `recallIndex.test.ts` proves the `ledger` ordering independently.

- **The panel is usable at 390px and its dismiss is obvious and
  keyboard-reachable** (planner AC 6): `recallPanel.test.tsx` asserts the dialog
  role and label, a single-column structure with no element declaring a fixed
  width beyond the mobile column, the close control present as a real focusable
  button, `Escape` closing the panel, and focus returning to the opener. The
  ≥44px control sizes and AA contrast are asserted structurally where testable
  and confirmed by the layout contract; note the keyboard-overlap-free, no-
  horizontal-scroll layout in the PR.

- **Copy is clean** (QUALITY BAR §8, spanning ACs): `copy.test.ts` automatically
  covers the new `recall` strings and asserts zero `"—"`/`"–"`, zero banned
  vocabulary, and zero negative empty-state phrasing.

- **Seed landing still proves the differentiator is reachable** (QUALITY BAR §4,
  updated test): `seed.test.tsx` lands on the sample world and asserts the visit
  ledger shows "The Harbor" with a "Last visit here: … ago" overview line
  (reachable at a glance), then taps The Harbor to open its recall panel and
  asserts the entry body ("the gulls remembered me first") and the panel's
  last-visit line render. This preserves the first-minute reachability proof
  through the new tap interaction.

**Definition of done:** `npm run build`, `npm run lint`, and `npm test` all pass
(including the updated `seed.test.tsx` and every prior EPIC suite); tapping a
place (marker or ledger row) opens its recall panel within a synchronous render,
listing its entries newest-first with a correct "Last visit here: … ago" line, a
correct visit count, and a per-entry elapsed time; a place with one entry and a
place with none each show a correct designed state; saving a new entry opens the
recall panel for that place in the same gesture; the visit ledger lists places
by last visit and matches the underlying entries; the panel is single-column and
usable at 390px with an obvious, keyboard-reachable dismiss; the lookup is
indexed by `placeId` and does not scan the whole corpus on a tap; the first-
recall coach mark leads a new visitor to the moment once and never again; the
copy sweep is clean; and no non-goal (cross-world search, AI summary, separate
recall export, entry edit/delete, time-scrub, onboarding system) shipped.

---

## Risks and guardrails

- **The whole product is judged here.** This EPIC has the craft budget because
  it is the differentiator. The bar is not "recall works" but "recall is
  instant, complete, true, and discoverable in the first minute". Hold every
  detail (elapsed correctness, ordering, the write-time answer-back, the 390px
  panel, the coach mark) to that, not to the baseline.
- **Slowness that only shows up after years.** The single biggest technical
  trap: leaving the tap path on the O(places × entries) `worldLedger` scan. It
  looks instant on the demo's five entries and dies on a decade's worth. The
  memoized single-pass index with O(1) `get` is binding; the reference-stability
  test guards against a regression back to per-tap filtering.
- **Wrong or missing answers.** Recall must return **every** entry for a place,
  in the right order, with a correct human elapsed time, matching the data. A
  stable-sort tiebreak (date desc, then `createdAt` desc) and reuse of the
  proven `elapsedLabel` keep this honest. An entry pinned to a place must still
  appear after the map is redrawn (the `placeId` invariant from `atlas.ts`); do
  not re-key recall on shapes or coordinates.
- **Discoverability, not just capability.** A signature moment hidden behind an
  unhinted tap fails "reachable in the first minute". The coach mark is the fix
  and is in scope. Keep it to one sentence pointing at the real control, shown
  once, `localStorage`-gated, never a tour.
- **Scope creep toward search / AI / export.** The panel begs for a search box,
  a summary, or a share button. All three are binding non-goals. Recall answers
  for one place in one world, with the raw entries, saved only through the
  existing whole-atlas file path.
- **Do not pollute the owned atlas.** The "recall hint seen" flag is per-device
  UI state and lives in `localStorage`, never in the atlas file. The file is the
  thing the user carries out of a burning house; keep onboarding state out of it.
- **Replacing the inline place cards is intended.** Removing the always-expanded
  entry dump in favor of the ledger + on-demand panel is the signature moment,
  not a regression. Update `seed.test.tsx` to prove reachability through the tap;
  do not keep both surfaces.
