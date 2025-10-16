import prisma from "@/lib/prisma";
import { getCurrentUser } from "../auth-utils";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import bcrypt from "bcryptjs";

export interface UserProfile {
  id: string;
  email: string;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class UserService {
  private static readonly SALT_ROUNDS = 10;

  static async getUserProfile(): Promise<UserProfile> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new AppError(ERROR_CODES.AUTH.UNAUTHENTICATED);
      }

      const user = await prisma.user.findUnique({
        where: { id: currentUser.id },
        select: {
          id: true,
          email: true,
          roles: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new AppError(ERROR_CODES.AUTH.USER_NOT_FOUND);
      }

      return user;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.AUTH.FETCH_ERROR, {}, error);
    }
  }

  static async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new AppError(ERROR_CODES.AUTH.UNAUTHENTICATED);
      }

      // Récupérer l'utilisateur avec son mot de passe
      const user = await prisma.user.findUnique({
        where: { id: currentUser.id },
      });

      if (!user) {
        throw new AppError(ERROR_CODES.AUTH.USER_NOT_FOUND);
      }

      // Vérifier l'ancien mot de passe
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        throw new AppError(ERROR_CODES.AUTH.INVALID_PASSWORD);
      }

      // Hasher le nouveau mot de passe
      const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

      // Mettre à jour le mot de passe
      await prisma.user.update({
        where: { id: currentUser.id },
        data: { password: hashedPassword },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.AUTH.PASSWORD_CHANGE_ERROR, {}, error);
    }
  }

  static async getUserStats() {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new AppError(ERROR_CODES.AUTH.UNAUTHENTICATED);
      }

      const [favoritesCount, preferences, komgaConfig] = await Promise.all([
        prisma.favorite.count({
          where: { userId: currentUser.id },
        }),
        prisma.preferences.findUnique({
          where: { userId: currentUser.id },
        }),
        prisma.komgaConfig.findUnique({
          where: { userId: currentUser.id },
        }),
      ]);

      return {
        favoritesCount,
        hasPreferences: !!preferences,
        hasKomgaConfig: !!komgaConfig,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.AUTH.FETCH_ERROR, {}, error);
    }
  }
}

