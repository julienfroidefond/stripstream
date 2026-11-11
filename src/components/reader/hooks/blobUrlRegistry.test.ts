import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BlobUrlRegistry } from "./blobUrlRegistry";

const revokeObjectURLMock = vi.fn<(url: string) => void>();

beforeEach(() => {
  revokeObjectURLMock.mockReset();
  Object.defineProperty(globalThis.URL, "revokeObjectURL", {
    configurable: true,
    value: revokeObjectURLMock,
  });
});

afterEach(() => {
  delete (globalThis.URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL;
});

describe("BlobUrlRegistry", () => {
  it("stores and returns live URLs", () => {
    const registry = new BlobUrlRegistry();

    registry.set(1, "blob:one");
    registry.set("next-1", "blob:next");

    expect(registry.get(1)).toBe("blob:one");
    expect(registry.get("next-1")).toBe("blob:next");
    expect(registry.has(1)).toBe(true);
    expect(registry.keys()).toEqual([1, "next-1"]);
    expect(registry.size).toBe(2);
    expect(revokeObjectURLMock).not.toHaveBeenCalled();
  });

  it("revokes a replaced URL exactly once", () => {
    const registry = new BlobUrlRegistry();

    registry.set(1, "blob:old");
    registry.set(1, "blob:new");
    registry.set(1, "blob:new");

    expect(revokeObjectURLMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:old");
    expect(registry.get(1)).toBe("blob:new");
  });

  it("revokes on delete and ignores unknown keys", () => {
    const registry = new BlobUrlRegistry();

    registry.set(1, "blob:one");
    registry.delete(1);
    registry.delete(1);

    expect(revokeObjectURLMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:one");
    expect(registry.has(1)).toBe(false);
  });

  it("revokes every URL on clear", () => {
    const registry = new BlobUrlRegistry();

    registry.set(1, "blob:one");
    registry.set(2, "blob:two");
    registry.clear();

    expect(revokeObjectURLMock).toHaveBeenCalledTimes(2);
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:one");
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:two");
    expect(registry.size).toBe(0);
  });
});
