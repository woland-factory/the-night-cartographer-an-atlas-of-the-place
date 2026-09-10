import { describe, expect, it } from "vitest";
import { fullAtlasFixture } from "../test/fixtures";
import { clearAtlas, loadAtlas, saveAtlas } from "./idb";

describe("IndexedDB persistence", () => {
  it("restores a saved atlas exactly", async () => {
    expect(await loadAtlas()).toBeNull();

    const atlas = fullAtlasFixture();
    await saveAtlas(atlas);

    const restored = await loadAtlas();
    expect(restored).toEqual(atlas);
  });

  it("clears the working atlas", async () => {
    await saveAtlas(fullAtlasFixture());
    await clearAtlas();
    expect(await loadAtlas()).toBeNull();
  });
});
