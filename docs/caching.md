# Système de Caching

Ce document décrit l'architecture et les stratégies de caching de StripStream.

## Vue d'ensemble

Le système de caching est organisé en **3 couches indépendantes** avec des responsabilités clairement définies :

```
┌─────────────────────────────────────────────────────────────┐
│                        NAVIGATEUR                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Service Worker (Cache API)                            │ │
│  │  → Offline support                                     │ │
│  │  → Images (covers + pages)                             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      SERVEUR NEXT.JS                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ServerCacheService                                    │ │
│  │  → Données API Komga                                   │ │
│  │  → Stale-while-revalidate                              │ │
│  │  → Mode fichier ou mémoire                             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      SERVEUR KOMGA                           │
└─────────────────────────────────────────────────────────────┘
```

## Couche 1 : Service Worker (Client)

### Fichier

`public/sw.js`

### Responsabilité

- Support offline de l'application
- Cache persistant des images (couvertures et pages de livres)
- Cache des ressources statiques Next.js

### Stratégies

#### Images : Cache-First

```javascript
// Pour toutes les images (covers + pages)
const isImageResource = (url) => {
  return (
    (url.includes("/api/v1/books/") &&
      (url.includes("/pages") || url.includes("/thumbnail") || url.includes("/cover"))) ||
    (url.includes("/api/komga/images/") &&
      (url.includes("/series/") || url.includes("/books/")) &&
      url.includes("/thumbnail"))
  );
};
```

**Comportement** :

1. Vérifier si l'image est dans le cache
2. Si oui → retourner depuis le cache
3. Si non → fetch depuis le réseau
4. Si succès → mettre en cache + retourner
5. Si échec → retourner 404

**Avantages** :

- Performance maximale (lecture instantanée depuis le cache)
- Fonctionne offline une fois les images chargées
- Économise la bande passante

#### Navigation et ressources statiques : Network-First

```javascript
// Pour les pages et ressources _next/static
event.respondWith(
  fetch(request)
    .then((response) => {
      // Mise en cache si succès
      if (response.ok && (isNextStaticResource || isNavigation)) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(async () => {
      // Fallback sur le cache si offline
      const cachedResponse = await cache.match(request);
      if (cachedResponse) return cachedResponse;

      // Page offline si navigation
      if (request.mode === "navigate") {
        return cache.match("/offline.html");
      }
    })
);
```

**Avantages** :

- Toujours la dernière version quand online
- Fallback offline si nécessaire
- Navigation fluide même sans connexion

### Caches

| Cache                   | Usage                        | Stratégie     | Taille   |
| ----------------------- | ---------------------------- | ------------- | -------- |
| `stripstream-cache-v1`  | Ressources statiques + pages | Network-First | ~5 MB    |
| `stripstream-images-v1` | Images (covers + pages)      | Cache-First   | Illimité |

### Nettoyage

- Automatique lors de l'activation du Service Worker
- Suppression des anciennes versions de cache
- Pas d'expiration (contrôlé par l'utilisateur via les paramètres du navigateur)

## Couche 2 : ServerCacheService (Serveur)

### Fichier

`src/lib/services/server-cache.service.ts`

### Responsabilité

- Cache des réponses API Komga côté serveur
- Optimisation des temps de réponse
- Réduction de la charge sur Komga

### Stratégie : Stale-While-Revalidate

Cette stratégie est **la clé de la performance** de l'application.

#### Principe

```
Requête → Cache existe ?
  ├─ Non    → Fetch normal + mise en cache
  └─ Oui    → Cache valide ?
      ├─ Oui    → Retourne immédiatement
      └─ Non    → Retourne le cache expiré (stale)
                  ET revalide en background
```

#### Implémentation

```typescript
async getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  type: keyof typeof ServerCacheService.DEFAULT_TTL = "DEFAULT"
): Promise<T> {
  const cacheKey = `${user.id}-${key}`;
  const cachedResult = this.getStale(cacheKey);

  if (cachedResult !== null) {
    const { data, isStale } = cachedResult;

    // Si le cache est expiré, revalider en background
    if (isStale) {
      this.revalidateInBackground(cacheKey, fetcher, type, key);
    }

    return data as T; // Retour immédiat
  }

  // Pas de cache, fetch normal
  const data = await fetcher();
  this.set(cacheKey, data, type);
  return data;
}
```

#### Avantages

✅ **Temps de réponse constant** : Le cache expiré est retourné instantanément  
✅ **Données fraîches** : Revalidation en background pour la prochaine requête  
✅ **Pas de délai** : L'utilisateur ne subit jamais l'attente de revalidation  
✅ **Résilience** : Même si Komga est lent, l'app reste rapide

#### Inconvénients

⚠️ Les données peuvent être légèrement obsolètes (jusqu'au prochain refresh)  
⚠️ Nécessite un cache initialisé (première requête toujours lente)

### Modes de stockage

L'utilisateur peut choisir entre deux modes :

#### Mode Mémoire (par défaut)

```typescript
cacheMode: "memory";
```

- Cache stocké en RAM
- **Performances** : Très rapide (lecture < 1ms)
- **Persistance** : Perdu au redémarrage du serveur
- **Capacité** : Limitée par la RAM disponible
- **Idéal pour** : Développement, faible charge

#### Mode Fichier

```typescript
cacheMode: "file";
```

- Cache stocké sur disque (`.cache/`)
- **Performances** : Rapide (lecture 5-10ms)
- **Persistance** : Survit aux redémarrages
- **Capacité** : Limitée par l'espace disque
- **Idéal pour** : Production, haute charge

### Time-To-Live (TTL)

Chaque type de données a un TTL configuré :

| Type        | TTL par défaut | Justification                      |
| ----------- | -------------- | ---------------------------------- |
| `DEFAULT`   | 5 minutes      | Données génériques                 |
| `HOME`      | 10 minutes     | Page d'accueil (données agrégées)  |
| `LIBRARIES` | 24 heures      | Bibliothèques (rarement modifiées) |
| `SERIES`    | 5 minutes      | Séries (métadonnées + progression) |
| `BOOKS`     | 5 minutes      | Livres (métadonnées + progression) |
| `IMAGES`    | 7 jours        | Images (immuables)                 |

#### Configuration personnalisée

Les TTL peuvent être personnalisés par l'utilisateur via la base de données :

```typescript
// Modèle Prisma : TTLConfig
{
  defaultTTL: 5 * 60 * 1000,
  homeTTL: 10 * 60 * 1000,
  librariesTTL: 24 * 60 * 60 * 1000,
  seriesTTL: 5 * 60 * 1000,
  booksTTL: 5 * 60 * 1000,
  imagesTTL: 7 * 24 * 60 * 60 * 1000,
}
```

### Isolation par utilisateur

Chaque utilisateur a son propre cache :

```typescript
const cacheKey = `${user.id}-${key}`;
```

**Avantages** :

- Pas de collision entre utilisateurs
- Progression de lecture individuelle
- Préférences personnalisées

### Invalidation du cache

Le cache peut être invalidé :

#### Manuellement

```typescript
await cacheService.delete(key); // Une clé
await cacheService.deleteAll(prefix); // Toutes les clés avec préfixe
await cacheService.clear(); // Tout le cache
```

#### Automatiquement

- Lors d'une mise à jour de progression
- Lors d'un changement de favoris
- Lors de la suppression d'une série

#### API

```
DELETE /api/komga/cache/clear    // Vider tout le cache
DELETE /api/komga/home           // Invalider le cache home
```

## Couche 3 : Cache HTTP (Navigateur)

### Responsabilité

- Cache basique géré par le navigateur
- Headers HTTP standard

### Configuration

#### Next.js ISR (Incremental Static Regeneration)

```typescript
export const revalidate = 60; // Revalidation toutes les 60 secondes
```

Utilisé uniquement pour les routes avec rendu statique.

#### Headers explicites (désactivé)

Les headers HTTP explicites ont été **supprimés** car :

- Le ServerCacheService gère déjà le caching efficacement
- Évite la confusion entre plusieurs couches de cache
- Simplifie le debugging

Avant (supprimé) :

```typescript
NextResponse.json(data, {
  headers: {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
  },
});
```

Maintenant :

```typescript
NextResponse.json(data); // Pas de headers
```

## Flow de données complet

Exemple : Chargement de la page d'accueil

```
1. Utilisateur → GET /
   ↓
2. Next.js → HomeService.getHomeData()
   ↓
3. HomeService → ServerCacheService.getOrSet("home-ongoing", ...)
   ↓
4. ServerCacheService
   ├─ Cache valide ? → Retourne immédiatement
   ├─ Cache expiré ? → Retourne cache + revalide en background
   └─ Pas de cache ? → Fetch Komga + mise en cache
   ↓
5. Response → Client
   ↓
6. Images → Service Worker (Cache-First)
   ├─ En cache ? → Lecture instantanée
   └─ Pas en cache ? → Fetch + mise en cache
```

### Temps de réponse typiques

| Scénario                      | Temps       | Détails                    |
| ----------------------------- | ----------- | -------------------------- |
| Cache ServerCache valide + SW | ~50ms       | Optimal                    |
| Cache ServerCache expiré + SW | ~50ms       | Revalidation en background |
| Pas de cache ServerCache + SW | ~200-500ms  | Première requête           |
| Cache SW uniquement           | ~10ms       | Images seulement           |
| Tout à froid                  | ~500-1000ms | Pire cas                   |

## Cas d'usage

### 1. Première visite

```
User → App → Komga (tous les caches vides)
Temps : ~500-1000ms
```

### 2. Visite suivante (online)

```
User → ServerCache (valide) → Images SW
Temps : ~50ms
```

### 3. Cache expiré (online)

```
User → ServerCache (stale) → Retour immédiat
       ↓
       Revalidation background → Mise à jour cache
Temps ressenti : ~50ms (aucun délai)
```

### 4. Mode offline

```
User → Service Worker cache uniquement
Fonctionnalités :
✅ Navigation entre pages déjà visitées
✅ Consultation des images déjà vues
❌ Nouvelles données (nécessite connexion)
```

## Monitoring et debug

### Logs de cache (recommandé pour le dev)

Activez les logs détaillés du cache serveur :

```bash
# Dans docker-compose.dev.yml ou .env
CACHE_DEBUG=true
```

**Format des logs** :

```
[CACHE HIT] home-ongoing | HOME | 0.45ms      # Cache valide
[CACHE STALE] home-ongoing | HOME | 0.52ms    # Cache expiré (retourné + revalidation)
[CACHE MISS] home-ongoing | HOME              # Pas de cache
[CACHE SET] home-ongoing | HOME | 324.18ms    # Mise en cache
[CACHE REVALIDATE] home-ongoing | HOME | 287ms # Revalidation background
```

📖 **Documentation complète** : [docs/cache-debug.md](./cache-debug.md)

### API de monitoring

#### Taille du cache serveur

```bash
GET /api/komga/cache/size
Response: { sizeInBytes: 15728640, itemCount: 234 }
```

#### Mode de cache actuel

```bash
GET /api/komga/cache/mode
Response: { mode: "memory" }
```

#### Changer le mode

```bash
POST /api/komga/cache/mode
Body: { mode: "file" }
```

#### Vider le cache

```bash
POST /api/komga/cache/clear
```

### DevTools du navigateur

#### Network Tab

- Temps de réponse < 50ms = cache serveur
- Headers `X-Cache` si configurés
- Onglet "Timing" pour détails

#### Application → Cache Storage

Inspecter le Service Worker :

- `stripstream-cache-v1` : Ressources statiques
- `stripstream-images-v1` : Images

Actions disponibles :

- Voir le contenu
- Supprimer des entrées
- Vider complètement

#### Application → Service Workers

- État du Service Worker
- "Unregister" pour le désactiver
- "Update" pour forcer une mise à jour

## Optimisations futures possibles

### 1. Cache Redis (optionnel)

- Pour un déploiement multi-instances
- Cache partagé entre plusieurs serveurs
- TTL natif Redis

### 2. Compression

- Compresser les données en cache (Brotli/Gzip)
- Économie d'espace disque/mémoire
- Trade-off CPU vs espace

### 3. Prefetching intelligent

- Précharger les séries en cours de lecture
- Précharger les pages suivantes dans le reader
- Basé sur l'historique utilisateur

### 4. Cache Analytics

- Ratio hit/miss
- Temps de réponse moyens
- Identification des données les plus consultées

## Bonnes pratiques

### Pour les développeurs

✅ **Utiliser BaseApiService.fetchWithCache()**

```typescript
await this.fetchWithCache<T>(
  "cache-key",
  async () => this.fetchFromApi(...),
  "HOME" // Type de TTL
);
```

✅ **Invalider le cache après modification**

```typescript
await HomeService.invalidateHomeCache();
```

✅ **Choisir le bon TTL**

- Court (1-5 min) : Données qui changent souvent
- Moyen (10-30 min) : Données agrégées
- Long (24h+) : Données quasi-statiques

❌ **Ne pas cacher les mutations**  
Les POST/PUT/DELETE ne doivent jamais être cachés

❌ **Ne pas oublier l'isolation utilisateur**  
Toujours préfixer avec `userId` pour les données personnelles

### Pour les utilisateurs

- **Mode mémoire** : Plus rapide, mais cache perdu au redémarrage
- **Mode fichier** : Persistant, idéal pour production
- **Vider le cache** : En cas de problème d'affichage
- **Offline** : Consulter les pages déjà visitées

## Conclusion

Le système de caching de StripStream est conçu pour :

🎯 **Performance** : Temps de réponse constants grâce au stale-while-revalidate  
🔒 **Fiabilité** : Fonctionne même si Komga est lent ou inaccessible  
💾 **Flexibilité** : Mode mémoire ou fichier selon les besoins  
🚀 **Offline-first** : Support complet du mode hors ligne  
🧹 **Simplicité** : 3 couches bien définies, pas de redondance

Le système est maintenu simple avec des responsabilités claires pour chaque couche, facilitant la maintenance et l'évolution future.
