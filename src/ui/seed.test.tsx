import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { copy } from "../copy";
import { init } from "../state/atlasStore";
import { App } from "./App";

function setConfig(config: Record<string, string>) {
  (window as unknown as { __NC_CONFIG__: unknown }).__NC_CONFIG__ = config;
}

describe("SEED_DEMO seeding", () => {
  it("lands on the demo world with a real, non-empty recall readout", async () => {
    setConfig({ SEED_DEMO: "1" });
    await init();
    render(<App />);

    // Landed inside the sample world, not on the empty state.
    expect(screen.queryByText(copy.worldList.emptyTitle)).toBeNull();
    expect(screen.getByRole("heading", { name: /Harbor City/ })).toBeInTheDocument();

    // A place answers back with prior entries and a computed elapsed line.
    expect(screen.getByRole("heading", { name: "The Harbor" })).toBeInTheDocument();
    const lastVisit = screen.getAllByText(/Last visit here:/);
    expect(lastVisit.length).toBeGreaterThan(0);
    expect(lastVisit[0].textContent).toMatch(/ago|today|yesterday/);
    expect(
      screen.getByText(/the gulls remembered me first/i),
    ).toBeInTheDocument();
  });

  it("shows the designed empty state when SEED_DEMO is off", async () => {
    setConfig({});
    await init();
    render(<App />);
    expect(screen.getByText(copy.worldList.emptyTitle)).toBeInTheDocument();
  });
});
