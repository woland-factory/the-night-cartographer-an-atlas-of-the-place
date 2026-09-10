import { describe, expect, it } from "vitest";
import { fullAtlasFixture } from "../test/fixtures";
import { parseAtlas, serialize } from "./serialize";

describe("serialize / parseAtlas", () => {
  it("round-trips a full atlas losslessly", () => {
    const atlas = fullAtlasFixture();
    const result = parseAtlas(serialize(atlas));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.atlas).toEqual(atlas);
    }
  });

  it("produces indented, human-readable JSON carrying format and version", () => {
    const text = serialize(fullAtlasFixture());
    expect(text).toContain('"format": "night-cartographer-atlas"');
    expect(text).toContain('"version": 1');
    // 2-space indentation is present (SVG geometry lives inside as a string).
    expect(text).toContain('\n  "worlds"');
    expect(text).toContain("M10 10 L90 10 L90 90 L10 90 Z");
  });

  it("rejects invalid JSON with a friendly reason, never a throw", () => {
    const result = parseAtlas("{not json");
    expect(result).toEqual({ ok: false, reason: "unreadable" });
  });

  it("rejects a non-atlas JSON document", () => {
    const result = parseAtlas(JSON.stringify({ hello: "world" }));
    expect(result).toEqual({ ok: false, reason: "unreadable" });
  });

  it("rejects a structurally broken atlas", () => {
    const broken = { format: "night-cartographer-atlas", version: 1 };
    const result = parseAtlas(JSON.stringify(broken));
    expect(result).toEqual({ ok: false, reason: "unreadable" });
  });

  it("rejects an atlas from a newer version cleanly", () => {
    const atlas = { ...fullAtlasFixture(), version: 99 };
    const result = parseAtlas(JSON.stringify(atlas));
    expect(result).toEqual({ ok: false, reason: "newer-version" });
  });
});
