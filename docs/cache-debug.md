# Debug du Cache

Guide pour debugger le système de caching de StripStream.

## Activation des logs de cache

### Variable d'environnement

Activez les logs détaillés du cache serveur avec :

```bash
CACHE_DEBUG=true
```

### Configuration

#### Développement (docker-compose.dev.yml)

```yaml
environment:
  - CACHE_DEBUG=true
```

#### Production (.env)

```env
CACHE_DEBUG=true
```

## Format des logs

Les logs de cache apparaissent dans la console serveur avec le format suivant :

### Cache HIT (donnée valide)

```
[CACHE HIT] home-ongoing | HOME | 0.45ms
```

- ✅ Donnée trouvée en cache
- ✅ Donnée encore valide (pas expirée)
- ⚡ Retour immédiat (très rapide)

### Cache STALE (donnée expirée)

```
[CACHE STALE] home-ongoing | HOME | 0.52ms
```

- ✅ Donnée trouvée en cache
- ⚠️ Donnée expirée mais toujours retournée
- 🔄 Revalidation lancée en background

### Cache MISS (pas de donnée)

```
[CACHE MISS] home-ongoing | HOME
```

- ❌ Aucune donnée en cache
- 🌐 Fetch normal depuis Komga
- 💾 Mise en cache automatique

### Cache SET (mise en cache)

```
[CACHE SET] home-ongoing | HOME | 324.18ms
```

- 💾 Donnée mise en cache après fetch
- 📊 Temps total incluant le fetch Komga
- ✅ Prochaines requêtes seront rapides

### Cache REVALIDATE (revalidation background)

```
[CACHE REVALIDATE] home-ongoing | HOME | 287.45ms
```

- 🔄 Revalidation en background (après STALE)
- 🌐 Nouvelle donnée fetched depuis Komga
- 💾 Cache mis à jour pour les prochaines requêtes

### Erreur de revalidation

```
[CACHE REVALIDATE ERROR] home-ongoing: Error: ...
```

- ❌ Échec de la revalidation background
- ⚠️ Cache ancien conservé
- 🔄 Retry au prochain STALE

## Types de cache

Les logs affichent le type de TTL utilisé :

| Type        | TTL     | Usage              |
| ----------- | ------- | ------------------ |
| `DEFAULT`   | 5 min   | Données génériques |
| `HOME`      | 10 min  | Page d'accueil     |
| `LIBRARIES` | 24h     | Bibliothèques      |
| `SERIES`    | 5 min   | Séries             |
| `BOOKS`     | 5 min   | Livres             |
| `IMAGES`    | 7 jours | Images             |

## Exemple de session complète

```bash
# Première requête (cache vide)
[CACHE MISS] home-ongoing | HOME
[CACHE SET] home-ongoing | HOME | 324.18ms

# Requête suivante (cache valide)
[CACHE HIT] home-ongoing | HOME | 0.45ms

# 10 minutes plus tard (cache expiré)
[CACHE STALE] home-ongoing | HOME | 0.52ms
[CACHE REVALIDATE] home-ongoing | HOME | 287.45ms

# Requête suivante (cache frais)
[CACHE HIT] home-ongoing | HOME | 0.43ms
```

## Outils complémentaires

### 1. DevTools du navigateur

#### Network Tab

- Temps de réponse < 50ms = probablement du cache serveur
- Headers `X-Cache` si configurés
- Onglet "Timing" pour détails

#### Application → Cache Storage / Service Workers

Il n'y a plus de Service Worker ni de Cache Storage : le mode hors-ligne a été retiré. Le navigateur gère uniquement son cache HTTP natif (voir l'onglet Network ci-dessus).

### 2. API de monitoring

#### Taille du cache

```bash
curl http://localhost:3000/api/komga/cache/size
```

Response :

```json
{
  "sizeInBytes": 15728640,
  "itemCount": 234
}
```

#### Mode actuel

```bash
curl http://localhost:3000/api/komga/cache/mode
```

Response :

```json
{
  "mode": "memory"
}
```

#### Vider le cache

```bash
curl -X POST http://localhost:3000/api/komga/cache/clear
```

#### Changer de mode

```bash
curl -X POST http://localhost:3000/api/komga/cache/mode \
  -H "Content-Type: application/json" \
  -d '{"mode": "file"}'
```

### 3. Mode fichier : Inspection du disque

Si vous utilisez le mode `file`, le cache est stocké sur disque :

```bash
# Voir la structure du cache
ls -la .cache/

# Voir la taille totale
du -sh .cache/

# Compter les fichiers
find .cache/ -type f | wc -l

# Voir le contenu d'une entrée
cat .cache/user-id/home-ongoing.json | jq
```

Exemple de contenu :

```json
{
  "data": {
    "ongoing": [...],
    "recentlyRead": [...],
    "onDeck": [...]
  },
  "expiry": 1704067200000
}
```

## Patterns de debug courants

### Identifier un problème de cache

**Symptôme** : Les données ne se rafraîchissent pas

```bash
# 1. Vérifier si STALE + REVALIDATE se produisent
CACHE_DEBUG=true

# 2. Observer les logs
[CACHE STALE] series-123 | SERIES | 0.5ms
[CACHE REVALIDATE ERROR] series-123: Network error

# 3. Problème identifié : Komga inaccessible
```

**Solution** : Vérifier la connectivité avec Komga

### Optimiser les performances

**Objectif** : Identifier les requêtes lentes

```bash
# Activer les logs
CACHE_DEBUG=true

# Observer les temps
[CACHE MISS] library-456-all-series | SERIES
[CACHE SET] library-456-all-series | SERIES | 2847.32ms  # ⚠️ Très lent !
```

**Solution** :

- Vérifier la taille des bibliothèques
- Augmenter le TTL pour ces données
- Considérer la pagination

### Vérifier le mode de cache

```bash
# Logs après redémarrage
[CACHE MISS] home-ongoing | HOME  # Mode memory : normal
[CACHE HIT] home-ongoing | HOME   # Mode file : cache persisté
```

En mode `memory` : tous les caches sont vides au démarrage  
En mode `file` : les caches survivent au redémarrage

## Performance attendue

### Temps de réponse normaux

| Scénario                | Temps attendu | Log                                  |
| ----------------------- | ------------- | ------------------------------------ |
| Cache HIT               | < 1ms         | `[CACHE HIT] ... \| 0.45ms`          |
| Cache STALE             | < 1ms         | `[CACHE STALE] ... \| 0.52ms`        |
| Cache MISS (petit)      | 50-200ms      | `[CACHE SET] ... \| 124.18ms`        |
| Cache MISS (gros)       | 200-1000ms    | `[CACHE SET] ... \| 847.32ms`        |
| Revalidate (background) | Variable      | `[CACHE REVALIDATE] ... \| 287.45ms` |

### Signaux d'alerte

⚠️ **Cache HIT > 10ms**

- Problème : Disque lent (mode file)
- Solution : Vérifier les I/O, passer en mode memory

⚠️ **Cache MISS > 2000ms**

- Problème : Komga très lent ou données énormes
- Solution : Vérifier Komga, optimiser la requête

⚠️ **REVALIDATE ERROR fréquents**

- Problème : Komga instable ou réseau
- Solution : Augmenter les timeouts, vérifier la connectivité

⚠️ **Trop de MISS successifs**

- Problème : Cache pas conservé ou TTL trop court
- Solution : Vérifier le mode, augmenter les TTL

## Désactiver les logs

Pour désactiver les logs de cache en production :

```bash
# .env
CACHE_DEBUG=false

# ou simplement commenter/supprimer la ligne
# CACHE_DEBUG=true
```

Les logs sont **automatiquement désactivés** si la variable n'est pas définie.

## Logs et performance

**Impact sur les performances** :

- Overhead : < 0.1ms par opération
- Pas d'écriture disque (juste console)
- Pas d'accumulation en mémoire
- Safe pour la production

**Recommandations** :

- ✅ Activé en développement
- ✅ Activé temporairement en production pour diagnostics
- ❌ Pas nécessaire en production normale

## Conclusion

Le système de logs de cache est conçu pour être :

- 🎯 **Simple** : Format clair et concis
- ⚡ **Rapide** : Impact négligeable sur les performances
- 🔧 **Utile** : Informations essentielles pour le debug
- 🔒 **Optionnel** : Désactivé par défaut

Pour la plupart des besoins de debug, les DevTools du navigateur suffisent.  
Les logs serveur sont utiles pour comprendre le comportement du cache côté backend.
