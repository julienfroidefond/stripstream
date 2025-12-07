# Plan d'Optimisation des Performances - StripStream

## 🔴 Problèmes Identifiés

### Problème Principal : Pagination côté client au lieu de Komga

**Code actuel problématique :**

```typescript
// library.service.ts - ligne 59
size: "5000"; // Récupère TOUTES les séries d'un coup

// series.service.ts - ligne 69
size: "1000"; // Récupère TOUS les livres d'un coup
```

**Impact :**

- Charge massive en mémoire (stocker 5000 séries)
- Temps de réponse longs (transfert de gros JSON)
- Cache volumineux et inefficace
- Pagination manuelle côté serveur Node.js

### Autres Problèmes

1. **TRIPLE cache conflictuel**

   - **Service Worker** : Cache les données API dans `DATA_CACHE` avec SWR
   - **ServerCacheService** : Cache côté serveur avec SWR
   - **Headers HTTP** : `Cache-Control` sur les routes API
   - Comportements imprévisibles, données désynchronisées

2. **Clés de cache trop larges**

   - `library-{id}-all-series` → stocke TOUT
   - Pas de clé par page/filtres

3. **Préférences rechargées à chaque requête**

   - `PreferencesService.getPreferences()` fait une query DB à chaque fois
   - Pas de mise en cache des préférences

4. **ISR mal configuré**
   - `export const revalidate = 60` sur routes dynamiques
   - Conflit avec le cache serveur

---

## ✅ Plan de Développement

### Phase 1 : Pagination Native Komga (PRIORITÉ HAUTE)

- [x] **1.1 Refactorer `LibraryService.getLibrarySeries()`**

  - Utiliser directement la pagination Komga
  - Endpoint: `POST /api/v1/series/list?page={page}&size={size}`
  - Supprimer `getAllLibrarySeries()` et le slice manuel
  - Passer les filtres (unread, search) directement à Komga

- [x] **1.2 Refactorer `SeriesService.getSeriesBooks()`**

  - Utiliser directement la pagination Komga
  - Endpoint: `POST /api/v1/books/list?page={page}&size={size}`
  - Supprimer `getAllSeriesBooks()` et le slice manuel (gardée pour book.service.ts)

- [x] **1.3 Adapter les clés de cache**

  - Clé incluant page + size + filtres
  - Format: `library-{id}-series-p{page}-s{size}-u{unread}-q{search}` ✅
  - Format: `series-{id}-books-p{page}-s{size}-u{unread}` ✅

- [x] **1.4 Mettre à jour les routes API**
  - `/api/komga/libraries/[libraryId]/series` ✅ (utilise déjà `LibraryService.getLibrarySeries()` refactoré)
  - `/api/komga/series/[seriesId]/books` ✅ (utilise déjà `SeriesService.getSeriesBooks()` refactoré)

### Phase 2 : Simplification du Cache (Triple → Simple)

**Objectif : Passer de 3 couches de cache à 1 seule (ServerCacheService)**

- [x] **2.1 Désactiver le cache SW pour les données API**

  - Modifier `sw.js` : retirer le cache des routes `/api/komga/*` (sauf images)
  - Garder uniquement le cache SW pour : images, static, navigation
  - Le cache serveur suffit pour les données

- [ ] **2.2 Supprimer les headers HTTP Cache-Control**

  - Retirer `Cache-Control` des NextResponse dans les routes API
  - Évite les conflits avec le cache serveur

- [ ] **2.3 Supprimer `revalidate` des routes dynamiques**

  - Routes API = dynamiques, pas besoin d'ISR
  - Le cache serveur suffit

- [ ] **2.4 Optimiser les TTL ServerCacheService**
  - Réduire TTL des listes paginées (1-2 min)
  - Garder TTL court pour les données avec progression (5 min)
  - Garder TTL long pour les images (7 jours)

**Résultat final :**

| Type de donnée   | Cache utilisé      | Stratégie     |
| ---------------- | ------------------ | ------------- |
| Images           | SW (IMAGES_CACHE)  | Cache-First   |
| Static (\_next/) | SW (STATIC_CACHE)  | Cache-First   |
| Données API      | ServerCacheService | SWR           |
| Navigation       | SW                 | Network-First |

### Phase 3 : Optimisation des Préférences

- [ ] **3.1 Cacher les préférences utilisateur**

  - Créer `PreferencesService.getCachedPreferences()`
  - TTL court (1 minute)
  - Invalidation manuelle lors des modifications

- [ ] **3.2 Réduire les appels DB**
  - Grouper les appels de config Komga + préférences
  - Request-level caching (par requête HTTP)

### Phase 4 : Optimisation du Home

- [ ] **4.1 Paralléliser intelligemment les appels Komga**

  - Les 5 appels sont déjà en parallèle ✅
  - Vérifier que le circuit breaker ne bloque pas

- [ ] **4.2 Réduire la taille des données Home**
  - Utiliser des projections (ne récupérer que les champs nécessaires)
  - Limiter à 10 items par section (déjà fait ✅)

### Phase 5 : Nettoyage et Simplification

- [ ] **5.1 Supprimer le code mort**

  - `getAllLibrarySeries()` (après phase 1)
  - `getAllSeriesBooks()` (après phase 1)

- [ ] **5.2 Documenter la nouvelle architecture**

  - Mettre à jour `docs/caching.md`
  - Documenter les nouvelles clés de cache

- [ ] **5.3 Ajouter des métriques**
  - Temps de réponse des requêtes Komga
  - Hit/Miss ratio du cache
  - Taille des payloads

---

## 📝 Implémentation Détaillée

### Phase 1.1 : Nouveau `LibraryService.getLibrarySeries()`

```typescript
static async getLibrarySeries(
  libraryId: string,
  page: number = 0,
  size: number = 20,
  unreadOnly: boolean = false,
  search?: string
): Promise<LibraryResponse<Series>> {
  const headers = { "Content-Type": "application/json" };

  // Construction du body de recherche pour Komga
  const condition: Record<string, any> = {
    libraryId: { operator: "is", value: libraryId },
  };

  // Filtre unread natif Komga
  if (unreadOnly) {
    condition.readStatus = { operator: "is", value: "IN_PROGRESS" };
    // OU utiliser: complete: { operator: "is", value: false }
  }

  const searchBody = { condition };

  // Clé de cache incluant tous les paramètres
  const cacheKey = `library-${libraryId}-series-p${page}-s${size}-u${unreadOnly}-q${search || ''}`;

  const response = await this.fetchWithCache<LibraryResponse<Series>>(
    cacheKey,
    async () => {
      const params: Record<string, string> = {
        page: String(page),
        size: String(size),
        sort: "metadata.titleSort,asc",
      };

      // Filtre de recherche
      if (search) {
        params.search = search;
      }

      return this.fetchFromApi<LibraryResponse<Series>>(
        { path: "series/list", params },
        headers,
        { method: "POST", body: JSON.stringify(searchBody) }
      );
    },
    "SERIES"
  );

  // Filtrer les séries supprimées côté client (léger)
  response.content = response.content.filter((series) => !series.deleted);

  return response;
}
```

### Phase 1.2 : Nouveau `SeriesService.getSeriesBooks()`

```typescript
static async getSeriesBooks(
  seriesId: string,
  page: number = 0,
  size: number = 24,
  unreadOnly: boolean = false
): Promise<LibraryResponse<KomgaBook>> {
  const headers = { "Content-Type": "application/json" };

  const condition: Record<string, any> = {
    seriesId: { operator: "is", value: seriesId },
  };

  if (unreadOnly) {
    condition.readStatus = { operator: "isNot", value: "READ" };
  }

  const searchBody = { condition };

  const cacheKey = `series-${seriesId}-books-p${page}-s${size}-u${unreadOnly}`;

  const response = await this.fetchWithCache<LibraryResponse<KomgaBook>>(
    cacheKey,
    async () =>
      this.fetchFromApi<LibraryResponse<KomgaBook>>(
        {
          path: "books/list",
          params: {
            page: String(page),
            size: String(size),
            sort: "number,asc",
          },
        },
        headers,
        { method: "POST", body: JSON.stringify(searchBody) }
      ),
    "BOOKS"
  );

  // Filtrer les livres supprimés côté client (léger)
  response.content = response.content.filter((book) => !book.deleted);

  return response;
}
```

### Phase 2.1 : Modification du Service Worker

```javascript
// sw.js - SUPPRIMER cette section
// Route 3: API data → Stale-While-Revalidate (if cacheable)
// if (isApiDataRequest(url.href) && shouldCacheApiData(url.href)) {
//   event.respondWith(staleWhileRevalidateStrategy(request, DATA_CACHE));
//   return;
// }

// Garder uniquement :
// - Route 1: Images → Cache-First
// - Route 2: RSC payloads → Stale-While-Revalidate (pour navigation)
// - Route 4: Static → Cache-First
// - Route 5: Navigation → Network-First
```

**Pourquoi supprimer le cache SW des données API ?**

- Le ServerCacheService fait déjà du SWR côté serveur
- Pas de bénéfice à cacher 2 fois
- Simplifie l'invalidation (un seul endroit)
- Les données restent accessibles en mode online via ServerCache

### Phase 2.2 : Routes API simplifiées

```typescript
// libraries/[libraryId]/series/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ libraryId: string }> }
) {
  const libraryId = (await params).libraryId;
  const searchParams = request.nextUrl.searchParams;

  const page = parseInt(searchParams.get("page") || "0");
  const size = parseInt(searchParams.get("size") || "20");
  const unreadOnly = searchParams.get("unread") === "true";
  const search = searchParams.get("search") || undefined;

  const [series, library] = await Promise.all([
    LibraryService.getLibrarySeries(libraryId, page, size, unreadOnly, search),
    LibraryService.getLibrary(libraryId),
  ]);

  // Plus de headers Cache-Control !
  return NextResponse.json({ series, library });
}

// Supprimer: export const revalidate = 60;
```

---

## 📊 Gains Attendus

| Métrique                  | Avant        | Après (estimé) |
| ------------------------- | ------------ | -------------- |
| Payload initial Library   | ~500KB - 5MB | ~10-50KB       |
| Temps 1ère page Library   | 2-10s        | 200-500ms      |
| Mémoire cache par library | ~5MB         | ~50KB/page     |
| Requêtes Komga par page   | 1 grosse     | 1 petite       |

---

## ⚠️ Impact sur le Mode Offline

**Avant (triple cache) :**

- Données API cachées par le SW → navigation offline possible

**Après (cache serveur uniquement) :**

- Données API non cachées côté client
- Mode offline limité aux images déjà vues
- Page offline.html affichée si pas de connexion

**Alternative si offline critique :**

- Option 1 : Garder le cache SW uniquement pour les pages "Home" et "Library" visitées
- Option 2 : Utiliser IndexedDB pour un vrai mode offline (plus complexe)
- Option 3 : Accepter la limitation (majoritaire pour un reader de comics)

---

## 🔧 Tests à Effectuer

- [ ] Test pagination avec grande bibliothèque (>1000 séries)
- [ ] Test filtres (unread, search) avec pagination
- [ ] Test changement de page rapide (pas de race conditions)
- [ ] Test invalidation cache (refresh)
- [ ] Test mode offline → vérifier que offline.html s'affiche
- [ ] Test images offline → doivent rester accessibles

---

## 📅 Ordre de Priorité

1. **Urgent** : Phase 1 (pagination native) - Impact maximal
2. **Important** : Phase 2 (simplification cache) - Évite les bugs
3. **Moyen** : Phase 3 (préférences) - Optimisation secondaire
4. **Faible** : Phase 4-5 (nettoyage) - Polish

---

## Notes Techniques

### API Komga - Pagination

L'API Komga supporte nativement :

- `page` : Index de page (0-based)
- `size` : Nombre d'éléments par page
- `sort` : Tri (ex: `metadata.titleSort,asc`)

Endpoint POST `/api/v1/series/list` accepte un body avec `condition` pour filtrer.

### Filtres Komga disponibles

```json
{
  "condition": {
    "libraryId": { "operator": "is", "value": "xxx" },
    "readStatus": { "operator": "is", "value": "IN_PROGRESS" },
    "complete": { "operator": "is", "value": false }
  }
}
```

### Réponse paginée Komga

```json
{
  "content": [...],
  "pageable": { "pageNumber": 0, "pageSize": 20 },
  "totalElements": 150,
  "totalPages": 8,
  "first": true,
  "last": false
}
```
