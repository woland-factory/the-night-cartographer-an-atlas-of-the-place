import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { copy } from "../copy";
import type { Entry } from "../model/atlas";
import type { PlaceRecall } from "../model/recallIndex";
import { RecallPanel } from "./RecallPanel";

function entry(id: string, date: string, body: string): Entry {
  return {
    id,
    placeId: "p1",
    date,
    body,
    createdAt: `${date}T07:00:00.000Z`,
  };
}

// Entries are newest-first, as buildRecallIndex hands them over.
function recallWith(entries: Entry[]): PlaceRecall {
  return {
    place: {
      id: "p1",
      name: "The Harbor",
      anchor: { x: 50, y: 50 },
      createdAt: "2019-01-01T00:00:00.000Z",
    },
    count: entries.length,
    lastVisit: entries.length > 0 ? entries[0].date : null,
    entries,
  };
}

const twoEntries = () =>
  recallWith([
    entry("e2", "2021-05-11", "Same bench, older gulls."),
    entry("e1", "2019-11-02", "The tide was out."),
  ]);

function renderPanel(
  recall: PlaceRecall,
  handlers: Partial<{ onWriteHere: (id: string) => void; onClose: () => void }> = {},
) {
  return render(
    <RecallPanel
      recall={recall}
      onWriteHere={handlers.onWriteHere ?? vi.fn()}
      onClose={handlers.onClose ?? vi.fn()}
    />,
  );
}

describe("RecallPanel", () => {
  it("answers with the place name, last visit, count, and newest-first entries", () => {
    renderPanel(twoEntries());

    const panel = screen.getByRole("dialog");
    expect(panel).toHaveAttribute("aria-modal", "true");
    expect(
      within(panel).getByRole("heading", { name: "The Harbor" }),
    ).toBeInTheDocument();

    const last = within(panel).getByText(/Last visit here:/);
    expect(last.textContent).toMatch(/ago|today|yesterday/);
    expect(within(panel).getByText("2 visits")).toBeInTheDocument();

    const items = within(panel).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    // Newest first, each with its formatted date, elapsed line, and body.
    expect(within(items[0]).getByText("11 May 2021")).toBeInTheDocument();
    expect(
      within(items[0]).getByText("Same bench, older gulls."),
    ).toBeInTheDocument();
    expect(within(items[1]).getByText("2 November 2019")).toBeInTheDocument();
    expect(within(items[1]).getByText("The tide was out.")).toBeInTheDocument();
    for (const item of items) {
      expect(
        within(item).getByText(/ago|today|yesterday/, {
          selector: ".entry__elapsed",
        }),
      ).toBeInTheDocument();
    }

    expect(
      within(panel).getByRole("button", { name: copy.recall.writeHere }),
    ).toBeInTheDocument();
  });

  it("shows the singular state for exactly one prior entry", () => {
    renderPanel(recallWith([entry("e1", "2021-05-11", "one dream")]));
    expect(screen.getByText(copy.worldView.visitOne)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.queryByText(/result/i)).toBeNull();
  });

  it("shows the designed invite for a place with no history", () => {
    renderPanel(recallWith([]));
    expect(screen.getByText(copy.recall.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(copy.recall.emptyBody)).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).toBeNull();
    expect(screen.queryByText(/0/)).toBeNull();
    expect(screen.queryByText(/result/i)).toBeNull();
    expect(
      screen.getByRole("button", { name: copy.recall.writeHere }),
    ).toBeInTheDocument();
  });

  it("hands the place id to Write a dream here", async () => {
    const user = userEvent.setup();
    const onWriteHere = vi.fn();
    renderPanel(recallWith([]), { onWriteHere });
    await user.click(
      screen.getByRole("button", { name: copy.recall.writeHere }),
    );
    expect(onWriteHere).toHaveBeenCalledWith("p1");
  });

  it("closes on Escape, the close button, and a scrim tap, keeping dialog clicks inert", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = renderPanel(twoEntries(), { onClose });

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: copy.recall.close }));
    expect(onClose).toHaveBeenCalledTimes(2);

    // A click inside the dialog never closes; the scrim does.
    await user.click(screen.getByRole("heading", { name: "The Harbor" }));
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(container.querySelector(".sheet-scrim")!);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("moves focus into the dialog on open and returns it to the opener on close", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            opener
          </button>
          {open && (
            <RecallPanel
              recall={twoEntries()}
              onWriteHere={vi.fn()}
              onClose={() => setOpen(false)}
            />
          )}
        </>
      );
    }
    render(<Harness />);

    const opener = screen.getByRole("button", { name: "opener" });
    await user.click(opener);
    const panel = screen.getByRole("dialog");
    expect(panel.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(panel, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opener).toHaveFocus();
  });

  it("keeps a single-column sheet: scrollable body, then the one primary action", () => {
    renderPanel(twoEntries());
    const dialog = screen.getByRole("dialog");
    const body = dialog.querySelector(".sheet__body");
    const actions = dialog.querySelector(".sheet__actions");
    expect(body).not.toBeNull();
    expect(actions).not.toBeNull();
    // The action bar is a later sibling of the scroll region, so it stays
    // reachable while a long history scrolls.
    expect(
      body!.compareDocumentPosition(actions!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      within(actions as HTMLElement).getByRole("button", {
        name: copy.recall.writeHere,
      }),
    ).toBeInTheDocument();
  });
});
