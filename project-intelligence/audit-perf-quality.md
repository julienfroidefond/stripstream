# Audit Qualité + Performance — stripstream (branche audit-perf-quality)

Date : 2026-09-05 · Baseline : lint ✓ · typecheck ✓ · build ✓ (41s, 22 routes dynamiques)

## Verdict global
Codebase saine côté serveur (cache Next bien utilisé, Promise.all généralisé, providers propres).
Les faiblesses sont concentrées côté **client** (0 memo, 0 lazy-loading) et **sécurité** (headers, rate-limit).

## CRITICAL

### C1. Aucun security header HTTP
`src/middleware.ts` (aucun header) + `next.config.js` (aucune config headers).
Pas de CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS.
→ Ajouter `headers()` dans next.config.js (CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin).

### C2. Cookies de session en clair en production
`src/lib/auth.ts:63` — `useSecureCookies: false` force des cookies non-secure même en HTTPS prod.
Le jeton JWT de session passe en clair → interception possible.
→ `useSecureCookies: process.env.NODE_ENV === "production"` (ou supprimer, NextAuth gère selon l'URL).

### C3. Aucun rate-limit sur login/register
`src/utils/rate-limit.ts` existe mais n'est branché que sur les configs (`checkRateLimit` dans config.ts / stripstream-config.ts).
`src/lib/auth.ts` (authorize) et `src/app/actions/auth.ts` (registerUser) : aucune protection brute-force.
→ Appliquer `checkRateLimit` sur authorize (par email+IP) et registerUser.

## HIGH

### H1. N+1 sur les favoris
`src/lib/services/favorite.service.ts:175-198` — `listFavorites()` fait `provider.getSeriesById(id)` par favori dans un map+Promise.all. Chez Stripstream chaque getSeriesById = 2 fetch (details + metadata), soit ~2N appels réseau pour N favoris.
→ Idéalement endpoint batch ; sinon limiter la concurrence + s'appuyer sur le cache Next (getSeriesById a déjà `revalidate`).

### H2. getProvider non mémoïsé
`src/lib/providers/provider.factory.ts:9-37` — `getProvider()` refait `getCurrentUser` + `getActiveConnection` + lectures DB à chaque appel serveur ; plusieurs appels dans un même render → lecture DB répétée.
→ Envelopper dans `React.cache()`.

### H3. Reader chargé statiquement (bundle route livre)
`src/components/reader/ClientBookWrapper.tsx:6` — `BookReader` importé statiquement. La chaîne page.tsx → ClientBookWrapper → BookReader tire tout le lecteur (PageDisplay, EndOfSeriesModal, ReaderInfoDialog, Thumbnail, blobs) dans le bundle initial de `/books/[bookId]`.
→ `next/dynamic` sur BookReader (ssr:false) pour ne charger que si l'utilisateur ouvre une page.

### H4. 0 React.memo sur les listes lourdes
0 `React.memo` sur 93 composants client.
- `src/components/reader/components/Thumbnail.tsx:7` — forwardRef non-memo, rendu des centaines de miniatures dans NavigationBar ; chaque changement de page re-rend tout.
- `src/components/home/MediaRow.tsx:80` — MediaCard non-memo, `onClick` inline recréé par item.
- `src/components/library/SeriesGrid.tsx:81` — items en `<button>` inline, `getReadingStatusInfo` appelé 2× par item (l.111 + l.114).

### H5. 0 next/dynamic (bundle initial)
Aucun lazy-loading sur 93 composants client. Le Toaster (`src/components/ui/toaster.tsx`, Radix) est monté dans ClientLayout → sur toutes les pages. framer-motion chargé sur la route home (`RecommendationsRow.tsx:6`).
→ `next/dynamic` pour Toaster + dialogs + composants lourds.

### H6. Route image Komga bufferise en mémoire
`src/app/api/komga/books/[bookId]/pages/[pageNumber]/route.ts:35` — seule route à bufferiser entièrement (buffer + `buffer.slice(0)` double la copie mémoire) via requestDeduplicationService, au lieu de streamer `response.body`.
→ Streamer avec le même cache au lieu de bufferiser.

### H7. Layout racine : 5 fetchs de données sur chaque page
`src/app/layout.tsx:93-104` — prefs, librairies, favoris, 2 configs chargés sur TOUTES les routes (Promise.allSettled mais coût réseau+DB payé partout, y compris login).
→ Déplacer vers un cache par route / Server Components ciblés, ou React.cache() pour dédup intra-requête.

## MEDIUM

### M1. getReaderInfo séquentiel
`src/lib/reader/getReaderData.ts:37-49` — `getSeriesById` puis `getBooks` en séquence (le reste est déjà en Promise.all).

### M2. Buffer de déduplication sous-utilisé
`src/lib/services/request-deduplication.service.ts` n'est branché que sur 1 route (komga books pages). Les autres routes images ne dédup pas.

### M3. Redirect de login sans rate-limit
`src/middleware.ts:62-64` — redirect vers /login, aucun rate-limit global.

## LOW

### L1. RefreshContext recrée son value à chaque render
`src/contexts/RefreshContext.tsx:22` — `value={{ refreshLibrary, refreshSeries }}` non mémoïsé (mineur, peu de consommateurs).

### L2. getLibraryById re-fetch toutes les librairies
`src/lib/providers/stripstream/stripstream.provider.ts:54-64` — fetch toutes les librairies pour en trouver une.

### L3. login-bg.jpg non optimisé
`src/app/login/LoginContent.tsx` — backgroundImage CSS inline, image 1200px+ chargée brute sans next/image.

### L4. ClientLayout monte tout dans un seul bundle
`src/components/layout/ClientLayout.tsx:208` — Header, Sidebar, InstallPWA, NetworkStatus tous dans le bundle initial.

## Points positifs (déjà bons)
- Cache serveur Next bien utilisé : `unstable_cache` + tags + revalidate dans komga.provider.ts (TTL long/méd/court)
- Promise.all généralisé (getBook, search, home primary/deferred)
- Images Komga : Cache-Control `public, max-age=2592000, immutable` via image.service.ts:41
- Contexts bien optimisés (PreferencesContext, AnonymousContext : useMemo + useCallback)
- HomeContent est un Server Component (pas de "use client")
- getReaderData déjà corrigé (Promise.all sur nextBook + readerInfo)
- next/image utilisé sur HomeClientWrapper
- Middleware : protection auth correcte (publicRoutes + redirect 401/307)