import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Sentry SDK so we can assert init/capture calls without a network.
vi.mock("@sentry/browser", () => ({
  init: vi.fn(),
  captureException: vi.fn(),
}));

import * as Sentry from "@sentry/browser";
import { initAnalytics } from "./analytics";
import {
  __resetErrorTrackingForTests,
  beforeSend,
  initErrorTracking,
  reportError,
} from "./errors";

function setConfig(config: Record<string, string>) {
  (window as unknown as { __NC_CONFIG__: unknown }).__NC_CONFIG__ = config;
}

beforeEach(() => {
  __resetErrorTrackingForTests();
});

describe("analytics hook", () => {
  it("injects no script when config is empty", () => {
    setConfig({});
    initAnalytics(document);
    expect(document.querySelector("script[data-nc-analytics]")).toBeNull();
  });

  it("injects the Umami script once when both values are present", () => {
    setConfig({
      UMAMI_URL: "https://analytics.example/script.js",
      UMAMI_WEBSITE_ID: "abc-123",
    });
    initAnalytics(document);
    initAnalytics(document);
    const scripts = document.querySelectorAll("script[data-nc-analytics]");
    expect(scripts).toHaveLength(1);
    const script = scripts[0] as HTMLScriptElement;
    expect(script.src).toBe("https://analytics.example/script.js");
    expect(script.getAttribute("data-website-id")).toBe("abc-123");
    script.remove();
  });
});

describe("error hook", () => {
  it("never calls Sentry.init when the DSN is empty", () => {
    setConfig({});
    initErrorTracking();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it("initializes with PII off when a DSN is present", () => {
    setConfig({ SENTRY_DSN: "https://public@sentry.example/1" });
    initErrorTracking();
    expect(Sentry.init).toHaveBeenCalledTimes(1);
    const options = (Sentry.init as unknown as { mock: { calls: unknown[][] } })
      .mock.calls[0][0] as Record<string, unknown>;
    expect(options.sendDefaultPii).toBe(false);
    expect(typeof options.beforeSend).toBe("function");
  });

  it("beforeSend strips request and breadcrumb data and caps the message", () => {
    const event = {
      request: { url: "http://x", data: "an entry body" },
      breadcrumbs: [{ message: "typed something" }],
      message: "x".repeat(600),
    };
    const cleaned = beforeSend(event as never);
    expect(cleaned.request).toBeUndefined();
    expect(cleaned.breadcrumbs).toEqual([]);
    expect(cleaned.message?.length).toBe(500);
  });

  it("reportError accepts only an Error argument", () => {
    expect(reportError.length).toBe(1);
  });

  it("reportError is a no-op until init runs", () => {
    setConfig({});
    initErrorTracking();
    reportError(new Error("boom"));
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
