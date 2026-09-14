import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { demoShapes } from "../data/demoAtlas";
import { PALETTE } from "../model/kit";
import {
  FOG_FILTER_ID,
  INK_FILTER_ID,
  MapDefs,
  renderShape,
} from "./mapRender";

const PALETTE_HEXES = new Set(PALETTE.map((s) => s.hex));

function renderCrookedMap() {
  return render(
    <svg viewBox="0 0 1000 1000">
      <MapDefs />
      {demoShapes().map(renderShape)}
    </svg>,
  );
}

describe("mapRender (crooked showcase fixture)", () => {
  it("renders deterministically", () => {
    const a = renderCrookedMap().container.innerHTML;
    const b = renderCrookedMap().container.innerHTML;
    expect(a).toBe(b);
  });

  it("uses only palette tokens for every shape color", () => {
    const { container } = renderCrookedMap();
    const shapes = container.querySelectorAll("[data-shape-type]");
    expect(shapes.length).toBe(demoShapes().length);
    for (const el of Array.from(shapes)) {
      for (const attr of ["stroke", "fill"]) {
        const value = el.getAttribute(attr);
        if (value && value !== "none") {
          expect(PALETTE_HEXES.has(value), `${attr}=${value}`).toBe(true);
        }
      }
      // Stamps color their inner path.
      for (const child of Array.from(el.querySelectorAll("[stroke]"))) {
        const stroke = child.getAttribute("stroke");
        if (stroke && stroke !== "none") {
          expect(PALETTE_HEXES.has(stroke), `stroke=${stroke}`).toBe(true);
        }
      }
    }
  });

  it("applies smoothing: line and area shapes use curve commands, not only L", () => {
    const { container } = renderCrookedMap();
    const district = container.querySelector('[data-shape-type="district"]');
    const d = district?.getAttribute("d") ?? "";
    expect(d).toContain("C");
    expect(d.trimEnd().endsWith("Z")).toBe(true);
  });

  it("references the shared ink filter on inked strokes", () => {
    const { container } = renderCrookedMap();
    const road = container.querySelector('[data-shape-type="road"]');
    expect(road?.getAttribute("filter")).toBe(`url(#${INK_FILTER_ID})`);
    expect(container.querySelector(`#${INK_FILTER_ID}`)).toBeTruthy();
  });

  it("gives fog the feathered treatment: dashed, reduced opacity, blur", () => {
    const { container } = renderCrookedMap();
    const fog = container.querySelector('[data-shape-type="fog"]');
    expect(fog?.getAttribute("stroke-dasharray")).toBeTruthy();
    expect(Number(fog?.getAttribute("stroke-opacity"))).toBeLessThan(1);
    expect(fog?.getAttribute("filter")).toBe(`url(#${FOG_FILTER_ID})`);
    expect(container.querySelector(`#${FOG_FILTER_ID}`)).toBeTruthy();
  });

  it("renders labels as escaped text nodes", () => {
    const { container } = renderCrookedMap();
    const labels = Array.from(
      container.querySelectorAll('[data-shape-type="label"]'),
    ).map((el) => el.textContent);
    expect(labels).toContain("The Harbor");
  });
});
