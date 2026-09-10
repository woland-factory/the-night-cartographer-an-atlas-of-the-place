# EPIC SPEC — Foundation, the owned file, and the deploy scaffold

*The Night Cartographer: an atlas of the places you only visit in dreams.*

This is EPIC 1 of 7. It lays the foundation the rest of the product is
built on: the scaffold, the owned atlas file, persistence, a minimal
world list, a real first render, the staging deploy, and inert
analytics/error hooks. No map drawing, no accounts, no cloud.

---

## Quality differentiator (this app must win here)

**Recall: the map answers back.** Touch any place and the atlas instantly
returns everything you wrote there before, with the time since your last
visit. Paper cannot answer. A dream-journal app has no places to answer
from. Obsidian answers only if you hand-wired every link yourself.

**What this EPIC owes the differentiator.** There is no map and no
polished recall panel yet (those are EPICs 2 and 4). But recall lives or
dies on the foundation this EPIC pours:

1. **Places are stable identities, and entries index against them.** A
   `place` keeps its `id` across every future map revision; an `entry`
   references a `placeId`, never a shape or a coordinate. Recall must
   still answer after the map has been redrawn ten times. If the data
   model gets this wrong, recall breaks in EPIC 4 and cannot be patched
   without a migration.
2. **The seeded demo already answers back.** On staging with `SEED_DEMO`,
   a first-time visitor opens the sample world and sees, within a minute
   and with zero input, a real place that returns its prior dated entries
   and the time since the last visit. In this EPIC that readout is a
   plain read-only list, not the signature panel. It must still be real:
   the demo carries multiple dated entries at one place across years, and
   the elapsed-time readout is computed and correct.

The signature panel, the on-map tap, the sub-100ms hot path, and the
guided walkthrough are explicitly later EPICs. This EPIC makes them
possible and makes the answer honest from day one.

---

## Scope

### In scope
- React + Vite + TypeScript project scaffold at the repo root.
- The atlas data model (TypeScript types) and a documented, human-readable
  file format: one JSON document with SVG geometry embedded as strings.
- A persistence layer: IndexedDB for working state, plus File System
  Access API (FSA) for the owned file, with a download/upload fallback for
  browsers without FSA. No feature is lost in the fallback.
- One-click export and import with a lossless round-trip.
- A minimal world list: create a world, name it, open it. A minimal
  opened-world view that renders the world's places and, per place, a
  plain read-only recall readout (its dated entries newest-first and the
  elapsed time since the last one).
- A real first render: the app shows real content within ~1s, with no
  white flash, on first paint.
- The staging deploy scaffold: a multi-stage `Dockerfile` and
  `docker-compose.staging.yml` at the repo root, verified to build and
  serve.
- The `SEED_DEMO` convention honored by the staging container: a bundled
  demo atlas that a fresh visitor lands on, auto-opened on staging.
- Thin, optional analytics (Umami) and error-tracking (Sentry DSN) client
  hooks that are inert without their env vars and never receive atlas
  content or PII.
- A `README.md` a stranger can understand, run, and contribute to.
- The `ATLAS_FORMAT.md` document describing the file shape.

### Out of scope (non-goals — building any of these is a defect)
- **No map drawing.** No SVG canvas, no drawing kit, no shape editing UI.
  The `Shape`/`Stratum` types exist in the model and file format for
  forward-compatibility, but nothing in this EPIC renders or edits a map.
- **No accounts, login, or identity.** The atlas is a file.
- **No cloud, server-side storage, or sync.** The app makes zero network
  calls for its core loop. The only network the app touches is the
  optional Umami script and optional Sentry ingestion, both env-gated.
- **No signature recall panel, no on-map tap, no per-world ledger screen,
  no write-time recall, no 100ms hot-path budget.** Those are EPIC 4. This
  EPIC ships only the plain read-only readout described above.
- **No guided first-run walkthrough.** That is EPIC 6. This EPIC ships the
  `SEED_DEMO` plumbing and the seed data only.
- **No time-scrub, no palimpsest UI, no entry composer UI.** Later EPICs.

### The one scope judgment this spec makes (read before building)
The planner's acceptance criterion for this EPIC requires a fresh visitor
to "reach the recall moment within a minute." Recall's polished panel
ships in EPIC 4, so this EPIC delivers the **minimum honest** version: a
plain, read-only list inside the opened world that shows a place's prior
entries and the elapsed time since the last one. It is not the signature
panel and must not grow into it. Do not add on-map interaction, animation,
a dedicated ledger screen, or a 100ms performance budget here. If you
find yourself building the map or a polished panel to satisfy this
criterion, stop: the plain list is the deliverable.

---

## Technical design

### Stack and dependencies
- **Vite + React 18 + TypeScript.** Client-only SPA. No backend.
- **`zod`** for boundary validation of imported files.
- **`idb`** (Jake Archibald's thin IndexedDB wrapper) for working-state
  persistence.
- **`@sentry/browser`** for optional error tracking (init guarded; see
  below). Umami needs no dependency (script tag).
- **Testing:** `vitest`, `@testing-library/react`,
  `@testing-library/jest-dom`, `jsdom`, `fake-indexeddb`.
- **Tooling:** `eslint` + `typescript-eslint`, `prettier`. Node 20.

Do not add state-management libraries, routers with a server, CSS
frameworks, or a design system. A single small token set (below) is
enough; EPIC 7 owns polish. Adding more is gold-plating.

### Files and modules to create
```
/Dockerfile                       multi-stage: node build -> nginx serve
/docker-compose.staging.yml       builds target `serve`, maps 8080:80, sets SEED_DEMO
/nginx.conf                        SPA fallback (try_files ... /index.html), gzip, cache
/docker/entrypoint.sh             writes /usr/share/nginx/html/config.js from env at start
/ATLAS_FORMAT.md                  the documented file format
/README.md                        rewrite: understand / run / contribute
/index.html                       inline app-shell + inline critical CSS (no white flash)
/public/config.js                 dev default: window.__NC_CONFIG__ = {} (empty)
/package.json, /tsconfig.json, /vite.config.ts, /vitest.config.ts

/src/main.tsx                     mounts React; reads runtime config; inits hooks; seeds
/src/config.ts                    reads window.__NC_CONFIG__ with safe empty defaults
/src/copy.ts                      ALL user-visible strings, centralized (enables the sweep)
/src/model/atlas.ts              TypeScript types for the atlas (below)
/src/model/factory.ts            createAtlas(), createWorld(name), createPlace(), etc.
/src/model/schema.ts             zod schema for AtlasFile + validate()/parseAtlas()
/src/model/migrate.ts            forward-only migration framework (v1 identity today)
/src/model/serialize.ts         serialize(atlas) -> string, parse(string) -> AtlasFile
/src/model/ledger.ts            derived per-place ledger (count, lastVisit) from entries
/src/lib/elapsed.ts             elapsedLabel(fromISO, nowISO) -> "14 months ago"
/src/persistence/idb.ts         load/save working atlas in IndexedDB (debounced save)
/src/persistence/file.ts        exportAtlas()/importAtlas(): FSA when present, else fallback
/src/data/demoAtlas.ts          the bundled SEED_DEMO sample atlas
/src/state/atlasStore.ts        in-memory atlas + subscribe; the single source of truth
/src/ui/App.tsx                 routes between world list and opened world (no server router)
/src/ui/WorldList.tsx           create/name/open worlds; empty state; export/import controls
/src/ui/WorldView.tsx           opened world: places + read-only recall readout
/src/ui/ErrorBoundary.tsx       designed error state
/src/ui/tokens.css              minimal token set (colors, spacing, radius, touch size)
```

### The atlas data model
Matches the plan's data model sketch. These types are the file format
plus the working state.

```ts
// src/model/atlas.ts
export interface AtlasFile {
  format: "night-cartographer-atlas"; // fixed discriminator
  version: 1;                          // schema version; migrations bump this
  meta: { createdAt: string; appVersion: string }; // ISO 8601; semver string
  settings: { activeWorldId: string | null };
  worlds: World[];
}

export interface World {
  id: string;                 // crypto.randomUUID()
  name: string;
  createdAt: string;          // ISO 8601
  isSample?: boolean;         // true only for the seeded demo world
  places: Place[];
  strata: Stratum[];          // append-only map revisions (no UI this EPIC)
  currentStratumId: string | null;
  entries: Entry[];
}

export interface Place {      // the stable identity recall indexes against
  id: string;
  name: string;
  anchor: Point | { shapeRef: string } | null;
  createdAt: string;
}
export interface Point { x: number; y: number }

export interface Stratum {    // one dated map revision, append-only
  id: string;
  createdAt: string;
  label?: string;
  shapes: Shape[];
  derivedFrom?: string | null;
}

export interface Shape {
  id: string;
  type: "district" | "road" | "coastline" | "label" | "stamp" | "fog";
  geometry: string;           // SVG path 'd' string, or serialized points
  styleToken: string;         // key into a fixed palette (defined in EPIC 2)
  text?: string;
  placeId?: string;           // links a district shape to a place
}

export interface Entry {
  id: string;
  placeId: string;            // recall indexes entries by this
  date: string;               // the dream's date, YYYY-MM-DD
  body: string;
  createdAt: string;          // ISO 8601 timestamp
}
```

**Ledger is derived, never stored.** `src/model/ledger.ts` computes, per
`placeId`: entry count and the most recent entry `date`. The read-only
readout and (later) the recall panel consume this. Never persist it.

### File format and round-trip
- **Serialize:** `serialize(atlas)` returns pretty-printed JSON
  (2-space indent, stable key order) so the file is human-readable and
  diff-friendly. SVG geometry lives inside `Shape.geometry` as a string,
  so the whole atlas is one file that outlives the tool.
- **Parse + validate:** `parseAtlas(text)` runs `JSON.parse`, then the
  `zod` schema (`schema.ts`), then `migrate()` (`migrate.ts`). It returns
  either `{ ok: true, atlas }` or `{ ok: false, reason }` with a
  human-readable reason. Never throw a raw parse error at the UI.
- **Round-trip guarantee:** `parseAtlas(serialize(atlas)).atlas` deep-
  equals `atlas` for any valid atlas. This is the load-bearing test.
- **Migrations are forward-only.** `migrate(file)` switches on
  `file.version`, applying each step in order up to `CURRENT_VERSION`
  (`1` today, so it is identity). Later EPICs add cases; old files must
  always upgrade, never break. An unknown/newer version returns a clear
  `{ ok: false, reason }` (do not silently corrupt).

### Persistence layer
- **Working state (IndexedDB):** one object store (e.g. `atlas`) holding
  the single working `AtlasFile` under a fixed key. `atlasStore` autosaves
  on change, debounced (~500ms), through `idb.ts`. On load, the app reads
  IndexedDB first.
- **The owned file (FSA):** feature-detect `window.showSaveFilePicker` /
  `showOpenFilePicker`. When present, "Save to file" writes the serialized
  atlas straight to a user-chosen `.json` file and retains the handle so a
  later save writes back to the same file. Suggested filename:
  `<world-or-atlas-name>.atlas.json`.
- **Fallback (no FSA):** "Export" builds a `Blob` and triggers a download
  via an `<a download>`; "Import" reads a file via `<input type="file">`
  and `File.text()`. Feature parity: the user can still get their atlas
  out and back in, they lose only the direct-to-same-file convenience.
- **Detection is runtime, not build-time.** Both code paths ship; the UI
  picks based on capability. Label the FSA action and the fallback action
  the same way to the user where possible so the feature reads identically.

### Runtime config (env at deploy time, not baked into the build)
Because this is a static SPA, env arrives at container start, not build
time. The nginx entrypoint writes `config.js` from environment variables;
`index.html` loads it before the app bundle.

```
window.__NC_CONFIG__ = {
  SEED_DEMO: "1" | "",           // truthy -> seed + auto-open demo on empty state
  UMAMI_URL: "" ,                // Umami script endpoint
  UMAMI_WEBSITE_ID: "" ,         // per-app id injected by the factory
  SENTRY_DSN: ""                 // per-app DSN injected at deploy time
};
```
`src/config.ts` reads `window.__NC_CONFIG__ ?? {}` and returns typed
values with empty defaults. `public/config.js` sets `{}` so dev and tests
have a real (empty) config and no 404.

### Analytics and error hooks (inert without env; never see atlas content)
- **Umami:** if BOTH `UMAMI_URL` and `UMAMI_WEBSITE_ID` are non-empty,
  inject `<script defer src={UMAMI_URL} data-website-id={UMAMI_WEBSITE_ID}>`
  once. Use only Umami's automatic pageview. Never call a custom event
  carrying atlas text, place names, or entry bodies. If either value is
  empty, inject nothing.
- **Sentry:** if `SENTRY_DSN` is non-empty, `Sentry.init({ dsn,
  sendDefaultPii: false, beforeSend })`. `beforeSend` strips anything that
  could carry atlas content: drop `event.request`, clear `event.breadcrumbs`
  (or filter to non-data breadcrumbs), and cap message length. Expose one
  thin wrapper `reportError(error: Error)` used by `ErrorBoundary`. The
  wrapper's signature takes an `Error` only, so no code path can hand
  Sentry an entry body. If `SENTRY_DSN` is empty, `reportError` is a no-op
  and `Sentry.init` is never called.
- **No PII anywhere.** There is no user identity in this product. Never
  log entry text, place names, or file contents to console or to any hook.

### First render (no white flash)
- Set `html, body` background to the app's dark background color in
  `index.html`'s inline CSS so the very first paint is never white.
- `index.html` contains an inline **app shell**: the product wordmark and
  a static skeleton of the world list, styled with inline critical CSS.
  React mounts into `#root` and replaces the shell once IndexedDB (or the
  seed) resolves. On an ordinary connection the user sees real content
  (the world list, or the seeded demo world) within ~1s and never a blank
  page.

### Minimal UI (this EPIC only)
- **World list (home):** worlds as cards or rows; each opens on tap. A
  "New world" primary action opens an inline name field and creates the
  world. An "Open the sample atlas" action loads the demo. Export / Import
  / Save to file controls live here (a small Settings area is acceptable,
  but keep it to these actions). Designed empty state (copy below).
- **Opened world (WorldView):** the world name, its list of places, and
  per place the plain read-only readout: entries newest-first with their
  dates, and one elapsed-time line (`elapsedLabel`). A place with no
  entries shows a short designed line inviting the first entry (no dead
  end, no "0 results"). No map, no composer, no panel animation.
- **Mobile-first:** single column, usable at 390px, no horizontal scroll,
  touch targets ~44px min-height, text readable without zoom.
- **Accessibility:** semantic headings, one labeled `<input>` for the
  world name, visible focus states, keyboard reaches every control,
  sufficient contrast.
- **Copy:** every user-visible string lives in `src/copy.ts`. Positive,
  short, no em-dashes, no banned vocabulary. Example strings below are
  pre-swept; use them or equally clean ones.

### Example copy (pre-swept — safe to ship verbatim)
- World list empty state (title / body / action):
  "Start your first atlas." / "Draw a world you return to, then pin what
  you remember." / button "New world".
- Sample entry point: "Open the sample atlas".
- Opened world, a place with history: "Last visit here: 14 months ago".
- Opened world, a place with no entries yet: "Pin your first morning here."
- Import failure: "That file isn't an atlas we can read. Pick another."
- Error boundary (title / action): "Reload to try again." / button
  "Reload".
- Save-to-file / Export button: "Save to file". Import button: "Open a
  file".

### The seeded demo atlas (`src/data/demoAtlas.ts`)
- One world, `isSample: true`, named plainly (for example "Harbor City").
- At least two places, one of them ("The Harbor") carrying **multiple
  dated entries across several years** so recall demonstrably answers back.
  A demo whose recall readout is empty does not count.
- Entry `date`s are fixed ISO dates spanning a few years, with the most
  recent roughly a year or so back, so `elapsedLabel` returns a real,
  plausible line like "Last visit here: 14 months ago" computed at
  runtime. Do not hardcode the elapsed string.
- Entry bodies are short, plain, dream-like, and pass the copy sweep.
- The world is clearly a sample (the `isSample` flag; surface it in the UI
  as a small "Sample" marker). It must never silently become the user's
  own saved file: seeding writes to working state only when IndexedDB is
  empty, and the app makes starting a real atlas one obvious action away.
  (The full "one tap in production, never overwrite" guarantee and the
  guided path are EPIC 6; here, do not overwrite a non-empty IndexedDB.)

### Seeding behavior
- On startup: read IndexedDB. If a saved atlas exists, use it (never
  overwrite it with the demo).
- If IndexedDB is empty AND `SEED_DEMO` is truthy: load `demoAtlas` into
  working state and set `settings.activeWorldId` to the demo world so the
  visitor lands inside it (the readout is immediately visible).
- If IndexedDB is empty AND `SEED_DEMO` is falsy: render the world list
  empty state (designed, not blank), which offers both "New world" and
  "Open the sample atlas".

### Docker / staging
- **Dockerfile (multi-stage):** stage `build` on `node:20-alpine` runs
  `npm ci && npm run build`; stage `serve` on `nginx:1.27-alpine` copies
  `dist` to `/usr/share/nginx/html`, copies `nginx.conf`, and installs
  `docker/entrypoint.sh` into `/docker-entrypoint.d/40-write-config.sh`
  (must be executable; the official nginx image runs these at start).
- **entrypoint.sh:** writes `config.js` from `SEED_DEMO`, `UMAMI_URL`,
  `UMAMI_WEBSITE_ID`, `SENTRY_DSN` (empty defaults). This keeps env at
  deploy time and out of the build.
- **nginx.conf:** SPA fallback `try_files $uri /index.html;`, gzip on,
  sensible cache headers for hashed assets, `config.js` served
  `no-cache`.
- **docker-compose.staging.yml:** one `web` service, `build.target:
  serve`, `ports: ["8080:80"]`, `environment: { SEED_DEMO: "1" }`
  (Umami/Sentry left unset so the hooks stay inert unless the deploy sets
  them), a healthcheck hitting `/`.

---

## Ordered task list (each item is independently checkable)

1. **Scaffold.** Vite + React + TS project at repo root; scripts `dev`,
   `build`, `preview`, `test`, `lint`. `tsconfig` strict. App boots to a
   placeholder. *AC:* `npm run build` succeeds; `npm run dev` serves.

2. **Tokens + app shell + first render.** `index.html` with inline dark
   background, inline app-shell wordmark and world-list skeleton;
   `tokens.css`; React mounts into `#root`. *AC:* first paint shows the
   shell (no white flash); after mount, real content shows within ~1s.

3. **Data model + factories.** `atlas.ts` types; `factory.ts`
   constructors using `crypto.randomUUID()` and ISO timestamps. *AC:*
   `createAtlas()` and `createWorld(name)` produce well-formed objects.

4. **Serialize + schema + migrate + round-trip.** `serialize.ts`,
   `schema.ts` (zod), `migrate.ts` (v1 identity). *AC:*
   `parseAtlas(serialize(atlas)).atlas` deep-equals `atlas`; malformed
   input returns `{ ok: false, reason }`; a `version` newer than
   `CURRENT_VERSION` is rejected cleanly.

5. **IndexedDB persistence + store.** `idb.ts` load/save; `atlasStore.ts`
   in-memory source of truth with subscribe and debounced autosave. *AC:*
   saving then reloading the store restores the atlas exactly (tested with
   `fake-indexeddb`).

6. **Export/import (FSA + fallback).** `file.ts` with runtime detection.
   *AC:* with FSA mocked present, save writes serialized atlas and retains
   the handle; with FSA absent, export produces a Blob download and import
   reads a File; both round-trip losslessly; a bad import surfaces the
   friendly reason, never a raw throw.

7. **Ledger + elapsed util.** `ledger.ts` derives per-place count and last
   visit; `elapsed.ts` formats human elapsed time. *AC:* ledger matches
   entries; `elapsedLabel` returns correct boundaries ("today",
   "yesterday", "3 months ago", "2 years ago").

8. **World list UI.** Create/name/open worlds; designed empty state;
   export/import/save controls; mobile-first at 390px. *AC:* create adds a
   world; open sets `activeWorldId`; empty state renders the pre-swept
   copy; no horizontal scroll at 390px; controls are keyboard-reachable
   and labeled.

9. **Opened world UI (read-only recall readout).** Places list; per place,
   entries newest-first with dates and one elapsed line; designed
   no-entries line. *AC:* a place with history shows its entries and a
   correct elapsed line; a place with none shows the invite line, not a
   dead end. No map, no panel.

10. **Runtime config + analytics/error hooks.** `config.ts`,
    `public/config.js`, Umami injector, Sentry init + `reportError` +
    `ErrorBoundary`. *AC:* with empty config, no Umami script is injected
    and `Sentry.init` is never called; with config present, the script is
    injected and init runs with `sendDefaultPii:false`; `beforeSend`
    strips request/breadcrumb data; `reportError` accepts only an `Error`.

11. **Seed demo + seeding logic.** `demoAtlas.ts`; startup seeding rules.
    *AC:* empty IndexedDB + `SEED_DEMO` truthy loads the demo and
    auto-opens it, and its recall readout is non-empty with a correct
    elapsed line; a non-empty IndexedDB is never overwritten; `SEED_DEMO`
    falsy shows the designed empty state.

12. **Docker + staging deploy.** `Dockerfile`, `nginx.conf`,
    `docker/entrypoint.sh`, `docker-compose.staging.yml`. *AC:* `docker
    compose -f docker-compose.staging.yml up --build` builds and serves;
    the served page shows the app shell and a `config.js` with
    `SEED_DEMO:"1"`; a fresh browser session lands on the demo world's
    readout. Capture a log/screenshot artifact of the running container.

13. **README + ATLAS_FORMAT + copy sweep.** Rewrite `README.md`
    (understand / run / contribute, verified against the compose file, no
    factory internals); write `ATLAS_FORMAT.md`; run the mechanical copy
    sweep across `src/copy.ts`, `demoAtlas.ts`, and `README.md`. *AC:*
    README commands match the actual files; the sweep test passes; no
    "—"/"–", no banned vocabulary, no negative empty-state phrasing in any
    user-visible string.

---

## Test plan (which automated test proves each criterion)

Use `vitest` + `@testing-library/react` + `jsdom` + `fake-indexeddb`.
Every planner acceptance criterion maps to at least one test below.

- **Staging builds and serves** (planner AC 1): a docker verification step
  in task 12 (run `docker compose ... up --build`, `curl
  http://localhost:8080/` and `http://localhost:8080/config.js`, assert
  200 + expected content, then bring it down). This is a run-and-observe
  step, not a unit test; record the result as an artifact. A CI-friendly
  unit test additionally asserts `nginx.conf` contains the SPA fallback
  and the compose file targets `serve` and maps the port.
- **SEED_DEMO lands on content + recall reachable** (planner AC 2):
  `seed.test`: with empty `fake-indexeddb` and `SEED_DEMO="1"`, App
  renders the demo world with a non-empty readout and a computed elapsed
  line; with `SEED_DEMO=""`, App renders the designed empty state, never a
  blank region.
- **Lossless round-trip + documented, human-readable JSON** (planner AC 3):
  `roundtrip.test`: `parseAtlas(serialize(atlas))` deep-equals `atlas` for
  a fixture with places, strata, shapes (SVG path strings), and entries;
  assert serialized output is indented JSON with `format` and `version`. A
  presence test asserts `ATLAS_FORMAT.md` exists and documents the top-level
  keys.
- **IndexedDB persistence + FSA fallback parity** (planner AC 4):
  `persistence.test`: save then reload restores the atlas; `file.test`:
  with FSA mocked absent, export yields a Blob whose text re-imports
  equal, and import reads a File equal; with FSA mocked present, save
  calls the picker and writes serialized content.
- **First render within ~1s, no white flash** (planner AC 5):
  `shell.test`: `index.html` contains the app-shell markup and a
  non-white body background; a render test asserts real content
  (world list or seeded world) is present after mount without a blank
  intermediate. (The ~1s wall-clock is confirmed in the task-12 run.)
- **Hooks inert without env; send no atlas content; no PII** (planner AC
  6): `hooks.test`: empty config injects no Umami script and never calls
  `Sentry.init`; populated config injects the script and calls init with
  `sendDefaultPii:false`; a `beforeSend` unit test drops `request` and
  data breadcrumbs; a structural test confirms `reportError` takes only an
  `Error`.
- **Copy sweep** (QUALITY BAR §8): `copy.test`: scan every exported string
  in `src/copy.ts` and the demo bodies for "—", "–", the banned
  vocabulary list, and negative empty-state phrasing ("You don't have",
  "No … yet", "Nothing … here", "Unable to", "Something went wrong");
  assert zero hits.
- **World list + model** (scope): `worldlist.test` (create/open, empty
  state copy), `ledger.test`, `elapsed.test`, `migrate.test` (identity for
  v1, clean rejection of a newer version).

**Definition of done:** `npm run build`, `npm run lint`, and `npm test`
all pass; `docker compose -f docker-compose.staging.yml up --build` serves
the app and a fresh session lands on the demo world's readout; the copy
sweep is clean; `README.md` and `ATLAS_FORMAT.md` are accurate.

---

## Risks and guardrails
- **Drift into EPIC 4.** The read-only readout is the single tempting
  place to over-build. Keep it a plain list. No map, no panel, no
  animation, no ledger screen, no performance budget here.
- **Env baked into the build.** Do not read Umami/Sentry/SEED_DEMO from
  `import.meta.env` at build time. They must come from `config.js` at
  container start, so one image serves any deploy.
- **Overwriting a real atlas with the demo.** Seed only when IndexedDB is
  empty. A returning user's file is sacred.
- **Place identity.** Entries reference `placeId`, and places outlive map
  revisions. Getting this wrong quietly breaks recall two EPICs later.
