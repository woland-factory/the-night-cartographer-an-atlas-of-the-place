import type { AtlasFile } from "../model/atlas";
import { parseAtlas, serialize, type ParseResult } from "../model/serialize";

// The owned file. When the File System Access API is present, "Save to file"
// writes straight to a user-chosen file and retains the handle so a later
// save writes back to the same file. Without FSA, the same action downloads
// a file and import reads one through a file input. No feature is lost in the
// fallback, only the direct-to-same-file convenience.

// Minimal typings for the File System Access API (not in lib.dom yet).
interface FsaWritable {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}
interface FsaFileHandle {
  createWritable(): Promise<FsaWritable>;
  getFile(): Promise<File>;
}
interface FsaWindow {
  showSaveFilePicker?: (options?: unknown) => Promise<FsaFileHandle>;
  showOpenFilePicker?: (options?: unknown) => Promise<FsaFileHandle[]>;
}

export function hasFileSystemAccess(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as FsaWindow).showSaveFilePicker === "function" &&
    typeof (window as unknown as FsaWindow).showOpenFilePicker === "function"
  );
}

function suggestedName(atlas: AtlasFile): string {
  const active = atlas.worlds.find((w) => w.id === atlas.settings.activeWorldId);
  const base = (active?.name ?? atlas.worlds[0]?.name ?? "atlas")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "atlas"}.atlas.json`;
}

// A retained handle lets a second save write back to the same file.
let currentHandle: FsaFileHandle | null = null;

export function __resetFileHandleForTests(): void {
  currentHandle = null;
}

// Fallback download via <a download>. Exposed for testing.
export function downloadText(text: string, filename: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function saveToFile(atlas: AtlasFile): Promise<void> {
  const text = serialize(atlas);
  const name = suggestedName(atlas);

  if (hasFileSystemAccess()) {
    const win = window as unknown as FsaWindow;
    if (!currentHandle) {
      currentHandle = await win.showSaveFilePicker!({
        suggestedName: name,
        types: [
          {
            description: "Atlas file",
            accept: { "application/json": [".json"] },
          },
        ],
      });
    }
    const writable = await currentHandle.createWritable();
    await writable.write(text);
    await writable.close();
    return;
  }

  downloadText(text, name);
}

// Parse text that has already been read from a file. Exposed so both the FSA
// and the input-element paths funnel through the same validation.
export function importAtlasText(text: string): ParseResult {
  return parseAtlas(text);
}

function pickFileFallback(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      file.text().then(resolve, () => resolve(null));
    });
    input.click();
  });
}

// openFromFile picks a file (FSA when present, else an input element), reads
// its text, and returns the parse result. Returns null only when the user
// cancels the picker.
export async function openFromFile(): Promise<ParseResult | null> {
  if (hasFileSystemAccess()) {
    const win = window as unknown as FsaWindow;
    let handles: FsaFileHandle[];
    try {
      handles = await win.showOpenFilePicker!({
        types: [
          {
            description: "Atlas file",
            accept: { "application/json": [".json"] },
          },
        ],
        multiple: false,
      });
    } catch {
      // The user dismissed the picker.
      return null;
    }
    const handle = handles[0];
    if (!handle) return null;
    currentHandle = handle;
    const file = await handle.getFile();
    return importAtlasText(await file.text());
  }

  const text = await pickFileFallback();
  if (text === null) return null;
  return importAtlasText(text);
}
