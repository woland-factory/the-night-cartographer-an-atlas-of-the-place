import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { copy } from "../copy";
import type { Shape, World } from "../model/atlas";
import { currentShapes } from "../model/strata";
import { addWorld, getState, init, openWorld } from "../state/atlasStore";
import { App } from "./App";
import { MapCanvas } from "./MapCanvas";

function activeWorld(): World {
  const atlas = getState();
  if (!atlas) throw new Error("no atlas");
  const w = atlas.worlds.find((x) => x.id === atlas.settings.activeWorldId);
  if (!w) throw new Error("no active world");
  return w;
}

async function openFreshWorld() {
  await init();
  addWorld("Test World");
  openWorld(getState()!.worlds[0].id);
  render(<App />);
}

// The canvas maps client coordinates through its bounding rect. jsdom has no
// layout, so tap-based tests pin the rect to the 0..1000 canvas space.
function mockCanvasRect() {
  vi.spyOn(SVGElement.prototype, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    right: 1000,
    bottom: 1000,
    width: 1000,
    height: 1000,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
}

function canvas() {
  return screen.getByRole("application", { name: copy.map.canvasLabel });
}

// Place three vertices with the keyboard reticle (no pointer needed).
function drawTriangleByKeyboard() {
  const c = canvas();
  c.focus();
  fireEvent.keyDown(c, { key: "Enter" }); // (500,500)
  fireEvent.keyDown(c, { key: "ArrowRight" });
  fireEvent.keyDown(c, { key: "Enter" }); // (520,500)
  fireEvent.keyDown(c, { key: "ArrowDown" });
  fireEvent.keyDown(c, { key: "Enter" }); // (520,520)
}

describe("MapCanvas", () => {
  it("shows the designed empty-canvas state on a fresh world", async () => {
    await openFreshWorld();
    expect(screen.getByText(copy.map.empty.title)).toBeInTheDocument();
    expect(screen.getByText(copy.map.empty.body)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: copy.map.empty.action }),
    ).toBeInTheDocument();
  });

  it("draws a district by keyboard and names it into a durable place", async () => {
    const user = userEvent.setup();
    await openFreshWorld();

    drawTriangleByKeyboard();
    await user.click(screen.getByRole("button", { name: copy.map.finish }));

    // The inline name field appears on finishing a district.
    const input = screen.getByLabelText(copy.map.nameLabel);
    await user.type(input, "The Harbor");
    await user.click(screen.getByRole("button", { name: copy.map.nameConfirm }));

    const world = activeWorld();
    expect(world.places).toHaveLength(1);
    expect(world.places[0].name).toBe("The Harbor");
    const shape = currentShapes(world)[0];
    expect(shape.type).toBe("district");
    expect(shape.placeId).toBe(world.places[0].id);
    // The place now appears in the visit ledger below the map, ready for its
    // first entry.
    expect(screen.getByText(copy.worldView.placeNoEntries)).toBeInTheDocument();
  });

  it("commits a road as an open polyline with no name prompt", async () => {
    const user = userEvent.setup();
    await openFreshWorld();

    await user.click(screen.getByRole("button", { name: copy.map.tools.road }));
    const c = canvas();
    c.focus();
    fireEvent.keyDown(c, { key: "Enter" });
    fireEvent.keyDown(c, { key: "ArrowRight" });
    fireEvent.keyDown(c, { key: "Enter" });
    await user.click(screen.getByRole("button", { name: copy.map.finish }));

    expect(screen.queryByLabelText(copy.map.nameLabel)).toBeNull();
    const shape = currentShapes(activeWorld())[0];
    expect(shape.type).toBe("road");
  });

  it("drops the chosen stamp glyph on a tap", async () => {
    const user = userEvent.setup();
    await openFreshWorld();
    mockCanvasRect();

    await user.click(screen.getByRole("button", { name: copy.map.tools.stamp }));
    await user.click(
      screen.getByRole("button", { name: copy.map.stampNames.bridge }),
    );
    fireEvent.click(canvas(), { clientX: 300, clientY: 400 });

    const shape = currentShapes(activeWorld())[0];
    expect(shape.type).toBe("stamp");
    expect(shape.text).toBe("bridge");
    expect(shape.geometry).toBe("300,400");
  });

  it("opens a text field on a label tap and commits the label", async () => {
    const user = userEvent.setup();
    await openFreshWorld();
    mockCanvasRect();

    await user.click(screen.getByRole("button", { name: copy.map.tools.label }));
    fireEvent.click(canvas(), { clientX: 200, clientY: 200 });

    const input = screen.getByLabelText(copy.map.labelFieldLabel);
    await user.type(input, "Old Town");
    await user.click(screen.getByRole("button", { name: copy.map.labelConfirm }));

    const shape = currentShapes(activeWorld())[0];
    expect(shape.type).toBe("label");
    expect(shape.text).toBe("Old Town");
  });

  it("places a vertex with arrow keys then Enter (keyboard parity)", async () => {
    await openFreshWorld();
    const c = canvas();
    c.focus();
    fireEvent.keyDown(c, { key: "ArrowRight" });
    fireEvent.keyDown(c, { key: "Enter" });

    // A shape is now in progress: the contextual controls appear.
    expect(
      screen.getByRole("button", { name: copy.map.undoPoint }),
    ).toBeInTheDocument();
  });
});

function worldWithPlace(): World {
  return {
    id: "w1",
    name: "Harbor City",
    createdAt: "2020-01-01T00:00:00.000Z",
    places: [
      {
        id: "p1",
        name: "The Harbor",
        anchor: { x: 500, y: 500 },
        createdAt: "2020-01-01T00:00:00.000Z",
      },
    ],
    strata: [],
    currentStratumId: null,
    entries: [],
  };
}

describe("MapCanvas place markers and drop mode", () => {
  it("renders a keyboard-focusable marker and picks its place on tap", async () => {
    const user = userEvent.setup();
    const onPickPlace = vi.fn();
    render(<MapCanvas world={worldWithPlace()} onPickPlace={onPickPlace} />);

    const marker = screen.getByRole("button", { name: "The Harbor" });
    expect(marker).toHaveAttribute("tabindex", "0");

    await user.click(marker);
    expect(onPickPlace).toHaveBeenCalledWith("p1");
    // The tap picks the place; it never starts a drawing.
    expect(screen.queryByRole("button", { name: copy.map.undoPoint })).toBeNull();
  });

  it("picks a place from the marker via keyboard Enter", () => {
    const onPickPlace = vi.fn();
    render(<MapCanvas world={worldWithPlace()} onPickPlace={onPickPlace} />);
    const marker = screen.getByRole("button", { name: "The Harbor" });
    marker.focus();
    fireEvent.keyDown(marker, { key: "Enter" });
    expect(onPickPlace).toHaveBeenCalledWith("p1");
  });

  it("makes markers inert while a shape is in progress", () => {
    const onPickPlace = vi.fn();
    render(<MapCanvas world={worldWithPlace()} onPickPlace={onPickPlace} />);
    const c = screen.getByRole("application", { name: copy.map.canvasLabel });
    c.focus();
    fireEvent.keyDown(c, { key: "ArrowRight" });
    fireEvent.keyDown(c, { key: "Enter" }); // one vertex: drawing in progress

    expect(screen.queryByRole("button", { name: "The Harbor" })).toBeNull();
    expect(onPickPlace).not.toHaveBeenCalled();
  });

  it("captures a single point on tap in dropping mode, committing no shape", () => {
    const onDropPoint = vi.fn();
    render(
      <MapCanvas world={worldWithPlace()} dropping onDropPoint={onDropPoint} />,
    );
    mockCanvasRect();
    const c = screen.getByRole("application", { name: copy.map.canvasLabel });
    fireEvent.click(c, { clientX: 300, clientY: 400 });

    expect(onDropPoint).toHaveBeenCalledWith({ x: 300, y: 400 });
    expect(screen.queryByRole("button", { name: copy.map.finish })).toBeNull();
  });

  it("captures a point via reticle + Enter in dropping mode", () => {
    const onDropPoint = vi.fn();
    render(
      <MapCanvas world={worldWithPlace()} dropping onDropPoint={onDropPoint} />,
    );
    const c = screen.getByRole("application", { name: copy.map.canvasLabel });
    c.focus();
    fireEvent.keyDown(c, { key: "Enter" }); // reticle at center

    expect(onDropPoint).toHaveBeenCalledWith({ x: 500, y: 500 });
  });
});

// A world whose current stratum carries a distinct label, so a viewed-mode
// render can be told apart from the live one.
function worldWithCurrentLabel(): World {
  return {
    id: "w1",
    name: "Harbor City",
    createdAt: "2020-01-01T00:00:00.000Z",
    places: [
      {
        id: "p1",
        name: "The Harbor",
        anchor: { x: 500, y: 500 },
        createdAt: "2020-01-01T00:00:00.000Z",
      },
    ],
    strata: [
      {
        id: "st1",
        createdAt: "2020-01-01T00:00:00.000Z",
        derivedFrom: null,
        shapes: [
          {
            id: "cur",
            type: "label",
            geometry: "100,100",
            styleToken: "ink",
            text: "CURRENT",
          },
        ],
      },
    ],
    currentStratumId: "st1",
    entries: [],
  };
}

const pastLabel: Shape = {
  id: "past",
  type: "label",
  geometry: "200,200",
  styleToken: "ink",
  text: "PAST",
};

describe("MapCanvas viewed-shapes (read-only past)", () => {
  it("renders the viewed snapshot, not the current stratum's shapes", () => {
    render(
      <MapCanvas world={worldWithCurrentLabel()} viewedShapes={[pastLabel]} />,
    );
    expect(screen.getByText("PAST")).toBeInTheDocument();
    expect(screen.queryByText("CURRENT")).toBeNull();
  });

  it("hides the map kit while viewing the past", () => {
    render(
      <MapCanvas world={worldWithCurrentLabel()} viewedShapes={[pastLabel]} />,
    );
    expect(screen.queryByRole("button", { name: copy.map.tools.road })).toBeNull();
    expect(screen.queryByRole("button", { name: copy.map.undo })).toBeNull();
  });

  it("commits nothing on a canvas tap and starts no drawing", () => {
    const { container } = render(
      <MapCanvas world={worldWithCurrentLabel()} viewedShapes={[pastLabel]} />,
    );
    mockCanvasRect();
    fireEvent.click(canvas(), { clientX: 300, clientY: 400 });
    // No in-progress vertex preview appeared: the tap placed nothing.
    expect(container.querySelector(".preview")).toBeNull();
  });

  it("shows no empty CTA for an empty viewed snapshot", () => {
    render(<MapCanvas world={worldWithCurrentLabel()} viewedShapes={[]} />);
    expect(screen.queryByText(copy.map.empty.title)).toBeNull();
  });

  it("keeps place markers live and picks a place on tap", async () => {
    const user = userEvent.setup();
    const onPickPlace = vi.fn();
    render(
      <MapCanvas
        world={worldWithCurrentLabel()}
        viewedShapes={[pastLabel]}
        onPickPlace={onPickPlace}
      />,
    );
    await user.click(screen.getByRole("button", { name: "The Harbor" }));
    expect(onPickPlace).toHaveBeenCalledWith("p1");
  });
});
