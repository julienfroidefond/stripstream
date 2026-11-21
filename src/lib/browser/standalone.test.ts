import { afterEach, describe, expect, it, vi } from "vitest";

import { isStandalonePwa } from "./standalone";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isStandalonePwa", () => {
  it("is false during server rendering", () => {
    expect(isStandalonePwa()).toBe(false);
  });

  it("detects the installed display mode", () => {
    vi.stubGlobal("window", {
      matchMedia: () => ({ matches: true }),
      navigator: {},
    });

    expect(isStandalonePwa()).toBe(true);
  });

  it("falls back to the iOS standalone flag", () => {
    vi.stubGlobal("window", {
      matchMedia: () => ({ matches: false }),
      navigator: { standalone: true },
    });

    expect(isStandalonePwa()).toBe(true);
  });

  it("is false in a regular browser tab", () => {
    vi.stubGlobal("window", {
      matchMedia: () => ({ matches: false }),
      navigator: {},
    });

    expect(isStandalonePwa()).toBe(false);
  });
});
