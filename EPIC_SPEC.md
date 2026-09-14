# EPIC SPEC — Pinned morning entries (the sub-minute gesture)

*The Night Cartographer: an atlas of the places you only visit in dreams.*

This EPIC builds the **entry composer**: a dated text entry pinned to a place,
written on a phone in the groggy minutes after waking. From an opened world a
user opens the composer, types the dream, picks an existing place or drops a
new one, keeps or edits the date, and saves. The entry is stored against a
`placeId` and appears immediately. It is fully usable at 390px, and the save
action is never hidden behind the on-screen keyboard.

This is one of the product's two load-bearing legs (the other is recall). It
builds directly on the existing data model (`Entry`, `Place`, `placeLedger`),
the `atlasStore`, the `MapCanvas`, and the `WorldView`. **No schema version
bump and no data migration**: `Entry`, `createEntry`, the entry schema, and the
ledger already exist (EPIC 1); this EPIC writes real entries through them for
the first time.

---

## Quality differentiator (this app must win here)

**Recall: the map answers back.** Touch any place and the atlas instantly
returns everything you wrote there before, with the time since your last visit.
Paper cannot answer. A dream-journal app has no places to answer from. Obsidian
answers only if you hand-wired every link yourself.

**What this EPIC owes the differentiator.** Recall (EPIC 4) can only answer with
what this EPIC captures. Entries are the fuel recall burns. If pinning a dream
to a place is slow, or an entry is stored against anything other than a stable
`placeId`, recall answers with nothing or with the wrong place two EPICs later.
So this EPIC's whole job for the differentiator is: **make pinning a dream to a
place fast and reliable, and store every entry against a `placeId` that survives
any later map revision.** The sub-minute gesture is not a convenience here; it
is what makes the years-long corpus exist for recall to answer from.

---

## Scope

### In scope
- **The entry composer** (`EntryComposer`): a modal sheet (a bottom sheet at
  phone widths, a centered dialog on wider screens) opened from an opened
  world. It holds three things and nothing else: the dream text, the date, and
  the place it pins to.
- **A single primary action on the world view** (`"Write a dream"`) that opens
  the composer. It is the world view's one obvious primary action (QUALITY BAR
  §7) once the world has something to pin to.
- **Two ways to choose the place, both landing in the same composer:**
  1. **Pick an existing place.** In the composer, existing places show as a row
     of selectable chips, most-recently-visited first. One tap selects.
     Additionally, tapping a **place marker on the map** (see below) opens the
     composer already pinned to that place.
  2. **Drop a new place.** From the composer, a `"New place"` action lets the
     user place a point on the map (pointer tap or the existing keyboard
     reticle) and give it a short name. This mints a `Place` (anchor = the
     dropped point, no district shape) and selects it as the pin target.
- **Place markers on the canvas**: a small, subtle marker rendered at each
  place's `Point` anchor so places are visible on the map (a dropped-point place
  has no district shape and would otherwise be invisible). Markers are the
  map-first way to "tap an existing place". Tapping a marker opens the composer
  pinned to that place. Markers are inert while a shape is being drawn (they
  never fight the drawing surface) and **never open a recall panel** (that is
  EPIC 4).
- **The date field**: defaults to **today** (the local calendar date), is
  editable through a native date input, and is capped at today (a dream cannot
  be dated in the future). A dream written down days later can be dated
  correctly.
- **Optimistic save**: saving commits synchronously to the store, the sheet
  closes, and the entry appears immediately in the pinned place's readout (and
  the place's marker appears immediately if it was just dropped). Autosave to
  IndexedDB stays the existing 500ms debounce.
- **Designed empty, and error states** for the composer surface:
  - Composer opened on a world with no places: a designed, positive state that
    leads the user to drop or draw a place first.
  - A failed device save: a designed, product-voice banner on the world view
    that says what to do next (save the atlas to a file), never a raw error.
  - (Loading: the composer opens from already-loaded in-memory state with no
    fetch, so there is no spinner. See "Loading" under Designed states for why
    this is correct rather than a skipped state.)
- **Store mutations** for adding an entry and for adding a bare place at a
  point, plus **save-status surfacing** so a failed autosave can be shown.
- **Boundary caps** on entry input (body length, date format, valid `placeId`).
- **New copy** in `src/copy.ts` (a `composer` section), a full copy sweep, and
  an `ATLAS_FORMAT.md` note if any wording about entries needs it (the `Entry`
  shape itself is already documented and does not change).

### Out of scope (non-goals — building any of these is a defect)
- **No rich media in entries.** No audio, no images, no attachments, no file
  input in the composer. Text only. (Plan non-goal.)
- **No tags, symbols, mood, weather, or any dream-analysis field.** The entry
  is date + body + place. Nothing else. (Plan non-goal.)
- **No AI anywhere.** No suggestions, no auto-place-guessing, no summaries.
  (Plan non-goal.)
- **No recall.** Tapping a place opens the **composer**, never a recall panel;
  there is no elapsed-time answer-back triggered by this EPIC's map taps beyond
  the existing EPIC 1 read-only readout, which stays exactly as it is. The
  signature answer-back panel and "recall at write time" are EPIC 4. Do not
  build them here.
- **No time-scrub UI** (EPIC 5). Entries attach to `world.entries`, not to a
  stratum, so nothing here touches the palimpsest timeline.
- **No editing or deleting existing entries.** This EPIC creates entries. An
  entry-edit/delete surface is a separate, later concern; do not add it (record
  it as a follow-up if you believe it is needed).
- **No draft persistence / recovery across sessions.** An open composer's
  unsaved text is transient component state. Do not build cross-reload draft
  storage.
- **No cross-world entry, no search, no lists across places.** The composer
  pins to one place in the current world.
- **No changes to the EPIC 2 drawing kit or its behavior** beyond adding place
  markers and the pin-tap. Draw tools, palette, stamps, strata, and district
  naming stay exactly as they are.

### The one scope judgment this spec makes (read before building)
"Drop a point" (from the plan's scope line) is realized as **minting a bare
`Place` at that point** (a `Place` whose `anchor` is a `Point`, with no district
shape and no stratum change), then pinning the entry to it. This is required
because an `Entry` references a `placeId`, never a coordinate, and a dropped
point must therefore become a durable place for recall to survive later map
revisions. A dropped place is given a short name in the same gesture, because a
nameless place is a useless recall target ("touch the harbor" needs a harbor).
This is the minimal way to honor "drop a point" without inventing a second kind
of pin target. It does not add a district, does not append a stratum, and does
not touch existing places.

---

## Technical design

### Data model (no migration)
The types are unchanged. For reference, the relevant existing shapes:

- `Entry { id; placeId; date /* YYYY-MM-DD */; body; createdAt /* ISO */ }` —
  already in `src/model/atlas.ts`, already validated by `entrySchema` in
  `src/model/schema.ts` (body capped at 20 000), already created by
  `createEntry(placeId, date, body)` in `src/model/factory.ts`.
- `Place { id; name; anchor: Point | { shapeRef } | null; createdAt }` — a
  dropped place uses a `Point` anchor. `createPlace(name, anchor)` already
  supports this.
- The **derived ledger** `placeLedger(entries, placeId)` already returns
  `{ count, lastVisit, entries /* newest-first */ }`.

Because all of this exists, **there is no forward migration and no version
bump.** The atlas file written after this EPIC is the same `version: 1` and
parses in every prior build (which simply ignores nothing new — entries were
always part of the format).

### New date helper (local, not UTC)
Add a tiny helper next to the existing elapsed logic (`src/lib/elapsed.ts` or a
new `src/lib/date.ts`):

```
todayLocalISO(now: Date): string   // "YYYY-MM-DD" from LOCAL year/month/day
```

Use local components (`getFullYear`/`getMonth`/`getDate`), **not**
`toISOString()`, so the default date is the user's calendar today, never off by
a day near midnight in a non-UTC zone. This is the composer's default date and
the date input's `max`. Deterministic given its `now` argument (pass `new Date()`
at the call site; the helper takes the date so it is unit-testable).

### Store mutations (`src/state/atlasStore.ts`)
Add, mirroring the existing immutable `replaceWorld`/`set` pattern (each
produces a new atlas object, emits, and schedules the debounced autosave):

- `addEntry(worldId, placeId, date, body)` — validate: `placeId` exists in that
  world's `places`; `date` matches `^\d{4}-\d{2}-\d{2}$`; `body` is non-empty
  after trim. On any failure, do nothing (the composer prevents these; this is
  defense in depth). On success, append `createEntry(placeId, date, body.trim())`
  to `world.entries`. Body is stored trimmed and sliced to the schema body cap.
- `addPlaceAtPoint(worldId, name, point): string | null` — mint
  `createPlace(name.trim(), point)`, append it to `world.places`, and **return
  the new place id** so the composer can select it. Returns `null` (and does
  nothing) if `name` is empty after trim. Does not append a stratum and does
  not create a shape.

Both are optimistic and synchronous: the caller can read the new state
immediately via `getState()` / the next React render.

### Save-status surfacing (for the designed error state)
Autosave is currently fire-and-forget (`void saveAtlas(atlas)`), so a failed
device write is invisible. Add a minimal save-status channel so the world view
can show the designed error banner:

- Track `saveStatus: "idle" | "saving" | "error"` in the store.
- In `scheduleSave`, set `"saving"` when the write starts; on resolve set
  `"idle"`; on reject set `"error"` (and call `reportError(err)` from
  `src/hooks/errors.ts` so it is tracked, never logged with atlas content).
- Expose `getSaveStatus()` and include save-status changes in the existing
  `emit()` so subscribers re-render. A tiny `useSaveStatus()` hook
  (`useSyncExternalStore` over the same `subscribe`) reads it. Keep this small;
  do not build a general notification system.
- A successful later save clears `"error"` back to `"idle"`, so the banner
  auto-dismisses once the device accepts a write again.

This keeps the entry optimistic (it is already in memory and exportable) while
making a genuine persistence failure honest and actionable.

### Composer state ownership and the drop flow
Composer visibility and the chosen place are lifted to `WorldView` so both the
`"Write a dream"` button and a map marker tap can open the same composer:

```
// local state in WorldView
composer:
  | { open: false }
  | { open: true; mode: "compose"; placeId: string | null }
  | { open: true; mode: "dropping"; draft: EntryDraft }   // waiting for a map point
```

- `"Write a dream"` → `{ open: true, mode: "compose", placeId: null }` (or the
  most-recent place preselected is **not** done — see below).
- Tapping a place marker (canvas, not mid-draw) → `{ open: true, mode:
  "compose", placeId: <that place> }`.
- Composer `"New place"` → keep the typed body and date in `draft`, switch to
  `mode: "dropping"`, collapse the sheet to a slim bar with the hint copy, and
  put the canvas into a one-shot point-capture state (a `dropping` prop on
  `MapCanvas` with an `onDropPoint(point)` callback; pointer tap or the existing
  reticle + Enter both produce a point). After the point is captured, show a
  compact name field; confirming calls `addPlaceAtPoint`, selects the returned
  id, restores the `draft`, and returns to `mode: "compose"`.

The transient body/date text is preserved across the drop detour via `draft` so
the user does not retype after placing a new place. It is **not** persisted
anywhere; closing the composer discards it.

**Place preselection:** do not auto-select a place. Order the chips
most-recently-visited first (using `placeLedger(...).lastVisit`, falling back to
`Place.createdAt`) so the likely place is the first, largest tap target, but
require an explicit tap. Auto-selecting risks a silently mis-pinned entry, which
corrupts recall; an explicit tap on an already-ordered list keeps the gesture
sub-minute without that risk.

### `EntryComposer` component (`src/ui/EntryComposer.tsx`, NEW)
A modal dialog (`role="dialog"`, `aria-modal="true"`, labelled by its title),
with focus moved into it on open, focus trapped within it, `Escape` to close,
and focus returned to the opener on close. Layout, top to bottom, in a single
column:

1. **Header**: the title (`copy.composer.title`) and a close control
   (`aria-label` = `copy.composer.close`).
2. **Scrollable body** (this region scrolls; the action bar below does not):
   - **Dream text**: a `<textarea>`, labelled, **autofocused on open** so the
     keyboard rises immediately (the groggy-morning optimization). Placeholder
     in product voice. `maxLength` = the body cap.
   - **Date**: `<input type="date">`, labelled, `value` defaults to
     `todayLocalISO(new Date())`, `max` = today, editable.
   - **Place**: a labelled group.
     - If the world has ≥1 place: a wrap of chip `<button>`s (one per place,
       most-recent first), each a real button with `aria-pressed` for the
       selected one, plus a `"New place"` button that starts the drop flow.
     - If the world has 0 places: the designed empty place-picker state
       (`copy.composer.emptyPlacesTitle` / `...Body`) with the `"New place"`
       action as the way forward. Positive voice, no dead end.
3. **Sticky action bar** (bottom, inside the sheet, above the safe-area inset):
   the primary **Save** button and a secondary **Cancel**. The action bar is a
   sibling *after* the scrollable body and stays pinned, so the on-screen
   keyboard never hides Save (QUALITY BAR: "keyboard does not obscure the save
   action"). Use `position: sticky; bottom: 0` on the bar within a
   flex-column sheet, and `padding-bottom: env(safe-area-inset-bottom)`.

- **Save enablement**: Save is disabled until `body.trim()` is non-empty **and**
  a place is selected. A short helper line states, positively, what is still
  needed (`copy.composer.needBody` when body is empty, else
  `copy.composer.needPlace` when no place). Never a scolding negative.
- **On Save**: call `addEntry(world.id, placeId, date, body)`, then close the
  composer. The commit is synchronous, so the pinned place's readout shows the
  entry on the next render with no await and no reload. The Save button has a
  pressed state (`:active`) for sub-100ms feedback; because the commit is
  instant, do not fake a "Saving…" spinner.
- **On Cancel / Escape / close**: discard and close (the transient draft is
  dropped). Tapping the scrim closes the same way.

### `MapCanvas` changes (`src/ui/MapCanvas.tsx`, EDIT)
Additive only; the drawing behavior is unchanged.

- **Render place markers**: for each `place` in `world.places` whose `anchor` is
  a `Point`, render a small marker `<g>` at the anchor (a soft dot with a subtle
  ring, `styleToken`-neutral `ink`, sized so its hit area is comfortable but it
  reads as a quiet mark, not a competing shape). Give it an accessible name via
  the surrounding control (see accessibility). Skip `{ shapeRef }` and `null`
  anchors gracefully (none are produced yet; do not crash).
- **Pin-tap**: accept an `onPickPlace(placeId)` prop. When **not** mid-draw
  (`vertices.length === 0 && !pendingDistrict && !pendingLabel`) and **not** in
  `dropping` mode, a tap/Enter on a marker calls `onPickPlace` and
  `stopPropagation` so it does not also drop a vertex. While drawing, markers
  are inert and pointer-transparent so they never interfere with the surface.
- **Drop mode**: accept a `dropping` prop and an `onDropPoint(point)` callback.
  When `dropping`, a canvas tap (or reticle + Enter) resolves to a canvas-space
  point and calls `onDropPoint` instead of dropping a drawing vertex; the draw
  kit is suppressed for that one capture.
- **No recall on tap.** A marker tap opens the composer only. It never renders
  entries, elapsed time, or a panel on the canvas. (EPIC 2 non-goal and EPIC 4
  boundary, both still binding.)

### `WorldView` changes (`src/ui/WorldView.tsx`, EDIT)
- Own the `composer` state above; render `EntryComposer` when open.
- Render the **`"Write a dream"`** primary action. Placement: a prominent,
  thumb-reachable button. Gating so there is exactly one primary action per
  state:
  - Brand-new empty world (`currentShapes` empty **and** `places` empty): the
    existing EPIC 2 empty-canvas `"Start a district"` CTA remains the single
    primary; `"Write a dream"` is not shown (there is nothing to pin to, and
    drawing + naming a district is the intended first step that also mints the
    first place).
  - Otherwise (`places.length > 0` **or** any drawn shapes exist):
    `"Write a dream"` is the world view's primary action. When it opens with 0
    places, the composer shows its empty place-picker state.
- Render the **save-error banner** (from `useSaveStatus()`), a designed,
  dismissible, product-voice surface with a `"Save to file"` action that runs
  the existing owned-file save path (the same one behind `copy.fileArea.save`).
  It appears only while `saveStatus === "error"`.
- The **EPIC 1 places readout stays unchanged** and continues to reflect
  `world.entries`, so a saved entry appears in its place card immediately.

### Designed states (QUALITY BAR §3)
- **Empty (no places yet):** the composer's place group shows
  `copy.composer.emptyPlacesTitle` + `...Body` and routes to `"New place"`.
  Positive, tells the user what to do first, no blank region, no dead end.
- **Loading:** the composer opens from already-loaded in-memory atlas state and
  performs no fetch, so a spinner would be dishonest. The layout is present
  immediately (no white flash). The app-level first-load skeleton
  (`LoadingShell`) already covers the only genuine async load. This is a
  deliberately absent spinner, not a skipped state; note it in the PR so a
  reviewer does not read it as a gap.
- **Error (device save failed):** the world-view banner described above. It
  names the situation plainly and gives one action (`"Save to file"`). No raw
  error, no code, no dead end. The optimistic entry remains in memory and is
  saved by the file action, so the guidance is true.

### Mobile-first and perceived speed (QUALITY BAR §1, §2)
- Single column, usable at 390px, no horizontal scroll. The sheet spans the
  viewport width with comfortable padding; the map behind it is untouched.
- Every control (chips, `"New place"`, Save, Cancel, close, date input) is
  ≥44px in its tappable dimension with comfortable spacing.
- All composer interactions (typing, chip selection, date change, drop capture)
  are local React state and update within one frame. Save is a synchronous store
  commit (optimistic); the entry is visible immediately; autosave stays the
  500ms debounce off the hot path.
- The default place ordering (most-recent first) plus autofocused text plus a
  today-default date make the common path — same recurring place, this morning —
  a type-and-two-taps gesture (open, type, tap place, Save).

### Accessibility (QUALITY BAR §6)
- The composer is a labelled modal dialog with focus management, focus trap,
  `Escape` to close, and focus restoration.
- Every field has a real, associated `<label>`. Every chip, `"New place"`,
  Save, Cancel, and close is a real `<button>` with an accessible name and a
  visible focus state; AA contrast on all text and controls.
- Place markers are keyboard-reachable for the pin-tap: expose each marker as a
  focusable control with an accessible name (for example the place name), so a
  keyboard user can open the composer for a place. The drop flow uses the
  existing canvas reticle + Enter for keyboard point placement, so dropping a
  new place is fully keyboard-operable. Keyboard reaches everything a pointer
  can.

### Security / boundary hygiene (QUALITY BAR §5; local, no-network app)
- Validate at the boundary: `date` matches `YYYY-MM-DD`; `body` non-empty after
  trim and sliced to the body cap; `placeId` must reference an existing place in
  the world; `addPlaceAtPoint` rejects an empty name. The composer prevents bad
  input; the store re-checks (defense in depth).
- All entry body text, place names, and the composer render through React text
  nodes (auto-escaped). Never `dangerouslySetInnerHTML`.
- No atlas content, entry bodies, place names, dates, or coordinates are ever
  logged. `reportError` receives only an `Error` (existing contract) and
  `beforeSend` already strips request data and caps message length.
- No new network calls. The core loop stays fully offline.

### Copy (all new strings in `src/copy.ts`, pre-swept and safe to ship)
Add a `composer` section. Positive, short, one idea each, no em-dashes, no
banned vocabulary, no negative empty-state phrasing (the existing
`copy.test.ts` sweep will check every one automatically):

- `title`: `"Write a dream"`
- `bodyLabel`: `"Your dream"`
- `bodyPlaceholder`: `"What did you see?"`
- `dateLabel`: `"Date"`
- `placeLabel`: `"Pin it to a place"`
- `newPlace`: `"New place"`
- `dropHint`: `"Tap the map to place it."`
- `newPlaceNameLabel`: `"Name this place"`
- `newPlaceNamePlaceholder`: `"The Harbor"`
- `newPlaceConfirm`: `"Add place"`
- `save`: `"Save"`
- `cancel`: `"Cancel"`
- `close`: `"Close"`
- `open`: `"Write a dream"` (the world-view primary button)
- `needBody`: `"Write a few words to save."`
- `needPlace`: `"Pick a place to save."`
- `emptyPlacesTitle`: `"Add a place to pin to."`
- `emptyPlacesBody`: `"Drop a place on the map, then pin your dream to it."`

Add a `saveError` section for the world-view banner:
- `saveError.title`: `"Save your atlas to keep these changes."`
- `saveError.body`: `"This device isn't storing new changes right now. Save your atlas to a file so you keep them."`
- `saveError.action`: `"Save to file"`

All strings above have been swept: no `"—"`/`"–"`, none of the banned
vocabulary, and no negative empty-state phrasing. Sweep again mechanically over
the final `copy.ts` before finishing (the sweep is part of DONE).

### `ATLAS_FORMAT.md`
The `Entry` shape and the "ledger is derived" note already document everything
this EPIC writes; no format change is required. Only touch `ATLAS_FORMAT.md` if
you add wording (for example a sentence that a place may be dropped as a point
with no district shape). Keep any edit swept.

### Files to create / touch
```
src/ui/EntryComposer.tsx   NEW   the composer dialog/sheet
src/lib/date.ts (or edit elapsed.ts) NEW/EDIT  todayLocalISO(now)
src/state/atlasStore.ts    EDIT  addEntry, addPlaceAtPoint, saveStatus + getSaveStatus
src/state/useSaveStatus.ts NEW   tiny useSyncExternalStore hook over save status
src/ui/MapCanvas.tsx       EDIT  place markers, onPickPlace, dropping/onDropPoint
src/ui/WorldView.tsx       EDIT  Write-a-dream primary, mount composer, save-error banner
src/ui/tokens.css          EDIT  sheet/dialog, chips, action bar, marker, banner styles
src/copy.ts                EDIT  composer + saveError sections
ATLAS_FORMAT.md            EDIT  only if a dropped-point place note is added (optional)
src/ui/entryComposer.test.tsx      NEW  composer flow + states + a11y + 390px structure
src/state/atlasStore.test.ts (or persistence tests) EDIT  addEntry/addPlaceAtPoint/saveStatus
src/lib/date.test.ts       NEW   todayLocalISO local-date correctness
```

---

## Ordered task list (each item independently checkable)

1. **Date helper (pure).** `todayLocalISO(now)` returning the local
   `YYYY-MM-DD`.
   *AC:* for a `Date` constructed at local `2026-09-14T23:30` it returns
   `"2026-09-14"` regardless of the runner's UTC offset (uses local
   components, not `toISOString`); deterministic for a fixed input.

2. **Store mutations + save status.** `addEntry`, `addPlaceAtPoint`, and the
   `saveStatus` channel with `getSaveStatus` and emission.
   *AC:* `addEntry` appends exactly one `Entry` with the given `placeId`, trimmed
   `body`, and `date`, produces a new atlas object, emits, and schedules a save;
   it is a no-op for an unknown `placeId`, an empty body, or a malformed date.
   `addPlaceAtPoint` appends one `Place` with a `Point` anchor (no shape, no new
   stratum) and returns its id; it is a no-op for an empty name. A rejected
   autosave sets `saveStatus` to `"error"`; a later successful save clears it to
   `"idle"`.

3. **MapCanvas markers + pin-tap + drop mode.** Render a marker per point-anchored
   place; `onPickPlace` fires on marker tap/Enter only when not mid-draw and not
   dropping (with `stopPropagation`); `dropping` + `onDropPoint` capture a single
   canvas point via tap or reticle+Enter.
   *AC:* with `world.places` containing a point-anchored place, a marker renders
   at its anchor and is keyboard-focusable; tapping it calls `onPickPlace` with
   that place id and does not add a drawing vertex; while a shape is in progress
   the marker does not fire `onPickPlace`; in `dropping` mode a canvas tap calls
   `onDropPoint` with the canvas-space point and commits no shape; a marker tap
   never renders entries or elapsed time on the canvas.

4. **EntryComposer component.** The dialog/sheet with dream text (autofocused),
   date (today default, editable, max today), the place chips + `"New place"`,
   the sticky Save/Cancel action bar, the empty place-picker state, Save
   enablement + helper text, and the drop detour that preserves the draft.
   *AC:* opening focuses the textarea; the date input value equals
   `todayLocalISO(new Date())` and is editable; Save is disabled until body and
   place are both present and shows the correct positive helper; picking a chip
   sets `aria-pressed`; `"New place"` → drop a point → name → `addPlaceAtPoint`
   selects the new place and the previously typed body survives; Save calls
   `addEntry` and closes; the empty place-picker state renders its copy when the
   world has 0 places.

5. **WorldView wiring + save-error banner.** Own composer state; render
   `"Write a dream"` per the gating rule; open the composer from the button and
   from a marker tap; render the save-error banner from `useSaveStatus()` with a
   working `"Save to file"` action; keep the EPIC 1 readout unchanged.
   *AC:* on a world with ≥1 place, `"Write a dream"` is the single primary and
   opens the composer; on a brand-new empty world it is not shown and
   `"Start a district"` remains primary; a saved entry appears in the place's
   readout card immediately (same render, no reload); when `saveStatus` is
   `"error"` the banner shows with its copy and a `"Save to file"` action, and it
   clears when saving recovers.

6. **Styles + copy + sweep.** Add sheet/dialog, chips, sticky action bar,
   marker, and banner styles (mobile-first, ≥44px, AA contrast, visible focus);
   add the `composer` and `saveError` copy; run the mechanical sweep.
   *AC:* the composer is single-column and usable at 390px with no horizontal
   scroll; every control is ≥44px and focus-visible; the Save action sits in a
   sticky bottom bar that is a sibling after the scrollable body; the copy sweep
   (`copy.test.ts`) finds no `"—"`/`"–"`, no banned vocabulary, and no negative
   empty-state phrasing across the new strings; `npm run build`, `npm run lint`,
   `npm test` pass and the existing EPIC 1/2 tests still pass.

---

## Test plan (which automated test proves each planner criterion)

Use the existing `vitest` + `@testing-library/react` + `jsdom` stack. Add
`entryComposer.test.tsx`, extend the store/persistence tests, and add
`date.test.ts`. Extend `copy.test.ts` coverage (automatic, since it walks the
whole `copy` object).

- **Open the composer, type, pick or drop a place, and save — a short flow at a
  phone-sized viewport** (planner AC 1): `entryComposer.test.tsx` renders a
  world with places, opens the composer, types a body, taps a place chip, and
  clicks Save; asserts the entry is in `world.entries` with the right `placeId`
  and `body` and that the composer closed. A second case drives the drop path:
  `"New place"` → drop a point (via the reticle+Enter keyboard path) → name →
  Save, asserting a new point-anchored place plus the pinned entry. The
  literal "under a minute" is a wall-clock property proven by the **minimal step
  count** (open, type, one tap, Save) and the all-in-one-sheet layout, plus an
  optional Playwright step in `e2e/smoke.spec.ts`; the unit tests prove the flow
  is complete and few-step.

- **Date defaults to today and is editable** (planner AC 2): `date.test.ts`
  proves `todayLocalISO` returns the local calendar date (including the late-
  evening non-UTC case). `entryComposer.test.tsx` asserts the date input's
  initial value equals today's local ISO date and that changing it and saving
  stores the edited date on the entry.

- **Feedback within 100ms; optimistic save; entry appears immediately** (planner
  AC 3): `entryComposer.test.tsx` asserts that immediately after clicking Save
  (no `await` of any timer) `getState()` contains the new entry, and that the
  world view's place readout shows it on the next render; chip buttons expose
  `aria-pressed` (pressed feedback) and the Save button is a real button with an
  active/disabled affordance. (Sub-100ms wall-clock is guaranteed structurally:
  every path is synchronous local state or a synchronous store commit; autosave
  is off the interaction path.)

- **Fully usable at 390px; reachable controls; readable text; Save not obscured
  by the keyboard** (planner AC 4): `entryComposer.test.tsx` asserts single-
  column structure with no element declaring a fixed width beyond the 390px
  column, every control ≥44px, and that the Save button lives in the sticky
  action bar rendered as a sibling **after** the scrollable body (so the
  keyboard cannot cover it). Real keyboard-overlap is confirmed by the layout
  contract plus the optional e2e run; note this in the PR.

- **Loading and error states are designed; a failed save says what to do next in
  the product's voice** (planner AC 5): `entryComposer.test.tsx` (or a
  `worldView` test) renders with `saveStatus === "error"` and asserts the banner
  shows `copy.saveError.title`/`body` and a `"Save to file"` action, contains no
  raw error string or code, and disappears when status returns to `"idle"`. A
  separate case asserts the composer's empty place-picker designed state renders
  its positive copy when the world has 0 places. The absent-by-design loading
  spinner is documented (no async fetch on open).

- **Entries are stored against a `placeId` so recall survives later map
  revisions** (planner AC 6): a store/model test saves an entry at a place, then
  appends a new stratum (a redraw via `commitShape`) and asserts
  `placeLedger(world.entries, placeId)` still returns that entry unchanged, and
  that the place remains in `world.places` with the same id and anchor. This
  reuses the EPIC 2 `placeIdentity` pattern and proves recall survives redraw.

- **Copy is clean** (QUALITY BAR §8, spanning ACs): the existing `copy.test.ts`
  sweep automatically covers the new `composer` and `saveError` strings and
  asserts zero `"—"`/`"–"`, zero banned vocabulary, and zero negative empty-state
  phrasing.

**Definition of done:** `npm run build`, `npm run lint`, and `npm test` all
pass (including the existing EPIC 1/2 suites); the composer opens from the world
view, pins a typed dream to a picked or dropped place, defaults the date to
today, and saves optimistically with the entry appearing immediately; the
composer is single-column and usable at 390px with the Save action never hidden
by the keyboard; the empty place-picker and save-error states are designed and
in the product's voice; every entry is stored against a `placeId` and recall
survives a subsequent redraw; the copy sweep is clean; and no non-goal (rich
media, tags/analysis, AI, recall panel, time-scrub, entry edit/delete, draft
persistence) shipped.

---

## Risks and guardrails
- **Recall creep (the tempting defect).** A place marker begging to be tapped
  invites showing its entries and "last visit" right there. That is EPIC 4 and a
  binding non-goal here. In this EPIC a marker tap opens the **composer** only.
  The honest recall surface is the unchanged EPIC 1 readout until EPIC 4.
- **Mis-pinned entries corrupt recall.** Do not auto-select a place. Order chips
  by recency to keep the gesture fast, but require an explicit tap so an entry is
  never silently attached to the wrong place. A wrong `placeId` is invisible now
  and wrong forever in recall.
- **Drawing-surface interference (EPIC 2's highest risk, still live).** Markers
  and the pin-tap are additive and must never change drawing: markers are inert
  and pointer-transparent while a shape is in progress, and the drop capture is a
  one-shot mode that suppresses vertex-dropping only for that single tap.
- **The keyboard hiding Save.** The single most load-bearing mobile detail. The
  sticky bottom action bar (sibling after the scroll region, with safe-area
  padding) is binding, and the layout test guards it. If Save can be covered, the
  morning gesture fails at its last step.
- **Optimistic save vs. honesty.** The entry is committed to memory instantly and
  is exportable, so the optimistic close is honest. The save-error banner exists
  precisely so a real device-write failure is never silent. Keep both.
- **Dropped places are real places.** A dropped point mints a durable named
  `Place` at that point, indistinguishable to recall from a district-born place.
  It must land in `world.places` (never inside a stratum) so its identity
  survives redraws, exactly like district-born places.
