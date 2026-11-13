import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { ADMIN_ROLE } from "../auth-utils";
import { ERROR_CODES, type ErrorCode } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";

export interface AdminUserData {
  id: string;
  email: string;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    favorites: number;
  };
  hasKomgaConfig: boolean;
  hasPreferences: boolean;
}

export interface AdminStatsData {
  totalUsers: number;
  totalAdmins: number;
  usersWithKomga: number;
  usersWithPreferences: number;
}

/** Rôles qu'un administrateur peut attribuer. */
export const ASSIGNABLE_ROLES = ["ROLE_USER", ADMIN_ROLE] as const;

const SALT_ROUNDS = 10;

/** Laisse passer une `AppError` métier, enveloppe toute autre panne dans `code`. */
function wrap(error: unknown, code: ErrorCode): never {
  if (error instanceof AppError) throw error;
  throw new AppError(code, {}, error);
}

/** Identifiant cible ; un identifiant non numérique ne désigne aucun utilisateur. */
function parseTargetId(userId: string): number {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(ERROR_CODES.AUTH.USER_NOT_FOUND);
  }
  return id;
}

async function assertUserExists(id: number): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) {
    throw new AppError(ERROR_CODES.AUTH.USER_NOT_FOUND);
  }
}

/**
 * Opérations d'administration. L'autorisation n'est pas vérifiée ici : les
 * actions passent par `runAction({ requireRole: "admin" })` et la page admin
 * par `isAdmin()`. Les opérations qui protègent l'administrateur contre
 * lui-même reçoivent son identifiant (`actorId`).
 */
export class AdminService {
  static async getAllUsers(): Promise<AdminUserData[]> {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          roles: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              favorites: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Vérifier les configs en 2 requêtes groupées (au lieu de 2N requêtes)
      const userIds = users.map((u) => u.id);
      const [komgaConfigs, preferences] = await Promise.all([
        prisma.komgaConfig.findMany({
          where: { userId: { in: userIds } },
          select: { userId: true, id: true },
        }),
        prisma.preferences.findMany({
          where: { userId: { in: userIds } },
          select: { userId: true, id: true },
        }),
      ]);

      const komgaByUser = new Set(komgaConfigs.map((c) => c.userId));
      const prefsByUser = new Set(preferences.map((p) => p.userId));

      return users.map((user) => ({
        ...user,
        id: user.id.toString(),
        roles: user.roles as string[],
        hasKomgaConfig: komgaByUser.has(user.id),
        hasPreferences: prefsByUser.has(user.id),
      }));
    } catch (error) {
      wrap(error, ERROR_CODES.ADMIN.FETCH_USERS_ERROR);
    }
  }

  static async updateUserRoles(userId: string, roles: string[]): Promise<void> {
    try {
      const id = parseTargetId(userId);
      await assertUserExists(id);
      await prisma.user.update({
        where: { id },
        data: { roles },
      });
    } catch (error) {
      wrap(error, ERROR_CODES.ADMIN.UPDATE_USER_ERROR);
    }
  }

  static async deleteUser(actorId: number, userId: string): Promise<void> {
    try {
      const id = parseTargetId(userId);
      if (id === actorId) {
        throw new AppError(ERROR_CODES.ADMIN.CANNOT_DELETE_SELF);
      }
      await assertUserExists(id);
      // La cascade supprime les relations (configs, préférences, favoris).
      await prisma.user.delete({ where: { id } });
    } catch (error) {
      wrap(error, ERROR_CODES.ADMIN.DELETE_USER_ERROR);
    }
  }

  static async resetUserPassword(actorId: number, userId: string, newPassword: string): Promise<void> {
    try {
      const id = parseTargetId(userId);
      // Son propre mot de passe se change depuis le compte, avec l'ancien.
      if (id === actorId) {
        throw new AppError(ERROR_CODES.ADMIN.CANNOT_RESET_OWN_PASSWORD);
      }
      await assertUserExists(id);
      const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await prisma.user.update({
        where: { id },
        data: { password: hashedPassword },
      });
    } catch (error) {
      wrap(error, ERROR_CODES.ADMIN.RESET_PASSWORD_ERROR);
    }
  }

  static async getUserStats(): Promise<AdminStatsData> {
    try {
      const [totalUsers, usersWithKomga, usersWithPreferences, allUsers] = await Promise.all([
        prisma.user.count(),
        prisma.komgaConfig.count(),
        prisma.preferences.count(),
        prisma.user.findMany({ select: { roles: true } }),
      ]);

      const totalAdmins = allUsers.filter(
        (user) => Array.isArray(user.roles) && user.roles.includes(ADMIN_ROLE)
      ).length;

      return {
        totalUsers,
        totalAdmins,
        usersWithKomga,
        usersWithPreferences,
      };
    } catch (error) {
      wrap(error, ERROR_CODES.ADMIN.FETCH_STATS_ERROR);
    }
  }
}
