import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(file: string): string {
  return readFileSync(resolve(process.cwd(), file), "utf8");
}

describe("nginx config", () => {
  const conf = read("nginx.conf");

  it("has the SPA fallback to index.html", () => {
    expect(conf).toMatch(/try_files\s+\$uri\s+\/index\.html/);
  });

  it("enables gzip and serves config.js with no-cache", () => {
    expect(conf).toMatch(/gzip\s+on/);
    expect(conf).toContain("location = /config.js");
    expect(conf).toMatch(/no-cache/);
  });
});

describe("staging compose (deploy contract)", () => {
  const compose = read("docker-compose.staging.yml");

  it("names the web container per the proxy contract and serves port 80", () => {
    expect(compose).toContain(
      "container_name: the-night-cartographer-an-atlas-of-the-place-staging-web",
    );
    expect(compose).toMatch(/expose:\s*\n\s*-\s*"80"/);
  });

  it("does not publish a host port", () => {
    expect(compose).not.toMatch(/\bports:/);
  });

  it("joins the external factory-staging-net network", () => {
    expect(compose).toContain("factory-staging-net");
    expect(compose).toMatch(/external:\s*true/);
  });

  it("sets memory bounds and the OOM victim priority", () => {
    expect(compose).toMatch(/mem_limit:\s*512m/);
    expect(compose).toMatch(/oom_score_adj:\s*800/);
  });

  it("enables the demo seed and has a healthcheck", () => {
    expect(compose).toMatch(/SEED_DEMO:\s*"1"/);
    expect(compose).toContain("healthcheck:");
    expect(compose).toMatch(/target:\s*serve/);
  });

  it("probes the healthcheck over 127.0.0.1, never localhost", () => {
    const healthLine = compose
      .split("\n")
      .find((line) => line.includes("wget") && line.includes("http://"));
    expect(healthLine).toBeDefined();
    expect(healthLine).toContain("http://127.0.0.1/");
    expect(healthLine).not.toContain("localhost");
  });
});

describe("Dockerfile", () => {
  const dockerfile = read("Dockerfile");

  it("is multi-stage: node build then nginx serve", () => {
    expect(dockerfile).toMatch(/FROM node:20-alpine AS build/);
    expect(dockerfile).toMatch(/FROM nginx:1\.27-alpine AS serve/);
  });

  it("installs the config entrypoint", () => {
    expect(dockerfile).toContain(
      "/docker-entrypoint.d/40-write-config.sh",
    );
  });
});
