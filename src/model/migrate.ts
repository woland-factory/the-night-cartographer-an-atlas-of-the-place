import { CURRENT_VERSION, type AtlasFile } from "./atlas";

// Forward-only migrations. `migrate` switches on the file's version and
// applies each step in order up to CURRENT_VERSION. Today CURRENT_VERSION is
// 1, so the migration is the identity. Later EPICs add cases here; an old
// file must always upgrade, never break.
//
// A file whose version is newer than this app understands is rejected
// cleanly rather than silently corrupted.

export type MigrateResult =
  | { ok: true; atlas: AtlasFile }
  | { ok: false; reason: "newer-version" };

export function migrate(file: AtlasFile): MigrateResult {
  if (file.version > CURRENT_VERSION) {
    return { ok: false, reason: "newer-version" };
  }

  // Each step upgrades from version N to N+1. Add cases as the schema grows.
  // (No steps yet: v1 is the current and only version, so this is identity.)
  const atlas = file;
  while (atlas.version < CURRENT_VERSION) {
    switch (atlas.version) {
      // case 1:
      //   atlas = upgradeV1toV2(atlas);
      //   break;
      default:
        // No migration path for this version. Treat as unreadable rather
        // than looping forever.
        return { ok: false, reason: "newer-version" };
    }
  }

  return { ok: true, atlas };
}
