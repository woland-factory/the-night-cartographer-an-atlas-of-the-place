import { describe, expect, it } from "vitest";
import { elapsedLabel } from "./elapsed";

describe("elapsedLabel", () => {
  const now = "2026-09-10";

  it("returns today for the same day", () => {
    expect(elapsedLabel("2026-09-10", now)).toBe("today");
  });

  it("returns yesterday for the previous day", () => {
    expect(elapsedLabel("2026-09-09", now)).toBe("yesterday");
  });

  it("returns days for less than a month", () => {
    expect(elapsedLabel("2026-09-03", now)).toBe("7 days ago");
  });

  it("returns months", () => {
    expect(elapsedLabel("2026-06-10", now)).toBe("3 months ago");
  });

  it("keeps counting in months up to two years", () => {
    // ~14 months back, the plan's example line.
    expect(elapsedLabel("2025-07-10", now)).toBe("14 months ago");
  });

  it("returns years at two years and beyond", () => {
    expect(elapsedLabel("2024-09-10", now)).toBe("2 years ago");
  });

  it("uses the singular for one month and one year", () => {
    expect(elapsedLabel("2026-08-10", now)).toBe("1 month ago");
    expect(elapsedLabel("2023-09-10", now)).toBe("3 years ago");
  });
});
