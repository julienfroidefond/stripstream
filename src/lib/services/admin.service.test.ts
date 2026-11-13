import { beforeEach, describe, expect, it, vi } from "vitest";

const { userFindUnique, userFindMany, userUpdate, userCount, komgaFindMany, stripstreamFindMany, preferencesCount } =
  vi.hoisted(() => ({
    userFindUnique: vi.fn(),
    userFindMany: vi.fn(),
    userUpdate: vi.fn(),
    userCount: vi.fn(),
    komgaFindMany: vi.fn(),
    stripstreamFindMany: vi.fn(),
    preferencesCount: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({
  default: {
    user: { findUnique: userFindUnique, findMany: userFindMany, update: userUpdate, count: userCount },
    komgaConfig: { findMany: komgaFindMany },
    stripstreamConfig: { findMany: stripstreamFindMany },
    preferences: { count: preferencesCount },
  },
}));
vi.mock("@/lib/auth-utils", () => ({ ADMIN_ROLE: "ROLE_ADMIN" }));

import { AdminService } from "./admin.service";
import { ERROR_CODES } from "@/constants/errorCodes";

const ADMIN = ["ROLE_USER", "ROLE_ADMIN"];
const USER = ["ROLE_USER"];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminService.updateUserRoles", () => {
  it("refuses that an admin removes their own admin role", async () => {
    userFindUnique.mockResolvedValue({ roles: ADMIN });
    userFindMany.mockResolvedValue([{ roles: ADMIN }, { roles: ADMIN }]);

    await expect(AdminService.updateUserRoles(7, "7", USER)).rejects.toMatchObject({
      code: ERROR_CODES.ADMIN.CANNOT_REMOVE_OWN_ADMIN,
    });
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("refuses to demote the last admin", async () => {
    userFindUnique.mockResolvedValue({ roles: ADMIN });
    userFindMany.mockResolvedValue([{ roles: ADMIN }, { roles: USER }]);

    await expect(AdminService.updateUserRoles(7, "12", USER)).rejects.toMatchObject({
      code: ERROR_CODES.ADMIN.LAST_ADMIN,
    });
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("demotes an admin when another admin remains", async () => {
    userFindUnique.mockResolvedValue({ roles: ADMIN });
    userFindMany.mockResolvedValue([{ roles: ADMIN }, { roles: ADMIN }]);

    await AdminService.updateUserRoles(7, "12", USER);

    expect(userUpdate).toHaveBeenCalledWith({ where: { id: 12 }, data: { roles: USER } });
  });

  it("lets an admin keep their own admin role while editing it", async () => {
    userFindUnique.mockResolvedValue({ roles: ADMIN });

    await AdminService.updateUserRoles(7, "7", ADMIN);

    expect(userFindMany).not.toHaveBeenCalled();
    expect(userUpdate).toHaveBeenCalledWith({ where: { id: 7 }, data: { roles: ADMIN } });
  });

  it("reports an unknown user", async () => {
    userFindUnique.mockResolvedValue(null);

    await expect(AdminService.updateUserRoles(7, "99", USER)).rejects.toMatchObject({
      code: ERROR_CODES.AUTH.USER_NOT_FOUND,
    });
  });
});

describe("AdminService.getUserStats", () => {
  it("counts distinct users with at least one connection of any provider", async () => {
    userCount.mockResolvedValue(4);
    preferencesCount.mockResolvedValue(2);
    userFindMany.mockResolvedValue([{ roles: ADMIN }, { roles: USER }, { roles: USER }, { roles: USER }]);
    // User 1 a deux configs Komga et une Stripstream, user 2 seulement Stripstream.
    komgaFindMany.mockResolvedValue([{ userId: 1 }]);
    stripstreamFindMany.mockResolvedValue([{ userId: 1 }, { userId: 2 }]);

    await expect(AdminService.getUserStats()).resolves.toEqual({
      totalUsers: 4,
      totalAdmins: 1,
      usersWithConnection: 2,
      usersWithPreferences: 2,
    });
    expect(komgaFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ distinct: ["userId"], select: { userId: true } })
    );
  });
});
