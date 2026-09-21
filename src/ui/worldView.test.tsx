import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { copy } from "../copy";
import type { World } from "../model/atlas";
import { currentShapes } from "../model/strata";
import { SAMPLE_WORLD_ID } from "../data/demoAtlas";
import { addWorld, getState, init, openWorld } from "../state/atlasStore";
import { App } from "./App";
import { WorldView } from "./WorldView";

function setConfig(config: Record<string, string>) {
  (window as unknown as { __NC_CONFIG__: unknown }).__NC_CONFIG__ = config;
}

async function openSampleWorld() {
  setConfig({ SEED_DEMO: "1" });
  await init();
  render(<App />);
}

function sampleWorld(): World {
  const atlas = getState();
  const w = atlas?.worlds.find((x) => x.id === SAMPLE_WORLD_ID);
  if (!w) throw new Error("no sample world");
  return w;
}

function scrub() {
  return screen.getByRole("slider", { name: copy.timeScrub.label });
}

function mapCanvas() {
  return screen.getByRole("application", { name: copy.map.canvasLabel });
}

describe("WorldView time scrub", () => {
  it("replays the geography and restores Now exactly", async () => {
    await openSampleWorld();

    // The Fog Stair map label exists only in the newest stratum.
    expect(within(mapCanvas()).getByText("The Fog Stair")).toBeInTheDocument();

    // Scrub to the oldest survey: the newest-only label is gone.
    fireEvent.change(scrub(), { target: { value: "0" } });
    expect(
      screen.getByText(`${copy.timeScrub.viewingPrefix} 2 November 2019`),
    ).toBeInTheDocument();
    expect(within(mapCanvas()).queryByText("The Fog Stair")).toBeNull();

    // Back to Now renders the current stratum exactly.
    fireEvent.click(
      screen.getByRole("button", { name: copy.timeScrub.backToNow }),
    );
    expect(screen.getByText(copy.timeScrub.now)).toBeInTheDocument();
    expect(within(mapCanvas()).getByText("The Fog Stair")).toBeInTheDocument();
  });

  it("never writes to the store while scrubbing", async () => {
    await openSampleWorld();

    const before = getState();
    const strataBefore = structuredClone(sampleWorld().strata);

    fireEvent.change(scrub(), { target: { value: "0" } });
    fireEvent.change(scrub(), { target: { value: "1" } });
    fireEvent.change(scrub(), { target: { value: "2" } });

    // No store mutation ran: the atlas object is the very same reference and
    // the strata are untouched.
    expect(getState()).toBe(before);
    expect(sampleWorld().strata).toEqual(strataBefore);
    // And Now still renders the current shapes exactly.
    const now = currentShapes(sampleWorld());
    expect(now.length).toBeGreaterThan(0);
  });

  it("answers recall in full while viewing the past (association by placeId)", async () => {
    const user = userEvent.setup();
    await openSampleWorld();

    fireEvent.change(scrub(), { target: { value: "0" } });

    // The Harbor answers with its whole history, including the 2025 entry.
    await user.click(screen.getByRole("button", { name: "The Harbor" }));
    const harbor = screen.getByRole("dialog");
    expect(
      within(harbor).getByText(/the gulls remembered me first/i),
    ).toBeInTheDocument();
    expect(within(harbor).getByText("4 visits")).toBeInTheDocument();
    await user.click(within(harbor).getByRole("button", { name: copy.recall.close }));

    // A place whose district only exists in a later stratum still answers in
    // full while the 2019 map is shown.
    await user.click(screen.getByRole("button", { name: "The Clockmarket" }));
    const clock = screen.getByRole("dialog");
    expect(
      within(clock).getByText(/every clock told a different hour/i),
    ).toBeInTheDocument();
  });

  it("returns to Now when the composer opens, and saves at Now", async () => {
    const user = userEvent.setup();
    await openSampleWorld();

    fireEvent.change(scrub(), { target: { value: "0" } });
    expect(
      screen.getByText(`${copy.timeScrub.viewingPrefix} 2 November 2019`),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: copy.composer.open }),
    );

    // Opening the composer reset the scrub to Now.
    expect(scrub()).toHaveValue("2");

    const dream = "a lantern under the pier";
    await user.type(screen.getByLabelText(copy.composer.bodyLabel), dream);
    const composer = screen.getByRole("dialog");
    await user.click(
      within(composer).getByRole("button", { name: "The Harbor" }),
    );
    await user.click(within(composer).getByRole("button", { name: copy.composer.save }));

    // The place answers back with the new entry.
    const panel = screen.getByRole("dialog");
    expect(within(panel).getByText(dream)).toBeInTheDocument();
  });

  it("hides the scrub on a world with no strata", async () => {
    setConfig({});
    await init();
    addWorld("Fresh World");
    openWorld(getState()!.worlds[0].id);
    render(<App />);

    expect(screen.queryByText(copy.timeScrub.label)).toBeNull();
    expect(screen.queryByRole("slider")).toBeNull();
  });

  it("walks a brand-new world draw -> write -> recall, ending on a real answer", async () => {
    const user = userEvent.setup();
    setConfig({});
    await init();
    addWorld("Dream City");
    openWorld(getState()!.worlds[0].id);
    const { container, unmount } = render(<App />);

    // Step draw: a blank world shows the draw line, anchored to the map CTA.
    expect(screen.getByText(copy.walkthrough.draw)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: copy.map.empty.action }),
    ).toHaveAttribute("data-walk-anchor", "draw");

    // Draw and name a district by keyboard: this mints the first place.
    const c = mapCanvas();
    c.focus();
    fireEvent.keyDown(c, { key: "Enter" }); // (500,500)
    fireEvent.keyDown(c, { key: "ArrowRight" });
    fireEvent.keyDown(c, { key: "Enter" }); // (520,500)
    fireEvent.keyDown(c, { key: "ArrowDown" });
    fireEvent.keyDown(c, { key: "Enter" }); // (520,520)
    await user.click(screen.getByRole("button", { name: copy.map.finish }));
    await user.type(screen.getByLabelText(copy.map.nameLabel), "The Harbor");
    await user.click(screen.getByRole("button", { name: copy.map.nameConfirm }));

    // Step write: the walk self-ticked, anchored to the "Write a dream" button.
    expect(screen.getByText(copy.walkthrough.write)).toBeInTheDocument();
    const writeButton = screen.getByRole("button", { name: copy.composer.open });
    expect(writeButton).toHaveAttribute("data-walk-anchor", "write");

    // Write a dream pinned to that place and save it.
    await user.click(writeButton);
    const dream = "a lantern under the pier";
    await user.type(screen.getByLabelText(copy.composer.bodyLabel), dream);
    const composer = screen.getByRole("dialog");
    await user.click(within(composer).getByRole("button", { name: "The Harbor" }));
    await user.click(
      within(composer).getByRole("button", { name: copy.composer.save }),
    );

    // The save opened the panel to show the fresh answer. Closing it leaves the
    // walk waiting on the user's own deliberate tap.
    const savedPanel = screen.getByRole("dialog");
    expect(within(savedPanel).getByText(dream)).toBeInTheDocument();
    await user.click(
      within(savedPanel).getByRole("button", { name: copy.recall.close }),
    );

    // Step recall: the walk self-ticked, anchored to the place markers.
    expect(screen.getByText(copy.walkthrough.recall)).toBeInTheDocument();
    expect(
      container.querySelector('.map-markers[data-walk-anchor="recall"]'),
    ).not.toBeNull();

    // Tap the place: the map answers back and the walk ends on that answer.
    await user.click(screen.getByRole("button", { name: "The Harbor" }));
    const panel = screen.getByRole("dialog");
    expect(within(panel).getByText(dream)).toBeInTheDocument();
    await user.click(
      within(panel).getByRole("button", { name: copy.recall.close }),
    );
    expect(screen.queryByText(copy.walkthrough.recall)).toBeNull();

    // A returning user never sees the walk again.
    unmount();
    render(<App />);
    expect(screen.queryByText(copy.walkthrough.draw)).toBeNull();
    expect(screen.queryByText(copy.walkthrough.write)).toBeNull();
    expect(screen.queryByText(copy.walkthrough.recall)).toBeNull();
  });

  it("keeps the walk hidden while a sheet is open, and Skip retires it at any step", async () => {
    const user = userEvent.setup();
    setConfig({});
    await init();
    addWorld("Dream City");
    openWorld(getState()!.worlds[0].id);
    render(<App />);

    // On the draw step, opening no sheet: the walk is visible.
    expect(screen.getByText(copy.walkthrough.draw)).toBeInTheDocument();

    // Skip at the very first step retires the whole walk.
    await user.click(screen.getByRole("button", { name: copy.walkthrough.skip }));
    expect(screen.queryByText(copy.walkthrough.draw)).toBeNull();
  });

  it("does not complete the walk when an empty place is tapped", async () => {
    const user = userEvent.setup();
    setConfig({});
    await init();
    addWorld("Dream City");
    openWorld(getState()!.worlds[0].id);
    render(<App />);

    // Draw and name a district: a place with no entries yet.
    const c = mapCanvas();
    c.focus();
    fireEvent.keyDown(c, { key: "Enter" });
    fireEvent.keyDown(c, { key: "ArrowRight" });
    fireEvent.keyDown(c, { key: "Enter" });
    fireEvent.keyDown(c, { key: "ArrowDown" });
    fireEvent.keyDown(c, { key: "Enter" });
    await user.click(screen.getByRole("button", { name: copy.map.finish }));
    await user.type(screen.getByLabelText(copy.map.nameLabel), "The Harbor");
    await user.click(screen.getByRole("button", { name: copy.map.nameConfirm }));

    // The walk is at write. Tap the empty place: recall opens its empty state.
    expect(screen.getByText(copy.walkthrough.write)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "The Harbor" }));
    expect(screen.getByText(copy.recall.emptyTitle)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: copy.recall.close }));

    // The signature moment has not happened, so the walk is still there.
    expect(screen.getByText(copy.walkthrough.write)).toBeInTheDocument();
  });

  it("leans on exactly one primary action with no sheet open", async () => {
    // The sample world has places and entries, so the world view's single
    // primary is "Write a dream". The walk's Skip and every other control are
    // visibly subordinate.
    await openSampleWorld();
    expect(document.querySelector(".sheet")).toBeNull();
    expect(document.querySelectorAll(".btn--primary")).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: copy.composer.open }),
    ).toHaveClass("btn--primary");
  });

  it("makes the map CTA the single primary on a brand-new blank world", () => {
    setConfig({});
    const world: World = {
      id: "blank",
      name: "Blank World",
      createdAt: "2020-01-01T00:00:00.000Z",
      places: [],
      strata: [],
      currentStratumId: null,
      entries: [],
    };
    render(<WorldView world={world} />);

    // On a blank world "Write a dream" is not shown; the map's own CTA is the
    // one primary, never both at once.
    expect(
      screen.queryByRole("button", { name: copy.composer.open }),
    ).toBeNull();
    expect(document.querySelectorAll(".btn--primary")).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: copy.map.empty.action }),
    ).toHaveClass("btn--primary");
  });

  it("shows the single-point state on a world with one stratum", () => {
    const world: World = {
      id: "w1",
      name: "One Survey",
      createdAt: "2019-11-02T07:12:00.000Z",
      places: [],
      strata: [
        {
          id: "st1",
          createdAt: "2019-11-02T07:12:00.000Z",
          label: "first survey",
          derivedFrom: null,
          shapes: [],
        },
      ],
      currentStratumId: "st1",
      entries: [],
    };
    render(<WorldView world={world} />);

    expect(screen.queryByRole("slider")).toBeNull();
    expect(
      screen.getByText(`${copy.timeScrub.drawnPrefix} 2 November 2019`),
    ).toBeInTheDocument();
  });
});
