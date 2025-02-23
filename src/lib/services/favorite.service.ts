import connectDB from "@/lib/mongodb";
import { FavoriteModel } from "@/lib/models/favorite.model";
import { AuthServerService } from "./auth-server.service";

interface User {
  id: string;
  email: string;
}

export class FavoriteService {
  private static readonly FAVORITES_CHANGE_EVENT = "favoritesChanged";

  private static dispatchFavoritesChanged() {
    // Dispatch l'événement pour notifier les changements
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(FavoriteService.FAVORITES_CHANGE_EVENT));
    }
  }

  private static getCurrentUser(): User {
    const user = AuthServerService.getCurrentUser();
    if (!user) {
      throw new Error("Utilisateur non authentifié");
    }
    return user;
  }

  /**
   * Vérifie si une série est dans les favoris
   */
  static async isFavorite(seriesId: string): Promise<boolean> {
    try {
      const user = this.getCurrentUser();
      await connectDB();

      const favorite = await FavoriteModel.findOne({
        userId: user.id,
        seriesId: seriesId,
      });

      return !!favorite;
    } catch (error) {
      console.error("Erreur lors de la vérification du favori:", error);
      return false;
    }
  }

  /**
   * Ajoute une série aux favoris
   */
  static async addToFavorites(seriesId: string): Promise<void> {
    try {
      const user = this.getCurrentUser();
      await connectDB();

      await FavoriteModel.findOneAndUpdate(
        { userId: user.id, seriesId },
        { userId: user.id, seriesId },
        { upsert: true }
      );

      this.dispatchFavoritesChanged();
    } catch (error) {
      console.error("Erreur lors de l'ajout aux favoris:", error);
      throw new Error("Erreur lors de l'ajout aux favoris");
    }
  }

  /**
   * Retire une série des favoris
   */
  static async removeFromFavorites(seriesId: string): Promise<void> {
    try {
      const user = this.getCurrentUser();
      await connectDB();

      await FavoriteModel.findOneAndDelete({
        userId: user.id,
        seriesId,
      });

      this.dispatchFavoritesChanged();
    } catch (error) {
      console.error("Erreur lors de la suppression des favoris:", error);
      throw new Error("Erreur lors de la suppression des favoris");
    }
  }

  /**
   * Récupère tous les IDs des séries favorites
   */
  static async getAllFavoriteIds(): Promise<string[]> {
    try {
      const user = this.getCurrentUser();
      await connectDB();

      const favorites = await FavoriteModel.find({ userId: user.id });
      return favorites.map((favorite) => favorite.seriesId);
    } catch (error) {
      console.error("Erreur lors de la récupération des favoris:", error);
      return [];
    }
  }
}
