import { ATLAS_FORMAT, CURRENT_VERSION, type AtlasFile } from "./atlas";
import { migrate } from "./migrate";
import { validateAtlas } from "./schema";

// The file format. `serialize` produces pretty-printed JSON (2-space
// indent) so the atlas is human-readable and diff-friendly. SVG geometry
// lives inside Shape.geometry as a string, so the whole atlas is one file
// that outlives the tool.

export function serialize(atlas: AtlasFile): string {
  return JSON.stringify(atlas, null, 2) + "\n";
}

export type ImportError = "unreadable" | "newer-version";

export type ParseResult =
  | { ok: true; atlas: AtlasFile }
  | { ok: false; reason: ImportError };

// parseAtlas runs JSON.parse, then the zod schema, then migrate. It never
// throws a raw parse error at the UI: every failure comes back as a typed
// reason the UI can turn into friendly copy.
export function parseAtlas(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: "unreadable" };
  }

  if (!raw || typeof raw !== "object") {
    return { ok: false, reason: "unreadable" };
  }

  const candidate = raw as Record<string, unknown>;
  if (candidate.format !== ATLAS_FORMAT) {
    return { ok: false, reason: "unreadable" };
  }

  // A file made by a newer app version is reported distinctly so the UI can
  // tell the user to update rather than calling their file corrupt.
  if (
    typeof candidate.version === "number" &&
    candidate.version > CURRENT_VERSION
  ) {
    return { ok: false, reason: "newer-version" };
  }

  const validated = validateAtlas(raw);
  if (!validated.ok) {
    return { ok: false, reason: "unreadable" };
  }

  const migrated = migrate(validated.atlas);
  if (!migrated.ok) {
    return { ok: false, reason: "newer-version" };
  }

  return { ok: true, atlas: migrated.atlas };
}
