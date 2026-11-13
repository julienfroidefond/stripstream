import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";

vi.mock("@/lib/auth-utils", () => ({
  requireUserId: vi.fn(),
  requireAdmin: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/lib/providers/provider.factory", () => ({ getProvider: vi.fn() }));
vi.mock("@/lib/services/preferences.service", () => ({
  PreferencesService: { getPreferences: vi.fn() },
}));
vi.mock("@/lib/services/user.service", () => ({
  UserService: { changePassword: vi.fn() },
}));
vi.mock("@/lib/logger", () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const { requireUserId } = await import("@/lib/auth-utils");
const { UserService } = await import("@/lib/services/user.service");
const { changePassword } = await import("./password");

const STRONG = "NewPassw0rd";

/** Chaque test prend un utilisateur distinct : les fenêtres mémoire restent isolées. */
let nextUserId = 1000;

beforeEach(() => {
  vi.mocked(requireUserId).mockReset();
  vi.mocked(UserService.changePassword).mockReset();
  vi.mocked(requireUserId).mockResolvedValue(nextUserId++);
  vi.mocked(UserService.changePassword).mockResolvedValue(undefined);
});

describe("changePassword", () => {
  it("changes the password of an authenticated user", async () => {
    const result = await changePassword("OldPassw0rd", STRONG);

    expect(result).toMatchObject({ success: true, code: "OK" });
    expect(UserService.changePassword).toHaveBeenCalledWith("OldPassw0rd", STRONG);
  });

  it("refuses an anonymous caller without touching the password", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new AppError(ERROR_CODES.AUTH.UNAUTHENTICATED));

    const result = await changePassword("OldPassw0rd", STRONG);

    expect(result).toMatchObject({ success: false, code: ERROR_CODES.AUTH.UNAUTHENTICATED });
    expect(UserService.changePassword).not.toHaveBeenCalled();
  });

  it("rejects a weak new password with a stable code", async () => {
    const result = await changePassword("OldPassw0rd", "weak");

    expect(result).toMatchObject({ success: false, code: ERROR_CODES.AUTH.PASSWORD_NOT_STRONG });
    expect(UserService.changePassword).not.toHaveBeenCalled();
  });

  it("returns the service code when the current password is wrong", async () => {
    vi.mocked(UserService.changePassword).mockRejectedValue(
      new AppError(ERROR_CODES.AUTH.INVALID_PASSWORD)
    );

    const result = await changePassword("wrong", STRONG);

    expect(result).toMatchObject({ success: false, code: ERROR_CODES.AUTH.INVALID_PASSWORD });
  });

  it("rate-limits attempts per user so the bcrypt check cannot be brute-forced", async () => {
    vi.mocked(UserService.changePassword).mockRejectedValue(
      new AppError(ERROR_CODES.AUTH.INVALID_PASSWORD)
    );

    const results = [];
    for (let attempt = 0; attempt < 6; attempt++) {
      results.push(await changePassword(`guess-${attempt}`, STRONG));
    }

    expect(results.slice(0, 5).map((r) => r.code)).toEqual(
      Array(5).fill(ERROR_CODES.AUTH.INVALID_PASSWORD)
    );
    expect(results[5]).toMatchObject({
      success: false,
      code: ERROR_CODES.AUTH.RATE_LIMITED,
      retryAfterSeconds: expect.any(Number),
    });
    expect(UserService.changePassword).toHaveBeenCalledTimes(5);
  });
});
