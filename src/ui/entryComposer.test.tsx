import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { copy } from "../copy";
import { todayLocalISO } from "../lib/date";
import * as idb from "../persistence/idb";
import {
  addWorld,
  commitShape,
  getState,
  importAtlas,
  init,
  openWorld,
} from "../state/atlasStore";
import { fullAtlasFixture } from "../test/fixtures";
import { App } from "./App";

function world() {
  return getState()!.worlds[0];
}

async function openComposerWithFixture() {
  const user = userEvent.setup();
  importAtlas(fullAtlasFixture());
  render(<App />);
  await user.click(screen.getByRole("button", { name: copy.composer.open }));
  return user;
}

describe("EntryComposer", () => {
  it("opens from the world view and autofocuses the dream text", async () => {
    await openComposerWithFixture();
    expect(
      screen.getByRole("heading", { name: copy.composer.title }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(copy.composer.bodyLabel)).toHaveFocus();
  });

  it("defaults the date to today and keeps it editable", async () => {
    await openComposerWithFixture();
    const dateInput = screen.getByLabelText(copy.composer.dateLabel) as HTMLInputElement;
    expect(dateInput.value).toBe(todayLocalISO(new Date()));
    expect(dateInput).toHaveAttribute("max", todayLocalISO(new Date()));
  });

  it("keeps Save disabled with a positive helper until body and place are set", async () => {
    const user = await openComposerWithFixture();
    const save = () => screen.getByRole("button", { name: copy.composer.save });

    expect(save()).toBeDisabled();
    expect(screen.getByText(copy.composer.needBody)).toBeInTheDocument();

    await user.type(screen.getByLabelText(copy.composer.bodyLabel), "a tide");
    expect(save()).toBeDisabled();
    expect(screen.getByText(copy.composer.needPlace)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "The Harbor" }));
    expect(save()).toBeEnabled();
  });

  it("marks the selected place chip pressed", async () => {
    const user = await openComposerWithFixture();
    const chip = screen.getByRole("button", { name: "The Harbor" });
    expect(chip).toHaveAttribute("aria-pressed", "false");
    await user.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
  });

  it("pins a typed dream to a picked place and appears immediately (optimistic)", async () => {
    const user = await openComposerWithFixture();
    await user.type(
      screen.getByLabelText(copy.composer.bodyLabel),
      "a lighthouse turning",
    );
    await user.click(screen.getByRole("button", { name: "The Harbor" }));
    await user.click(screen.getByRole("button", { name: copy.composer.save }));

    const entries = world().entries;
    const added = entries[entries.length - 1];
    expect(added.placeId).toBe("p1");
    expect(added.body).toBe("a lighthouse turning");
    // The composer closed and the entry shows in the place readout at once.
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("a lighthouse turning")).toBeInTheDocument();
  });

  it("stores an edited date on the entry", async () => {
    const user = await openComposerWithFixture();
    await user.type(screen.getByLabelText(copy.composer.bodyLabel), "older dream");
    fireEvent.change(screen.getByLabelText(copy.composer.dateLabel), {
      target: { value: "2020-05-01" },
    });
    await user.click(screen.getByRole("button", { name: "The Harbor" }));
    await user.click(screen.getByRole("button", { name: copy.composer.save }));

    const added = world().entries[world().entries.length - 1];
    expect(added.date).toBe("2020-05-01");
  });

  it("keeps the Save action in a sticky bar that follows the scrollable body", async () => {
    await openComposerWithFixture();
    const dialog = screen.getByRole("dialog");
    const body = dialog.querySelector(".sheet__body");
    const actions = dialog.querySelector(".sheet__actions");
    expect(body).not.toBeNull();
    expect(actions).not.toBeNull();
    // The action bar is a later sibling than the scroll region, so the on-screen
    // keyboard cannot cover it.
    expect(
      body!.compareDocumentPosition(actions!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      within(actions as HTMLElement).getByRole("button", {
        name: copy.composer.save,
      }),
    ).toBeInTheDocument();
  });

  it("drops a new place, preserves the typed body, and pins the dream to it", async () => {
    const user = await openComposerWithFixture();
    await user.type(
      screen.getByLabelText(copy.composer.bodyLabel),
      "a room I had not seen",
    );

    // Start the drop detour.
    await user.click(screen.getByRole("button", { name: copy.composer.newPlace }));
    expect(screen.getByText(copy.composer.dropHint)).toBeInTheDocument();

    // Place the point with the keyboard reticle (center of the canvas).
    const canvas = screen.getByRole("application", { name: copy.map.canvasLabel });
    fireEvent.keyDown(canvas, { key: "Enter" });

    // Name the dropped place and confirm.
    await user.type(
      screen.getByLabelText(copy.composer.newPlaceNameLabel),
      "The Well",
    );
    await user.click(
      screen.getByRole("button", { name: copy.composer.newPlaceConfirm }),
    );

    // Back in compose: the new place is a point anchor and the body survived.
    const dropped = world().places.find((p) => p.name === "The Well");
    expect(dropped?.anchor).toEqual({ x: 500, y: 500 });
    expect(
      (screen.getByLabelText(copy.composer.bodyLabel) as HTMLTextAreaElement)
        .value,
    ).toBe("a room I had not seen");

    await user.click(screen.getByRole("button", { name: copy.composer.save }));
    const added = world().entries[world().entries.length - 1];
    expect(added.placeId).toBe(dropped!.id);
    expect(added.body).toBe("a room I had not seen");
  });

  it("shows the designed empty place-picker state when the world has no places", async () => {
    const user = userEvent.setup();
    await init();
    addWorld("Fresh World");
    const id = getState()!.worlds[0].id;
    openWorld(id);
    // A drawn shape with no name means shapes exist but no place does.
    commitShape(id, {
      id: "sh-unnamed",
      type: "district",
      geometry: "20,20 80,20 80,80 20,80",
      styleToken: "ink",
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: copy.composer.open }));
    expect(
      screen.getByText(copy.composer.emptyPlacesTitle),
    ).toBeInTheDocument();
    expect(screen.getByText(copy.composer.emptyPlacesBody)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: copy.composer.newPlace }),
    ).toBeInTheDocument();
  });

  it("does not show Write a dream on a brand-new empty world", async () => {
    await init();
    addWorld("Empty World");
    const id = getState()!.worlds[0].id;
    openWorld(id);
    render(<App />);

    expect(
      screen.queryByRole("button", { name: copy.composer.open }),
    ).toBeNull();
    // The map's own first-step CTA remains the single primary.
    expect(
      screen.getByRole("button", { name: copy.map.empty.action }),
    ).toBeInTheDocument();
  });

  it("opens the composer pinned to a place when its marker is tapped", async () => {
    const user = userEvent.setup();
    importAtlas(fullAtlasFixture());
    render(<App />);
    // The Harbor (p1) has a point anchor, so its marker is on the map.
    await user.click(screen.getByRole("button", { name: "The Harbor" }));

    // The composer opened; the tapped place is preselected.
    expect(
      screen.getByRole("heading", { name: copy.composer.title }),
    ).toBeInTheDocument();
    const chips = screen.getAllByRole("button", { name: "The Harbor" });
    // One of them is the pressed chip inside the dialog.
    expect(chips.some((c) => c.getAttribute("aria-pressed") === "true")).toBe(
      true,
    );
  });
});

describe("save-error banner", () => {
  it("shows the designed banner on a failed device save and clears on recovery", async () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(idb, "saveAtlas").mockResolvedValue(undefined);
    spy.mockRejectedValueOnce(new Error("QuotaExceededError"));
    try {
      importAtlas(fullAtlasFixture()); // schedules the first (failing) save
      render(<App />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });

      expect(screen.getByText(copy.saveError.title)).toBeInTheDocument();
      expect(screen.getByText(copy.saveError.body)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: copy.saveError.action }),
      ).toBeInTheDocument();
      // No raw error text leaks into the UI.
      expect(screen.queryByText(/QuotaExceededError/)).toBeNull();

      // A later accepted write clears the banner.
      act(() => {
        getState(); // no-op read
      });
      const worldId = getState()!.worlds[0].id;
      act(() => {
        // any mutation reschedules a save, which now resolves
        importAtlas({ ...getState()!, settings: { activeWorldId: worldId } });
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });

      expect(screen.queryByText(copy.saveError.title)).toBeNull();
    } finally {
      spy.mockRestore();
      vi.useRealTimers();
    }
  });
});
