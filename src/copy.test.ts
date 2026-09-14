import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { copy } from "./copy";
import { demoWorld } from "./data/demoAtlas";

// Mechanical copy sweep (QUALITY BAR §8). Every user-visible string must be
// free of em-dashes, the banned LLM vocabulary, and negative empty-state
// phrasing.

const BANNED_WORDS = [
  "seamlessly",
  "effortlessly",
  "unlock",
  "elevate",
  "empower",
  "leverage",
  "robust",
  "dive in",
  "in today's fast-paced world",
  "we've got you covered",
  "supercharge",
];

const NEGATIVE_PHRASES = [
  "you don't have",
  "unable to",
  "something went wrong",
  "no results",
  "0 results",
];

const NEGATIVE_PATTERNS = [/\bno\b[^.]*\byet\b/i, /\bnothing\b[^.]*\bhere\b/i];

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
  } else if (value && typeof value === "object") {
    for (const v of Object.values(value)) collectStrings(v, out);
  }
}

function checkNoDashes(strings: string[]) {
  for (const s of strings) {
    expect(s.includes("—"), `em-dash in: ${s}`).toBe(false);
    expect(s.includes("–"), `en-dash in: ${s}`).toBe(false);
  }
}

function checkNoBanned(strings: string[]) {
  for (const s of strings) {
    const lower = s.toLowerCase();
    for (const word of BANNED_WORDS) {
      expect(lower.includes(word), `banned "${word}" in: ${s}`).toBe(false);
    }
  }
}

function checkNoNegative(strings: string[]) {
  for (const s of strings) {
    const lower = s.toLowerCase();
    for (const phrase of NEGATIVE_PHRASES) {
      expect(lower.includes(phrase), `negative "${phrase}" in: ${s}`).toBe(
        false,
      );
    }
    for (const pattern of NEGATIVE_PATTERNS) {
      expect(pattern.test(s), `negative pattern in: ${s}`).toBe(false);
    }
  }
}

describe("copy sweep", () => {
  const uiStrings: string[] = [];
  collectStrings(copy, uiStrings);
  const world = demoWorld();
  const demoStrings = [
    world.name,
    ...world.places.map((p) => p.name),
    ...world.entries.map((e) => e.body),
    // The seeded showcase map's label shapes are user-visible copy too.
    ...world.strata.flatMap((s) =>
      s.shapes.map((shape) => shape.text ?? "").filter(Boolean),
    ),
  ];
  const allProductStrings = [...uiStrings, ...demoStrings];

  it("has no em-dashes or en-dashes in UI or demo copy", () => {
    checkNoDashes(allProductStrings);
  });

  it("has no banned vocabulary in UI or demo copy", () => {
    checkNoBanned(allProductStrings);
  });

  it("has no negative empty-state phrasing in UI or demo copy", () => {
    checkNoNegative(allProductStrings);
  });

  it("keeps README and ATLAS_FORMAT free of dashes and banned words", () => {
    const readme = readFileSync(resolve(process.cwd(), "README.md"), "utf8");
    const format = readFileSync(
      resolve(process.cwd(), "ATLAS_FORMAT.md"),
      "utf8",
    );
    checkNoDashes([readme, format]);
    checkNoBanned([readme, format]);
  });
});
