import { describe, expect, it } from "vitest";
import { fullAtlasFixture } from "../test/fixtures";
import { migrate } from "./migrate";

describe("migrate", () => {
  it("is the identity for a current-version file", () => {
    const atlas = fullAtlasFixture();
    const result = migrate(atlas);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.atlas).toEqual(atlas);
  });

  it("rejects a newer version cleanly", () => {
    const atlas = { ...fullAtlasFixture(), version: 2 };
    const result = migrate(atlas);
    expect(result).toEqual({ ok: false, reason: "newer-version" });
  });
});
