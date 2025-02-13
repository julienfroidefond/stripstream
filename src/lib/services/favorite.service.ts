import { storageService } from "./storage.service";

export class FavoriteService {
  /**
   * Vérifie si une série est dans les favoris
   */
  static isFavorite(seriesId: string): boolean {
    return storageService.isFavorite(seriesId);
  }

  /**
   * Ajoute une série aux favoris
   */
  static addToFavorites(seriesId: string): void {
    storageService.addFavorite(seriesId);
  }

  /**
   * Retire une série des favoris
   */
  static removeFromFavorites(seriesId: string): void {
    storageService.removeFavorite(seriesId);
  }

  /**
   * Récupère tous les IDs des séries favorites
   */
  static getAllFavoriteIds(): string[] {
    return storageService.getFavorites();
  }
}
