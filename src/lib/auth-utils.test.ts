import { beforeEach, describe, expect, it, vi } from "vitest";

import { ERROR_CODES } from "@/constants/errorCodes";
import type { UserData } from "@/lib/services/auth-server.service";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/lib/auth", () => ({ auth: authMock }));

function user(overrides: Partial<UserData> = {}): UserData {
  return {
    id: "42",
    email: "reader@example.com",
    roles: ["ROLE_USER"],
    authenticated: true,
    ...overrides,
  };
}

/**
 * `getCurrentUser` is wrapped in React `cache`, so each test gets a fresh
 * module instance to avoid sharing memoized sessions between cases.
 */
async function loadAuthUtils() {
  return import("./auth-utils");
}

beforeEach(() => {
  vi.resetModules();
  authMock.mockReset();
});

describe("getCurrentUser", () => {
  it("returns null when there is no session", async () => {
    authMock.mockResolvedValue(null);
    const { getCurrentUser } = await loadAuthUtils();

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("maps the session user to the internal user shape", async () => {
    authMock.mockResolvedValue({
      user: { id: "7", email: "admin@example.com", roles: ["ROLE_ADMIN"] },
    });
    const { getCurrentUser } = await loadAuthUtils();

    await expect(getCurrentUser()).resolves.toEqual({
      id: "7",
      email: "admin@example.com",
      roles: ["ROLE_ADMIN"],
      authenticated: true,
    });
  });
});

describe("requireUserId", () => {
  it("returns the numeric id of the authenticated user", async () => {
    authMock.mockResolvedValue({ user: user({ id: "42" }) });
    const { requireUserId } = await loadAuthUtils();

    await expect(requireUserId()).resolves.toBe(42);
  });

  it("throws AUTH_UNAUTHENTICATED without a session", async () => {
    authMock.mockResolvedValue(null);
    const { requireUserId } = await loadAuthUtils();

    await expect(requireUserId()).rejects.toMatchObject({
      name: "AppError",
      code: ERROR_CODES.AUTH.UNAUTHENTICATED,
    });
  });
});

describe("isAdmin", () => {
  it("returns true for a session carrying ROLE_ADMIN", async () => {
    authMock.mockResolvedValue({ user: user({ roles: ["ROLE_USER", "ROLE_ADMIN"] }) });
    const { isAdmin } = await loadAuthUtils();

    await expect(isAdmin()).resolves.toBe(true);
  });

  it("returns false for a regular user or no session", async () => {
    authMock.mockResolvedValue({ user: user({ roles: ["ROLE_USER"] }) });
    const { isAdmin } = await loadAuthUtils();

    await expect(isAdmin()).resolves.toBe(false);

    authMock.mockResolvedValue(null);
    await expect(isAdmin()).resolves.toBe(false);
  });
});

describe("requireAdmin", () => {
  it("returns the admin user", async () => {
    const admin = user({ roles: ["ROLE_ADMIN"] });
    authMock.mockResolvedValue({ user: admin });
    const { requireAdmin } = await loadAuthUtils();

    await expect(requireAdmin()).resolves.toEqual(admin);
  });

  it("rejects unauthenticated callers", async () => {
    authMock.mockResolvedValue(null);
    const { requireAdmin } = await loadAuthUtils();

    await expect(requireAdmin()).rejects.toThrow("Unauthenticated");
  });

  it("rejects authenticated users without ROLE_ADMIN", async () => {
    authMock.mockResolvedValue({ user: user({ roles: ["ROLE_USER"] }) });
    const { requireAdmin } = await loadAuthUtils();

    await expect(requireAdmin()).rejects.toThrow("Forbidden: Admin access required");
  });
});
