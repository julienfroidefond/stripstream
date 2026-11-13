import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  userFindUnique,
  userUpdate,
  favoriteCount,
  preferencesFindUnique,
  komgaCount,
  stripstreamCount,
} = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  favoriteCount: vi.fn(),
  preferencesFindUnique: vi.fn(),
  komgaCount: vi.fn(),
  stripstreamCount: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    user: { findUnique: userFindUnique, update: userUpdate },
    favorite: { count: favoriteCount },
    preferences: { findUnique: preferencesFindUnique },
    komgaConfig: { count: komgaCount },
    stripstreamConfig: { count: stripstreamCount },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(async (plain: string, hash: string) => hash === `hash:${plain}`),
    hash: vi.fn(async (plain: string) => `hash:${plain}`),
  },
}));

import { UserService } from "./user.service";
import { ERROR_CODES } from "@/constants/errorCodes";

/**
 * L'identité est un paramètre : aucun mock de session. Ces tests prouvent que
 * le service lit et écrit la ligne de l'utilisateur qu'on lui passe.
 */
beforeEach(() => {
  vi.clearAllMocks();
});

describe("UserService — injected identity", () => {
  it("loads the profile of the userId it receives", async () => {
    userFindUnique.mockResolvedValue({
      id: 7,
      email: "seven@example.com",
      roles: ["ROLE_USER"],
      createdAt: new Date(0),
      updatedAt: new Date(0),
    });

    const profile = await UserService.getUserProfile(7);

    expect(userFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 7 } }));
    expect(profile).toMatchObject({ id: "7", email: "seven@example.com" });
  });

  it("reports USER_NOT_FOUND for an unknown userId", async () => {
    userFindUnique.mockResolvedValue(null);

    await expect(UserService.getUserProfile(404)).rejects.toMatchObject({
      code: ERROR_CODES.AUTH.USER_NOT_FOUND,
    });
  });

  it("scopes the stats to the userId it receives", async () => {
    favoriteCount.mockResolvedValue(3);
    preferencesFindUnique.mockResolvedValue({ id: 1 });
    komgaCount.mockResolvedValue(0);
    stripstreamCount.mockResolvedValue(0);

    await expect(UserService.getUserStats(7)).resolves.toEqual({
      favoritesCount: 3,
      hasPreferences: true,
      hasConnection: false,
    });
    expect(favoriteCount).toHaveBeenCalledWith({ where: { userId: 7 } });
    expect(preferencesFindUnique).toHaveBeenCalledWith({ where: { userId: 7 } });
    expect(komgaCount).toHaveBeenCalledWith({ where: { userId: 7 } });
    expect(stripstreamCount).toHaveBeenCalledWith({ where: { userId: 7 } });
  });

  it("counts a Stripstream-only user as connected", async () => {
    favoriteCount.mockResolvedValue(0);
    preferencesFindUnique.mockResolvedValue(null);
    komgaCount.mockResolvedValue(0);
    stripstreamCount.mockResolvedValue(1);

    await expect(UserService.getUserStats(7)).resolves.toMatchObject({ hasConnection: true });
  });

  it("changes the password of the userId it receives", async () => {
    userFindUnique.mockResolvedValue({ id: 7, password: "hash:OldPassw0rd" });

    await UserService.changePassword(7, "OldPassw0rd", "NewPassw0rd!");

    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { password: "hash:NewPassw0rd!", sessionVersion: { increment: 1 } },
    });
  });

  it("refuses a wrong current password without writing", async () => {
    userFindUnique.mockResolvedValue({ id: 7, password: "hash:OldPassw0rd" });

    await expect(UserService.changePassword(7, "wrong", "NewPassw0rd!")).rejects.toMatchObject({
      code: ERROR_CODES.AUTH.INVALID_PASSWORD,
    });
    expect(userUpdate).not.toHaveBeenCalled();
  });
});
