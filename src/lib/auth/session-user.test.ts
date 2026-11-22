import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUniqueMock } = vi.hoisted(() => ({ findUniqueMock: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ default: { user: { findUnique: findUniqueMock } } }));

import { loadSessionUser } from "./session-user";

beforeEach(() => {
  findUniqueMock.mockReset();
});

describe("loadSessionUser", () => {
  it("reads roles and sessionVersion by primary key", async () => {
    findUniqueMock.mockResolvedValue({ roles: ["ROLE_USER"], sessionVersion: 3 });

    await expect(loadSessionUser(7)).resolves.toEqual({
      roles: ["ROLE_USER"],
      sessionVersion: 3,
    });
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: 7 },
      select: { roles: true, sessionVersion: true },
    });
  });

  it("returns null for a user that no longer exists", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(loadSessionUser(7)).resolves.toBeNull();
  });
});
