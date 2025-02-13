import { storageService } from "./storage.service";

export class FavoriteService {
  private static readonly FAVORITES_CHANGE_EVENT = "favoritesChanged";

  private static dispatchFavoritesChanged() {
    // Dispatch l'événement pour notifier les changements
    window.dispatchEvent(new Event(FavoriteService.FAVORITES_CHANGE_EVENT));
  }

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
    this.dispatchFavoritesChanged();
  }

  /**
   * Retire une série des favoris
   */
  static removeFromFavorites(seriesId: string): void {
    storageService.removeFavorite(seriesId);
    this.dispatchFavoritesChanged();
  }

  /**
   * Récupère tous les IDs des séries favorites
   */
  static getAllFavoriteIds(): string[] {
    return storageService.getFavorites();
  }
}
