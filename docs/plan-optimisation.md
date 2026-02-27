# Plan d'Optimisation des Performances

> Dernière mise à jour: 2026-02-27

## État Actuel

### Ce qui fonctionne bien
- ✅ Pagination native Komga (`POST /series/list`, `POST /books/list`)
- ✅ Prefetching des pages de livre (avec déduplication)
- ✅ 5 appels parallèles pour la page Home
- ✅ Service Worker pour images et navigation
- ✅ Timeout et retry sur les appels API
- ✅ Prisma singleton pour éviter les connexions multiples
- ✅ **Cache serveur API avec Next.js revalidate** (ajouté)

---

## Analyse Complète

### ⚡ Problèmes de Performance

#### 🟡 Cache préférences (IMPACT: MOYEN)
**Symptôme:** Chaque lecture de préférences = 1 query DB

**Fichier:** `src/lib/services/preferences.service.ts`

#### 🟢 N+1 API Calls - résolu avec cache
Les appels pour récupérer le count des livres sont parallèles (Promise.all) + cache Next.js (0-2ms). Plus critique qu'avant.

---

### 🔒 Problemes de Securite

#### 🔴 Critique - Auth Header en clair
**Impact:** HIGH | **Fichiers:** `src/lib/services/config-db.service.ts:21-23`

```typescript
// Problème: authHeader stocké en clair dans la DB
const authHeader: string = Buffer.from(`${data.username}:${data.password}`).toString("base64");
```

**Solution:** Chiffrer avec AES-256 avant de stocker. Ajouter `ENCRYPTION_KEY` dans .env

#### 🔴 Pas de rate limiting
**Impact:** HIGH | **Fichiers:** Toutes les routes API

**Solution:** Ajouter `rate-limiter-flexible` pour limiter les requêtes par IP/user

---

### ⚠️ Autres Problemes

#### 🟡 Appels doublons (architecture Next.js)
**Impact:** Moyen | **Fichier:** `layout.tsx`

Le layout + les pages font des appels séparés → appels doublons. Résolu en partie par le cache.

#### Service Worker double-cache (IMPACT: FAIBLE)
**Symptôme:** Conflit entre cache SW et navigateur

#### getHomeData echoue completement si une requete echoue
**Impact:** Fort | **Fichier:** `src/app/api/komga/home/route.ts`

---

## Priorites d'implementation

### ✅ Phase 2: Performance (COMPLETEE)
- **Cache serveur API via fetchFromApi avec option `revalidate`**
- Fichiers modifiés:
  - `src/lib/services/base-api.service.ts` - ajout option `revalidate` dans fetch + CACHE_DEBUG
  - `src/lib/services/library.service.ts` - CACHE_TTL = 300s (5 min)
  - `src/lib/services/home.service.ts` - CACHE_TTL = 120s (2 min)
  - `src/lib/services/series.service.ts` - CACHE_TTL = 120s (2 min)
  - `src/lib/services/book.service.ts` - CACHE_TTL = 60s (1 min)

### Phase 1: Securite (PRIORITE SUIVANTE)

1. **Chiffrer les identifiants Komga**
   ```typescript
   // src/lib/utils/encryption.ts
   import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
   
   const ALGORITHM = 'aes-256-gcm';
   const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
   
   export function encrypt(text: string): string {
     const iv = randomBytes(16);
     const cipher = createCipheriv(ALGORITHM, key, iv);
     const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
     return `${iv.toString('hex')}:${encrypted.toString('hex')}:${cipher.getAuthTag().toString('hex')}`;
   }
   ```

2. **Ajouter rate limiting**

### Phase 3: Fiabilite (Priorite MOYENNE)

1. **Graceful degradation** sur Home (afficher données partielles si un appel échoue)
2. **Cache préférences**

### Phase 4: Nettoyage (Priorite FAIBLE)

1. **Supprimer double-cache SW** pour les données API

---

## TTL Recommandes pour Cache

| Donnee | TTL | Status |
|--------|-----|--------|
| Home | 2 min | ✅ Implementé |
| Series list | 2 min | ✅ Implementé |
| Books list | 2 min | ✅ Implementé |
| Book details | 1 min | ✅ Implementé |
| Libraries | 5 min | ✅ Implementé |
| Preferences | - | ⏳ Non fait |

---

## Fichiers a Modifier

### ✅ Performance (COMPLET)
1. ~~`src/lib/services/server-cache.service.ts`~~ - Supprimé, on utilise Next.js natif
2. ~~`src/lib/services/base-api.service.ts`~~ - Ajout option `revalidate` dans fetch
3. ~~`src/lib/services/home.service.ts`~~ - CACHE_TTL = 120s
4. ~~`src/lib/services/library.service.ts`~~ - CACHE_TTL = 300s
5. ~~`src/lib/services/series.service.ts`~~ - CACHE_TTL = 120s
6. ~~`src/lib/services/book.service.ts`~~ - CACHE_TTL = 60s

### 🔒 Securite (A FAIRE)
1. `src/lib/utils/encryption.ts` (nouveau)
2. `src/lib/services/config-db.service.ts` - Utiliser chiffrement
3. `src/middleware.ts` - Ajouter rate limiting

### Fiabilite (A FAIRE)
1. `src/app/api/komga/home/route.ts` - Graceful degradation
2. `src/lib/services/base-api.service.ts` - Utiliser deduplication

### Nettoyage (A FAIRE)
1. `public/sw.js` - Supprimer cache API
