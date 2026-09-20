# EPIC SPEC — First run: seeded demo and guided first success

*The Night Cartographer: an atlas of the places you only visit in dreams.*

This EPIC ties the whole product together for a stranger. Two halves:

1. **A seeded demo world** so a first-run visitor with no saved atlas meets a
   real recall moment immediately, with zero hand-crafted input.
2. **A guided first-success path**: a short, skippable walk that leads a
   brand-new user through creating their own first recall (draw a district,
   write a dream and pin it, then tap the place and watch the map answer back).

**Read this first — what already ships vs. what this EPIC builds.** Prior
EPICs already delivered most of half 1. The sample world (`src/data/demoAtlas.ts`)
carries multiple dated entries at The Harbor across 2019, 2021, 2023, and 2025;
`atlasStore.init()` auto-opens it on staging when `SEED_DEMO` is set and offers
it as one tap in production without ever overwriting a saved atlas; the sample
is marked with a "Sample" chip and starting a real atlas is one tap away. What
does **not** yet exist is the guided path. Today `src/ui/WorldView.tsx` shows a
single recall coach mark ("Tap a place to see what you wrote there.") gated on
`hasSeenRecallHint()` — one hint, not the 2-to-4-step walk planner AC 3 requires.

So the build is: **turn the single coach mark into a self-ticking, anchored,
skippable guided path**, and **pin every other planner criterion with a test**
so the already-shipped demo behavior cannot silently regress. This is not a new
feature surface bolted on; it is the existing hint generalized into the walk the
bar (§4) and the planner both ask for.

This EPIC adds **no schema change, no version bump, and no migration**. The
first-run-complete flag stays per-device in `localStorage`, never in the atlas
file the user owns.

---

## Quality differentiator (this app must win here)

**Recall: the map answers back.** Touch any place and the atlas instantly
returns everything you wrote there before, with the time since your last visit.
Paper cannot answer. A dream-journal app has no places to answer from. Obsidian
answers only if you hand-wired every link yourself.

**What this EPIC owes the differentiator.** This is the EPIC that decides
whether a stranger ever *reaches* the recall moment. Both halves bend toward it:
the seeded demo puts a real answer-back one tap away on a cold start, and the
guided path exists for exactly one purpose — to walk a first-time user all the
way to the instant the map answers them for the first time on data they made
themselves. The final step of the walk is not "you're done"; it is "tap the
place," and completing the walk *is* the first recall. If the walk ends anywhere
short of the map answering back, this EPIC has missed its one job. Every copy
line, every anchor, and the definition of "first success" below are chosen so
the walk terminates on the signature moment and nowhere else.

---

## Scope

### In scope

- **The guided first-success path** (the core new work). A self-ticking,
  skippable coach mark in the world view that walks a first-time user through
  the three actions that end in recall. The current step is **derived from the
  world's own progress**, so it advances by itself as the user acts and never
  needs a "Next" button:
  - **Step `draw`** — world is blank (no shapes and no places): one line, "Draw
    a district.", anchored to the map's existing "Start a district" empty-state
    control (the control is emphasized; see anchoring below).
  - **Step `write`** — the world now has a shape or a place but no entries yet:
    "Write a dream and pin it to a place.", anchored to the "Write a dream"
    button.
  - **Step `recall`** — the world now has at least one entry but the user has
    not yet opened recall: "Tap a place to see what you wrote there.", anchored
    to the map's place markers.
  - **Skip** is present at every step and retires the entire walk permanently.
  - The walk **shows only until the first success** and **never again for a
    returning user** (planner AC 3). "First success" is defined precisely below.
- **`Walkthrough` component** (`src/ui/Walkthrough.tsx`, NEW): presentation-only,
  mirroring the `TimeScrub`/`RecallPanel` pattern (no store imports, no world
  access beyond props). It receives the current step and an `onSkip` callback
  and renders the one-line instruction plus the Skip control. WorldView owns all
  derivation and the done-flag write.
- **First-run-complete flag** (`src/lib/firstRun.ts`, EDIT): generalize the
  existing recall-hint flag into a first-run-complete flag. Same storage guard
  (a storage-blocked browser reads as "complete", so the walk simply does not
  show and nothing ever crashes). Rename the exports and the key to their new
  meaning (see Technical design). No new module.
- **`WorldView` wiring** (`src/ui/WorldView.tsx`, EDIT): derive the current step
  from `world` and the recall index, render `<Walkthrough>` in place of today's
  inline `hint-mark`, apply the anchor emphasis to the active step's target
  control, mark first-run complete on the first *answering* recall open, and
  hide the walk whenever a sheet is open or the flag is set.
- **Copy** (`src/copy.ts`, EDIT): a new `walkthrough` section; remove the now
  unused `recall.hint` / `recall.hintDismiss`. Mechanical copy sweep over every
  touched string (`copy.test.ts` sweeps the whole `copy` object automatically).
- **Styles** (`src/ui/tokens.css`, EDIT): the coach card (rename/extend the
  existing `.hint-mark` rules), the anchor-emphasis treatment on target
  controls, mobile-first at 390px, visible focus, AA contrast, ≥44px touch
  targets.
- **Provable-demo hardening** (tests only, no behavior change): explicit
  automated assertions for planner AC 1, AC 2, and AC 4 so the already-shipped
  seeded-demo behavior is locked against regression (see Test plan).
- **Tests**: unit tests for the walk's three steps, Skip, and accessibility;
  an integration test driving the **full** walk in a real new world
  (blank → draw → write → recall → gone, then gone on remount); reworked
  first-run tests in `seed.test.tsx`; a demo-entries assertion for AC 2; one e2e
  case asserting the walk in the sample first-run flow.

### Out of scope (non-goals — building any of these is a defect)

- **No multi-step tutorial essays.** (Planner non-goal.) Each step is one short
  imperative sentence anchored to a real control. No paragraphs, no modal
  onboarding tour, no explanatory tooltips propping up the layout.
- **No video.** (Planner non-goal.) No animation, no autoplay demo, no recorded
  walkthrough.
- **No re-triggering the walkthrough from settings.** (Planner non-goal.) There
  is no "show me the tour again" control anywhere. Once first-run is complete it
  stays complete for that device.
- **No new demo content or geometry.** The sample world's worlds, strata,
  shapes, places, and entries are unchanged. This EPIC does not add a second
  sample world, more entries, or more places. (Half 1 already ships; touching
  its content would break existing render/seed/e2e assertions for no reason.)
- **No changes to the map kit, composer, recall panel, ledger, time scrub, or
  the file format.** Those surfaces are reused untouched; the walk only points
  at them.
- **No forced/blocking onboarding.** The walk never blocks a control, never
  traps focus, and never prevents the user from doing something else first. It
  points; it does not gate.
- **No account, no network, no server first-run state.** First-run state is
  per-device `localStorage` only, never in the owned atlas file.

### Scope judgments this spec makes (read before building)

1. **The guided path is the real-atlas creation walk; the sample is AC 1's job.**
   Planner AC 3's own list of anchors starts with "draw a district", so the walk
   is for a user making their *own* first success. The seeded sample (AC 1)
   provides an *instant* recall moment with nothing to draw. These are two
   distinct obligations and this EPIC meets both. Consequence: when the walk
   runs in the sample world (which already has a drawn map and entries), its
   derived step is `recall` from the first frame — the sample enters the path at
   its final step, which is exactly right ("the map is already here, tap it").
   The **full** three-step walk is only visible in a brand-new real world, and
   the integration test in task 4 is what proves all three steps exist. Do not
   try to force a `draw`/`write` step onto the pre-drawn sample; that would be a
   lie about the map's state.

2. **One global first-run flag; the first success in either the sample or a real
   world retires the walk.** This matches the shipped hint's semantics and the
   "no re-trigger from settings" non-goal. A visitor who opens the sample, taps
   a place, and sees recall *has* had a first success; retiring the walk
   afterward is correct, not a bug. A fresh browser profile (or cleared storage)
   always shows the walk again. Do not build per-world first-run state.

3. **"First success" means recall actually answered — a place with entries.**
   The flag is set when the recall panel opens for a place whose recall
   `count > 0` (the map genuinely answered back). Tapping an empty place before
   any dream is written opens the recall panel's designed empty state and does
   **not** complete the walk — the signature moment has not happened yet. This
   keeps "shows only until the first success" honest: success is the answer, not
   the tap.

4. **The step is derived, not stored.** There is no persisted step counter. The
   current step is a pure function of `world` (shapes, places, entries) plus the
   recall index, so it self-ticks as the user acts and can never drift out of
   sync with the atlas. The only persisted first-run state is the single
   complete/not-complete flag.

5. **The walk is a single evolving anchored line, not a checklist widget.** Bar
   §4 accepts "a highlighted next step" as a sufficient guided path, and §7
   demands radical simplicity. Showing one imperative sentence at a time,
   pinned to the one control that matters right now, is the smallest thing that
   satisfies AC 3 without a wall of text or a progress-dots widget that would
   read as "2 of 3 done" on the pre-drawn sample (judgment 1). The "2 to 4
   steps" requirement is met by the sequence of anchored steps the real
   first-run user is walked through, proven end to end by the task-4 test.

---

## Technical design

### Data model (no changes, no migration)

`CURRENT_VERSION` stays `1`. No atlas field is added or read differently. The
only persisted state this EPIC touches is the per-device first-run flag in
`localStorage`, which is not part of the atlas file.

### First-run flag (`src/lib/firstRun.ts`, EDIT)

Generalize the existing recall-hint flag to mean "the user has completed (or
skipped) the guided first success". Keep the storage guard exactly as is.

```
// New key and exports (was nc.recallHintSeen / hasSeenRecallHint / markRecallHintSeen)
const KEY = "nc.firstRunDone";
export function hasCompletedFirstRun(): boolean { /* storage-guarded; blocked → true */ }
export function markFirstRunComplete(): void { /* storage-guarded no-op on block */ }
```

- Storage-blocked browsers still read as complete (the walk hides, nothing
  crashes) — the current guard behavior, preserved.
- The key rename means a dev/staging browser that already stored the old
  `nc.recallHintSeen` will see the walk once more. This is acceptable: the app
  has no production users with persisted state, staging seeds fresh per deploy,
  and the walk is skippable in one tap. Do not write migration code for a
  localStorage key.
- The only caller is `WorldView`; update its import. There is no dedicated test
  of this module today (optional: add `src/lib/firstRun.test.ts` covering
  set/read and the blocked-storage path).

### `Walkthrough` component (`src/ui/Walkthrough.tsx`, NEW)

Presentation-only. No store, no `firstRun` import, no world access.

```
export type WalkStep = "draw" | "write" | "recall";

interface WalkthroughProps {
  step: WalkStep;          // the current derived step
  onSkip: () => void;      // retires the whole walk
}
```

- Renders one line: `copy.walkthrough[step]` (the imperative sentence for the
  active step) and a Skip button (`copy.walkthrough.skip`) calling `onSkip`.
- The container is a non-modal status region: `role="status"` with
  `aria-live="polite"` so the changing instruction is announced to a screen
  reader as it self-ticks; it never traps focus and never blocks the controls
  behind or beside it.
- Reuse/extend the existing `.hint-mark` layout (text on one side, a subordinate
  ghost button on the other). The Skip button is visibly subordinate (§7).
- No progress widget, no step counter text, no "Next" button, no close "×"
  distinct from Skip. One sentence, one Skip.

### `WorldView` wiring (`src/ui/WorldView.tsx`, EDIT)

Replace the current `hintSeen`/`showHint`/`dismissHint`/inline `hint-mark`
block with the derived walk. Everything else in `WorldView` (recall panel,
composer, drop-a-place detour, visit ledger, time scrub, save-error banner,
sample chip) stays exactly as shipped.

- **State:** `const [firstRunDone, setFirstRunDone] = useState(() =>
  hasCompletedFirstRun())`. WorldView is keyed by `world.id` in `App`, so this
  resets appropriately when the active world changes; it also reflects the
  persisted flag on mount, so a returning user never sees the walk.
- **Derived step** (pure, from existing locals):

  ```
  // hasShapes = currentShapes(world).length > 0        (already computed)
  // hasEntries = index.ledger.some((r) => r.count > 0) (today's showHint gate)
  const walkStep: WalkStep | null =
    firstRunDone            ? null      // done or skipped: no walk, ever
    : hasEntries            ? "recall"
    : (hasShapes || world.places.length > 0) ? "write"
    :                         "draw";
  ```

  The `write` guard intentionally matches the existing `showWriteDream =
  world.places.length > 0 || hasShapes`, so the "Write a dream" button the step
  anchors to is guaranteed to be on screen whenever the step is `write`.
- **Visibility:** render `<Walkthrough step={walkStep} onSkip={skipWalk} />`
  only when `view.kind === "none"` (no sheet open) and `walkStep !== null`. This
  mirrors today's `showHint` gate (`view.kind === "none" && !hintSeen && …`).
- **Skip:** `function skipWalk() { markFirstRunComplete(); setFirstRunDone(true); }`.
- **First success:** in `openRecall(placeId)`, when the opened place's recall
  `count > 0` and first-run is not yet done, call `markFirstRunComplete()` and
  `setFirstRunDone(true)`. Opening recall on an empty place does not complete
  the walk (scope judgment 3). This replaces today's unconditional
  `if (!hintSeen) dismissHint()` inside `openRecall`.
- **Anchor emphasis:** while the walk is visible, the active step's target
  control is emphasized so "the highlighted next step" is literal and testable.
  Add a stable, testable hook to each target — a `data-walk-anchor` attribute
  (or an `is-walk-target` class) toggled on:
  - `draw` → the map empty-state "Start a district" button (in `MapCanvas`,
    the `.map-empty` CTA), or the `.map-stage` if the CTA element is not
    reachable from WorldView. Prefer passing a small `walkAnchor?: WalkStep |
    null` prop into `MapCanvas` and letting it mark its own empty CTA / marker
    layer, keeping the emphasis co-located with the control. Keep the prop
    optional and inert when unset (like `viewedShapes`).
  - `write` → the `.write-dream` "Write a dream" button (owned by WorldView; add
    the attribute directly).
  - `recall` → the place markers (via the same `walkAnchor` prop into
    `MapCanvas`; emphasize the marker group).

  Emphasis is CSS only (a ring/glow, respecting `prefers-reduced-motion` — a
  static outline, no looping animation, to honor the no-animation-essay spirit
  and reduced-motion users). The attribute/class is the anchoring contract the
  tests assert; the exact visual is a CSS detail.
- **Removed:** the `hintSeen` state, `hasSeenRecallHint`/`markRecallHintSeen`
  imports, `showHint`, `dismissHint`, and the inline `hint-mark` JSX. Their
  behavior is now covered by the walk's `recall` step and Skip.

Perceived speed is unaffected: `walkStep` is a synchronous derivation from
already-in-memory state; the recall index is already memoized per `world`
identity, so a tap and the walk's self-tick both stay within a frame.

### Copy (`src/copy.ts`, EDIT — pre-swept)

Add a `walkthrough` section and remove the unused hint strings:

```
walkthrough: {
  draw: "Draw a district.",
  write: "Write a dream and pin it to a place.",
  recall: "Tap a place to see what you wrote there.",
  skip: "Skip",
},
```

Remove `recall.hint` and `recall.hintDismiss` (no remaining caller after the
WorldView edit; keep every other `recall.*` string). All new strings checked:
no em-dash or en-dash, none of the banned vocabulary, positive imperative
phrasing, one idea each. `copy.test.ts` walks the whole `copy` object, so the
new section is swept automatically; run the sweep again over the final diff,
including any string you write into tests or docs.

### Styles (`src/ui/tokens.css`, EDIT)

- Rename/extend the existing `.hint-mark` rules for the coach card (the layout
  is already correct: flex row, text plus a subordinate ghost button). Keep the
  Skip button subordinate to any nearby primary action (§7).
- Add the anchor-emphasis rule for `[data-walk-anchor]` / `.is-walk-target`: a
  visible, AA-contrast outline or ring on the emphasized control. Static under
  `prefers-reduced-motion`; if animated at all, a single subtle pulse is the
  ceiling — no looping attention-grabbers.
- Mobile-first: the coach card spans the content column at 390px with no
  horizontal scroll; the Skip touch target is ≥44px; text readable without zoom.
- Visible focus state on Skip; the card itself is not a focus target.

### Files to create / touch

```
src/ui/Walkthrough.tsx        NEW   the coach card: one imperative line + Skip, role=status
src/ui/walkthrough.test.tsx   NEW   three steps render correct copy; Skip fires; a11y/status role
src/lib/firstRun.ts           EDIT  generalize to first-run-complete flag (rename exports + key)
src/ui/WorldView.tsx          EDIT  derive step, mount Walkthrough, anchor emphasis, first-success flag
src/ui/MapCanvas.tsx          EDIT  optional walkAnchor prop → emphasize empty CTA / markers (inert when unset)
src/copy.ts                   EDIT  walkthrough section; remove recall.hint / recall.hintDismiss
src/ui/tokens.css             EDIT  coach card + anchor emphasis; mobile-first, focus, contrast
src/ui/seed.test.tsx          EDIT  rework the coach-mark describe into walkthrough behavior; keep SEED_DEMO tests
src/ui/worldView.test.tsx     EDIT  full-walk integration test (blank → draw → write → recall → gone)
src/data/demoAtlas.test.ts    EDIT  AC 2 assertion: multiple dated entries at one place across years
e2e/smoke.spec.ts             EDIT  assert the walk's recall step in the sample flow; retires after first recall
src/lib/firstRun.test.ts      NEW (optional)  set/read + blocked-storage guard
```

---

## Ordered task list (each item independently checkable)

1. **First-run flag + Walkthrough component (pure UI).** Generalize
   `firstRun.ts` (rename exports and key to first-run-complete semantics, keep
   the storage guard). Build `Walkthrough.tsx`: one imperative line per step
   plus a subordinate Skip button, in a `role="status"` `aria-live="polite"`
   region. Add the `walkthrough` copy section and remove `recall.hint` /
   `recall.hintDismiss`.
   *AC:* `walkthrough.test.tsx` proves that `step="draw"` renders "Draw a
   district.", `step="write"` renders "Write a dream and pin it to a place.",
   `step="recall"` renders "Tap a place to see what you wrote there."; clicking
   Skip calls `onSkip` exactly once; the container has `role="status"`; the
   component imports no store and no `firstRun` module. `firstRun.ts` reads back
   what it writes and returns `true` (walk hidden) when storage throws.

2. **MapCanvas anchor emphasis (opt-in, inert by default).** Add the optional
   `walkAnchor?: WalkStep | null` prop. When `"draw"`, mark the `.map-empty`
   CTA as the walk target; when `"recall"`, mark the marker layer; otherwise no
   change. Unset/`null` leaves every existing behavior identical.
   *AC:* with `walkAnchor="draw"` and an empty world, the empty CTA carries the
   walk-anchor hook; with `walkAnchor="recall"` and a world with markers, the
   marker layer carries it; with the prop unset, every existing
   `mapCanvas.test.tsx` case passes unchanged and no walk-anchor hook is present.

3. **WorldView wiring: derive, mount, anchor, complete-on-success.** Replace the
   hint state/JSX with the derived walk. Mount `<Walkthrough>` when
   `view.kind === "none"` and the step is non-null; apply anchor emphasis to the
   active target (`draw`/`recall` via MapCanvas, `write` via the `.write-dream`
   button); mark first-run complete when recall opens for a place with
   `count > 0` and on Skip; hide the walk when a sheet is open or the flag is set.
   *AC (unit/integration):* on a blank world the walk shows `draw` and the map
   CTA is the anchor; committing a named district advances the walk to `write`
   with the "Write a dream" button anchored; saving an entry advances it to
   `recall` with the markers anchored; the walk is hidden while the composer or
   recall panel is open; Skip removes the walk and it does not return after a
   remount; opening recall on a place with entries removes the walk and it does
   not return after a remount; opening recall on an *empty* place does **not**
   remove the walk.

4. **Full-walk integration test (proves the 2-to-4-step path exists).** In
   `worldView.test.tsx`, drive a brand-new real world all the way through:
   assert the `draw` line, draw and name a district (mints a place), assert the
   walk self-ticks to the `write` line, open the composer and save a dream
   pinned to that place, assert it self-ticks to the `recall` line, tap the
   place, assert recall answers (the saved entry is shown) and the walk is now
   gone, then remount and assert the walk stays gone.
   *AC:* the test passes and exercises all three anchored steps in order with
   the exact `copy.walkthrough` strings, ending on a real recall answer.

5. **Seeded-demo hardening (lock AC 1, AC 2, AC 4 with tests).**
   - `seed.test.tsx`: keep the SEED_DEMO landing + tapped-place tests. Rework
     the "first-recall coach mark" describe into walkthrough behavior: on the
     seeded sample the walk shows the `recall` step on landing; after opening
     and closing recall it is gone; a remount does not bring it back; Skip also
     retires it and it stays retired.
   - `demoAtlas.test.ts`: add an AC 2 assertion — The Harbor has at least two
     entries whose dates fall in at least two distinct calendar years, so recall
     demonstrably answers back with elapsed history (a demo yielding an empty
     recall does not count).
   - AC 4 assertion (in `seed.test.tsx` or `atlasStore.test.ts`): calling
     `openSample()` on an atlas that already has a user world keeps that world
     (never replaced), adds the sample marked `isSample`, and calling
     `openSample()` twice does not duplicate it; the "New world" path creates a
     separate non-sample world. The sample world renders its "Sample" chip.
   *AC:* all the above pass; `npm test` is green with no weakened prior
   assertions.

6. **Styles + copy sweep.** Coach card and anchor-emphasis styles, mobile-first
   at 390px, ≥44px Skip target, visible focus, AA contrast, reduced-motion
   respected. Run the mechanical copy sweep over `copy.ts`, the new component,
   the demo labels, and any string written into tests or docs.
   *AC:* at 390px the coach card fits with no horizontal scroll; Skip focus is
   visible; `copy.test.ts` passes over the new strings; `npm run build`,
   `npm run lint`, and `npm test` all pass.

7. **E2E in the sample first-run flow.** Extend `e2e/smoke.spec.ts` (which runs
   production-like, `SEED_DEMO` off, starting on the world list). After "Open the
   sample atlas", assert the walk's `recall` line is visible; tap The Harbor,
   confirm recall answers, close it, and assert the walk line is gone.
   *AC:* the new case passes on the built app and the three existing smoke tests
   pass unchanged.

---

## Test plan (which automated test proves each planner criterion)

Existing stack: `vitest` + `@testing-library/react` + `jsdom` for units and
integration, Playwright (`e2e/smoke.spec.ts`) for the production build.

- **"On first run with no saved atlas the app presents the sample atlas
  (auto-opened on staging via SEED_DEMO; offered as one tap in production),
  and a stranger reaches a real recall moment within a minute with zero
  hand-crafted input."** — `seed.test.tsx` proves the SEED_DEMO path lands
  inside the sample and a tapped place answers back synchronously (already
  present); the SEED_DEMO-off case proves the designed empty state with the
  one-tap "Open the sample atlas" control (already present); `e2e/smoke.spec.ts`
  proves the production one-tap path end to end on the built app. Task 5 keeps
  these green and adds the AC 4 non-overwrite assertions.

- **"The seeded demo contains multiple dated entries at the same place across
  years, so recall demonstrably answers back."** — `demoAtlas.test.ts` (task 5)
  asserts The Harbor has ≥2 entries spanning ≥2 distinct years; `seed.test.tsx`
  asserts the tapped-place recall panel shows the multi-visit history with a
  computed elapsed line ("4 visits", newest entry visible).

- **"A guided path of 2 to 4 steps, each one short imperative sentence, anchors
  to the real controls, is skippable at every step, shows only until the first
  success, and never appears again for a returning user."** —
  `walkthrough.test.tsx` proves each step renders one imperative sentence and
  Skip fires; the `worldView.test.tsx` full-walk test (task 4) proves the three
  anchored steps run in order (draw → write → recall) and that each is anchored
  to its real control, that the walk ends on a real recall answer, and that it
  is gone afterward and after a remount (returning user); task-3 cases prove
  Skip retires the walk at any step and that it stays retired across a remount;
  the e2e case proves the `recall` step is real on the built app.

- **"The sample atlas is clearly marked as a sample and cannot silently become
  the user's own file; starting a real atlas is one obvious step away."** —
  task-5 assertions prove `openSample()` never replaces existing worlds, adds
  the sample as `isSample` (rendered with the "Sample" chip in both the world
  list and the world view), and is idempotent; the world list's "New world"
  control creates a separate non-sample world in one tap. The chip presence is
  asserted in the rendered world list.

- **"All first-run copy passes the copy sweep (no em-dashes, no banned
  vocabulary, positive phrasing)."** — `copy.test.ts` automatically sweeps the
  new `walkthrough` section and the sample stratum/entry-adjacent labels for
  dashes, banned vocabulary, and negative phrasing; the manual sweep in task 6
  covers any string written into components, tests, or docs.

**Definition of done:** `npm run build`, `npm run lint`, and `npm test` pass
(every prior suite included), and the Playwright smoke suite passes with the new
walk case; on a brand-new real world the guided path walks draw → write →
recall and terminates on a real recall answer; the walk is skippable at every
step, shows only until the first success, and never returns for a returning
user; on a cold first run the seeded sample presents a real recall moment within
a minute with zero hand-crafted input; the sample is chip-marked and never
overwrites a user's own worlds, with a real atlas one tap away; the copy sweep
is clean; and no non-goal (tutorial essay, video, settings re-trigger, new demo
content, blocking onboarding, per-world or server first-run state) shipped.

---

## Risks and guardrails

- **The walk that outstays its welcome.** The one behavior a returning user must
  never see is the coach mark reappearing. The guardrail is the persisted flag
  read on mount plus the "complete on first answering recall or on Skip" rule;
  the remount assertions in tasks 3, 4, and 5 make any regression loud.

- **A walk that ends before recall.** If the final step were "you're done" or a
  generic dismiss, the EPIC would miss its one job (recall). The guardrail:
  "first success" is defined as recall opening on a place with `count > 0`, so
  completing the walk *is* the signature moment. The full-walk test asserts the
  walk ends on a real answer, not on a button.

- **Completing on an empty tap.** Tapping a place before writing anything opens
  the recall empty state. Marking first-run complete there would retire the walk
  before the map ever answered. The guardrail is the `count > 0` check in
  `openRecall`; task 3 asserts the empty-place tap does not complete the walk.

- **Anchor drift / an unanchored "next step".** A coach line with nothing
  pointed at is a floating hint, not a guided path. The guardrail is the
  `data-walk-anchor` / `is-walk-target` contract asserted per step in tasks 2–4,
  so each step provably highlights the real control it names.

- **Forcing steps onto the sample.** The sample is pre-drawn; a `draw` or
  `write` step there would be a lie (scope judgment 1). The derived-step
  function keys off the world's actual shapes/places/entries, so the sample
  naturally enters at `recall`. Do not special-case the sample.

- **Demo drift.** This EPIC changes no demo content. Adding entries, places, or
  geometry to make the walk "nicer" would break existing render/seed/e2e
  assertions and shift EPIC 7's polish ground. The demo is input to this EPIC,
  not output.

- **Copy tells.** The steps are the highest-visibility strings a first-time user
  reads. Sweep them (and any example copy written into tests or this document)
  for dashes, banned vocabulary, and negative phrasing before finishing;
  `copy.test.ts` enforces the shipped strings automatically.

- **Gold-plating.** No progress-dots widget, no confetti, no multi-panel tour,
  no settings replay, no animation beyond a single static/subtle anchor
  highlight. One imperative line pinned to one control, plus Skip. That is the
  whole surface, and it is enough to walk a stranger to the moment the map
  answers back.
