import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";

vi.mock("@/lib/auth/session", () => ({
  ADMIN_ROLE: "ROLE_ADMIN",
  requireUserId: vi.fn(),
  requireAdmin: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/lib/providers/provider.factory", () => ({ getProvider: vi.fn() }));
vi.mock("@/lib/services/preferences.service", () => ({
  PreferencesService: { getPreferences: vi.fn() },
}));
vi.mock("@/lib/logger", () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const { requireAdmin } = await import("@/lib/auth/session");
const { AdminService } = await import("@/lib/services/admin.service");
const { deleteUser, resetUserPassword, updateUserRoles } = await import("./admin");

let nextAdminId = 500;

beforeEach(() => {
  vi.mocked(requireAdmin).mockReset();
  vi.mocked(requireAdmin).mockResolvedValue({
    id: String(nextAdminId++),
    email: "admin@example.com",
    roles: ["ROLE_ADMIN"],
    authenticated: true,
  });
  vi.spyOn(AdminService, "deleteUser").mockResolvedValue(undefined);
  vi.spyOn(AdminService, "updateUserRoles").mockResolvedValue(undefined);
  vi.spyOn(AdminService, "resetUserPassword").mockResolvedValue(undefined);
});

describe("admin actions", () => {
  it("refuses a non-admin before reaching the service", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new AppError(ERROR_CODES.AUTH.FORBIDDEN));

    await expect(deleteUser("12")).resolves.toMatchObject({
      success: false,
      code: ERROR_CODES.AUTH.FORBIDDEN,
    });
    expect(AdminService.deleteUser).not.toHaveBeenCalled();
  });

  it("hands the acting admin id to the service", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      id: "7",
      email: "admin@example.com",
      roles: ["ROLE_ADMIN"],
      authenticated: true,
    });

    await expect(deleteUser("12")).resolves.toMatchObject({ success: true });
    expect(AdminService.deleteUser).toHaveBeenCalledWith(7, "12");
  });

  it.each([[[]], [["ROLE_ROOT"]]])("rejects invalid roles %j", async (roles) => {
    await expect(updateUserRoles("12", roles)).resolves.toMatchObject({
      success: false,
      code: ERROR_CODES.ADMIN.INVALID_ROLES,
    });
    expect(AdminService.updateUserRoles).not.toHaveBeenCalled();
  });

  it("hands the acting admin id to the role update", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      id: "7",
      email: "admin@example.com",
      roles: ["ROLE_ADMIN"],
      authenticated: true,
    });

    await expect(updateUserRoles("12", ["ROLE_USER"])).resolves.toMatchObject({ success: true });
    expect(AdminService.updateUserRoles).toHaveBeenCalledWith(7, "12", ["ROLE_USER"]);
  });

  it("rejects a weak reset password and rate-limits resets per admin", async () => {
    await expect(resetUserPassword("12", "weak")).resolves.toMatchObject({
      code: ERROR_CODES.AUTH.PASSWORD_NOT_STRONG,
    });

    // La tentative faible a consommé une unité : 9 autres passent, la 11e est refusée.
    const codes = [];
    for (let attempt = 0; attempt < 10; attempt++) {
      codes.push((await resetUserPassword("12", "Str0ngPassword")).code);
    }

    expect(codes.slice(0, 9)).toEqual(Array(9).fill("OK"));
    expect(codes[9]).toBe(ERROR_CODES.AUTH.RATE_LIMITED);
    expect(AdminService.resetUserPassword).toHaveBeenCalledTimes(9);
  });
});
