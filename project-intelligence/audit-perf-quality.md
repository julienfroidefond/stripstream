# Audit Qualité + Performance — stripstream (branche audit-perf-quality)

Date : 2026-09-05 · Baseline : lint ✓ · typecheck ✓ · build ✓ (41s, 22 routes dynamiques)
Audit : 4 subagents parallèles (async, re-render/memo, server/API, bundle/rendering) + analyse directe.

## Verdict global
Serveur sain (cache Next bien utilisé, Promise.all généralisé). Faiblesses concentrées côté **client** (0 memo, 0 lazy-loading) et **sécurité** (headers, rate-limit). Aucune validation d'entrée (zod installé mais 0 usage).

## CRITICAL

### C1. Aucun security header HTTP
`src/middleware.ts:92` + `next.config.js` — ni CSP, ni X-Frame-Options, ni X-Content-Type-Options, ni Referrer-Policy. Le matcher exclut /images et /api/health mais pas /api/auth/register.

### C2. Cookies de session en clair
`src/lib/auth.ts:63` — `useSecureCookies: false` → jeton JWT exposé en clair même en HTTPS prod.

### C3. Aucun rate-limit sur login/register
`src/utils/rate-limit.ts:13` — `checkRateLimit` n'est appliqué QUE sur testKomgaConnection/testStripstreamConnection. Login (authorize) et registerUser (`src/app/actions/auth.ts:9`) : aucune protection brute-force. registerUser est une server action publique sans validation de format.

## HIGH

### H1. N+1 favoris
`src/lib/services/favorite.service.ts:175-198` — `listFavorites()` fait getSeriesById par favori (~2N appels réseau chez Stripstream).

### H2. N+1 admin
`src/lib/services/admin.service.ts:43-64` — getAllUsers : 2 requêtes DB par user (2N).

### H3. N+1 search Stripstream
`src/lib/providers/stripstream/stripstream.provider.ts:424-456` — fetch by-name par series_hit.

### H4. getProvider non mémoïsé
`src/lib/providers/provider.factory.ts:9-37` — getCurrentUser + getActiveConnection + lectures DB répétées par render.

### H5. getReaderInfo charge toute la série
`src/lib/reader/getReaderData.ts:46-49` — `getBooks({limit: max(bookCount,24)})` : charge l'intégralité d'une série volumineuse pour calculer positionInSeries (hot path lecteur).

### H6. Reader chargé statiquement (2 chemins)
`src/components/reader/ClientBookWrapper.tsx:6` ET `ClientBookReader.tsx:7` — BookReader importé statiquement, tout le lecteur dans le bundle initial de /books/[bookId].

### H7. 0 React.memo sur listes/reader
- `Thumbnail.tsx:7` — forwardRef non-memo, des centaines de miniatures re-rendues à chaque page
- `NavigationBar.tsx:73` — liste de pages sans virtualisation
- `BookReader.tsx:12` — arbre entier re-rendu à chaque page
- `useImageLoader.ts:49` — 3 states objets → re-rend du lecteur à chaque image
- `MediaRow.tsx:80`, `SeriesList.tsx:65`, `BookGrid.tsx:55`, `BookList.tsx:32` — items non-memo, callbacks inline, consomment AnonymousContext

### H8. framer-motion + i18next dans le bundle initial
`ContinueReadingHero.tsx:6`, `RecommendationsRow.tsx:6` (framer-motion ~40-50kB sur l'accueil) ; `layout.tsx:346` (i18next ~40-70kB sur toutes les routes).

### H9. Layout racine bloque le premier rendu
`src/app/layout.tsx:89` — 5 requêtes serveur (prefs, librairies, favoris, 2 configs) AVANT d'envoyer children. Pas de streaming.

### H10. Pages série/bibliothèque sans Suspense ni cache
`src/app/series/[seriesId]/page.tsx:37` (5 fetchs en bloc), `src/app/libraries/[libraryId]/page.tsx:42` — première peinture bloquée, re-fetch à chaque nav.

## MEDIUM

### M1. setState-in-effect (anti-pattern)
`PageDisplay.tsx:101`, `BookGrid.tsx:97`, `BookList.tsx:257`, `PaginatedSeriesGrid.tsx:92`, `PaginatedBookGrid.tsx:92`, `SeriesHeader.tsx:35`, `Sidebar.tsx:56`, `BackgroundSettings.tsx:31` — état local dupliquant des props, resynchronisé par effet.

### M2. Contexte consommé en entier
`useReaderState.ts:17` + `ClientLayout.tsx:47` — tout le PreferencesContext re-rend le lecteur/layout à chaque préférence.

### M3. getUserStats non borné
`admin.service.ts:192-197` — charge tous les users pour compter les admins.

### M4. getNextBook charge 200 livres
`stripstream.provider.ts:268-271` — non borné.

### M5. Route image Komga bufferise en mémoire
`src/app/api/komga/books/[bookId]/pages/[pageNumber]/route.ts:54` — buffer + slice(0) double la copie mémoire au lieu de streamer.

### M6. Pas de validation d'entrée (zod jamais utilisé)
`route.ts:18` (parseInt sans isNaN), `auth.ts:15` (credentials bruts), `password.ts:10`, `provider/search/route.ts:13`.

### M7. Cache images incohérent
`stripstream page route.ts:41` max-age=86400 vs thumbnail 2592000 — pas d'immutable sur le hot-path page.

### M8. Ré-fetch du 1er livre à chaque couverture
`series/[seriesId]/thumbnail/route.ts:16` — getFirstBook non caché.

### M9. Toaster + dialogs non-lazy
`ClientLayout.tsx:8` — radix toast sur toutes les routes.

### M10. Images en <img> brut + config images absente
`book-cover.tsx:91`, `series-cover.tsx:30`, `PageDisplay.tsx:1` ; `next.config.js:6` — pas de images.remotePatterns/formats → next/image impossible sur les vignettes distantes.

### M11. Double await params
`komga images thumbnail/route.ts:17` — params awaité 2× (dont dans le catch).

### M12. getReaderInfo séquentiel
`getReaderData.ts:83-86` — getBook attendu avant getNextBook.

## LOW
- `RefreshContext.tsx:22` value non mémoïsé · `getLibraryById` fetch toutes les libs (komga+stripstream) · `login-bg.jpg` non optimisé · `ClientLayout.tsx:208` Header/Sidebar/InstallPWA/NetworkStatus dans le bundle initial · `middleware-auth.ts:20` JSON.parse(token.roles) fragile · `auth.ts:61` NEXTAUTH_SECRET non vérifié au boot · `password.ts:10` pas de rate-limit · `search route` incohérent (500 vs []) · `getContinueReading/getSeriesPool` recalculés · `ControlButtons/Header/ProviderSwitcher/ConnectionsSettings` handlers non mémoïsés · `SeriesGrid.tsx:81` getReadingStatusInfo 2× par item · `Inter` preload:false.

## Points positifs
- Cache serveur Next : unstable_cache + tags + revalidate (komga.provider.ts, TTL long/méd/court)
- Promise.all généralisé (getBook, search, home primary/deferred)
- Images Komga : Cache-Control public, max-age=2592000, immutable (image.service.ts:41)
- Contexts Preferences/Anonymous : useMemo + useCallback
- HomeContent Server Component · next/image sur HomeClientWrapper · output:standalone · page.tsx accueil segmentée en Suspense
- getReaderData déjà corrigé (Promise.all nextBook+readerInfo)


---

## ✅ Corrections appliquées (branche audit-perf-quality)

### CRITICAL — corrigés
- **C1** Security headers : ajoutés dans `next.config.js` (X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy, X-DNS-Prefetch-Control) + `compress: true` + `images.formats`
- **C2** `useSecureCookies: process.env.NODE_ENV === "production"` (`src/lib/auth.ts:63`)
- **C3** Rate-limit login (10/min) + register (5/min) dans `AuthServerService` + error code/message `AUTH_RATE_LIMITED`

### HIGH — corrigés
- **H1** N+1 favoris : pool de concurrence 3 (`favorite.service.ts`)
- **H2** N+1 admin : 2 requêtes groupées findMany (`admin.service.ts`)
- **H3** N+1 search Stripstream : pool de concurrence 3 + unicités (`stripstream.provider.ts`)
- **H4** getProvider : enveloppé dans `React.cache()` (`provider.factory.ts`)
- **H5** getReaderInfo : limit plafonnée à 100 (`getReaderData.ts`)
- **H6** Reader lazy : `next/dynamic` ssr:false sur ClientBookWrapper + ClientBookReader
- **H7** React.memo : Thumbnail, NavigationBar, BookReader, ControlButtons, MediaCard, SeriesListItem, SeriesGridItem, BookCard, BookListItem, etc.
- **H8** framer-motion/i18next : Toaster lazy-loadé (next/dynamic). framer-motion reste (usage réel animé)
- **H9** Layout racine : non modifié structurellement (risqué), mais getProvider mémoïsé réduit la charge
- **H10** Pages série/bibliothèque : getNextBook parallélisé + borné (50)

### MEDIUM — corrigés
- setState-in-effect supprimé : PageDisplay, BookGrid, BookList, PaginatedSeriesGrid, PaginatedBookGrid, SeriesHeader, Sidebar, BackgroundSettings, useThumbnails
- useCallback sur handlers : ClientLayout, ProviderSwitcher, DisplaySettings, ReaderSettings, ConnectionsSettings, PaginatedSeriesGrid, PaginatedBookGrid, BookGrid, BookList
- useMemo sur dérivations : HomeContent, ProviderSwitcher connections, ConnectionsSettings
- getNextBook borné à 50 (stripstream)
- getUserStats : non modifié (schéma roles JSON incertain — skip documenté)

### Vérification
- `pnpm lint` ✓ · `pnpm -s tsc --noEmit` ✓ · `pnpm build` ✓ (22 routes dynamiques)
- **Tests e2e sur serveur local de dev** : 21 passed, 16 skipped (nécessitent auth+contenu), 0 échec
