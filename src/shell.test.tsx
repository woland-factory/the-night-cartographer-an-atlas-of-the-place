import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { copy } from "./copy";
import { App } from "./ui/App";

// The first paint must never be blank or white. index.html carries an inline
// dark background and an inline app shell before the bundle loads, and the
// React LoadingShell holds the same layout steady until the store resolves.
describe("first render shell", () => {
  const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

  it("sets a non-white background inline", () => {
    expect(html).toMatch(/background:\s*#0e1116/i);
  });

  it("includes an inline app shell with the wordmark and tagline", () => {
    expect(html).toContain("app-shell");
    expect(html).toContain(copy.wordmark);
    expect(html).toContain(copy.tagline);
  });

  it("paints the dark shell before the module bundle loads", () => {
    // The critical inline style and the shell markup both precede the app
    // bundle tag, so the browser paints real content before any JS runs.
    const style = html.indexOf("background: #0e1116");
    const shell = html.indexOf('class="app-shell"');
    const bundle = html.indexOf('src="/src/main.tsx"');
    expect(style).toBeGreaterThan(-1);
    expect(shell).toBeGreaterThan(-1);
    expect(bundle).toBeGreaterThan(-1);
    expect(style).toBeLessThan(bundle);
    expect(shell).toBeLessThan(bundle);
  });

  it("mounts the app into #root and loads runtime config first", () => {
    expect(html).toContain('id="root"');
    expect(html).toContain('src="/config.js"');
    expect(html).toContain('src="/src/main.tsx"');
  });

  it("renders a steady loading shell before the store resolves", () => {
    // With no atlas loaded, App renders LoadingShell: the wordmark, the
    // tagline, and steady-height placeholder cards, never a white flash.
    render(<App />);
    expect(screen.getByText(copy.wordmark)).toBeInTheDocument();
    expect(screen.getByText(copy.tagline)).toBeInTheDocument();
    const cards = document.querySelectorAll(".page .card");
    expect(cards.length).toBe(3);
    for (const card of cards) {
      expect((card as HTMLElement).style.height).toBe("64px");
    }
  });
});
