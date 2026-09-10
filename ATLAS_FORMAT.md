# The atlas file format

An atlas is one JSON document. It is human-readable and diff-friendly
(2-space indentation), and the map geometry is embedded as SVG path strings,
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

## Stratum

One dated map revision. Editing the map appends a new stratum instead of
changing an old one (the palimpsest). Drawing tools arrive in a later release;
the shape below is defined now so old files keep working.

```json
{
  "id": "uuid",
  "createdAt": "2020-01-02T00:00:00.000Z",
  "label": "first draft",
  "derivedFrom": null,
  "shapes": []
}
```

## Shape

```json
{
  "id": "uuid",
  "type": "district",
  "geometry": "M10 10 L90 10 L90 90 L10 90 Z",
  "styleToken": "ink",
  "text": "The Harbor",
  "placeId": "place-id"
}
```

- `type`: one of `district`, `road`, `coastline`, `label`, `stamp`, `fog`.
- `geometry`: an SVG path `d` string, or serialized points.
- `styleToken`: a key into a fixed palette.
- `text`: label text, when the shape carries a label.
- `placeId`: links a district shape to a place.

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
