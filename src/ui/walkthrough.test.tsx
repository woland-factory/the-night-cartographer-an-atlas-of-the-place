import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { copy } from "../copy";
import { Walkthrough } from "./Walkthrough";

// The walk is presentation-only: one imperative line per step plus a
// subordinate Skip, in a polite status region. It owns no state.

describe("Walkthrough", () => {
  it("renders the draw step's imperative line", () => {
    render(<Walkthrough step="draw" onSkip={() => {}} />);
    expect(screen.getByText("Draw a district.")).toBeInTheDocument();
  });

  it("renders the write step's imperative line", () => {
    render(<Walkthrough step="write" onSkip={() => {}} />);
    expect(
      screen.getByText("Write a dream and pin it to a place."),
    ).toBeInTheDocument();
  });

  it("renders the recall step's imperative line", () => {
    render(<Walkthrough step="recall" onSkip={() => {}} />);
    expect(
      screen.getByText("Tap a place to see what you wrote there."),
    ).toBeInTheDocument();
  });

  it("calls onSkip exactly once when Skip is pressed", async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    render(<Walkthrough step="draw" onSkip={onSkip} />);

    await user.click(screen.getByRole("button", { name: copy.walkthrough.skip }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("is a polite status region so a screen reader hears the step self-tick", () => {
    render(<Walkthrough step="write" onSkip={() => {}} />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("imports no store and no firstRun module (presentation only)", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/ui/Walkthrough.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/import[^\n]*atlasStore/);
    expect(source).not.toMatch(/import[^\n]*firstRun/);
  });
});
