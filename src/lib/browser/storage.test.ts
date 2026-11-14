import { describe, expect, it } from "vitest";

import {
  ANONYMOUS_STORAGE_SCOPE,
  buildStorageKey,
  normalizeStorageScope,
  STORAGE_KEY_PREFIX,
} from "./storage";

describe("buildStorageKey", () => {
  it("namespaces the key with the prefix and the scope", () => {
    expect(buildStorageKey("user-a", "recommendations-view-mode")).toBe(
      "stripstream:user-a:recommendations-view-mode"
    );
  });

  it("gives two accounts on the same browser two distinct keys", () => {
    const keyA = buildStorageKey("user-a", "recommendations-view-mode");
    const keyB = buildStorageKey("user-b", "recommendations-view-mode");

    expect(keyA).not.toBe(keyB);
    expect(keyA.endsWith(":recommendations-view-mode")).toBe(true);
    expect(keyB.endsWith(":recommendations-view-mode")).toBe(true);
  });

  it("keeps the raw key readable only through the scoped form", () => {
    expect(buildStorageKey("user-a", "pwa-install-dismissed")).not.toBe(
      "pwa-install-dismissed"
    );
    expect(buildStorageKey("user-a", "pwa-install-dismissed")).toBe(
      `${STORAGE_KEY_PREFIX}:user-a:pwa-install-dismissed`
    );
  });

  it("falls back to the anonymous scope when no user is signed in", () => {
    expect(buildStorageKey(null, "pwa-install-dismissed")).toBe(
      `stripstream:${ANONYMOUS_STORAGE_SCOPE}:pwa-install-dismissed`
    );
    expect(buildStorageKey(undefined, "pwa-install-dismissed")).toBe(
      `stripstream:${ANONYMOUS_STORAGE_SCOPE}:pwa-install-dismissed`
    );
    expect(buildStorageKey("   ", "pwa-install-dismissed")).toBe(
      `stripstream:${ANONYMOUS_STORAGE_SCOPE}:pwa-install-dismissed`
    );
  });

  it("trims the scope", () => {
    expect(buildStorageKey(" user-a ", "key")).toBe("stripstream:user-a:key");
  });
});

describe("normalizeStorageScope", () => {
  it("keeps a real scope untouched", () => {
    expect(normalizeStorageScope("cuid-123")).toBe("cuid-123");
  });

  it("replaces a blank scope with the anonymous scope", () => {
    expect(normalizeStorageScope("")).toBe(ANONYMOUS_STORAGE_SCOPE);
    expect(normalizeStorageScope(null)).toBe(ANONYMOUS_STORAGE_SCOPE);
  });
});
