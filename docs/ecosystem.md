# Écosystème Stripstream

Stripstream n'est que la moitié de l'histoire. Ce dépôt est le **lecteur** ; le
**backend de référence** vit dans un dépôt séparé, cloné à côté de celui-ci. Ce
document décrit les deux dépôts, leur convention de clone et le contrat qui les
relie.

## Deux dépôts

| Dépôt | Rôle | Stack |
| --- | --- | --- |
| [`julienfroidefond/stripstream`](https://github.com/julienfroidefond/stripstream) (ce dépôt) | Lecteur web. Ne possède pas la bibliothèque : il parle à Komga **ou** au Librarian via l'abstraction `IMediaProvider`. | Next.js 16, React 19, TypeScript, Prisma 7 + SQLite |
| [`julienfroidefond/stripstream-librarian`](https://github.com/julienfroidefond/stripstream-librarian) | Gestionnaire auto-hébergé de bibliothèque de BD, mangas et ebooks : indexation (CBZ/CBR/PDF/EPUB), recherche plein texte, enrichissement de métadonnées, découverte et téléchargement, progression de lecture. | Rust (axum, sqlx, tokio) + PostgreSQL, backoffice Next.js, docs Astro/Starlight |

Les deux dépôts sont maintenus par le même auteur et évoluent ensemble : le
Librarian est le backend que la majorité des utilisateurs de Stripstream
consomment.

## Convention de clone en frère

Le Librarian est **souvent cloné en dossier frère** de ce dépôt :

```text
Sites/
├── stripstream/            # ce dépôt (lecteur)
└── stripstream-librarian/  # backend (gestionnaire de bibliothèque)
```

- Aucun sous-module Git ne lie les deux : `.gitmodules` est vide et chaque
  dépôt se build, se teste et se versionne indépendamment. Les commits, tags et
  versions (`package.json` ici, `Cargo.toml` là-bas) ne sont pas synchronisés.
- La convention `../stripstream-librarian` est documentée des deux côtés :
  le `AGENTS.md` du Librarian décrit ce dépôt comme « the official reader
  client … often cloned as a sibling directory (`../stripstream`) ».
- Les agents qui travaillent ici peuvent donc rencontrer le backend en
  `../stripstream-librarian` sans qu'il fasse partie de ce dépôt. Ne pas le
  déplacer ni le modifier sans raison liée au contrat d'API.

## Contrat d'API (scope `read`)

Le Librarian expose **deux surfaces** :

- la **Client API** (`/swagger-ui`, `/openapi.json`) — endpoints de lecture ;
- l'**Admin API** (`/admin/swagger-ui`) — tous les endpoints.

Stripstream consomme uniquement la **Client API avec un token de scope `read`**
(lecture, progression de lecture, favoris et notations personnelles du token).
L'authentification se fait par en-tête `Authorization: Bearer stl_{prefix}_{secret}`
(`src/lib/providers/stripstream/stripstream.client.ts:50-56`). Les tokens suivent
le format `stl_{prefix}_{secret}` et sont hachés (Argon2) côté Librarian.

La références complète des endpoints vit dans la documentation du Librarian
(`apps/docs/`, section [Référence API](https://github.com/julienfroidefond/stripstream-librarian/blob/main/apps/docs/src/content/docs/reference/api.md)).
Côté Librarian, cette Client API est traitée comme **un contrat public** : les
changements cassants doivent être évités, car ce dépôt et d'autres clients
(KOReader, Panels…) en dépendent.

## Services et ports (Librarian)

| Service | Rôle | Port |
| --- | --- | --- |
| API | API REST (Rust/axum) | `7080` |
| Indexer | Indexation en arrière-plan | `7081` |
| Backoffice | Interface web d'administration | `7082` |
| Documentation | Site Astro/Starlight | `7084` |
| PostgreSQL | Base de données | `6432` |

Démarrage minimal côté Librarian :

```bash
cp .env.example .env   # renseigner DATABASE_URL, API_BOOTSTRAP_TOKEN, ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_SECRET
docker compose up -d
```

## Raccordement côté Stripstream

1. Créer un token de scope `read` dans le Librarian (Backoffice → tokens API).
2. Dans Stripstream, ajouter une connexion **Stripstream** (réglages) : URL de
   base du Librarian + token. Chaque utilisateur peut garder plusieurs
   connexions, une seule active à la fois (voir `docs/architecture.md` §1).
3. À défaut de connexion enregistrée, Stripstream retombe sur les variables
   `STRIPSTREAM_URL` et `STRIPSTREAM_TOKEN` (voir `ENV.md`).

## Pour aller plus loin

- Lecteur (ce dépôt) : [`README.md`](../README.md), [`docs/architecture.md`](./architecture.md).
- Backend : [dépôt `stripstream-librarian`](https://github.com/julienfroidefond/stripstream-librarian), documentation dans `apps/docs/`.
- Provider Komga : [`docs/komga-api-summary.md`](./komga-api-summary.md).
