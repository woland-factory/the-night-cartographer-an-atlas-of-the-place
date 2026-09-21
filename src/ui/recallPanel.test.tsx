import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { copy } from "../copy";
import type { Entry } from "../model/atlas";
import { buildRecallIndex } from "../model/recallIndex";
import type { PlaceRecall } from "../model/recallIndex";
import { stressWorld } from "../test/fixtures";
import { RECALL_PAGE, RecallPanel } from "./RecallPanel";

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

// A busy place: `count` distinct dated entries, newest-first, so the cap and
// its reveal can be exercised. Day n maps to a real YYYY-MM-DD.
function manyEntries(count: number): Entry[] {
  const out: Entry[] = [];
  for (let i = 0; i < count; i++) {
    const day = new Date(Date.UTC(2010, 0, 1 + (count - 1 - i)))
      .toISOString()
      .slice(0, 10);
    out.push(entry(`e${count - 1 - i}`, day, `dream ${count - 1 - i}`));
  }
  return out; // already newest-first (i=0 is the latest day)
}

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

  it("caps the rendered list at RECALL_PAGE and shows the true total plus a reveal", () => {
    const total = RECALL_PAGE + 80;
    renderPanel(recallWith(manyEntries(total)));
    const panel = screen.getByRole("dialog");

    // Only a page of entries renders, but the count line stays honest.
    expect(within(panel).getAllByRole("listitem")).toHaveLength(RECALL_PAGE);
    expect(within(panel).getByText(`${total} visits`)).toBeInTheDocument();

    // The reveal is present, subordinate (a ghost, not the primary), and lives
    // inside the dialog so it is reachable under the focus trap.
    const reveal = within(panel).getByRole("button", {
      name: copy.recall.showEarlier,
    });
    expect(reveal).toHaveClass("btn--ghost");
    expect(reveal).not.toHaveClass("btn--primary");

    // One primary action only: "Write a dream here". The reveal is subordinate.
    expect(panel.querySelectorAll(".btn--primary")).toHaveLength(1);
  });

  it("reveals every earlier visit on demand and then hides the control", async () => {
    const user = userEvent.setup();
    const total = RECALL_PAGE + 40;
    renderPanel(recallWith(manyEntries(total)));
    const panel = screen.getByRole("dialog");

    await user.click(
      within(panel).getByRole("button", { name: copy.recall.showEarlier }),
    );

    expect(within(panel).getAllByRole("listitem")).toHaveLength(total);
    expect(
      within(panel).queryByRole("button", { name: copy.recall.showEarlier }),
    ).toBeNull();
  });

  it("shows no reveal when the history fits in one page", () => {
    renderPanel(recallWith(manyEntries(RECALL_PAGE)));
    expect(screen.getAllByRole("listitem")).toHaveLength(RECALL_PAGE);
    expect(
      screen.queryByRole("button", { name: copy.recall.showEarlier }),
    ).toBeNull();
  });

  it("stays instant and complete on the busiest place of a years-deep atlas", async () => {
    const user = userEvent.setup();
    // The recall a real tap would produce: an O(1) lookup, no per-tap scan.
    const index = buildRecallIndex(stressWorld());
    const recall = index.get("sp0");
    expect(recall.count).toBeGreaterThan(1000);

    renderPanel(recall);
    const panel = screen.getByRole("dialog");

    // The answer-back opens bounded: one page, not thousands of nodes.
    expect(within(panel).getAllByRole("listitem")).toHaveLength(RECALL_PAGE);
    // The true total is shown, so the answer is honest before the reveal.
    expect(
      within(panel).getByText(`${recall.count} visits`),
    ).toBeInTheDocument();

    // Every earlier morning is still reachable in one tap.
    await user.click(
      within(panel).getByRole("button", { name: copy.recall.showEarlier }),
    );
    expect(within(panel).getAllByRole("listitem")).toHaveLength(recall.count);
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
