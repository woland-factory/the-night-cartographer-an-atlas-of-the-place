# EPIC SPEC — Polish pass (no new features)

*The Night Cartographer: an atlas of the places you only visit in dreams.*

A whole-product UX, performance, and craft pass against the QUALITY BAR and the
recall differentiator. This EPIC **tightens what already ships and adds no
features**. Every criterion below is a concrete, testable check against THIS
app's real screens (the world list, the map, the composer, the recall panel,
the visit ledger, the time scrub, the first-run walk) and its README.

**Read this first — the product is already close to the bar.** Prior EPICs
delivered designed empty/loading/error states, a mobile-first stylesheet built
on a 44px touch token, visible focus rings, labeled inputs, full keyboard
reach, a mechanical copy sweep (`copy.test.ts`), the guided first-run walk, the
seeded sample world, staging/deploy tests, and a Playwright smoke suite. So
this pass is mostly **verification plus locks**, with exactly one genuine
behavior tightening:

- **The recall panel renders every entry for a place with no cap**
  (`src/ui/RecallPanel.tsx` maps `recall.entries` directly). On a decade-long
  atlas one place can hold hundreds or thousands of dated entries, so the
  signature surface is an unbounded list that gets slower with every morning the
  user succeeds in logging. QUALITY BAR §1 makes capping such a list mandatory.
  This is the one code change, and it is a bar fix, not a feature.

- **There is no seeded stress atlas and no perf lock.** Planner AC 2 requires
  proving recall and map render stay responsive on a seeded stress atlas with
  years of entries. That test infrastructure does not exist yet and is built
  here.

Everything else is an audit that verifies a bar clause on the real screens and
leaves a regression lock behind, fixing any hit it finds.

This EPIC adds **no schema change, no version bump, and no migration.**

---

## Quality differentiator (this app must win here)

**Recall: the map answers back.** Touch any place and the atlas instantly
returns everything you wrote there before, with the time since your last visit.
Paper cannot answer. A dream-journal app has no places to answer from. Obsidian
answers only if you hand-wired every link yourself.

**What this EPIC owes the differentiator.** The recall moment must stay the most
polished interaction in the product and stay *instant* no matter how large the
atlas grows. A polish pass that let the recall panel slow down as the corpus
compounds would betray the one dimension this product wins on. So the recall
panel's speed on a years-deep atlas is the load-bearing acceptance criterion of
this EPIC: the answer-back opens within one frame on the stress atlas, its
rendered list is bounded, and every dated entry the user ever wrote there stays
reachable. Reachable-from-a-cold-first-run-within-a-minute is already proven by
the sample flow; this pass keeps it true and proves it does not regress under
the cap.

---

## Scope

### In scope (each item is a bar clause verified on a real screen, with a lock)

1. **Recall list cap (QUALITY BAR §1 — the one behavior change).** Bound the
   number of entry rows the recall panel renders at once, with every older entry
   still reachable in one tap. This is the smallest change that brings the
   signature surface up to the "unbounded lists MUST be paginated or capped"
   rule without hiding anything the user wrote (see Technical design).

2. **Seeded stress atlas + perf lock (planner AC 2 / §1).** A test-only stress
   world with years of entries across many places and many strata, plus tests
   proving `buildRecallIndex` stays a single pass, `get()` is an O(1) lookup
   returning a stable reference, the recall panel renders a bounded node count
   on the busiest place, the visit ledger stays correctly ordered, and the map
   renders only the current stratum's shapes (never a scan across all strata).

3. **First-meaningful-render lock (§1 / planner AC 2).** A test that pins the
   inline app shell and critical CSS in `index.html` and the React
   `LoadingShell`, so the first paint is guaranteed to be real content on a dark
   surface, never a blank white page.

4. **Copy sweep, completed across the whole product (planner AC 3 / §8).**
   Extend the mechanical sweep so it covers **every** user-visible string, not
   just the `copy` object and demo strings: add the negative-phrasing checks to
   `README.md` and `ATLAS_FORMAT.md` (today they are only checked for dashes and
   banned words), and sweep the user-visible strings in `index.html` (the shell
   wordmark, tagline, and meta description). Run the manual mechanical sweep over
   every touched string and fix every hit.

5. **Contrast + accessibility lock (§6 / planner AC 1).** A computed WCAG check
   over the real text/background token pairs in `tokens.css` (asserting ≥ 4.5:1
   for body text and ≥ 3:1 for large text and UI affordances), plus an audit that
   every screen's inputs are labeled, interactive elements are keyboard-reachable
   with a visible focus state, and touch targets meet the 44px token. Fix any
   pair or control that falls short.

6. **One-primary-action audit (§7 / planner AC 4).** Assert each primary screen
   renders exactly one visible primary action with secondary actions visibly
   subordinate, and confirm no screen leans on a wall of text.

7. **README verification for a stranger (planner AC 6 / §9).** Cross-check every
   command in `README.md` against `package.json` scripts, the `Dockerfile`, and
   `docker-compose.staging.yml`; confirm the "Contribute" file map still matches
   the tree; confirm there are no factory internals. Fix any drift.

### Out of scope (non-goals — building any of these is a defect)

- **No new features.** (Planner non-goal.) No new screen, tool, entry field,
  export format, setting, or mechanic. The recall cap is a §1 bar fix on an
  existing surface, not a feature: it renders a subset of data that already
  exists and keeps all of it reachable.
- **No re-architecture.** (Planner non-goal.) No new state library, no store
  restructure, no change to the atlas file format, the recall index shape, the
  persistence layer, or the strata model. The recall index is already O(1) on
  the tap path and is not rewritten.
- **No gold-plating past the bar.** (Planner non-goal.) No new animations beyond
  what ships, no design system, no theming, no virtualization library, no
  premature optimization of paths that already meet the budget. The visit ledger
  (one row per named place) and the map render (current stratum only) are
  bounded in practice and are **not** capped or virtualized.
- **No copy rewrites for taste.** Only sweep hits (dashes, banned vocabulary,
  negative phrasing) and outright bar violations are changed. Do not reword
  strings that already pass.
- **No visual redesign.** Palette, layout, type scale, and spacing tokens stay.
  Only contrast pairs that fail AA are adjusted, and only enough to pass.

### Scope judgments this spec makes (read before building)

1. **The recall cap keeps every entry reachable.** The differentiator is that
   the map returns *everything* you wrote at a place. A cap that permanently hid
   older mornings would break that promise. So the cap renders the newest
   `RECALL_PAGE` entries and, when there are more, a single subordinate control
   reveals the remainder. The panel's visit **count** always shows the true
   total, so the answer-back is honest even before the reveal. Capping without a
   reveal is a defect here; so is no cap at all.

2. **Only genuinely unbounded hot-path lists are capped.** The recall entry list
   grows without limit as a place accrues visits, so it is capped. The visit
   ledger is bounded by the number of named places a hand-drawn world has (small
   in practice) and the map renders only the current stratum's shapes, so neither
   is capped. Capping them would be gold-plating past the bar (non-goal).

3. **Verification-only items still fix what they find.** Several items are audits
   with locks. If an audit finds the app already meets the bar, the deliverable
   is the lock (a test) plus a one-line note in the run summary. If it finds a
   real hit (a failing contrast pair, an unlabeled input, a negative-phrasing
   string), that hit is fixed in the same run. Do not weaken an audit to make it
   pass; report `failure` if a hit cannot be fixed within scope.

4. **The perf lock is structural, not wall-clock.** A timing assertion
   (`expect(ms).toBeLessThan(...)`) is flaky on shared CI. The stress-atlas
   proof asserts *shape*: single-pass index build, O(1) `get()` returning a
   stable reference, and a bounded rendered node count on the busiest place.
   Those prove "does not get slower with every row" deterministically. A
   generous wall-clock sanity check may be added but must not be the gate.

---

## Technical design

### Data model (no changes, no migration)

`CURRENT_VERSION` stays `1`. No atlas field is added, removed, or read
differently. The recall index (`src/model/recallIndex.ts`) keeps its exact
shape and single-pass build; it is not modified. The stress atlas is a
test-only fixture and ships nowhere in the bundle.

### Recall list cap (`src/ui/RecallPanel.tsx`, EDIT)

The panel already computes `recall.count` and renders `recall.entries` (already
sorted newest-first by the index). Bound the rendered slice:

```
const RECALL_PAGE = 50; // newest entries shown before the reveal

// inside the component:
const [showAll, setShowAll] = useState(false);
const shown = showAll ? recall.entries : recall.entries.slice(0, RECALL_PAGE);
const hiddenCount = recall.count - shown.length;
```

- Render `shown` in the `<ol className="recall-entries">` instead of
  `recall.entries`.
- When `hiddenCount > 0`, render one subordinate ghost button after the list:
  `copy.recall.showEarlier`, `onClick={() => setShowAll(true)}`. It is a
  `.btn .btn--ghost .btn--block` (visibly subordinate to the primary "Write a
  dream here"), keyboard reachable, inside the focus trap.
- The count line (`visitsLabel(recall.count)`) and the "Last visit here" line
  are unchanged, so the true total and newest date always show regardless of the
  cap. The elapsed labels stay computed at render.
- `RECALL_PAGE` is a module constant, generously above what a real dreamer hits,
  so the reveal is the long-tail escape hatch, not a routine step. No
  pagination-by-page, no infinite scroll: one reveal to show the rest is the
  smallest thing that satisfies §1 while keeping every entry reachable
  (scope judgment 1).
- Reset is automatic: `RecallPanel` unmounts on close and remounts per
  `placeId`, so `showAll` starts false for each newly tapped place. Confirm the
  panel is not memoized in a way that would preserve `showAll` across places; if
  it is, key it by `recall.place.id`.

### Seeded stress atlas (`src/test/fixtures.ts`, EDIT — add a helper)

Add a deterministic stress builder next to `fullAtlasFixture`. Test-only; no
production import.

```
// A years-deep atlas for the perf locks: many places, many entries at the
// busiest place, many strata. Deterministic (no Date.now, no random), so the
// node-count and ordering assertions are stable.
export function stressWorld(opts?: {
  places?: number;   // default ~12
  entries?: number;  // default ~3000, weighted onto the first place
  strata?: number;   // default ~30
}): World { /* ... */ }

export function stressAtlas(): AtlasFile { /* wraps stressWorld() */ }
```

- Spread entry `date`s across ~10 calendar years and set `createdAt` so
  `newestFirst` ordering is unambiguous. Weight the majority of entries onto the
  first place so the busiest-place render is genuinely large (this is the case
  the cap must survive).
- Build strata as append-only snapshots (each `derivedFrom` the previous), so
  the time-scrub and current-stratum paths are exercised at scale.
- All strings the builder emits (place names, entry bodies, stratum labels) go
  through the copy sweep too if they are plausibly user-visible; keep them plain
  and dash-free so the sweep stays green. Prefer neutral generated text like
  `Visit N at <place>` (no dashes, no banned words).

### Perf lock (`src/model/recallIndex.stress.test.ts`, NEW)

- `buildRecallIndex(stressWorld())` returns a `RecallIndex`; `index.get(id)`
  returns the **same object reference** on repeated calls (proves precomputed,
  never re-filtered).
- `index.ledger.length === world.places.length` and is sorted by `byLastVisit`
  (spot-check the first/last few).
- The busiest place's `PlaceRecall.entries` is sorted newest-first and its
  `count` equals the number of entries pinned to it.
- Optional, non-gating: a single `buildRecallIndex` call over the stress world
  completes well within a generous budget; keep this loose or omit it (scope
  judgment 4).

### Recall panel cap tests (`src/ui/recallPanel.test.tsx`, EDIT)

- Given a `PlaceRecall` with `count` far above `RECALL_PAGE`, the panel renders
  exactly `RECALL_PAGE` `.entry` nodes and shows the `copy.recall.showEarlier`
  control; the visit-count line shows the true total.
- Clicking `showEarlier` renders all entries and hides the control.
- Given a `count` at or below `RECALL_PAGE`, no `showEarlier` control appears and
  all entries render.
- The existing empty-state and single-entry cases still pass unchanged.
- The reveal control is inside the dialog (reachable under the focus trap) and is
  not the primary action.

### First-render lock (`src/shell.test.ts`, EDIT, or NEW `src/firstRender.test.ts`)

- Read `index.html`; assert it contains the inline `.app-shell` markup, the
  wordmark and tagline text, and the critical inline `<style>` setting a
  non-white background (`#0e1116`) before the module bundle tag. This proves the
  first paint is real content, never blank (§1).
- Assert `App`'s `LoadingShell` renders the wordmark and steady-height cards
  (holds layout, no white flash) — a small render test.

### Copy sweep completion (`src/copy.test.ts`, EDIT)

- Apply `checkNoNegative` (already defined) to `README.md` and `ATLAS_FORMAT.md`
  in the existing "README and ATLAS_FORMAT" test, alongside the dash and banned
  checks it already runs.
- Add `index.html`'s user-visible strings to the sweep: extract the shell
  wordmark, tagline, `<title>`, and `<meta name="description">` content and run
  all three checks (`checkNoDashes`, `checkNoBanned`, `checkNoNegative`) on them.
- Keep the existing `copy` + demo sweep. If the stress fixture emits
  user-visible strings, include them too.
- Then run the **manual** mechanical sweep (§8) over every string touched this
  run (components, tests, README, this spec) for `—` / `–`, banned vocabulary,
  and negative phrasing, and fix every hit.

### Contrast + a11y lock (`src/ui/contrast.test.ts`, NEW)

- Include a tiny WCAG relative-luminance helper **inside the test file**
  (test-only; do not ship an unused module). Assert the real pairs used for text
  meet AA:
  - `--muted (#9a9384)` on `--surface (#171b22)`, on `--surface-2 (#1e232c)`, and
    on `--bg (#0e1116)` ≥ 4.5:1 (small body/meta text).
  - `--text (#e7e2d6)` on `--surface` and `--bg` ≥ 4.5:1.
  - `--accent (#d8a657)` on `--surface` ≥ 4.5:1 (the "Last visit here" line).
  - `.map-empty__body (#5b5344)` on `--map-paper (#e8dfc8)` ≥ 4.5:1.
  - `--accent-text (#1a1206)` on `--accent (#d8a657)` ≥ 4.5:1 (primary button
    label).
  - `--danger (#e0a3a3)` on the save-banner background (`#2a1a1a`) ≥ 4.5:1.
- Read the hex values from `tokens.css` at test time (or mirror them as
  documented constants in the test with a comment pointing at the source) so the
  test guards the shipped values.
- If any pair is below its threshold, darken/lighten only that token enough to
  pass, then re-run the sweep. (The pairs above were spot-checked and appear to
  pass; the deliverable is the lock. Do not change tokens that pass.)
- A11y audit (manual, with lock where cheap): confirm every input in the
  composer, the map name/label panels, the new-world form, and the time scrub has
  an associated label; confirm the map canvas, markers, kit buttons, sheets, and
  the walk's Skip all have a visible focus state and are keyboard-operable; keep
  the existing component tests that assert `role`/`aria-label` green.

### One-primary-action audit (extend existing component tests)

- World list (empty and populated): exactly one `.btn--primary` ("New world");
  the sample and file controls are non-primary.
- World view default (sample world, no sheet open): exactly one visible
  `.btn--primary` (the map empty CTA on a blank world, or "Write a dream" once
  there is something to pin — never both at once).
- Recall panel: one `.btn--primary` ("Write a dream here"); the new
  `showEarlier` reveal is subordinate.
- Composer: one `.btn--primary` ("Save").
- Assert these counts in the relevant existing test files rather than adding a
  new global harness.

### README verification (`README.md`, EDIT only if drift is found)

- Verify each command: `npm install`, `npm run dev`, `npm run build`,
  `npm run preview`, `npm run lint`, `npm test`, `npm run test:e2e` all exist in
  `package.json`; `docker build -t night-cartographer .` and the `docker run ...
  -e SEED_DEMO=1` example match the `Dockerfile` (multi-stage, `serve` target)
  and the `SEED_DEMO` convention; the `docker-compose.staging.yml` description
  (network-only, no host port) matches the file.
- Verify the "Contribute" file map (`src/model/`, `src/persistence/`,
  `src/state/`, `src/ui/`, `src/copy.ts`) still matches the tree.
- Confirm no factory internals (no task types, agent names, factory paths, or
  internal service names). Fix any drift; the current README reads clean, so this
  is likely verification only.

### Files to create / touch

```
src/ui/RecallPanel.tsx              EDIT  cap the entry list to RECALL_PAGE; subordinate "Show earlier visits" reveal
src/copy.ts                         EDIT  add recall.showEarlier (swept)
src/test/fixtures.ts                EDIT  add stressWorld()/stressAtlas() (test-only, deterministic)
src/model/recallIndex.stress.test.ts NEW  perf lock: single-pass build, O(1) get, stable ref, ledger order, bounded busiest place
src/ui/recallPanel.test.tsx         EDIT  cap + reveal tests; existing states still pass
src/ui/contrast.test.ts             NEW   computed WCAG AA lock over the real token pairs
src/copy.test.ts                    EDIT  negative-phrasing on README/ATLAS_FORMAT; sweep index.html strings
src/shell.test.ts                   EDIT  lock inline app shell + critical CSS in index.html; LoadingShell render
src/ui/worldlist.test.tsx           EDIT  one-primary-action assertion
src/ui/worldView.test.tsx           EDIT  one-primary-action assertion (no sheet open)
README.md                           EDIT  only if command/tree drift is found
src/ui/tokens.css                   EDIT  only if a contrast pair fails AA
```

---

## Ordered task list (each item independently checkable)

1. **Recall list cap + copy string.** Add `RECALL_PAGE`, the `showAll` state, the
   `shown` slice, and the subordinate `copy.recall.showEarlier` reveal to
   `RecallPanel`. Keep the count and "last visit" lines on the true total.
   *AC:* `recallPanel.test.tsx` proves a place with more than `RECALL_PAGE`
   entries renders exactly `RECALL_PAGE` `.entry` nodes plus the reveal control,
   the count line shows the true total, clicking reveal shows all and hides the
   control, and a place at/below the cap shows no control and renders every
   entry; the empty and single-entry states still pass.

2. **Stress atlas fixture.** Add `stressWorld()`/`stressAtlas()` to
   `src/test/fixtures.ts`: ~12 places, ~3000 entries weighted onto the busiest
   place, ~30 append-only strata, dates spread across ~10 years, deterministic.
   *AC:* the builder is pure (no `Date.now`/random), returns a valid `World`/
   `AtlasFile` that passes the schema, and the busiest place has far more than
   `RECALL_PAGE` entries.

3. **Perf lock.** `recallIndex.stress.test.ts`: single-pass build, `get()`
   returns a stable reference and O(1) lookup, `ledger.length` equals place
   count and is ordered by last visit, the busiest place's entries are
   newest-first with the correct count.
   *AC:* the test passes and asserts structural shape (not wall-clock).

4. **Cap ⇄ recall integration on the stress atlas.** Render the recall panel for
   the busiest place of the stress atlas.
   *AC:* the panel opens and renders a bounded node count (`RECALL_PAGE`), the
   count line shows the true (large) total, and the reveal shows the rest. Proves
   the differentiator stays instant and complete at scale.

5. **First-render lock.** `shell.test.ts`: `index.html` ships the inline
   `.app-shell`, the wordmark/tagline, and critical CSS with a non-white
   background before the bundle; `LoadingShell` renders steady content.
   *AC:* the test passes; a first paint can never be blank white.

6. **Copy sweep completion.** Extend `copy.test.ts` to run negative-phrasing on
   `README.md`/`ATLAS_FORMAT.md` and all three checks on `index.html`'s
   user-visible strings; run the manual mechanical sweep over every touched
   string and fix hits.
   *AC:* `copy.test.ts` is green with the widened coverage; the manual sweep
   finds no `—`/`–`, no banned vocabulary, and no negative empty-state phrasing
   in any touched string (report the count of hits found and fixed in the
   summary, even if zero).

7. **Contrast + a11y lock.** `contrast.test.ts` asserts every real text/background
   token pair meets its AA threshold; the a11y audit confirms labels, focus, and
   keyboard reach across every screen. Fix any failing pair or control.
   *AC:* the contrast test passes; the audit note in the summary lists each
   screen checked and any fix made.

8. **One-primary-action audit.** Add the single-visible-`.btn--primary`
   assertions to the world-list and world-view tests; confirm the recall panel
   and composer each keep one primary with the reveal/secondary subordinate.
   *AC:* the assertions pass on every screen listed in Technical design.

9. **README verification.** Cross-check every command and the file map against
   the actual `package.json`, `Dockerfile`, compose, and tree; confirm no factory
   internals. Fix drift.
   *AC:* every documented command is real and correct; the file map matches;
   `copy.test.ts`'s README checks pass; the summary states what was verified and
   any fix.

10. **Green gates.** `npm run build`, `npm run lint`, `npm test` all pass with no
    prior assertion weakened, and the Playwright smoke suite still passes
    unchanged (the cap does not change the sample's small entry counts, so the
    e2e answer-back assertions are unaffected).
    *AC:* all three commands and the smoke suite pass in the foreground to
    completion.

---

## Test plan (which automated test proves each planner criterion)

Existing stack: `vitest` + `@testing-library/react` + `jsdom` for units and
integration; Playwright (`e2e/smoke.spec.ts`) for the production build.

- **"Every screen meets the QUALITY BAR: designed empty/loading/error states,
  mobile-first at 390px, 44px touch targets, visible focus, labeled inputs,
  sufficient contrast, full keyboard reach."** — The existing component tests
  already cover the designed states, roles, labels, and focus behavior and stay
  green. New `contrast.test.ts` locks AA on the real token pairs; the
  one-primary-action assertions and the a11y audit confirm labels/focus/keyboard
  per screen; `shell.test.ts` locks the loading/first-paint state. Mobile-first
  (390px, 44px) is enforced by the `--touch` token and the mobile-first
  stylesheet, spot-verified in the audit.

- **"First meaningful render within ~1s; all interactions acknowledge within
  100ms; recall and map render stay responsive on a seeded stress atlas with
  years of entries (no hot-path slowdown)."** — `shell.test.ts` locks the inline
  first paint. `recallIndex.stress.test.ts` proves the index is single-pass with
  O(1) `get()` (the tap path never scans). The cap tests and the stress-atlas
  panel render prove the recall list stays bounded and the answer-back opens in
  one synchronous render at any corpus size. The map render reads only the
  current stratum (proven by the existing render/scrub tests and asserted on the
  stress world's many strata).

- **"A full copy sweep across every user-visible string (components, empty
  states, errors, seed/demo copy, README) finds no '—' or '–', no banned LLM
  vocabulary, and no negative empty-state phrasing; every hit is fixed."** —
  `copy.test.ts` sweeps the whole `copy` object, the demo strings, `README.md`,
  `ATLAS_FORMAT.md` (now including negative phrasing), and `index.html`'s
  user-visible strings; the manual mechanical sweep covers every string touched
  this run.

- **"Each screen has one obvious primary action; secondary actions visibly
  subordinate; no wall of text propping up a layout."** — the one-primary-action
  assertions in the world-list, world-view, recall-panel, and composer tests.

- **"The recall moment is demonstrably the most polished interaction and is
  reachable from a cold first run within a minute."** — the stress-atlas panel
  render proves recall stays instant and complete at scale; `e2e/smoke.spec.ts`
  already proves a cold first run reaches recall in one tap ("Open the sample
  atlas" → tap The Harbor → history + elapsed), and this pass keeps it green.

- **"README.md lets a stranger understand, run (verified against the actual
  compose files), and contribute, with no factory internals."** — the README
  verification task cross-checks every command against `package.json`, the
  `Dockerfile`, and `docker-compose.staging.yml`; `copy.test.ts`'s README checks
  guard tone; the existing `staging.test.ts` guards the compose/Dockerfile
  contract the README describes.

**Definition of done:** `npm run build`, `npm run lint`, and `npm test` pass
(every prior suite included and no prior assertion weakened), and the Playwright
smoke suite passes unchanged. The recall panel renders a bounded list with every
older entry reachable in one tap, and stays instant on the seeded stress atlas.
The first paint is provably real content, never blank. The copy sweep is clean
across components, demo, README, ATLAS_FORMAT, and index.html, with any hit
fixed. Every real text/background pair meets AA. Each screen has one primary
action. The README's commands and file map are verified correct with no factory
internals. No new feature, no re-architecture, and no gold-plating past the bar
shipped.

---

## Risks and guardrails

- **A cap that hides history.** The whole promise is that the map hands back
  *everything* you wrote at a place. The guardrail: the visit count always shows
  the true total, and the "Show earlier visits" reveal exposes every older entry
  in one tap. Task 4 asserts the busiest place's true total is visible and the
  rest is reachable. Capping with no reveal is a defect.

- **Scope creep into a feature.** The cap is the only behavior change, and it is
  a §1 bar fix on an existing surface. The guardrail: no new copy beyond one
  reveal label, no pagination widget, no infinite scroll, no virtualization
  library, and the ledger and map render are explicitly left uncapped (scope
  judgment 2). Anything more is gold-plating (non-goal).

- **Flaky perf tests.** Wall-clock timing on shared CI is unreliable. The
  guardrail: the perf lock asserts structural shape (single-pass build, O(1)
  stable-reference `get()`, bounded rendered node count), which proves "does not
  slow down with every row" deterministically (scope judgment 4).

- **Audits that quietly pass by being weakened.** An audit that lowers its own
  threshold to go green proves nothing. The guardrail: contrast thresholds are
  the WCAG AA numbers, the sweep checks are the shipped ones, and a hit that
  cannot be fixed within scope is reported as `failure`, never hidden
  (scope judgment 3).

- **Copy tells slipping into new strings.** The one new string ("Show earlier
  visits") and any stress-fixture text are the only additions; sweep them (and
  this spec's example copy) for dashes, banned vocabulary, and negative phrasing
  before finishing. `copy.test.ts` enforces the shipped `copy` object
  automatically.

- **Breaking the green smoke suite.** The sample world's entry counts are far
  below `RECALL_PAGE`, so the cap never triggers there and the e2e answer-back
  assertions are unaffected. Confirm by running the smoke suite; if any assertion
  moves, the cap logic is wrong, not the test.
