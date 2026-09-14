import { describe, expect, it } from "vitest";
import { todayLocalISO } from "./date";

describe("todayLocalISO", () => {
  it("returns the LOCAL calendar date, not the UTC date", () => {
    // A Date built from local components: late evening on 2026-09-14. Whatever
    // the runner's UTC offset, the local calendar day is the 14th.
    const late = new Date(2026, 8, 14, 23, 30, 0);
    expect(todayLocalISO(late)).toBe("2026-09-14");
  });

  it("zero-pads month and day", () => {
    const early = new Date(2026, 0, 3, 6, 0, 0);
    expect(todayLocalISO(early)).toBe("2026-01-03");
  });

  it("is deterministic for a fixed input", () => {
    const d = new Date(2024, 11, 31, 12, 0, 0);
    expect(todayLocalISO(d)).toBe(todayLocalISO(new Date(2024, 11, 31, 12, 0, 0)));
    expect(todayLocalISO(d)).toBe("2024-12-31");
  });
});
