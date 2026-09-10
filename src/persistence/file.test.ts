import { afterEach, describe, expect, it, vi } from "vitest";
import { fullAtlasFixture } from "../test/fixtures";
import { serialize } from "../model/serialize";
import {
  hasFileSystemAccess,
  importAtlasText,
  openFromFile,
  saveToFile,
} from "./file";

afterEach(() => {
  // Remove any FSA stubs added by a test.
  delete (window as unknown as Record<string, unknown>).showSaveFilePicker;
  delete (window as unknown as Record<string, unknown>).showOpenFilePicker;
  delete (URL as unknown as Record<string, unknown>).createObjectURL;
  delete (URL as unknown as Record<string, unknown>).revokeObjectURL;
});

describe("file: fallback (no File System Access API)", () => {
  it("exports a Blob download whose text re-imports to an equal atlas", async () => {
    expect(hasFileSystemAccess()).toBe(false);

    // jsdom's Blob lacks text(), so record the content with a stand-in.
    const parts: string[] = [];
    const RealBlob = globalThis.Blob;
    class RecordingBlob {
      constructor(chunks: string[]) {
        parts.push(...chunks);
      }
      async text() {
        return parts.join("");
      }
    }
    globalThis.Blob = RecordingBlob as unknown as typeof Blob;

    // jsdom does not implement these; assign mocks directly.
    const createUrl = vi.fn(() => "blob:mock");
    (URL as unknown as Record<string, unknown>).createObjectURL = createUrl;
    (URL as unknown as Record<string, unknown>).revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const atlas = fullAtlasFixture();
    try {
      await saveToFile(atlas);
    } finally {
      globalThis.Blob = RealBlob;
    }

    expect(createUrl).toHaveBeenCalledOnce();
    const text = parts.join("");
    const result = importAtlasText(text);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.atlas).toEqual(atlas);
  });

  it("surfaces a friendly reason for a bad import, never throws", () => {
    const result = importAtlasText("garbage");
    expect(result).toEqual({ ok: false, reason: "unreadable" });
  });
});

describe("file: File System Access API present", () => {
  it("writes serialized atlas and retains the handle across saves", async () => {
    const writes: string[] = [];
    const writable = {
      write: vi.fn(async (data: string) => {
        writes.push(data);
      }),
      close: vi.fn(async () => {}),
    };
    const handle = {
      createWritable: vi.fn(async () => writable),
      getFile: vi.fn(),
    };
    const picker = vi.fn(async () => handle);
    (window as unknown as Record<string, unknown>).showSaveFilePicker = picker;
    (window as unknown as Record<string, unknown>).showOpenFilePicker = vi.fn();

    expect(hasFileSystemAccess()).toBe(true);

    const atlas = fullAtlasFixture();
    await saveToFile(atlas);
    await saveToFile(atlas);

    // The picker is shown only once; the retained handle serves the second save.
    expect(picker).toHaveBeenCalledOnce();
    expect(writes[0]).toBe(serialize(atlas));
    expect(writes).toHaveLength(2);
  });

  it("reads an atlas from a chosen file", async () => {
    const atlas = fullAtlasFixture();
    // A file-like stub with text(); jsdom's File lacks a working text().
    const serialized = serialize(atlas);
    const file = { text: async () => serialized };
    const handle = { getFile: vi.fn(async () => file), createWritable: vi.fn() };
    (window as unknown as Record<string, unknown>).showOpenFilePicker = vi.fn(async () => [
      handle,
    ]);
    (window as unknown as Record<string, unknown>).showSaveFilePicker = vi.fn();

    const result = await openFromFile();
    expect(result?.ok).toBe(true);
    if (result?.ok) expect(result.atlas).toEqual(atlas);
  });
});
