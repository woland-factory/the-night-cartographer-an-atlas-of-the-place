# PRODUCT PLAN — The Night Cartographer

*An atlas of the places you only visit in dreams.*

## Core value (one sentence)

A dreamer who returns to the same imaginary place for years can draw its
geography with a constrained map kit, pin each morning's entry to a spot
on it, and instantly get back everything they wrote at that same spot on
earlier visits, all kept in one private file they own.

## North star

Years from now, opening your atlas feels like stepping back through a
door you thought you had forgotten. The place is there, drawn in your
own crooked hand, more detailed than it was last spring, and the moment
you touch the harbor it hands back the three mornings you stood there
before and how long ago each was. The excellent version is not a
prettier map. It is an instrument of return: it holds a place that
exists nowhere else, remembers what you forgot, and after a few years is
the one file you would carry out of a burning house. Its standard is
that a stranger who has never remembered a dream twice still understands,
within a minute, why someone would keep this for a decade.

## Quality differentiator (the one dimension we win on)

**Recall: the map answers back.** Touch any place and the atlas instantly
returns everything you wrote there before, with the time since your last
visit. Paper cannot answer. A dream-journal app has no places to answer
from. Obsidian answers only if you hand-wired every link yourself. This
is the single dimension where The Night Cartographer must clearly beat
every existing way to do the job, and every EPIC below bends toward
making that one moment excellent and reachable in the first minute.

## The signature moment

Drop a pin on a district, or just tap it, and a panel rises with the
dated entries written at that place across the years and the elapsed
time since the last one. Surface copy: "Last visit here: 14 months ago."
It re-enacts the eeriest part of the real experience, suddenly
remembering earlier visits once you are back inside the dream, except now
the remembering is real, recorded, and yours. The build gives this
mechanic its craft budget; nothing else competes with it for polish.

---

## MVP user stories

1. As a returning dreamer, I can create and name a dream world so I have
   somewhere to hold its geography.
2. As a dreamer, I can draw my world's districts, roads, coastline, and
   labels with a constrained kit, so an amateur's map still looks
   intentional and atlas-like.
3. As a dreamer, I can mark foggy or uncertain boundaries, so the map
   stays honest to a place I only half remember.
4. As a dreamer waking up, I can write a dated entry and pin it to a
   place in under a minute on my phone.
5. As a returning dreamer, when I touch a place I see everything I wrote
   there before and how long it has been since my last visit there.
6. As a long-term user, I can drag a time slider to watch my world's
   geography change across visits, without ever losing an old version.
7. As the owner of my atlas, I can export and re-import my whole atlas as
   one documented file, and the app works with no network at all.
8. As a brand-new visitor, I can open a sample atlas and reach the recall
   moment within a minute, guided by a short first-success path.

## Data model sketch

One plain, documented JSON document (the owned file). SVG geometry is
embedded as path data inside it, so the whole atlas is a single file that
outlives the tool.

- **Atlas** (file root): `version`, `worlds[]`, `settings`, `meta`
  (`createdAt`, `appVersion`).
- **World**: `id`, `name`, `createdAt`, `places[]`, `strata[]`,
  `currentStratumId`, `entries[]`.
- **Place** (the stable identity recall indexes against): `id`, `name`,
  `anchor` (a point coordinate, or a reference to a district shape),
  `createdAt`. Places persist across map revisions so redrawing
  geography never breaks recall.
- **Stratum** (one dated map revision, append-only): `id`, `createdAt`,
  `label?`, `shapes[]`, `derivedFrom?` (previous stratum id). Editing the
  map appends a new stratum; old strata are never destroyed
  (the palimpsest).
- **Shape**: `id`, `type` (`district | road | coastline | label | stamp
  | fog`), `geometry` (SVG path / points), `styleToken` (from a fixed
  palette), `text?` (labels), `placeId?` (links a district to a place).
- **Entry**: `id`, `placeId`, `date` (the dream's date), `body` (text),
  `createdAt`.
- **Ledger** (derived, not stored): per place, the visit count and the
  last-visit date, computed from entries. Powers the recall panel and the
  per-world visit ledger.

## Screen inventory (no server endpoints; fully client-side)

1. **Atlas home / world list** — worlds as cards; empty state guides the
   first draw; entry point to the sample atlas.
2. **Map view** — the SVG canvas with a Draw / Pin mode toggle and the
   constrained kit palette.
3. **Entry composer** — a mobile sheet: dated text plus the place it
   pins to. Built for the groggy five minutes after waking.
4. **Recall panel** — prior entries at a place, newest first, with
   elapsed time. The signature surface.
5. **Time-scrub control** — a slider that replays the world's strata
   across dates.
6. **Settings** — export / import the atlas file, open the sample atlas,
   an About/format note. No accounts, no network toggles.
7. **First-run guided overlay** — a short, skippable path to the first
   recall.

There is no backend for the core loop. The only server involved is a
static file host. Analytics and error tracking are wired as thin,
optional client hooks (see EPIC 1) and never touch atlas content.

---

## EPIC list (build order)

Each EPIC is small and independently reviewable. The order is
depth-first toward recall: foundation, then the surfaces recall needs
(map, entries), then recall itself, then the mechanics that make it
compound (palimpsest), then first-run so a stranger reaches it, then a
whole-product polish pass.

### EPIC 1 — Foundation, the owned file, and the deploy scaffold
**Scope.** Project scaffold (React + Vite + TypeScript). The atlas data
model and a documented file format. Persistence layer: IndexedDB for
working state plus File System Access API for the owned file, with a
download/upload fallback for browsers without FSA. One-click
export/import round-trip. A minimal world list (create, name, open a
world). A real first render (never a blank page). The staging deploy
scaffold. Thin, optional analytics (Umami) and error tracking (Sentry
DSN) client hooks that are inert without env and never receive atlas
content or PII.

**Acceptance criteria.**
- `docker compose -f docker-compose.staging.yml up` builds and serves the
  app; a `Dockerfile` (multi-stage: build then serve static assets) and
  `docker-compose.staging.yml` exist at the repo root and are verified to
  run. *(Reviews treat a missing staging compose as a shipping blocker;
  it lives here.)*
- The staging container honors the `SEED_DEMO` convention: a brand-new
  visitor with no saved atlas lands on content, not a blank canvas, and
  can reach the recall moment within a minute without hand-crafted input.
- Exporting an atlas then importing the exported file reproduces the same
  atlas exactly (round-trip test passes). The file is human-readable
  JSON with SVG geometry embedded, and its shape is documented in the
  repo.
- Working state persists across reload via IndexedDB. In a browser
  without File System Access API, export downloads a file and import
  reads one; no feature is lost, only the direct-to-file convenience.
- First meaningful render shows real content within ~1s; no white flash.
- Analytics/error hooks are no-ops when their env vars are absent, send
  no atlas text, pins, or entry bodies, and log no PII.

**Non-goals.** No map drawing yet. No accounts. No cloud. No sync.

### EPIC 2 — The map kit (constrained stylized drawing)
**Scope.** The SVG canvas and the constrained kit: labeled district
polygons, road/path strokes, a coastline tool, text labels, a small
fixed stamp set, and fog / vague-boundary edges for uncertainty.
Stylized rendering does the aesthetic work so crooked lines read as
intentional. A fixed palette (no arbitrary color picker). Every map edit
appends a new stratum (the palimpsest foundation); districts can be
promoted to named places. Fully usable at 390px with ~44px touch
targets.

**Acceptance criteria.**
- A user can draw and label a district, draw a road and a coastline,
  drop a stamp, and mark a fog/uncertain edge, using only the fixed kit.
- No freehand pixel/raster brush, no color picker beyond the fixed
  palette, no layers panel exists anywhere in the UI.
- An amateur test map (deliberately crooked input) renders as a
  coherent, atlas-like place, not a wobbly scrawl.
- Naming a district creates a `place` with a stable id that survives
  later redrawing.
- Every edit appends a stratum; no edit mutates or deletes a prior
  stratum's shapes.
- Drawing and labeling are fully operable by touch at 390px with no
  horizontal scroll; primary action per screen is unambiguous.
- Empty canvas shows a designed state that says what to do first, in the
  product's voice, with no negative phrasing.

**Non-goals.** No time-scrub UI yet (data only). No image import as a
base map. No recall yet.

### EPIC 3 — Pinned morning entries (the sub-minute gesture)
**Scope.** The entry composer: a dated text entry pinned to a place
(tap an existing place, or drop a point). Optimized for speed on a phone
right after waking. This is one of the two load-bearing legs of the
whole product.

**Acceptance criteria.**
- From the map view, a user can open the composer, type an entry, pick or
  drop a place, and save in a flow that measurably takes under a minute
  on a phone-sized viewport.
- The entry date defaults to today and is editable (for logging a dream
  written down later).
- Every interaction gives feedback within 100ms (pressed states,
  optimistic save); the entry appears on the map immediately.
- Composer is fully usable at 390px: reachable controls, readable text,
  no zoom needed, keyboard does not obscure the save action.
- Loading and error states are designed; a failed save states what to do
  next in the product's voice, never a raw error.
- Entries are stored against a `placeId`, so recall survives later map
  revisions.

**Non-goals.** No rich media (audio, images) in entries. No tags,
symbols, or dream analysis. No AI.

### EPIC 4 — Recall (the signature moment)
**Scope.** The recall panel: touching or pinning a place surfaces the
dated entries written there, newest first, with elapsed time since the
last visit, plus the per-place visit count. This EPIC gets the craft
budget; it is the differentiator.

**Acceptance criteria.**
- Tapping a place with prior entries opens a panel listing them
  newest-first, each with its date and a human elapsed time
  (for example "Last visit here: 14 months ago"). Copy is positive and
  free of banned filler and em-dashes.
- The panel appears within 100ms of the tap; queries are indexed by
  `placeId` and do not slow down as entries accumulate (no full scan on
  the hot path).
- A place with exactly one prior entry, and a place with none, each show
  a correct, designed state (no "0 results" dead end; a place with no
  history invites the first entry).
- Placing a new entry at a place that already has history shows the
  recall in the same gesture, so the answer-back happens at write time,
  not only on a separate lookup.
- The per-world visit ledger (places by last visit) is viewable and
  matches the underlying entries.
- Fully usable at 390px; panel dismiss is obvious and keyboard-reachable.

**Non-goals.** No search across worlds. No AI summary of entries. No
export of the recall view as a separate artifact.

### EPIC 5 — Palimpsest time-scrub
**Scope.** The time slider that replays a world's strata across dates, so
the user watches the geography mutate over years without losing any
version. Uses the append-only strata from EPIC 2.

**Acceptance criteria.**
- A slider (or equivalent control) scrubs the map through its dated
  strata; moving it re-renders the geography as it stood at that date.
- Scrubbing never alters stored strata; returning to "now" restores the
  current map exactly.
- Entries pinned to places remain correctly associated as the geography
  under them changes across strata.
- The control is discoverable, labeled, keyboard-operable, and usable at
  390px.
- With a single stratum the control degrades gracefully (shown as a
  single point in time, not broken).

**Non-goals.** No branching/alternate timelines. No per-shape diff view.
No animation beyond the scrub.

### EPIC 6 — First run: seeded demo and guided first success
**Scope.** A seeded demo world (`SEED_DEMO`) with a few years of
backdated visits so a first-run visitor sees recall immediately, plus a
short guided path that walks a new user through their first real success
once. Ties the whole product together for a stranger.

**Acceptance criteria.**
- On first run with no saved atlas, the app presents the sample atlas
  (auto-opened on staging via `SEED_DEMO`; offered as one tap in
  production so a user's own new atlas is never overwritten). Opening it,
  a stranger reaches a real recall moment (prior entries with elapsed
  time) within a minute, with zero hand-crafted input.
- The seeded demo contains multiple dated entries at the same place
  across years, so recall demonstrably answers back (a demo that yields
  an empty recall does not count).
- A guided path of 2 to 4 steps, each one short imperative sentence,
  anchors to the real controls (draw a district, write an entry, pin it,
  touch the place to see recall). It is skippable at every step, shows
  only until the first success, and never appears again for a returning
  user.
- The sample atlas is clearly marked as a sample and cannot silently
  become the user's own file; starting a real atlas is one obvious step
  away.
- All first-run copy passes the copy sweep (no em-dashes, no banned
  vocabulary, positive phrasing).

**Non-goals.** No multi-step tutorial essays. No video. No re-triggering
the walkthrough from settings for the MVP.

### EPIC 7 — Polish pass (no new features)
**Scope.** A UX, performance, and craft pass over the whole delivered
product against the QUALITY BAR and the recall differentiator. Tighten
what exists; add nothing.

**Acceptance criteria.**
- Every screen meets the QUALITY BAR: designed empty/loading/error
  states, mobile-first at 390px, ~44px touch targets, visible focus,
  labeled inputs, sufficient contrast, keyboard reaches everything.
- First meaningful render within ~1s; all interactions acknowledge within
  100ms; recall and map render stay responsive on an atlas with years of
  entries (a seeded stress atlas is used to verify no hot-path slowdown).
- A full copy sweep across every user-visible string (components, empty
  states, errors, seed/demo copy, README): no "—" or "–", none of the
  banned LLM vocabulary, no negative empty-state phrasing. Every hit
  fixed.
- Each screen has one obvious primary action; secondary actions are
  visibly subordinate; no wall of text props up a layout.
- The recall moment is demonstrably the most polished interaction in the
  product and is reachable from a cold first run within a minute.
- `README.md` lets a stranger understand, run (verified against the
  actual compose files), and contribute, with no factory internals.

**Non-goals.** No new features. No re-architecture. No gold-plating past
the bar (no unspecified animations, no design system for a handful of
screens, no premature optimization).

---

## Non-Goals / Out of scope (the fence)

These are tempting and excluded. Building any of them is a defect.

- **No AI or LLM anywhere.** No dream interpretation, no generated maps,
  no summaries. There is no runtime LLM in this product.
- **No accounts, login, or identity.** The atlas is a file, not a
  profile.
- **No cloud, no server-side storage, no multi-device sync.** The core
  loop makes zero network calls.
- **No sharing, social, collaboration, or publishing** of atlases.
- **No procedural or automatic map generation.** The hand is the point.
- **No image import as a base map** (no uploading a photo or scan to
  trace or pin onto).
- **No freehand pixel/raster brush or general paint tooling.** No
  arbitrary color picker, no layers panel. The kit is constrained by
  design.
- **No expedition / lucid-dream steering mechanics** (the bolder sibling
  variant). This ships the documentary atlas, not the instrument that
  claims to steer dreams.
- **No streaks, notifications, reminders, or habit nudges.** Visits are
  sporadic by nature; the product never guilts absence.
- **No tags, symbol statistics, or dream-analysis dashboards.** That is
  the category shape this product deliberately rejects.
- **No rich media in entries** (audio, images) for the MVP; text only.

## Named risks carried into the build

1. **Drawing-surface jank (highest build risk).** Mitigation is scope,
   not effort: the constrained kit is binding, and stylized rendering
   makes crooked input look intentional. If EPIC 2 drifts toward a
   general drawing app, it fails the bar.
2. **False precision.** Fog and vague-boundary edges ship in EPIC 2, not
   a later pass, so the map can stay honest to a half-remembered place.
3. **Sporadic engagement (accepted).** Design for instant re-entry after
   long gaps; no streaks, no notifications, no absence guilt.
4. **The Obsidian shadow.** The defense is exactly two legs: the
   sub-minute morning gesture (EPIC 3) and the palimpsest-plus-recall
   (EPICs 4 and 5). If either ships mediocre, the product loses. They get
   the craft budget.
5. **Mobile entry must work at 390px** or the loop dies at its most
   load-bearing moment. Mobile is a first-class acceptance criterion in
   EPICs 3, 4, and 7.
