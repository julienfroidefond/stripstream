import prisma from "@/lib/prisma";
import { requireAdmin } from "../auth-utils";
import { ERROR_CODES } from "../../constants/errorCodes";
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

export class AdminService {
  static async getAllUsers(): Promise<AdminUserData[]> {
    try {
      await requireAdmin();

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

      // Vérifier les configs pour chaque user
      const usersWithConfigs = await Promise.all(
        users.map(async (user) => {
          const [komgaConfig, preferences] = await Promise.all([
            prisma.komgaConfig.findUnique({
              where: { userId: user.id },
              select: { id: true },
            }),
            prisma.preferences.findUnique({
              where: { userId: user.id },
              select: { id: true },
            }),
          ]);

          return {
            ...user,
            id: user.id.toString(),
            roles: user.roles as string[],
            hasKomgaConfig: !!komgaConfig,
            hasPreferences: !!preferences,
          };
        })
      );

      return usersWithConfigs;
    } catch (error) {
      if (error instanceof Error && error.message.includes("Forbidden")) {
        throw new AppError(ERROR_CODES.AUTH.FORBIDDEN);
      }
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.ADMIN.FETCH_USERS_ERROR, {}, error);
    }
  }

  static async updateUserRoles(userId: string, roles: string[]): Promise<void> {
    try {
      await requireAdmin();
      const userIdInt = parseInt(userId, 10);

      // Vérifier que l'utilisateur existe
      const user = await prisma.user.findUnique({
        where: { id: userIdInt },
      });

      if (!user) {
        throw new AppError(ERROR_CODES.AUTH.USER_NOT_FOUND);
      }

      // Mettre à jour les rôles
      await prisma.user.update({
        where: { id: userIdInt },
        data: { roles },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Forbidden")) {
        throw new AppError(ERROR_CODES.AUTH.FORBIDDEN);
      }
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.ADMIN.UPDATE_USER_ERROR, {}, error);
    }
  }

  static async deleteUser(userId: string): Promise<void> {
    try {
      const admin = await requireAdmin();
      const userIdInt = parseInt(userId, 10);

      // Empêcher la suppression de son propre compte
      if (admin.id === userId) {
        throw new AppError(ERROR_CODES.ADMIN.CANNOT_DELETE_SELF);
      }

      // Vérifier que l'utilisateur existe
      const user = await prisma.user.findUnique({
        where: { id: userIdInt },
      });

      if (!user) {
        throw new AppError(ERROR_CODES.AUTH.USER_NOT_FOUND);
      }

      // Supprimer l'utilisateur (cascade supprimera les relations)
      await prisma.user.delete({
        where: { id: userIdInt },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Forbidden")) {
        throw new AppError(ERROR_CODES.AUTH.FORBIDDEN);
      }
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.ADMIN.DELETE_USER_ERROR, {}, error);
    }
  }

  static async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    try {
      const admin = await requireAdmin();
      const userIdInt = parseInt(userId, 10);

      // Empêcher la modification de son propre mot de passe via cette méthode
      if (admin.id === userId) {
        throw new AppError(ERROR_CODES.ADMIN.CANNOT_RESET_OWN_PASSWORD);
      }

      // Vérifier que l'utilisateur existe
      const user = await prisma.user.findUnique({
        where: { id: userIdInt },
      });

      if (!user) {
        throw new AppError(ERROR_CODES.AUTH.USER_NOT_FOUND);
      }

      // Hasher le nouveau mot de passe
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Mettre à jour le mot de passe
      await prisma.user.update({
        where: { id: userIdInt },
        data: { password: hashedPassword },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Forbidden")) {
        throw new AppError(ERROR_CODES.AUTH.FORBIDDEN);
      }
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.ADMIN.RESET_PASSWORD_ERROR, {}, error);
    }
  }

  static async getUserStats() {
    try {
      await requireAdmin();

      const [totalUsers, usersWithKomga, usersWithPreferences] = await Promise.all([
        prisma.user.count(),
        prisma.komgaConfig.count(),
        prisma.preferences.count(),
      ]);

      // Count admin users by fetching all users and filtering
      const allUsers = await prisma.user.findMany({
        select: { roles: true },
      });
      const totalAdmins = allUsers.filter(
        (user) => Array.isArray(user.roles) && user.roles.includes("ROLE_ADMIN")
      ).length;

      return {
        totalUsers,
        totalAdmins,
        usersWithKomga,
        usersWithPreferences,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("Forbidden")) {
        throw new AppError(ERROR_CODES.AUTH.FORBIDDEN);
      }
      throw new AppError(ERROR_CODES.ADMIN.FETCH_STATS_ERROR, {}, error);
    }
  }
}
