// Runtime config read from window.__NC_CONFIG__, which is written by the
// container entrypoint at start (staging) or served empty in dev. Read at
// call time, not module load, so tests can set the config before reading it.

export interface RuntimeConfig {
  seedDemo: boolean;
  umamiUrl: string;
  umamiWebsiteId: string;
  sentryDsn: string;
}

interface RawConfig {
  SEED_DEMO?: unknown;
  UMAMI_URL?: unknown;
  UMAMI_WEBSITE_ID?: unknown;
  SENTRY_DSN?: unknown;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function getConfig(): RuntimeConfig {
  const raw: RawConfig =
    (typeof window !== "undefined" &&
      (window as { __NC_CONFIG__?: RawConfig }).__NC_CONFIG__) ||
    {};

  const seed = raw.SEED_DEMO;
  return {
    // "1" is truthy, "" is falsy. Any non-empty string enables the seed.
    seedDemo: typeof seed === "string" ? seed.length > 0 : Boolean(seed),
    umamiUrl: asString(raw.UMAMI_URL),
    umamiWebsiteId: asString(raw.UMAMI_WEBSITE_ID),
    sentryDsn: asString(raw.SENTRY_DSN),
  };
}
