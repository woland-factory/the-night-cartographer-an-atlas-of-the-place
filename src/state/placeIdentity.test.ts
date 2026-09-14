import { describe, expect, it } from "vitest";
import type { Shape } from "../model/atlas";
import { createEntry } from "../model/factory";
import { placeLedger } from "../model/ledger";
import { currentShapes } from "../model/strata";
import {
  addWorld,
  commitDistrict,
  commitShape,
  getState,
  init,
  nameDistrict,
  openWorld,
  subscribe,
  undoLastEdit,
} from "./atlasStore";

function onlyWorld() {
  const atlas = getState();
  if (!atlas) throw new Error("no atlas");
  return atlas.worlds[0];
}

function district(id: string, geometry: string): Shape {
  return { id, type: "district", geometry, styleToken: "ink" };
}

async function freshWorld() {
  await init();
  addWorld("Harbor City");
  openWorld(onlyWorld().id);
  return onlyWorld().id;
}

describe("store map mutations", () => {
  it("produces a new atlas object and notifies subscribers on commit", async () => {
    const worldId = await freshWorld();
    const before = getState();

    let notified = 0;
    const unsubscribe = subscribe(() => {
      notified += 1;
    });
    commitShape(worldId, district("sh1", "10,10 90,10 90,90 10,90"));
    unsubscribe();

    expect(notified).toBe(1);
    expect(getState()).not.toBe(before);
    expect(currentShapes(onlyWorld())).toHaveLength(1);
  });

  it("naming a fresh district appends exactly one stratum and mints a place", async () => {
    const worldId = await freshWorld();
    commitDistrict(worldId, district("sh1", "20,20 80,20 80,80 20,80"), "The Harbor");

    const world = onlyWorld();
    expect(world.strata).toHaveLength(1);
    expect(world.places).toHaveLength(1);
    const place = world.places[0];
    expect(place.name).toBe("The Harbor");
    expect(place.anchor).toEqual({ x: 50, y: 50 });
    expect(currentShapes(world)[0].placeId).toBe(place.id);
  });

  it("skipping the name commits an unnamed district with no place", async () => {
    const worldId = await freshWorld();
    commitDistrict(worldId, district("sh1", "20,20 80,20 80,80 20,80"), "  ");

    const world = onlyWorld();
    expect(world.places).toHaveLength(0);
    expect(currentShapes(world)[0].placeId).toBeUndefined();
  });
});

describe("place identity survives redrawing (recall foundation)", () => {
  it("keeps the same id and anchor across new strata and an undo", async () => {
    const worldId = await freshWorld();
    commitDistrict(worldId, district("sh1", "20,20 80,20 80,80 20,80"), "The Harbor");

    const place = onlyWorld().places[0];
    const placeId = place.id;
    const anchor = place.anchor;

    // An entry pinned to this place, as EPIC 3 will write.
    const entry = createEntry(placeId, "2024-01-09", "The tide was out.");

    // Redraw: append more strata, then undo one.
    commitShape(worldId, district("sh2", "300,300 400,300 400,400 300,400"));
    commitShape(worldId, {
      id: "road1",
      type: "road",
      geometry: "0,0 500,500",
      styleToken: "rust",
    });
    undoLastEdit(worldId);

    const world = onlyWorld();
    const stillThere = world.places.find((p) => p.id === placeId);
    expect(stillThere).toBeTruthy();
    expect(stillThere?.anchor).toEqual(anchor);
    // The entry still resolves to the place after all that redrawing.
    expect(placeLedger([entry], placeId).count).toBe(1);
  });

  it("naming a previously committed district appends a placeId copy, prior strata untouched", async () => {
    const worldId = await freshWorld();
    commitShape(worldId, district("sh1", "20,20 80,20 80,80 20,80"));

    const firstStratum = onlyWorld().strata[0];
    expect(firstStratum.shapes[0].placeId).toBeUndefined();

    nameDistrict(worldId, "sh1", "The Clockmarket");

    const world = onlyWorld();
    expect(world.places).toHaveLength(1);
    expect(currentShapes(world)[0].placeId).toBe(world.places[0].id);
    // The prior stratum still carries the unnamed copy.
    expect(world.strata[0].shapes[0].placeId).toBeUndefined();
    expect(world.strata).toHaveLength(2);
  });
});
