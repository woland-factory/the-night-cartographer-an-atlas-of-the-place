import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { copy } from "../copy";
import type { Entry, Place, World } from "../model/atlas";
import { buildRecallIndex } from "../model/recallIndex";
import { VisitLedger } from "./VisitLedger";

function place(id: string, name: string, createdAt: string): Place {
  return { id, name, anchor: { x: 100, y: 100 }, createdAt };
}

function entry(id: string, placeId: string, date: string): Entry {
  return {
    id,
    placeId,
    date,
    body: `body ${id}`,
    createdAt: `${date}T07:00:00.000Z`,
  };
}

// Mixed history: harbor visited twice (most recently), stair once earlier,
// well never.
function mixedWorld(): World {
  return {
    id: "w1",
    name: "Harbor City",
    createdAt: "2019-01-01T00:00:00.000Z",
    places: [
      place("well", "The Well", "2020-01-01T00:00:00.000Z"),
      place("harbor", "The Harbor", "2019-01-01T00:00:00.000Z"),
      place("stair", "The Fog Stair", "2019-06-01T00:00:00.000Z"),
    ],
    strata: [],
    currentStratumId: null,
    entries: [
      entry("e1", "harbor", "2020-02-01"),
      entry("e2", "harbor", "2024-05-11"),
      entry("e3", "stair", "2021-03-03"),
    ],
  };
}

describe("VisitLedger", () => {
  it("lists places by last visit with unvisited places last", () => {
    const index = buildRecallIndex(mixedWorld());
    render(<VisitLedger index={index} onOpen={vi.fn()} />);

    expect(screen.getByText(copy.recall.ledgerHeading)).toBeInTheDocument();
    const rows = screen.getAllByRole("button");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText("The Harbor")).toBeInTheDocument();
    expect(within(rows[1]).getByText("The Fog Stair")).toBeInTheDocument();
    expect(within(rows[2]).getByText("The Well")).toBeInTheDocument();
  });

  it("shows the last-visit line and count on visited rows, matching the index", () => {
    const index = buildRecallIndex(mixedWorld());
    render(<VisitLedger index={index} onOpen={vi.fn()} />);

    const rows = screen.getAllByRole("button");
    const harborLast = within(rows[0]).getByText(/Last visit here:/);
    expect(harborLast.textContent).toMatch(/ago|today|yesterday/);
    expect(within(rows[0]).getByText("2 visits")).toBeInTheDocument();
    expect(
      within(rows[1]).getByText(copy.worldView.visitOne),
    ).toBeInTheDocument();
  });

  it("shows the first-entry invite on an unvisited row", () => {
    const index = buildRecallIndex(mixedWorld());
    render(<VisitLedger index={index} onOpen={vi.fn()} />);

    const wellRow = screen.getAllByRole("button")[2];
    expect(
      within(wellRow).getByText(copy.worldView.placeNoEntries),
    ).toBeInTheDocument();
    expect(within(wellRow).queryByText(/Last visit here:/)).toBeNull();
  });

  it("opens a row's recall on tap", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const index = buildRecallIndex(mixedWorld());
    render(<VisitLedger index={index} onOpen={onOpen} />);

    await user.click(screen.getAllByRole("button")[1]);
    expect(onOpen).toHaveBeenCalledWith("stair");
  });

  it("renders nothing for a world with no places", () => {
    const empty: World = {
      id: "w1",
      name: "Empty",
      createdAt: "2019-01-01T00:00:00.000Z",
      places: [],
      strata: [],
      currentStratumId: null,
      entries: [],
    };
    const { container } = render(
      <VisitLedger index={buildRecallIndex(empty)} onOpen={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
