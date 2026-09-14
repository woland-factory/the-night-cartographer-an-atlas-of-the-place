import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { copy } from "../copy";
import { PALETTE, STAMPS } from "../model/kit";
import { addWorld, getState, init, openWorld } from "../state/atlasStore";
import { App } from "./App";

async function openFreshWorld() {
  await init();
  addWorld("Test World");
  openWorld(getState()!.worlds[0].id);
  return render(<App />);
}

describe("MapKit (the constrained kit)", () => {
  it("has no raster brush, no color picker, no file input, no layers panel", async () => {
    const { container } = await openFreshWorld();
    expect(container.querySelectorAll('input[type="color"]')).toHaveLength(0);
    expect(container.querySelectorAll('input[type="file"]')).toHaveLength(0);
    expect(container.querySelectorAll("canvas")).toHaveLength(0);
    expect(screen.queryByText(/layer/i)).toBeNull();
  });

  it("renders exactly the fixed palette count as swatches", async () => {
    const { container } = await openFreshWorld();
    expect(container.querySelectorAll(".swatch")).toHaveLength(PALETTE.length);
  });

  it("renders exactly the fixed stamp set when the stamp tool is active", async () => {
    const user = userEvent.setup();
    const { container } = await openFreshWorld();
    await user.click(screen.getByRole("button", { name: copy.map.tools.stamp }));
    expect(container.querySelectorAll(".stamp")).toHaveLength(STAMPS.length);
  });

  it("has exactly one primary action in the empty state and while drawing", async () => {
    const { container } = await openFreshWorld();
    // Empty state: the only primary is the empty-canvas call to action.
    expect(container.querySelectorAll(".btn--primary")).toHaveLength(1);

    // Start a shape: the only primary becomes Finish.
    const canvas = screen.getByRole("application", {
      name: copy.map.canvasLabel,
    });
    canvas.focus();
    fireEvent.keyDown(canvas, { key: "Enter" });
    expect(container.querySelectorAll(".btn--primary")).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: copy.map.finish }),
    ).toHaveClass("btn--primary");
  });

  it("gives every kit control a real, keyboard-reachable button", async () => {
    const user = userEvent.setup();
    const { container } = await openFreshWorld();
    await user.click(screen.getByRole("button", { name: copy.map.tools.stamp }));
    const controls = container.querySelectorAll(
      ".tool, .swatch, .stamp, .kit .btn",
    );
    expect(controls.length).toBeGreaterThan(0);
    for (const el of Array.from(controls)) {
      expect(el.tagName).toBe("BUTTON");
    }
  });

  it("uses the single-column layout with no fixed width beyond the column", async () => {
    const { container } = await openFreshWorld();
    const editor = container.querySelector(".map-editor");
    expect(editor).toBeTruthy();
    for (const el of Array.from(editor!.querySelectorAll<HTMLElement>("*"))) {
      const width = el.style.width;
      if (width.endsWith("px")) {
        expect(parseFloat(width)).toBeLessThanOrEqual(390);
      }
    }
  });
});

// The 44px touch target and focus-visible contracts live in the stylesheet.
// jsdom applies no layout, so assert the rules exist rather than measuring.
describe("kit touch targets and focus (stylesheet contract)", () => {
  const css = readFileSync(resolve(process.cwd(), "src/ui/tokens.css"), "utf8");

  it("sets the touch target to 44px", () => {
    expect(css).toMatch(/--touch:\s*44px/);
  });

  it("sizes tools, swatches, and stamps to the touch target", () => {
    expect(css).toMatch(/\.tool\s*{[^}]*min-height:\s*var\(--touch\)/);
    expect(css).toMatch(/min-height:\s*var\(--touch\)/);
  });

  it("gives kit controls a visible focus state", () => {
    expect(css).toContain(".tool:focus-visible");
    expect(css).toContain(".swatch:focus-visible");
    expect(css).toContain(".stamp:focus-visible");
  });
});
