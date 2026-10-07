# Documentation des API

Stripstream expose deux surfaces côté serveur, et rien d'autre :

- **Route Handlers** — les fichiers `route.ts` sous `src/app/api/`. Ce sont les seuls endpoints HTTP de l'application : authentification, recherche et streaming d'images.
- **Server Actions** — les fichiers `"use server"` sous `src/app/actions/`. Elles remplacent les anciennes routes REST de lecture et de mutation (favoris, préférences, progression de lecture, configuration, administration…). Les composants clients les appellent directement, sans `fetch` HTTP interne.

## 🔐 Authentification

- Toutes les routes d'API hors famille d'authentification traversent le middleware `src/proxy.ts` et exigent une session NextAuth valide. Une requête non authentifiée reçoit une réponse `401` JSON.
- Seule la famille d'authentification NextAuth est publique (exclue du matcher du middleware).
- Les routes d'images résolvent l'utilisateur courant côté serveur : Komga lit la `KomgaConfig` active via `ConfigDBService.getConfig()`, Stripstream résout sa config via `getResolvedStripstreamConfig(userId)` après un contrôle explicite `getCurrentUser()`.
- Les Server Actions vérifient l'utilisateur via `getCurrentUser()` ou `requireUserId()`. Les actions de test de connexion sont en plus limitées par `checkRateLimit` (5 tentatives par 30 secondes et par utilisateur).

## 🌐 Route Handlers

### GET /api/auth/[...nextauth]

- **Description** : handler NextAuth v5 (`handlers` exporté depuis `src/lib/auth.ts`) ; le fichier route réexporte `export const { GET, POST } = handlers`. Gère les flux d'authentification : connexion par identifiants, session JWT, CSRF et callbacks.
- **Authentification** : publique — c'est le point d'entrée du login, exclu du matcher du middleware.

### POST /api/auth/[...nextauth]

- **Description** : même handler NextAuth v5 ; porte les soumissions de connexion/déconnexion et les callbacks.
- **Authentification** : publique.

### GET /api/komga/books/[bookId]/pages/[pageNumber]

- **Description** : flux binaire d'une page de livre servie par la `KomgaConfig` active. `pageNumber` est 1-based côté client et converti en 0-based pour Komga. Les requêtes concurrentes vers la même page sont dédupliquées par `requestDeduplicationService`.
- **Authentification** : session NextAuth requise ; utilise la configuration Komga active de l'utilisateur.
- **Cache** : `Cache-Control: public, max-age=31536000`.

### GET /api/komga/images/books/[bookId]/pages/[pageNumber]

- **Description** : proxy de streaming de la page d'un livre Komga. Réponse `404` explicite quand Komga ne trouve pas l'image.
- **Authentification** : session NextAuth requise ; configuration Komga active.
- **Cache** : `public, max-age=2592000, immutable` (30 jours), posé par `KomgaImageService.streamImage`.

### GET /api/komga/images/books/[bookId]/pages/[pageNumber]/thumbnail

- **Description** : miniature d'une page de livre Komga. `400` si `pageNumber` est invalide, `404` si Komga ne trouve pas la miniature.
- **Authentification** : session NextAuth requise ; configuration Komga active.
- **Cache** : `public, max-age=2592000, immutable` (30 jours).

### GET /api/komga/images/books/[bookId]/thumbnail

- **Description** : couverture d'un livre Komga. `KomgaBookService.getCover()` renvoie la miniature du livre ou la première page selon la préférence `showThumbnails`.
- **Authentification** : session NextAuth requise ; configuration Komga active.
- **Cache** : `public, max-age=2592000, immutable` (30 jours).

### GET /api/komga/images/series/[seriesId]/first-page

- **Description** : couverture d'une série Komga en streaming. `KomgaSeriesService.getCover()` sert la première page du premier livre, ou la miniature de la série quand la préférence `showThumbnails` est active.
- **Authentification** : session NextAuth requise ; configuration Komga active.
- **Cache** : `public, max-age=2592000, immutable` (30 jours).

### GET /api/komga/images/series/[seriesId]/thumbnail

- **Description** : miniature d'une série Komga. `404` si Komga ne trouve pas l'image.
- **Authentification** : session NextAuth requise ; configuration Komga active.
- **Cache** : `public, max-age=2592000, immutable` (30 jours).

### GET /api/provider/search

- **Description** : recherche via le provider actif (`getProvider()` → `provider.search(query, limit)`). Query `q` (minimum 2 caractères), `limit` optionnel (défaut 6, borné entre 1 et 10). Renvoie un tableau de résultats normalisés, ou `[]` si `q` est trop court ou si aucun provider n'est configuré.
- **Authentification** : session NextAuth requise.
- **Cache** : `Cache-Control: no-store`.

### GET /api/stripstream/images/books/[bookId]/pages/[pageNumber]

- **Description** : proxy de streaming de la page d'un livre servie par le client Stripstream (`StripstreamClient.fetchImage`). La query string reçue est transmise telle quelle au backend.
- **Authentification** : session NextAuth requise **et** contrôle explicite `getCurrentUser()` (`401` sinon) ; config Stripstream résolue pour l'utilisateur.
- **Cache** : `public, max-age=86400` (1 jour).

### GET /api/stripstream/images/books/[bookId]/thumbnail

- **Description** : miniature d'un livre Stripstream. Les appels concurrents sont dédupliqués par une clé dérivée de l'URL et du token (`sha256`). Réponse `404` en cas d'échec de récupération.
- **Authentification** : session NextAuth requise **et** contrôle explicite `getCurrentUser()` (`401` sinon).
- **Cache** : `public, max-age=2592000, immutable` (30 jours).

### GET /api/stripstream/search

- **Description** : recherche via le provider actif, même contrat que `/api/provider/search` (`q` minimum 2 caractères, `limit` défaut 6 / max 10). Différence : lève une erreur de configuration manquante (`500`) si aucun provider n'est actif, au lieu de renvoyer `[]`.
- **Authentification** : session NextAuth requise.
- **Cache** : `Cache-Control: no-store`.

> **Streaming navigateur** : les routes d'images ci-dessus sont destinées à la balise `<img>` du navigateur. L'authentification et les credentials des providers restent côté serveur ; le navigateur ne reçoit que le flux binaire.

## ⚡ Server Actions

Tous les fichiers de `src/app/actions/` commencent par `"use server"`. Les actions sont appelées directement par les composants clients et renvoient en général un objet `{ success, message }` (ou des données). Sauf mention contraire, elles exigent une session utilisateur valide.

### src/app/actions/admin.ts

| Action | Rôle |
| --- | --- |
| `getAdminDashboardData` | Charge la liste des utilisateurs et les statistiques du tableau de bord admin. |
| `updateUserRoles` | Met à jour les rôles d'un utilisateur (au moins un rôle requis). |
| `deleteUser` | Supprime un utilisateur. |
| `resetUserPassword` | Réinitialise le mot de passe d'un utilisateur (force minimale vérifiée : 8 caractères, une majuscule, un chiffre). |

### src/app/actions/auth.ts

| Action | Rôle |
| --- | --- |
| `registerUser` | Inscrit un nouvel utilisateur (email + mot de passe). |

### src/app/actions/books.ts

| Action | Rôle |
| --- | --- |
| `getBookData` | Charge les données du lecteur pour un livre via `getProvider()` et `getReaderData()`. |

### src/app/actions/config.ts

| Action | Rôle |
| --- | --- |
| `testKomgaConnection` | Teste des identifiants Komga fournis à la volée. Limitée par `checkRateLimit` (5 / 30 s). |
| `listKomgaConfigs` | Liste les configurations Komga de l'utilisateur avec l'état actif. |
| `saveKomgaConfig` | Crée ou met à jour une configuration Komga. Mot de passe requis à la création, conservé s'il est vide en mise à jour ; la première configuration devient active. |
| `deleteKomgaConfig` | Supprime une configuration Komga de l'utilisateur. |
| `testKomgaConfigById` | Teste une configuration Komga existante avec les credentials stockés. Limitée par `checkRateLimit` (5 / 30 s). |
| `setActiveKomgaConfig` | Active une configuration Komga et invalide les caches provider (`home`, listes de bibliothèques, livres, favoris). |

### src/app/actions/favorites.ts

| Action | Rôle |
| --- | --- |
| `addToFavorites` | Ajoute une série aux favoris (persistés en SQLite par utilisateur et par config) et invalide les tags de cache `favorites` et `home`. |
| `removeFromFavorites` | Retire une série des favoris et invalide les mêmes tags de cache. |

### src/app/actions/home.ts

| Action | Rôle |
| --- | --- |
| `loadHomeFeed` | Charge une section paginée de la home : `continue-reading`, `ongoing`, `favorites`, `reading-lists`, `latest-series`, `recently-read` ou `recommendations`. |

### src/app/actions/library.ts

| Action | Rôle |
| --- | --- |
| `scanLibrary` | Déclenche un scan d'une bibliothèque via le provider actif et revalide la page de la bibliothèque et la liste. |
| `getRandomBookFromLibraries` | Renvoie l'URL de miniature d'un livre tiré au hasard parmi les bibliothèques fournies. |

### src/app/actions/password.ts

| Action | Rôle |
| --- | --- |
| `changePassword` | Change le mot de passe de l'utilisateur (vérifie l'ancien mot de passe et la force du nouveau). |

### src/app/actions/preferences.ts

| Action | Rôle |
| --- | --- |
| `updatePreferences` | Met à jour les préférences utilisateur et revalide `/`, `/libraries` et `/series` (sauf mise à jour du seul mode anonyme, piloté côté client). |

### src/app/actions/ratings.ts

| Action | Rôle |
| --- | --- |
| `setSeriesRating` | Enregistre une note de 1 à 10 via le provider et invalide le tag de cache `series-rating:${seriesId}`. |
| `deleteSeriesRating` | Supprime la note d'une série et invalide le même tag de cache ciblé. |

### src/app/actions/read-progress.ts

| Action | Rôle |
| --- | --- |
| `updateReadProgress` | Enregistre la progression de lecture (page, terminé) via le provider. Ignorée en mode anonyme. Invalide `series-books:${seriesId}` quand `seriesId` est fourni, sinon tous les livres de la série. |
| `deleteReadProgress` | Réinitialise la progression de lecture d'un livre et invalide les caches associés. |

### src/app/actions/refresh.ts

| Action | Rôle |
| --- | --- |
| `revalidateForRefresh` | Invalide caches et chemins selon le `scope` (`home`, `library`, `series`, `book`) avant un `router.refresh()` côté client. |

### src/app/actions/stripstream-config.ts

| Action | Rôle |
| --- | --- |
| `testStripstreamConnection` | Teste une URL et un token Stripstream fournis à la volée. Limitée par `checkRateLimit` (5 / 30 s). |
| `listStripstreamConfigs` | Liste les configurations Stripstream de l'utilisateur avec l'état actif. |
| `saveStripstreamConfig` | Crée ou met à jour une configuration Stripstream. Token requis à la création, conservé s'il est vide en mise à jour ; la première configuration devient active. |
| `deleteStripstreamConfig` | Supprime une configuration Stripstream de l'utilisateur. |
| `testStripstreamConfigById` | Teste une configuration Stripstream existante avec le token stocké. Limitée par `checkRateLimit` (5 / 30 s). |
| `setActiveStripstreamConfig` | Active une configuration Stripstream et invalide les caches provider. |
