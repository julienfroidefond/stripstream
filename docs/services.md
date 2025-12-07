# Documentation des Services

## 🔐 AuthService

Service de gestion de l'authentification

### Méthodes

- `loginUser(email: string, password: string): Promise<UserData>`
  - Authentifie un utilisateur
  - Retourne les données utilisateur

- `createUser(email: string, password: string): Promise<UserData>`
  - Crée un nouvel utilisateur
  - Retourne les données utilisateur

- `logout(): Promise<void>`
  - Déconnecte l'utilisateur actuel

## 📚 LibraryService

Service de gestion des bibliothèques

### Méthodes

- `getLibraries(): Promise<Library[]>`
  - Récupère la liste des bibliothèques
  - Met en cache les résultats

- `getLibrary(libraryId: string): Promise<Library>`
  - Récupère une bibliothèque spécifique
  - Lance une erreur si non trouvée

- `getLibrarySeries(libraryId: string, page: number = 0, size: number = 20, unreadOnly: boolean = false, search?: string): Promise<LibraryResponse<Series>>`
  - Récupère les séries d'une bibliothèque
  - Supporte la pagination et le filtrage
  - Paramètres :
    - `page` : Numéro de page (défaut: 0)
    - `size` : Nombre d'éléments par page (défaut: 20, valeurs possibles: 20, 50, 100)
    - `unreadOnly` : Filtrer les séries non lues (défaut: false)
    - `search` : Rechercher une série par titre (optionnel)

## 📖 SeriesService

Service de gestion des séries

### Méthodes

- `getSeries(seriesId: string): Promise<Series>`
  - Récupère les détails d'une série

- `getSeriesBooks(seriesId: string, page: number = 0, size: number = 24, unreadOnly: boolean = false): Promise<LibraryResponse<KomgaBook>>`
  - Récupère les livres d'une série
  - Supporte la pagination et le filtrage

- `getCover(seriesId: string): Promise<Response>`
  - Récupère la couverture d'une série

## 📑 BookService

Service de gestion des livres

### Méthodes

- `getBook(bookId: string): Promise<{ book: KomgaBook; pages: number[] }>`
  - Récupère les détails d'un livre et ses pages

- `updateReadProgress(bookId: string, page: number, completed: boolean = false): Promise<void>`
  - Met à jour la progression de lecture

- `getPage(bookId: string, pageNumber: number): Promise<Response>`
  - Récupère une page spécifique d'un livre

- `getCover(bookId: string): Promise<Response>`
  - Récupère la couverture d'un livre

- `getPageThumbnail(bookId: string, pageNumber: number): Promise<Response>`
  - Récupère la miniature d'une page

## 🖼️ ImageService

Service de gestion des images

### Méthodes

- `getImage(path: string): Promise<ImageResponse>`
  - Récupère une image depuis le serveur
  - Gère le cache des images

- `getSeriesThumbnailUrl(seriesId: string): string`
  - Génère l'URL de la miniature d'une série

- `getBookThumbnailUrl(bookId: string): string`
  - Génère l'URL de la miniature d'un livre

- `getBookPageUrl(bookId: string, pageNumber: number): string`
  - Génère l'URL d'une page de livre

## ⚙️ ConfigDBService

Service de gestion de la configuration

### Méthodes

- `getConfig(): Promise<Config>`
  - Récupère la configuration Komga

- `saveConfig(config: Config): Promise<Config>`
  - Sauvegarde la configuration Komga

- `getTTLConfig(): Promise<TTLConfig>`
  - Récupère la configuration TTL

- `saveTTLConfig(config: TTLConfig): Promise<TTLConfig>`
  - Sauvegarde la configuration TTL

## 🔄 ServerCacheService

Service de gestion du cache serveur

### Méthodes

- `getCacheMode(): string`
  - Récupère le mode de cache actuel

- `clearCache(): void`
  - Vide le cache serveur

## ⭐ FavoriteService

Service de gestion des favoris

### Méthodes

- `getAllFavoriteIds(): Promise<string[]>`
  - Récupère les IDs des séries favorites

## 🔧 PreferencesService

Service de gestion des préférences

### Méthodes

- `getPreferences(): Promise<Preferences>`
  - Récupère les préférences utilisateur

- `savePreferences(preferences: Preferences): Promise<void>`
  - Sauvegarde les préférences utilisateur

## 🧪 TestService

Service de test de connexion

### Méthodes

- `testConnection(config: AuthConfig): Promise<{ libraries: KomgaLibrary[] }>`
  - Teste la connexion au serveur Komga
  - Retourne les bibliothèques si succès

## 🌐 BaseApiService

Service de base pour les appels API

### Méthodes

- `buildUrl(config: Config, path: string, params?: Record<string, string>): string`
  - Construit une URL d'API

- `getAuthHeaders(config: Config): Headers`
  - Génère les en-têtes d'authentification

- `fetchFromApi<T>(url: string, headers: Headers, raw?: boolean): Promise<T>`
  - Effectue un appel API avec gestion d'erreurs

- `fetchWithCache<T>(key: string, fetcher: () => Promise<T>, type: CacheType): Promise<T>`
  - Effectue un appel API avec mise en cache
