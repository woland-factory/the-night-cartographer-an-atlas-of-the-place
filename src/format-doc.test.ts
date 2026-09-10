import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// ATLAS_FORMAT.md documents the owned file so it outlives the tool.
describe("ATLAS_FORMAT.md", () => {
  const doc = readFileSync(resolve(process.cwd(), "ATLAS_FORMAT.md"), "utf8");

  it("documents the top-level keys", () => {
    for (const key of ["format", "version", "meta", "settings", "worlds"]) {
      expect(doc).toContain(key);
    }
  });

  it("explains the place-identity invariant recall depends on", () => {
    expect(doc.toLowerCase()).toContain("placeid");
  });
});
