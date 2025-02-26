import { ERROR_CODES } from "./errorCodes";

export const ERROR_MESSAGES: Record<string, string> = {
  // Middleware
  [ERROR_CODES.MIDDLEWARE.UNAUTHORIZED]: "🚫 Accès non autorisé",
  [ERROR_CODES.MIDDLEWARE.INVALID_TOKEN]: "🔐 Session invalide ou expirée",
  [ERROR_CODES.MIDDLEWARE.INVALID_SESSION]: "⚠️ Données de session invalides",

  // MongoDB
  [ERROR_CODES.MONGODB.MISSING_URI]:
    "🔧 Veuillez définir la variable d'environnement MONGODB_URI dans votre fichier .env",
  [ERROR_CODES.MONGODB.CONNECTION_FAILED]: "🔌 La connexion à MongoDB a échoué",

  // Auth
  [ERROR_CODES.AUTH.UNAUTHENTICATED]: "🔒 Utilisateur non authentifié",
  [ERROR_CODES.AUTH.INVALID_CREDENTIALS]: "⛔️ Identifiants invalides",
  [ERROR_CODES.AUTH.PASSWORD_NOT_STRONG]: "💪 Le mot de passe n'est pas assez fort",
  [ERROR_CODES.AUTH.PASSWORD_MISMATCH]: "❌ Les mots de passe ne correspondent pas",
  [ERROR_CODES.AUTH.EMAIL_EXISTS]: "📧 Cette adresse email est déjà utilisée",
  [ERROR_CODES.AUTH.INVALID_USER_DATA]: "👤 Données utilisateur invalides",
  [ERROR_CODES.AUTH.LOGOUT_ERROR]: "🚪 Erreur lors de la déconnexion",

  // Komga
  [ERROR_CODES.KOMGA.MISSING_CONFIG]: "⚙️ Configuration Komga non trouvée",
  [ERROR_CODES.KOMGA.MISSING_CREDENTIALS]: "🔑 Credentials Komga manquants",
  [ERROR_CODES.KOMGA.CONNECTION_ERROR]: "🌐 Erreur lors du test de connexion",
  [ERROR_CODES.KOMGA.HTTP_ERROR]: "🌍 Erreur HTTP: {status} {statusText}",
  [ERROR_CODES.KOMGA.SERVER_UNREACHABLE]:
    "📡 Impossible de se connecter au serveur. Vérifiez l'URL et que le serveur est accessible.",

  // Library
  [ERROR_CODES.LIBRARY.NOT_FOUND]: "📚 Bibliothèque {libraryId} non trouvée",
  [ERROR_CODES.LIBRARY.FETCH_ERROR]: "📚 Erreur lors de la récupération des bibliothèques",

  // Series
  [ERROR_CODES.SERIES.FETCH_ERROR]: "📖 Erreur lors de la récupération des séries",
  [ERROR_CODES.SERIES.NO_BOOKS_FOUND]: "📚 Aucun livre trouvé dans la série",

  // Book
  [ERROR_CODES.BOOK.NOT_FOUND]: "📕 Livre non trouvé",
  [ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR]: "📈 Erreur lors de la mise à jour de la progression",
  [ERROR_CODES.BOOK.PROGRESS_DELETE_ERROR]: "🗑️ Erreur lors de la suppression de la progression",
  [ERROR_CODES.BOOK.PAGES_FETCH_ERROR]: "📄 Erreur lors de la récupération des pages",
  [ERROR_CODES.BOOK.DOWNLOAD_CANCELLED]: "❌ Téléchargement annulé",

  // Favorite
  [ERROR_CODES.FAVORITE.ADD_ERROR]: "⭐️ Impossible d'ajouter la série aux favoris",
  [ERROR_CODES.FAVORITE.DELETE_ERROR]: "🗑️ Impossible de retirer la série des favoris",
  [ERROR_CODES.FAVORITE.FETCH_ERROR]: "⭐️ Impossible de récupérer la liste des favoris",
  [ERROR_CODES.FAVORITE.UPDATE_ERROR]: "📝 Impossible de mettre à jour les favoris",
  [ERROR_CODES.FAVORITE.NETWORK_ERROR]: "📡 Erreur réseau lors de l'accès aux favoris",
  [ERROR_CODES.FAVORITE.SERVER_ERROR]: "🔧 Le serveur a rencontré une erreur lors du traitement des favoris",
  [ERROR_CODES.FAVORITE.STATUS_CHECK_ERROR]: "❓ Impossible de vérifier le statut des favoris",

  // Preferences
  [ERROR_CODES.PREFERENCES.FETCH_ERROR]: "⚙️ Erreur lors de la récupération des préférences",
  [ERROR_CODES.PREFERENCES.UPDATE_ERROR]: "⚙️ Erreur lors de la mise à jour des préférences",
  [ERROR_CODES.PREFERENCES.CONTEXT_ERROR]:
    "🔄 usePreferences doit être utilisé dans un PreferencesProvider",

  // Cache
  [ERROR_CODES.CACHE.DELETE_ERROR]: "🗑️ Erreur lors de la suppression du cache",
  [ERROR_CODES.CACHE.SAVE_ERROR]: "💾 Erreur lors de la sauvegarde dans le cache",
  [ERROR_CODES.CACHE.LOAD_ERROR]: "📂 Erreur lors du chargement du cache",
  [ERROR_CODES.CACHE.CLEAR_ERROR]: "🧹 Erreur lors de la suppression complète du cache",
  [ERROR_CODES.CACHE.MODE_FETCH_ERROR]: "⚙️ Erreur lors de la récupération du mode de cache",
  [ERROR_CODES.CACHE.MODE_UPDATE_ERROR]: "⚙️ Erreur lors de la mise à jour du mode de cache",
  [ERROR_CODES.CACHE.INVALID_MODE]: "⚠️ Mode de cache invalide. Doit être 'file' ou 'memory'",

  // UI
  [ERROR_CODES.UI.TABS_TRIGGER_ERROR]: "🔄 TabsTrigger doit être utilisé dans un composant Tabs",
  [ERROR_CODES.UI.TABS_CONTENT_ERROR]: "🔄 TabsContent doit être utilisé dans un composant Tabs",

  // Image
  [ERROR_CODES.IMAGE.FETCH_ERROR]: "🖼️ Erreur lors de la récupération de l'image",

  // Home
  [ERROR_CODES.HOME.FETCH_ERROR]:
    "🏠 Erreur lors de la récupération des données de la page d'accueil",

  // Config
  [ERROR_CODES.CONFIG.SAVE_ERROR]: "💾 Erreur lors de la sauvegarde de la configuration",
  [ERROR_CODES.CONFIG.FETCH_ERROR]: "⚙️ Erreur lors de la récupération de la configuration",
  [ERROR_CODES.CONFIG.TTL_SAVE_ERROR]: "⏱️ Erreur lors de la sauvegarde de la configuration TTL",
  [ERROR_CODES.CONFIG.TTL_FETCH_ERROR]: "⏱️ Erreur lors de la récupération de la configuration TTL",

  // Debug
  [ERROR_CODES.DEBUG.FETCH_ERROR]: "🔍 Erreur lors de la récupération des logs",
  [ERROR_CODES.DEBUG.SAVE_ERROR]: "💾 Erreur lors de l'enregistrement du log",
  [ERROR_CODES.DEBUG.CLEAR_ERROR]: "🧹 Erreur lors de la suppression des logs",

  // Client
  [ERROR_CODES.CLIENT.FETCH_ERROR]: "🌐 Erreur lors de la requête",
  [ERROR_CODES.CLIENT.NETWORK_ERROR]: "📡 Erreur de connexion réseau",
  [ERROR_CODES.CLIENT.REQUEST_FAILED]: "❌ La requête a échoué",
} as const;
