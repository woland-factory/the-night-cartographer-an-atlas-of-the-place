# The Night Cartographer

An atlas of the places you only visit in dreams.

Some people return to the same dream city for years, with a stable geography
and a private history that resumes between visits. This is a local-first web
tool for that: draw the map of a recurring world, pin each morning's entry to
a place on it, and touch any place to get back everything you wrote there
before, with the time since your last visit. Your atlas is one file you own.
There is no account and no cloud.

You draw the map yourself with a small kit: districts, roads, a coastline,
labels, stamps, and fog edges for the parts you half-remember. Crooked lines are
welcome. The shared hand-drawn styling makes them read as one atlas. The
signature recall panel and the guided first run arrive in later releases.

## What you can do today

- Keep your atlas on your device. It saves as you go, and you can save it to a
  file you keep and open it again later.
- Create and name a world.
- Draw its map with the tool kit, and name a district to mint a place you can
  pin dreams to later.
- Open a bundled sample world and see a place answer back with its dated
  entries and the time since the last visit.

Every edit appends a new revision and keeps the old ones. Your atlas grows into
a years-long record you own. The app always draws the current revision, so
drawing stays fast however long that history gets.

## Run it

You need Node 20 or newer.

```bash
git clone <this-repo-url>
cd the-night-cartographer-an-atlas-of-the-place
npm install
npm run dev
```

Open the printed URL (Vite serves on http://localhost:5173 by default).

### Production bundle

```bash
npm run build     # type-check, then build the static site into dist/
npm run preview   # serve the built site locally
```

### With Docker

The app builds to static files served by nginx. Runtime settings are read
from the environment at container start.

```bash
docker build -t night-cartographer .
docker run --rm -p 8080:80 -e SEED_DEMO=1 night-cartographer
```

Open http://localhost:8080. With `SEED_DEMO=1` a first visit lands on the
sample world.

`docker-compose.staging.yml` is the file the hosted deploy uses. It serves on
the internal network behind a shared proxy and does not publish a host port,
so it is meant for that environment rather than a local one-liner.

## Configuration

All settings are optional and read at container start (see `.env.example`):

- `SEED_DEMO`: set to `1` to seed and auto-open the sample world on a fresh
  visit.
- `UMAMI_URL` and `UMAMI_WEBSITE_ID`: optional privacy-friendly page-view
  analytics. Both must be set to switch it on. No atlas content is ever sent.
- `SENTRY_DSN`: optional error tracking. Off unless set. Atlas content and
  request data are stripped before anything is sent.

With none of these set, the app runs fully offline and sends nothing.

## The atlas file

Your atlas is one human-readable JSON document with the map geometry stored as
plain vertex lists, so the whole thing is a single file that outlives the tool.
The format is documented in [ATLAS_FORMAT.md](./ATLAS_FORMAT.md).

## Contribute

The code is a client-only React and TypeScript app built with Vite.

- `src/model/` the atlas data model, file format, schema, migrations, and the
  map kit, geometry, and append-only strata helpers.
- `src/persistence/` IndexedDB working state and the owned-file save and open.
- `src/state/` the in-memory store and seeding.
- `src/ui/` the world list, the opened-world view, and the map canvas and kit.
- `src/copy.ts` every user-visible string in one place.

Run the checks:

```bash
npm run lint      # ESLint
npm test          # unit and component tests (Vitest)
npm run test:e2e  # end-to-end smoke test (Playwright)
```

`scripts/e2e.sh` runs the same end-to-end test inside the pinned Playwright
container, which is how CI runs it on a shared host.

## License

MIT. See [LICENSE](./LICENSE).
