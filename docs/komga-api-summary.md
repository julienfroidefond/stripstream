# Résumé Spec Komga OpenAPI v1.24.1

## Authentication
- **Basic Auth** ou **API Key** (`X-API-Key` header)
- Sessions: cookie `KOMGA-SESSION` ou header `X-Auth-Token`
- "Remember me" supporté

## Endpoints Principaux

### Libraries
| Méthode | Endpoint | Description |
|--------|----------|-------------|
| GET | `/libraries` | Liste des bibliothèques |
| GET | `/libraries/{id}` | Détail d'une bibliothèque |

### Series
| Méthode | Endpoint | Description |
|--------|----------|-------------|
| GET | `/series` | Liste des séries (GET avec params) |
| POST | `/series/list` | Liste paginée avec filtres (JSON body) |
| GET | `/series/{id}` | Détail d'une série |
| GET | `/series/{id}/thumbnail` | Vignette (image complète) |
| GET | `/series/{id}/books` | Livres d'une série |

### Books
| Méthode | Endpoint | Description |
|--------|----------|-------------|
| GET | `/books` | Liste des livres |
| POST | `/books/list` | Liste paginée avec filtres |
| GET | `/books/{id}` | Détail d'un livre |
| GET | `/books/{id}/pages` | Liste des pages |
| GET | `/books/{id}/pages/{n}` | Image d'une page (streaming) |
| GET | `/books/{id}/pages/{n}/thumbnail` | Miniature (300px max) |

### Collections & Readlists
| Méthode | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/collections` | CRUD Collections |
| GET/POST | `/readlists` | CRUD Readlists |

## Pagination

**Paramètres query:**
- `page` - Index 0-based
- `size` - Taille de page
- `sort` - Tri (ex: `metadata.titleSort,asc`)

**Corps JSON (POST):**
```json
{
  "condition": {
    "libraryId": { "operator": "is", "value": "xxx" }
  },
  "fullTextSearch": "query"
}
```

## Opérateurs
- `is`, `isNot`
- `contains`, `containsNot`
- `before`, `after`, `beforeOrEqual`, `afterOrEqual`

## Opérateurs Logiques
- `allOf` - ET logique
- `anyOf` - OU logique

## Images

| Type | Endpoint | Taille |
|------|----------|--------|
| Vignette série | `/series/{id}/thumbnail` | Taille originale |
| Page livre | `/books/{id}/pages/{n}` | Taille originale (streaming) |
| Miniature page | `/books/{id}/pages/{n}/thumbnail` | 300px max |

**Note:** Komga ne fournit pas de redimensionnement pour les vignettes de séries.
