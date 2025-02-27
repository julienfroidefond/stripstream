import { ERROR_CODES } from "./errorCodes";

export const ERROR_MESSAGES: Record<string, string> = {
  // Middleware
  [ERROR_CODES.MIDDLEWARE.UNAUTHORIZED]: "🚫 Unauthorized access",
  [ERROR_CODES.MIDDLEWARE.INVALID_TOKEN]: "🔐 Invalid or expired session",
  [ERROR_CODES.MIDDLEWARE.INVALID_SESSION]: "⚠️ Invalid session data",

  // MongoDB
  [ERROR_CODES.MONGODB.MISSING_URI]:
    "🔧 Please set MONGODB_URI environment variable in your .env file",
  [ERROR_CODES.MONGODB.CONNECTION_FAILED]: "🔌 MongoDB connection failed",

  // Auth
  [ERROR_CODES.AUTH.UNAUTHENTICATED]: "🔒 User not authenticated",
  [ERROR_CODES.AUTH.INVALID_CREDENTIALS]: "⛔️ Invalid credentials",
  [ERROR_CODES.AUTH.PASSWORD_NOT_STRONG]: "💪 Password is not strong enough",
  [ERROR_CODES.AUTH.PASSWORD_MISMATCH]: "❌ Passwords do not match",
  [ERROR_CODES.AUTH.EMAIL_EXISTS]: "📧 This email is already in use",
  [ERROR_CODES.AUTH.INVALID_USER_DATA]: "👤 Invalid user data",
  [ERROR_CODES.AUTH.LOGOUT_ERROR]: "🚪 Error during logout",

  // Komga
  [ERROR_CODES.KOMGA.MISSING_CONFIG]: "⚙️ Komga configuration not found",
  [ERROR_CODES.KOMGA.MISSING_CREDENTIALS]: "🔑 Missing Komga credentials",
  [ERROR_CODES.KOMGA.CONNECTION_ERROR]: "🌐 Connection test error",
  [ERROR_CODES.KOMGA.HTTP_ERROR]: "🌍 HTTP Error: {status} {statusText}",
  [ERROR_CODES.KOMGA.SERVER_UNREACHABLE]:
    "📡 Unable to connect to server. Check the URL and ensure the server is accessible.",

  // Library
  [ERROR_CODES.LIBRARY.NOT_FOUND]: "📚 Library {libraryId} not found",
  [ERROR_CODES.LIBRARY.FETCH_ERROR]: "📚 Error fetching libraries",

  // Series
  [ERROR_CODES.SERIES.FETCH_ERROR]: "📖 Error fetching series",
  [ERROR_CODES.SERIES.NO_BOOKS_FOUND]: "📚 No books found in series",

  // Book
  [ERROR_CODES.BOOK.NOT_FOUND]: "📕 Book not found",
  [ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR]: "📈 Error updating reading progress",
  [ERROR_CODES.BOOK.PROGRESS_DELETE_ERROR]: "🗑️ Error deleting reading progress",
  [ERROR_CODES.BOOK.PAGES_FETCH_ERROR]: "📄 Error fetching pages",
  [ERROR_CODES.BOOK.DOWNLOAD_CANCELLED]: "❌ Download cancelled",

  // Favorite
  [ERROR_CODES.FAVORITE.ADD_ERROR]: "⭐️ Unable to add series to favorites",
  [ERROR_CODES.FAVORITE.DELETE_ERROR]: "🗑️ Unable to remove series from favorites",
  [ERROR_CODES.FAVORITE.FETCH_ERROR]: "⭐️ Unable to fetch favorites list",
  [ERROR_CODES.FAVORITE.UPDATE_ERROR]: "📝 Unable to update favorites",
  [ERROR_CODES.FAVORITE.NETWORK_ERROR]: "📡 Network error while accessing favorites",
  [ERROR_CODES.FAVORITE.SERVER_ERROR]: "🔧 Server encountered an error while processing favorites",
  [ERROR_CODES.FAVORITE.STATUS_CHECK_ERROR]: "❓ Unable to check favorites status",

  // Preferences
  [ERROR_CODES.PREFERENCES.FETCH_ERROR]: "⚙️ Error fetching preferences",
  [ERROR_CODES.PREFERENCES.UPDATE_ERROR]: "⚙️ Error updating preferences",
  [ERROR_CODES.PREFERENCES.CONTEXT_ERROR]:
    "🔄 usePreferences must be used within a PreferencesProvider",

  // Cache
  [ERROR_CODES.CACHE.DELETE_ERROR]: "🗑️ Error deleting cache",
  [ERROR_CODES.CACHE.SAVE_ERROR]: "💾 Error saving to cache",
  [ERROR_CODES.CACHE.LOAD_ERROR]: "📂 Error loading from cache",
  [ERROR_CODES.CACHE.CLEAR_ERROR]: "🧹 Error clearing cache completely",
  [ERROR_CODES.CACHE.MODE_FETCH_ERROR]: "⚙️ Error fetching cache mode",
  [ERROR_CODES.CACHE.MODE_UPDATE_ERROR]: "⚙️ Error updating cache mode",
  [ERROR_CODES.CACHE.INVALID_MODE]: "⚠️ Invalid cache mode. Must be 'file' or 'memory'",

  // UI
  [ERROR_CODES.UI.TABS_TRIGGER_ERROR]: "🔄 TabsTrigger must be used within a Tabs component",
  [ERROR_CODES.UI.TABS_CONTENT_ERROR]: "🔄 TabsContent must be used within a Tabs component",

  // Image
  [ERROR_CODES.IMAGE.FETCH_ERROR]: "🖼️ Error fetching image",

  // Home
  [ERROR_CODES.HOME.FETCH_ERROR]: "🏠 Error fetching home page data",

  // Config
  [ERROR_CODES.CONFIG.SAVE_ERROR]: "💾 Error saving configuration",
  [ERROR_CODES.CONFIG.FETCH_ERROR]: "⚙️ Error fetching configuration",
  [ERROR_CODES.CONFIG.TTL_SAVE_ERROR]: "⏱️ Error saving TTL configuration",
  [ERROR_CODES.CONFIG.TTL_FETCH_ERROR]: "⏱️ Error fetching TTL configuration",

  // Debug
  [ERROR_CODES.DEBUG.FETCH_ERROR]: "🔍 Error fetching logs",
  [ERROR_CODES.DEBUG.SAVE_ERROR]: "💾 Error saving log",
  [ERROR_CODES.DEBUG.CLEAR_ERROR]: "🧹 Error clearing logs",

  // Client
  [ERROR_CODES.CLIENT.FETCH_ERROR]: "🌐 Error during request",
  [ERROR_CODES.CLIENT.NETWORK_ERROR]: "📡 Network connection error",
  [ERROR_CODES.CLIENT.REQUEST_FAILED]: "❌ Request failed",
} as const;
