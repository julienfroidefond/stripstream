# Documentation des API

Stripstream expose deux surfaces côté serveur, et rien d'autre :

- **Route Handlers** — les fichiers `route.ts` sous `src/app/api/`. Ce sont les seuls endpoints HTTP de l'application : authentification, recherche, streaming d'images et téléchargement du fichier source d'un tome.
- **Server Actions** — les fichiers `"use server"` sous `src/app/actions/`. Elles remplacent les anciennes routes REST de lecture et de mutation (favoris, préférences, progression de lecture, configuration, administration…). Les composants clients les appellent directement, sans `fetch` HTTP interne.

## 🔐 Authentification

- Toutes les routes d'API hors famille d'authentification traversent le middleware `src/proxy.ts` et exigent une session NextAuth valide. Une requête non authentifiée reçoit une réponse `401` JSON.
- Seules la famille d'authentification NextAuth (exclue du matcher du middleware) et la sonde `GET /api/health` (exemptée par le proxy sur ce chemin exact) sont publiques.
- Les huit routes média (Komga et Stripstream) sont des déclarations d'une ligne `createMediaRoute(provider, kind)` (`src/lib/media/media-route.ts`) : l'adaptateur vérifie la session, choisit le transport du provider, applique la politique de cache et d'en-têtes, relaie les `304` et mappe les erreurs. La route résout l'utilisateur une fois et transmet `userId` au transport (`MediaTransportContext`, ADR 0029) ; les transports résolvent la connexion via `requireConnectionForProvider(provider, userId)` (`@/lib/connections`), qui applique la config active du provider, puis la première config de ce provider appartenant à l'utilisateur ; il n'y a aucun repli sur des variables d'environnement (ADR 0032). Le module déchiffre les credentials ; les routes ne lisent jamais les colonnes `authHeader`/`token` directement.
- Les Server Actions vérifient l'utilisateur par les gates du runner (`requireUser`, `requireRole`, `rateLimit`), qui transmettent `userId` aux services ; les services ne lisent pas la session (ADR 0029). L'action `testConnection` est en plus limitée par le `rateLimit` du runner, sur la clé `connectionTestRateLimitKey` (`src/lib/connections/probe.ts`, 5 tentatives par 30 secondes et par utilisateur et par provider).

## 🌐 Route Handlers

### GET /api/auth/[...nextauth]

- **Description** : handler NextAuth v5 (`handlers` exporté depuis `src/lib/auth.ts`) ; le fichier route réexporte `export const { GET, POST } = handlers`. Gère les flux d'authentification : connexion par identifiants, session JWT, CSRF et callbacks.
- **Authentification** : publique — c'est le point d'entrée du login, exclu du matcher du middleware.

### POST /api/auth/[...nextauth]

- **Description** : même handler NextAuth v5 ; porte les soumissions de connexion/déconnexion et les callbacks.
- **Authentification** : publique.

### GET /api/health

- **Description** : sonde de santé du conteneur (`HEALTHCHECK` du Dockerfile, healthcheck compose). Exécute `SELECT 1` via Prisma : `200 {"status":"ok"}` si la base répond, `503 {"status":"unavailable"}` sinon. `Cache-Control: no-store`, aucune information sensible (ni version ni message d'erreur).
- **Authentification** : publique, sur ce chemin exact uniquement (`/api/healthz` ou `/api/health/x` restent protégés).

### Routes média

Les huit routes média sont dérivées d'une seule table (`src/lib/media/media-url.ts`, ADR 0027) : `MEDIA_ROUTE_PATTERNS` donne la forme de route d'un `MediaRef.kind`, préfixée par `/api/<provider>/`, et `SERVED_MEDIA_KINDS` liste les kinds servis par chaque provider. Chaque `route.ts` se réduit à `createMediaRoute(provider, kind)` ; adapters et providers construisent leurs URL avec `mediaUrl(provider, ref)` (ou `bookPageUrlTemplate` pour les gabarits `{page}`), et `media-url.test.ts` vérifie qu'un fichier existe pour chaque couple servi, qu'aucun autre n'existe et que chaque URL redonne la même référence.

La politique de réponse est choisie par kind (`MEDIA_POLICIES`, `src/lib/media/policies.ts`), identique pour les deux providers sauf l'écart documenté des couvertures Komga :

| Kind | Route (sous `/api/<provider>/`) | Providers | `Cache-Control` | Erreurs |
| --- | --- | --- | --- | --- |
| `book-file` | `books/[bookId]/file` | Komga, Stripstream | `private, no-store` | JSON, status mappé (`401`/`403`/`404`), repli `KOMGA_HTTP_ERROR` / `STRIPSTREAM_HTTP_ERROR` |
| `book-page` | `images/books/[bookId]/pages/[pageNumber]` | Komga, Stripstream | `private, max-age=2592000, immutable` | JSON, `404` « Image not found », sinon `500` `IMAGE_FETCH_ERROR` |
| `book-page-thumbnail` | `images/books/[bookId]/pages/[pageNumber]/thumbnail` | Komga | `private, max-age=2592000, immutable` | idem |
| `book-cover` | `images/books/[bookId]/thumbnail` | Komga, Stripstream | Stripstream : `private, max-age=2592000, immutable` ; Komga : `private, max-age=3600` | idem |
| `series-cover` | `images/series/[seriesId]/thumbnail` | Komga | `private, max-age=3600` | idem |

- **Authentification** : session NextAuth requise ; le cœur (`media-route-core.ts`) renvoie `401` JSON avant tout appel au transport. Les transports résolvent la connexion active du provider.
- **Pages** : `pageNumber` est 1-based côté client (`400` s'il n'est pas un entier positif ou nul) ; seul le transport Komga le convertit en 0-based. La query string d'une page est conservée dans la référence et transmise telle quelle au backend Stripstream (format, largeur…) ; elle fait partie de l'URL, donc de la clé de cache.
- **Validateurs** : `If-None-Match` / `If-Modified-Since` sont relayés à l'amont, une réponse `304` est renvoyée sans corps ni `Content-Type` implicite. Les pages Komga et les couvertures Stripstream identiques en vol sont dédupliquées par connexion résolue et empreinte du validateur.
- **Couvertures Komga** : le transport sert la miniature Komga ou la première page selon la préférence utilisateur `showThumbnails`, lue à chaque requête (premier livre de la série résolu via `ProviderTransport.request()` pour `series-cover`). Les octets d'une même URL dépendent donc de la préférence : la réponse est `private, max-age=3600` : un rechargement est servi par le cache du navigateur, un changement de préférence s'applique en une heure au plus (au lieu de trente jours), puis la réponse se revalide par ETag.
- **Fichiers** : `Content-Type` et `Content-Disposition` amont recopiés ; `Content-Length` volontairement omis (Safari est strict sur un `Content-Length` posé au-dessus d'une réponse chunked).
- **Toutes les réponses sont `private`** : la même URL est résolue contre la connexion désignée par le cookie de session, un cache partagé ne doit jamais la servir à un autre utilisateur.

### GET /api/provider/search

- **Description** : recherche via le provider actif (`getProvider()` → `provider.search(query, limit)`). Query `q` (minimum 2 caractères), `limit` optionnel (défaut 6, borné entre 1 et 10). Renvoie un tableau de résultats normalisés, ou `[]` si `q` est trop court ou si aucun provider n'est configuré. C'est la seule route de recherche : l'ancien clone `/api/stripstream/search` a été supprimé.
- **Authentification** : session NextAuth requise.
- **Cache** : `Cache-Control: no-store`.

> **Streaming navigateur** : les routes d'images ci-dessus sont destinées à la balise `<img>` du navigateur. L'authentification et les credentials des providers restent côté serveur ; le navigateur ne reçoit que le flux binaire.

## ⚡ Server Actions

Tous les fichiers de `src/app/actions/` commencent par `"use server"`. Les actions sont appelées directement par les composants clients et, sauf exception documentée, passent par le runner (`runAction` / `runProviderAction`, `src/lib/actions/action-runner.ts`) : elles renvoient un `ActionResult` — `{ success: true, code: "OK", message, ...données }` ou `{ success: false, code: ErrorCode, message }`. Le client traduit `errors.${code}` ; `message` reste un libellé technique. Sauf mention contraire, elles exigent une session utilisateur valide.

### src/app/actions/admin.ts

Toutes ces actions déclarent `requireRole: "admin"` : sans session elles échouent en `AUTH_UNAUTHENTICATED`, sans `ROLE_ADMIN` en `AUTH_FORBIDDEN`, avant toute écriture.

| Action | Rôle |
| --- | --- |
| `getAdminDashboardData` | Charge la liste des utilisateurs et les statistiques du tableau de bord admin. |
| `updateUserRoles` | Met à jour les rôles d'un utilisateur : liste non vide de rôles parmi `ROLE_USER` / `ROLE_ADMIN`, sinon `ADMIN_INVALID_ROLES`. Refuse qu'un admin retire son propre `ROLE_ADMIN` (`ADMIN_CANNOT_REMOVE_OWN_ADMIN`) et la rétrogradation du dernier admin (`ADMIN_LAST_ADMIN`). |
| `deleteUser` | Supprime un utilisateur (`ADMIN_CANNOT_DELETE_SELF` pour son propre compte). |
| `resetUserPassword` | Réinitialise le mot de passe d'un utilisateur (force minimale vérifiée : 8 caractères, une majuscule, un chiffre, sinon `AUTH_PASSWORD_NOT_STRONG` ; `ADMIN_CANNOT_RESET_OWN_PASSWORD` pour soi-même). Limitée à 10 / 15 min par administrateur (`AUTH_RATE_LIMITED`). |

### src/app/actions/auth.ts

| Action | Rôle |
| --- | --- |
| `registerUser` | Inscrit un nouvel utilisateur (email + mot de passe). Fermée sauf `REGISTRATION_ENABLED=true` (`AUTH_REGISTRATION_DISABLED`, ADR 0032). Action anonyme ; la force du mot de passe, le budget par IP (10 / h, premier élément de `X-Forwarded-For`) et par email (5 / min) sont vérifiés par `AuthServerService.registerUser`. |

### src/app/actions/books.ts

| Action | Rôle |
| --- | --- |
| `getBookData` | Charge les données du lecteur pour un livre via `getProvider()` et `getReaderData()`. |

### src/app/actions/connections.ts

Actions de connexion génériques (ADR 0030) : une action par opération, discriminée par `provider`. Les champs propres à un provider (`username`/`password` Komga, `token` Stripstream) et leur validation viennent de son descripteur (`src/lib/connections/descriptors.ts`) ; table, secret, provider et transport viennent de sa définition (`src/lib/connections/registry.ts`). Toutes passent par `runAction` avec `requireUser`, renvoient un `ActionResult` et échouent avec un code du catalogue (`CONFIG_INVALID_INPUT`, `CONFIG_NOT_FOUND`, `CONFIG_DUPLICATE_NAME`, `CONFIG_*_ERROR`…) ; le client traduit `errors.${code}`.

| Action | Rôle |
| --- | --- |
| `listConnections()` | Configs de l'utilisateur, une liste par provider (`{ lists: ConnectionLists }`), avec l'état actif du navigateur. Un échec renvoie `CONFIG_FETCH_ERROR` au lieu d'une liste vide. |
| `saveConnection(input: ConnectionInput)` | Crée (sans `id`) ou met à jour (avec `id`) une config. Secrets requis à la création, conservés s'ils sont vides en mise à jour. Renvoie `{ id, created }`. |
| `deleteConnection({ provider, id })` | Supprime une config de l'utilisateur. |
| `activateConnection({ provider, id })` | Sélectionne une config pour ce navigateur (cookies) et invalide les caches provider. Le client recharge ensuite toute la page (`useActivateConnection`). Renvoie `{ name }`. |
| `testConnection({ stored } \| { draft })` | Teste une config enregistrée (credentials stockés, `testStoredConnection`) ou des credentials saisis (connexion ad hoc construite par la définition). Limitée par le runner (`rateLimit`, 5 / 30 s par utilisateur et par provider, `AUTH_RATE_LIMITED`). Un échec porte le code de l'erreur provider (`KOMGA_UNAUTHORIZED`…) ou `CONFIG_TEST_ERROR`. Renvoie `{ libraryCount }`. |

### src/app/actions/favorites.ts

| Action | Rôle |
| --- | --- |
| `addToFavorites` | Ajoute une série aux favoris (persistés en SQLite par utilisateur et par config) et invalide les tags de cache `favorites` et `home`. |
| `removeFromFavorites` | Retire une série des favoris et invalide les mêmes tags de cache. |

### src/app/actions/home.ts

| Action | Rôle |
| --- | --- |
| `loadContinueReading` | Charge la page suivante du hero « Reprendre la lecture ». `offset` est le nombre de tomes déjà affichés ; l'action délègue à `loadContinueReadingPage` (`src/lib/home/continue-reading-feed.ts`), le même module que le rendu initial, et renvoie uniquement la nouvelle page, déjà résolue en entrées de reprise (`book`, `series`, `progressPercent`). Le hero ajoute la page à sa liste et n'a plus à fusionner ni à matcher côté client. |
| `loadHomeFeed` | Charge une page d'une section de la home : `ongoing`, `favorites`, `reading-lists`, `latest-series`, `recently-read` ou `recommendations`. `offset` est le nombre d'éléments déjà affichés ; l'action renvoie `{ items, hasMore }` pour la seule nouvelle page. Elle délègue au registre `src/lib/home/feed-registry.ts`, partagé avec le rendu initial de la page. |

### src/app/actions/library.ts

| Action | Rôle |
| --- | --- |
| `scanLibrary` | Déclenche un scan d'une bibliothèque via le provider actif et revalide la page de la bibliothèque et la liste. Renvoie `{ jobId, progressSupported, forbidden? }` : `jobId` n'est renseigné que si le backend expose un suivi (Librarian admin), et `forbidden` vaut `true` sur un 403 (scan réservé aux admins côté Komga comme côté Librarian). |
| `getScanStatus` | Suit le job renvoyé par `scanLibrary` (`libraryId`, `jobId`). Renvoie `{ state: "running" \| "completed" \| "failed" \| "cancelled" \| "unavailable" }` et ne lève jamais : un backend sans suivi (Komga), un 403 (token `read`) ou une erreur réseau dégradent en `unavailable`. |
| `getRandomBookFromLibraries` | Renvoie l'URL de miniature d'un livre tiré au hasard parmi les bibliothèques fournies. |

### src/app/actions/password.ts

| Action | Rôle |
| --- | --- |
| `changePassword` | Change le mot de passe de l'utilisateur (vérifie l'ancien mot de passe et la force du nouveau). Limitée à 5 tentatives / 15 min par utilisateur (`AUTH_RATE_LIMITED`), car chaque appel compare l'ancien mot de passe avec bcrypt. |

### src/app/actions/preferences.ts

| Action | Rôle |
| --- | --- |
| `updatePreferences` | Met à jour les préférences utilisateur et revalide `/`, `/libraries` et `/series` (sauf mise à jour du seul mode anonyme, piloté côté client). |

### src/app/actions/ratings.ts

| Action | Rôle |
| --- | --- |
| `setSeriesRating` | Enregistre une note de 1 à 10 via le provider et invalide le tag `series-rating:${seriesId}` ainsi que `ratings-list` (page « Mes notes »). |
| `deleteSeriesRating` | Supprime la note d'une série et invalide les mêmes tags de cache. |

### src/app/actions/read-progress.ts

| Action | Rôle |
| --- | --- |
| `updateReadProgress` | Enregistre la progression de lecture (page, terminé) via le provider. Ignorée en mode anonyme. Invalide toujours `home`, `library-series`, `ratings-list` et `reading-stats`, puis `series-books:${seriesId}` quand `seriesId` est fourni, sinon tous les livres de la série. |
| `deleteReadProgress` | Réinitialise la progression de lecture d'un livre et invalide les caches associés. Ignorée en mode anonyme. |
| `updateSeriesReadStatus` | Marque **tous** les livres d'une série comme lus (`read: true`) ou non lus (`read: false`). Pagine les livres via `getAllSeriesBooks`, applique la progression livre par livre avec une concurrence bornée (`SERIES_WRITE_CONCURRENCY`), puis invalide les caches une seule fois. Renvoie `{ success, updated, total }` pour un retour « X / Y » côté UI. Ignorée en mode anonyme. |

### src/app/actions/series-shelf.ts

| Action | Rôle |
| --- | --- |
| `shelveSeries` | Met une série de côté pour le lecteur courant via le provider (idempotent). Invalide `home`, `series-shelf:${seriesId}`, les pages `/`, `/in-progress`, `/series/${seriesId}` et `/libraries/${libraryId}` (ou le tag de liste global en secours). |
| `unshelveSeries` | Reprend une série mise de côté et invalide les mêmes caches. |

### src/app/actions/refresh.ts

| Action | Rôle |
| --- | --- |
| `revalidateForRefresh` | Invalide caches et chemins selon le `scope` (`home`, `library`, `series`, `book`) avant un `router.refresh()` côté client. Passe par le runner : session requise, budget `refresh:<userId>` (30 / min), scope et identifiant validés (`REFRESH_INVALID_TARGET`) ; renvoie un `ActionResult`. |

> **Chiffrement au repos** : l'`authHeader` Komga et le `token` Stripstream sont stockés sous enveloppe AES-256-GCM (`src/lib/credentials.ts`, clé `CREDENTIALS_ENCRYPTION_KEY`). L'action `saveConnection` passe par `src/lib/connections/manage.ts`, où la définition du provider chiffre à l'écriture (mot de passe/token vide en mise à jour : la valeur chiffrée existante est conservée) ; `src/lib/connections/resolve.ts` déchiffre à la lecture avant de construire un provider ou une sonde. Les lignes legacy en clair restent lisibles ; `pnpm encrypt-credentials` les migre de façon idempotente (`ENV.md`).
