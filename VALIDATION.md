# VALIDATION — The Night Cartographer

**Verdict: VIABLE** — with binding scope conditions. The idea clears the
factory's value bar (durable artifact, survives the chatbot test,
survives free tools, agent-buildable) but only under a specific scope
discipline: a constrained stylized map kit, never a general drawing app,
and the resurfacing mechanic treated as the product, not a feature.

## Core value proposition

A dreamer who returns to the same imaginary place for years can, for the
first time, hold that place outside their own head: draw its geography
with a constrained map kit, pin each morning's journal entry to a spot
on it, and get back what they wrote at that same spot on earlier visits.
The output is one private local file the user owns. No account, no
cloud, no AI.

The signature moment is place-indexed memory: drop a pin on the harbor
district and the atlas answers with the three entries written there
across two years, with the elapsed time shown. Example surface copy:
"Last visit here: 14 months ago." This re-enacts the eeriest part of the
lived experience (suddenly remembering previous visits once inside the
dream) as a real, recorded mechanic. It passes the signature-moment
test: it is a thing the product does, not an adjective.

## Why it passes the four value tests

1. **Genuinely better off?** Yes, for a real (if small) population with
   direct evidence: two independent HN accounts of stable recurring
   dream worlds, a named community practice ("dream mapping" on
   DreamViews and oneironauts.io, done today on hex paper), and a fresh
   Substack account of someone literally photographing her paper dream
   map to share it. These people have material and no instrument.
2. **Survives the chatbot?** Structurally. The core state is a growing
   vector drawing with dated entries bound to coordinates and an
   append-only revision history. A chat window cannot hold a canvas, a
   stratum stack, or "what did I write at this spot in 2027." No LLM
   is involved anywhere; there is no prompt to wrap.
3. **Survives free tools?** This is the closest call and the verdict
   hinges on the loop, not any single feature. Obsidian+Leaflet needs
   the map drawn elsewhere and re-imported; Azgaar draws procedural
   continents with no journal; paper (the strongest substitute, per the
   premortem) cannot resurface entries by place, cannot search, and
   cannot keep contradictory strata coexisting. The one primitive no
   substitute has is the place-indexed ledger that answers back. If
   that mechanic ships excellent, the product wins; if it ships as a
   pin list, the product collapses into "more convenient than
   Obsidian" and loses.
4. **Durable artifact?** The strongest pass in the brief. A plain,
   documented JSON+SVG file that after years contains a documented
   place no one else has ever been. Export must be a launch feature.
5. **Agent-deliverable at the quality bar?** Yes, conditionally. The
   drawing surface is where autonomous agents ship jank, and a freehand
   paint tool would fail the bar. A constrained kit (labeled district
   polygons, path strokes, coastline brush, text labels, a small stamp
   set) is well within agent capability on SVG, keeps non-artists from
   blank-canvas paralysis, and makes the palimpsest cheap (strata are
   appended vector groups). The build must be held to this constraint.

## Minimal feature set (the smallest product that delivers the value)

1. **One dream world, drawable**: SVG canvas with the constrained kit
   above. No freehand pixel brush, no layers panel, no color picker
   beyond a fixed stylized palette. Data model supports multiple
   worlds; UI can ship world-list-plus-one.
2. **Pinned entries**: dated text entry, dropped on a point or district.
   Writing plus pinning must be a sub-minute gesture and fully usable
   on a phone (the five groggy minutes after waking are the use case).
3. **Resurfacing**: placing or tapping a pin surfaces prior entries at
   that place with elapsed time. This is the product; it gets the
   craft budget.
4. **Palimpsest strata**: map edits append as dated strata; a simple
   time slider replays the geography. Revisions never destroy old
   strata.
5. **Owned file**: everything lives client-side (File System Access API
   with IndexedDB fallback); one-click export/import of a documented
   JSON+SVG file. Zero network calls in the core loop.
6. **Seeded demo world** (SEED_DEMO): a sample atlas with a few years of
   backdated visits so a first-run visitor sees the resurfacing moment
   within a minute without writing anything.

Out of the minimal set: AI of any kind, accounts, sync, sharing,
procedural generation, expedition/lucid-dreaming mechanics (the bolder
sibling), image import as base maps.

## Main risks

1. **Drawing-surface jank (build risk, highest).** Canvas interaction
   code is the one place agents reliably underdeliver. Mitigation is
   scope, not effort: the constrained kit is binding, and crooked
   polygons must look intentional by design (stylized rendering does
   the aesthetic work, not user skill). If the plan drifts toward a
   general drawing app, the build fails the quality bar.
2. **False precision (product risk).** Dream geography is only mostly
   consistent. If the tool demands precision, pinning feels like lying
   and the honest majority of users churn. Uncertainty must be
   drawable: fog edges, vague-boundary districts, contradictory strata
   allowed to coexist. This belongs in the minimal kit, not a later
   polish pass.
3. **Sporadic engagement (accepted, not fixable).** Visits arrive
   months apart; the premortem is right that no habit loop exists. The
   factory's bar is durable value, not DAU, so this is a design
   constraint rather than a rejection reason: the product must be
   excellent at resuming after long gaps (instant re-entry, no streaks,
   no notifications) and must never guilt the user about absence.
4. **The Obsidian shadow (competitive risk).** A technical user can
   assemble roughly 70% of this today from free parts. The defense is
   exactly two things: the sub-minute morning gesture and the
   palimpsest with resurfacing. If either ships mediocre, the brief's
   own defense collapses. There is no third leg.
5. **Small audience (accepted).** Stable recurring dream worlds are a
   minority experience. Fine under the factory's purpose: this is an
   outlier-hunting portfolio, and a keepsake instrument for a quiet
   niche is the intended shape, not a defect.

On the premortem's 0.78 kill probability: it is a forecast of habit and
market success, which the factory explicitly does not optimize for. Its
strongest objection (paper already offered this loop and nobody
sustains one) is the one argument the product directly answers: paper
cannot answer back. The place-indexed resurfacing is the removed
bottleneck, and it is honest to say the whole bet rides on it. The dead
ETH Dream Cartography platform is weak evidence either way; it was a
cloud academic platform whose failure mode (funding, accounts) is
precisely what local-first removes.

## What would make me reject it (and should stop a later build)

- The plan or build drifts into a general freehand drawing tool, or the
  constrained kit proves too janky to make an amateur's map feel
  atlas-like. That is the failure the premortem's "wobbly scrawl" risk
  predicts, and it is fatal.
- The resurfacing moment cannot be demonstrated on first run within a
  minute from seeded data. A first-run that shows only an empty canvas
  demonstrates nothing and fails the first-run bar.
- The file format ends up opaque or export ships late. An intimate
  years-long artifact locked in IndexedDB is a betrayal of the core
  promise.
- Anyone adds accounts, cloud sync, or AI interpretation. Each one
  breaks the "too intimate for someone's cloud" positioning that
  justifies the product's existence against the app-store category.
- Mobile entry-plus-pinning proves unworkable at 390px. If the morning
  gesture needs a desktop, the loop dies at its most load-bearing
  moment.
