import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

const ORIGIN = "https://stripstream.example";

describe("safeRedirectPath", () => {
  it("keeps a same-origin path with its query and hash", () => {
    expect(safeRedirectPath("/series/42?page=2#top", ORIGIN)).toBe("/series/42?page=2#top");
  });

  it("falls back to / without a target", () => {
    expect(safeRedirectPath(undefined, ORIGIN)).toBe("/");
    expect(safeRedirectPath("", ORIGIN)).toBe("/");
  });

  it.each([
    "//evil.com",
    "/\\evil.com",
    "\\\\evil.com",
    "/\\/evil.com",
    "https://evil.com/path",
    "javascript:alert(1)",
    "http://stripstream.example/plain-http",
    "/.//evil.com",
  ])("refuses the open redirect %s", (from) => {
    const result = safeRedirectPath(from, ORIGIN);
    expect(result.startsWith("/")).toBe(true);
    expect(result.startsWith("//")).toBe(false);
    expect(new URL(result, ORIGIN).origin).toBe(ORIGIN);
  });

  it("accepts an absolute URL on the same origin but returns only its path", () => {
    expect(safeRedirectPath(`${ORIGIN}/libraries`, ORIGIN)).toBe("/libraries");
  });

  it("resolves a relative path against the origin root", () => {
    expect(safeRedirectPath("libraries", ORIGIN)).toBe("/libraries");
  });
});
