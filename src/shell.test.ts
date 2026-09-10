import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The first paint must never be blank or white. index.html carries an inline
// dark background and an inline app shell before the bundle loads.
describe("first render shell", () => {
  const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

  it("sets a non-white background inline", () => {
    expect(html).toMatch(/background:\s*#0e1116/i);
  });

  it("includes an inline app shell with the wordmark", () => {
    expect(html).toContain("app-shell");
    expect(html).toContain("The Night Cartographer");
  });

  it("mounts the app into #root and loads runtime config first", () => {
    expect(html).toContain('id="root"');
    expect(html).toContain('src="/config.js"');
    expect(html).toContain('src="/src/main.tsx"');
  });
});
