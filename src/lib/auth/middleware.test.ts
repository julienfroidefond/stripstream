import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getTokenMock, loadSessionUserMock, loggerErrorMock } = vi.hoisted(() => ({
  getTokenMock: vi.fn(),
  loadSessionUserMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}));

vi.mock("next-auth/jwt", () => ({ getToken: getTokenMock }));
vi.mock("@/lib/auth/session-user", () => ({ loadSessionUser: loadSessionUserMock }));
vi.mock("@/lib/logger", () => ({ default: { error: loggerErrorMock } }));

import { getAuthSession } from "./middleware";

function request() {
  return new NextRequest("http://localhost/libraries/lib1");
}

function token(overrides: Record<string, unknown> = {}) {
  return {
    sub: "7",
    email: "reader@example.com",
    roles: JSON.stringify(["ROLE_USER"]),
    sessionVersion: 1,
    ...overrides,
  };
}

beforeEach(() => {
  getTokenMock.mockReset();
  loadSessionUserMock.mockReset();
  loggerErrorMock.mockReset();
});

describe("getAuthSession", () => {
  it("returns null without a token", async () => {
    getTokenMock.mockResolvedValue(null);

    await expect(getAuthSession(request())).resolves.toBeNull();
    expect(loadSessionUserMock).not.toHaveBeenCalled();
  });

  it("returns null for a token without a subject", async () => {
    getTokenMock.mockResolvedValue(token({ sub: undefined }));

    await expect(getAuthSession(request())).resolves.toBeNull();
    expect(loadSessionUserMock).not.toHaveBeenCalled();
  });

  it("builds the session from the database roles, not the token's", async () => {
    getTokenMock.mockResolvedValue(token());
    loadSessionUserMock.mockResolvedValue({
      roles: ["ROLE_USER", "ROLE_ADMIN"],
      sessionVersion: 1,
    });

    await expect(getAuthSession(request())).resolves.toEqual({
      user: {
        id: "7",
        email: "reader@example.com",
        roles: ["ROLE_USER", "ROLE_ADMIN"],
      },
    });
    expect(loadSessionUserMock).toHaveBeenCalledWith(7);
  });

  it("returns null when the user no longer exists", async () => {
    getTokenMock.mockResolvedValue(token());
    loadSessionUserMock.mockResolvedValue(null);

    await expect(getAuthSession(request())).resolves.toBeNull();
  });

  it("returns null when the session version changed", async () => {
    getTokenMock.mockResolvedValue(token({ sessionVersion: 1 }));
    loadSessionUserMock.mockResolvedValue({ roles: ["ROLE_USER"], sessionVersion: 2 });

    await expect(getAuthSession(request())).resolves.toBeNull();
  });

  it("falls back to the token session when the storage read fails", async () => {
    const failure = new Error("SQLITE_BUSY");
    getTokenMock.mockResolvedValue(token());
    loadSessionUserMock.mockRejectedValue(failure);

    await expect(getAuthSession(request())).resolves.toEqual({
      user: {
        id: "7",
        email: "reader@example.com",
        roles: ["ROLE_USER"],
      },
    });
    expect(loggerErrorMock).toHaveBeenCalledWith(
      { err: failure },
      "Auth revalidation unavailable in proxy"
    );
  });

  it("returns null when getToken throws", async () => {
    getTokenMock.mockRejectedValue(new Error("JWTSessionError"));

    await expect(getAuthSession(request())).resolves.toBeNull();
  });
});
