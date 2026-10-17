import { afterEach, describe, expect, it, vi } from "vitest";

import {
  canShareFiles,
  fetchSharedFile,
  filenameFromContentDisposition,
  isIosStandalone,
} from "@/lib/download";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isIosStandalone", () => {
  it("is false in a regular browser", () => {
    expect(isIosStandalone()).toBe(false);
  });

  it("is true when iOS reports standalone mode", () => {
    vi.stubGlobal("navigator", { standalone: true });
    expect(isIosStandalone()).toBe(true);
  });
});

describe("filenameFromContentDisposition", () => {
  it("prefers the RFC 5987 encoded filename", () => {
    expect(
      filenameFromContentDisposition(
        "attachment; filename=\"Ast_rix le Gaulois.cbz\"; filename*=UTF-8''Ast%C3%A9rix%20le%20Gaulois.cbz"
      )
    ).toBe("Astérix le Gaulois.cbz");
  });

  it("falls back to the plain ASCII filename", () => {
    expect(filenameFromContentDisposition('attachment; filename="book.cbz"')).toBe("book.cbz");
  });

  it("returns null for missing or malformed headers", () => {
    expect(filenameFromContentDisposition(null)).toBeNull();
    expect(filenameFromContentDisposition("attachment")).toBeNull();
    expect(filenameFromContentDisposition("attachment; filename*=UTF-8''%E9")).toBeNull();
  });
});

describe("fetchSharedFile", () => {
  it("returns a File built from the response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("bytes", {
        status: 200,
        headers: {
          "content-type": "application/vnd.comicbook+zip",
          "content-disposition": 'attachment; filename="GON T06.cbz"',
        },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const file = await fetchSharedFile("/api/stripstream/books/b1/file");

    expect(fetchMock).toHaveBeenCalledWith("/api/stripstream/books/b1/file");
    expect(file.name).toBe("GON T06.cbz");
    expect(file.type).toBe("application/vnd.comicbook+zip");
    expect(await file.text()).toBe("bytes");
  });

  it("falls back to the provided name (then a default) without a disposition header", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => new Response(new Uint8Array([1]), { status: 200 }))
    );

    expect((await fetchSharedFile("/api/books/b1/file", "Tome 1")).name).toBe("Tome 1");
    expect((await fetchSharedFile("/api/books/b1/file")).name).toBe("book");
  });

  it("throws on a failed response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 404 })));

    await expect(fetchSharedFile("/api/stripstream/books/b1/file")).rejects.toThrow(
      "download failed (404)"
    );
  });
});

describe("canShareFiles", () => {
  it("is false when the Web Share API is unavailable", () => {
    vi.stubGlobal("navigator", {});
    expect(canShareFiles(new File(["x"], "a.cbz"))).toBe(false);
  });

  it("delegates to navigator.canShare with the file", () => {
    const canShare = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { canShare });
    const file = new File(["x"], "a.cbz");

    expect(canShareFiles(file)).toBe(true);
    expect(canShare).toHaveBeenCalledWith({ files: [file] });
  });
});
