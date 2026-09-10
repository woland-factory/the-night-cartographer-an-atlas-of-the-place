import * as Sentry from "@sentry/browser";
import type { ErrorEvent } from "@sentry/browser";
import { getConfig } from "../config";

// Optional error tracking. Inert unless SENTRY_DSN is set. The atlas is
// private, so beforeSend strips anything that could carry its content, and
// the public wrapper takes only an Error so no code path can hand an entry
// body to Sentry.

let initialized = false;

export function beforeSend(event: ErrorEvent): ErrorEvent {
  // Drop request data and breadcrumbs, which can capture user content.
  delete event.request;
  event.breadcrumbs = [];
  // Cap message length so a large body cannot ride along in a message.
  if (typeof event.message === "string" && event.message.length > 500) {
    event.message = event.message.slice(0, 500);
  }
  return event;
}

export function initErrorTracking(): void {
  const { sentryDsn } = getConfig();
  if (!sentryDsn) return;

  Sentry.init({
    dsn: sentryDsn,
    sendDefaultPii: false,
    beforeSend,
  });
  initialized = true;
}

export function reportError(error: Error): void {
  if (!initialized) return;
  Sentry.captureException(error);
}

// Test helper so init state does not leak between tests.
export function __resetErrorTrackingForTests(): void {
  initialized = false;
}
