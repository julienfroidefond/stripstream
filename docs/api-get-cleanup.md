---
status: reviewed
reviewed_at: 2026-02-28
review_file: thoughts/reviews/api-get-cleanup-review.md
---

# Plan - Cleanup des routes API GET (focus RSC)

## État réel (scan `src/app/api`)

Routes GET actuellement présentes :

### A. Migrees en Lot 1 (RSC, routes supprimees)

| Route | Utilisation client actuelle | Cible | Action |
|-------|-----------------------------|-------|--------|
| `GET /api/preferences` | `src/contexts/PreferencesContext.tsx` | Préférences fournies par layout/page server | ✅ Supprimée |
| `GET /api/komga/favorites` | `src/components/layout/Sidebar.tsx`, `src/components/series/SeriesHeader.tsx` | Favoris passés depuis parent Server Component | ✅ Supprimée |
| `GET /api/admin/users` | `src/components/admin/AdminContent.tsx` | Page admin en RSC + props | ✅ Supprimée |
| `GET /api/admin/stats` | `src/components/admin/AdminContent.tsx` | Page admin en RSC + props | ✅ Supprimée |
| `GET /api/komga/libraries` | `src/components/settings/BackgroundSettings.tsx` | Données passées depuis page/settings server | ✅ Supprimée |

### B. A garder temporairement (interaction client forte)

| Route | Utilisation actuelle | Pourquoi garder maintenant | Piste de simplification |
|-------|----------------------|----------------------------|-------------------------|
| `GET /api/komga/books/[bookId]` | fallback dans `ClientBookPage.tsx`, usage `DownloadManager.tsx` | fallback utile hors flux page SSR | Limiter au fallback strict, éviter le double-fetch |
| `GET /api/komga/series/[seriesId]` | utilisé via Sidebar pour enrichir les favoris | enrichissement client en cascade | Charger les métadonnées nécessaires en amont côté server |
| `GET /api/user/profile` | pas d'appel client direct trouvé | route utile pour consommation API interne/outils | Vérifier si remplaçable par service server direct |

### B2. Migrees en Lot 2 (pagination server-first)

| Route | Utilisation client actuelle | Cible | Action |
|-------|-----------------------------|-------|--------|
| `GET /api/komga/libraries/[libraryId]/series` | `src/app/libraries/[libraryId]/LibraryClientWrapper.tsx` | Chargement via `searchParams` dans page server | ✅ Supprimée |
| `GET /api/komga/series/[seriesId]/books` | `src/app/series/[seriesId]/SeriesClientWrapper.tsx` | Chargement via `searchParams` dans page server | ✅ Supprimée |
| `GET /api/komga/random-book` | `src/components/layout/ClientLayout.tsx` | Action utilisateur via server action | ✅ Supprimée |
| `GET /api/komga/home` | `src/app/page.tsx` consomme déjà `HomeService` côté server | Données agrégées directement via service server | ✅ Supprimée |

### C. A conserver (API de transport / framework)

| Route | Raison |
|-------|--------|
| `GET /api/komga/images/**` | streaming/binaire image, adapté à une route API |
| `GET /api/komga/books/[bookId]/pages/[pageNumber]` | endpoint image avec déduplication/cache |
| `GET /api/auth/[...nextauth]` | handler NextAuth, à conserver |

## Points importants

- `GET /api/komga/config` n'existe plus dans `src/app/api` (déjà retirée).
- Le gain principal vient des écrans qui refetchent des données déjà disponibles côté server (layout/page).
- Objectif: réduire les GET API utilisés comme couche interne entre composants React et services serveur.

## Plan d'exécution recommandé

1. **Lot 1 (quick wins)**
   - Migrer `preferences`, `favorites`, `admin/users`, `admin/stats`, `komga/libraries` vers un chargement server-first.
   - Garder les routes GET le temps de la transition, puis supprimer les appels client.

2. **Lot 2 (pages paginées)**
   - Repenser `libraries/[libraryId]/series` et `series/[seriesId]/books` pour un flux `searchParams` server-first.
   - Conserver seulement les interactions client réellement nécessaires.

3. **Lot 3 (stabilisation)**
   - Vérifier `user/profile` et `komga/home` (route API vs appel direct service).
   - Supprimer les routes GET devenues sans consommateurs.

## Check de validation

- Plus de `fetch("/api/...")` GET dans les composants server-capables.
- Pas de régression UX sur pagination/filtres et random book.
- Journal clair des routes supprimées et des routes conservées avec justification.
