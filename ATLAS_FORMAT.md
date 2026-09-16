# The atlas file format

An atlas is one JSON document. It is human-readable and diff-friendly
(2-space indentation), and the map geometry is stored as plain vertex lists,
so the whole atlas is a single file you own that outlives this tool.

The current schema is version `1`.

## Top level

```json
{
  "format": "night-cartographer-atlas",
  "version": 1,
  "meta": { "createdAt": "2020-01-01T00:00:00.000Z", "appVersion": "0.1.0" },
  "settings": { "activeWorldId": "world-id-or-null" },
  "worlds": []
}
```

- `format`: a fixed discriminator. A file without it is not read.
- `version`: the schema version. Migrations bump this. A file from a newer
  version than the app understands is reported clearly rather than corrupted.
- `meta.createdAt`: ISO 8601 timestamp.
- `meta.appVersion`: the app version that created the file.
- `settings.activeWorldId`: the world last opened, or `null`.
- `worlds`: the list of dream worlds.

## World

```json
{
  "id": "uuid",
  "name": "Harbor City",
  "createdAt": "2020-01-01T00:00:00.000Z",
  "isSample": false,
  "places": [],
  "strata": [],
  "currentStratumId": null,
  "entries": []
}
```

- `isSample`: present and `true` only for the bundled sample world.
- `places`: the named places in this world (see below).
- `strata`: dated map revisions, append-only. No revision is ever destroyed.
- `currentStratumId`: the revision currently shown, or `null`.
- `entries`: the dated dream entries in this world.

## Place

A place is the stable identity that recall indexes against. Its `id` is kept
across every future map revision, so redrawing the geography never breaks the
link between a place and what you wrote there.

```json
{
  "id": "uuid",
  "name": "The Harbor",
  "anchor": { "x": 220, "y": 340 },
  "createdAt": "2019-11-02T07:12:00.000Z"
}
```

- `anchor`: a point `{ x, y }`, a reference `{ "shapeRef": "shape-id" }`, or
  `null`.

A place is minted two ways. Naming a district mints a place anchored at that
district's centroid. Dropping a point on the map mints a place anchored at that
point, with no district shape. Both live in `places` and both keep their `id`
forever, so recall answers the same way for either kind after the map is
redrawn.

## Stratum

One dated map revision. Editing the map appends a new stratum instead of
changing an old one (the palimpsest): every committed edit writes a full
snapshot of the map at that revision, and prior strata are never changed or
removed. `currentStratumId` on the world points at the newest, and `derivedFrom`
links each stratum to the one it grew from. Array order is commit order, which
is the order the map history replays in. The revision history grows the file
over time. That accumulation is the point of the tool, not a leak: the reader
only ever draws the current stratum, so drawing stays fast no matter how long
the history gets.

```json
{
  "id": "uuid",
  "createdAt": "2020-01-02T00:00:00.000Z",
  "label": "first survey",
  "derivedFrom": null,
  "shapes": []
}
```

## Shape

```json
{
  "id": "uuid",
  "type": "district",
  "geometry": "120,140 360,120 400,360 160,380",
  "styleToken": "ink",
  "text": "The Harbor",
  "placeId": "place-id"
}
```

- `type`: one of `district`, `road`, `coastline`, `label`, `stamp`, `fog`.
- `geometry`: honest vertices, stylized only at read time. Line and area shapes
  (`district`, `road`, `coastline`, `fog`) store a space-separated list of
  `"x,y"` points in the canvas 0..1000 space. Point shapes (`stamp`, `label`)
  store one `"x,y"`. The smoothed drawing path is computed by the app, never
  stored, so the same vertices can be restyled or replayed later.
- `styleToken`: one of the fixed palette keys `ink`, `sea`, `moss`, `rust`,
  `plum`, `fog`.
- `text`: the label string for a `label` shape, or the glyph id for a `stamp`
  (one of `tower`, `tree`, `bridge`, `mountain`, `well`, `compass`).
- `placeId`: set on a district that has been named, linking it to the place that
  naming minted.

## Entry

```json
{
  "id": "uuid",
  "placeId": "place-id",
  "date": "2025-07-05",
  "body": "Same bench at the end of the pier.",
  "createdAt": "2025-07-05T06:20:00.000Z"
}
```

An entry references a place by `placeId`, never by a shape or a coordinate.
This is what lets recall keep answering after the map has been redrawn.

## The ledger is derived

Per-place visit count and last-visit date are computed from `entries` at read
time. They are never stored in the file.
