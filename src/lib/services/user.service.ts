import prisma from "@/lib/prisma";
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

/**
 * Profil, statistiques et mot de passe d'un utilisateur identifié par
 * l'appelant. Le service ne lit pas la session : le runner (`requireUser`) ou
 * la page qui a vérifié la session lui passe `userId` (ADR 0029).
 */
export class UserService {
  private static readonly SALT_ROUNDS = 10;

  static async getUserProfile(userId: number): Promise<UserProfile> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
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

      return {
        id: user.id.toString(),
        email: user.email,
        roles: user.roles as string[],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.AUTH.FETCH_ERROR, {}, error);
    }
  }

  static async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      // Récupérer l'utilisateur avec son mot de passe
      const user = await prisma.user.findUnique({
        where: { id: userId },
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

      // Mettre à jour le mot de passe ; la nouvelle version de session ferme
      // toutes les sessions ouvertes, y compris celle-ci (ADR 0032).
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword, sessionVersion: { increment: 1 } },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.AUTH.PASSWORD_CHANGE_ERROR, {}, error);
    }
  }

  static async getUserStats(userId: number) {
    try {
      const [favoritesCount, preferences, komgaConfigs, stripstreamConfigs] = await Promise.all([
        prisma.favorite.count({
          where: { userId },
        }),
        prisma.preferences.findUnique({
          where: { userId },
        }),
        prisma.komgaConfig.count({ where: { userId } }),
        prisma.stripstreamConfig.count({ where: { userId } }),
      ]);

      return {
        favoritesCount,
        hasPreferences: !!preferences,
        hasConnection: komgaConfigs + stripstreamConfigs > 0,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.AUTH.FETCH_ERROR, {}, error);
    }
  }
}
