import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@/constants/errorCodes";

const { headersMock } = vi.hoisted(() => ({ headersMock: vi.fn() }));

vi.mock("next/headers", () => ({ headers: headersMock }));
vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/lib/providers/provider.factory", () => ({ getProvider: vi.fn() }));
vi.mock("@/lib/auth-utils", () => ({ requireUserId: vi.fn(), requireAdmin: vi.fn() }));
vi.mock("@/lib/services/preferences.service", () => ({
  PreferencesService: { getPreferences: vi.fn() },
}));
vi.mock("@/lib/logger", () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const { AuthServerService } = await import("@/lib/services/auth-server.service");
const { registerUser } = await import("./auth");

beforeEach(() => {
  headersMock.mockResolvedValue(new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }));
  vi.spyOn(AuthServerService, "registerUser").mockResolvedValue({
    id: "1",
    email: "new@example.com",
    roles: ["ROLE_USER"],
    authenticated: true,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("registerUser", () => {
  it("is closed by default, before reaching the service", async () => {
    vi.stubEnv("REGISTRATION_ENABLED", "");

    await expect(registerUser("new@example.com", "Str0ngPassword")).resolves.toMatchObject({
      success: false,
      code: ERROR_CODES.AUTH.REGISTRATION_DISABLED,
    });
    expect(AuthServerService.registerUser).not.toHaveBeenCalled();
  });

  it("registers with the client IP when explicitly enabled", async () => {
    vi.stubEnv("REGISTRATION_ENABLED", "true");

    await expect(registerUser("new@example.com", "Str0ngPassword")).resolves.toMatchObject({
      success: true,
    });
    expect(AuthServerService.registerUser).toHaveBeenCalledWith(
      "new@example.com",
      "Str0ngPassword",
      "203.0.113.9"
    );
  });
});
