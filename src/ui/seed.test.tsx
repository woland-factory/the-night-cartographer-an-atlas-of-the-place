import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { copy } from "../copy";
import { init } from "../state/atlasStore";
import { App } from "./App";

function setConfig(config: Record<string, string>) {
  (window as unknown as { __NC_CONFIG__: unknown }).__NC_CONFIG__ = config;
}

describe("SEED_DEMO seeding", () => {
  it("lands on the visit ledger, then a tapped place answers back", async () => {
    setConfig({ SEED_DEMO: "1" });
    await init();
    const user = userEvent.setup();
    render(<App />);

    // Landed inside the sample world, not on the empty state.
    expect(screen.queryByText(copy.worldList.emptyTitle)).toBeNull();
    expect(
      screen.getByRole("heading", { name: /Harbor City/ }),
    ).toBeInTheDocument();

    // The ledger overview answers at a glance: last visit, computed elapsed.
    const lastVisit = screen.getAllByText(/Last visit here:/);
    expect(lastVisit.length).toBeGreaterThan(0);
    expect(lastVisit[0].textContent).toMatch(/ago|today|yesterday/);
    // The full entries wait behind the tap: that is the signature moment.
    expect(screen.queryByText(/the gulls remembered me first/i)).toBeNull();

    // Tap The Harbor's marker: the recall panel opens with the history. The
    // open is synchronous (no timer, no await beyond the click itself).
    await user.click(screen.getByRole("button", { name: "The Harbor" }));
    const panel = screen.getByRole("dialog");
    expect(
      within(panel).getByRole("heading", { name: "The Harbor" }),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText(/Last visit here:/).textContent,
    ).toMatch(/ago|today|yesterday/);
    expect(within(panel).getByText("4 visits")).toBeInTheDocument();
    expect(
      within(panel).getByText(/the gulls remembered me first/i),
    ).toBeInTheDocument();
  });

  it("shows the designed empty state when SEED_DEMO is off", async () => {
    setConfig({});
    await init();
    render(<App />);
    expect(screen.getByText(copy.worldList.emptyTitle)).toBeInTheDocument();
  });
});

describe("first-recall coach mark", () => {
  it("points at the tap once, then never again after the first recall open", async () => {
    setConfig({ SEED_DEMO: "1" });
    await init();
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    expect(screen.getByText(copy.recall.hint)).toBeInTheDocument();

    // The first recall open retires the hint for good.
    await user.click(screen.getByRole("button", { name: "The Harbor" }));
    await user.click(screen.getByRole("button", { name: copy.recall.close }));
    expect(screen.queryByText(copy.recall.hint)).toBeNull();

    // A returning user never sees it.
    unmount();
    render(<App />);
    expect(screen.queryByText(copy.recall.hint)).toBeNull();
  });

  it("dismisses with Got it and stays dismissed", async () => {
    setConfig({ SEED_DEMO: "1" });
    await init();
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(
      screen.getByRole("button", { name: copy.recall.hintDismiss }),
    );
    expect(screen.queryByText(copy.recall.hint)).toBeNull();

    unmount();
    render(<App />);
    expect(screen.queryByText(copy.recall.hint)).toBeNull();
  });
});
