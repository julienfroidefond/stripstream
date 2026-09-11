# Variables d'environnement

Référence complète des variables reconnues par Stripstream. Le modèle à copier
est `.env.example` (`cp .env.example .env`).

## Requises (lues par le code de l'application)

```env
# Base de données SQLite utilisée par Prisma (voir prisma/schema.prisma).
# Le chemin relatif est résolu depuis le dossier prisma/ (emplacement de
# prisma/schema.prisma) : file:./data/stripstream.db pointe donc vers
# prisma/data/stripstream.db.
DATABASE_URL=file:./data/stripstream.db

# OBLIGATOIRE. Clé de chiffrement des sessions/JWT NextAuth.
# Générer avec : openssl rand -base64 32
NEXTAUTH_SECRET=

# URL publique de base de l'application (utilisée par NextAuth pour les callbacks).
# Si derrière un reverse proxy HTTPS, utiliser l'URL HTTPS publique :
NEXTAUTH_URL=https://ton-domaine.com
# Sinon en local :
# NEXTAUTH_URL=http://localhost:3000
```

## Optionnelles (lues par le code de l'application)

```env
# "development" | "production" | "test" (défaut : development).
# NODE_ENV=production

# Mot de passe du compte admin créé par scripts/init-db.mjs
# (également utilisé au build par docker-compose).
# ADMIN_DEFAULT_PASSWORD=Admin@2025

# Journaux de debug (1/true pour activer).
# CACHE_DEBUG=false
# KOMGA_DEBUG=false
# STRIPSTREAM_DEBUG=false

# Fallback du Librarian Stripstream, utilisé quand l'utilisateur n'a pas
# enregistré d'URL/token en base.
# STRIPSTREAM_URL=https://librarian.example.com
# STRIPSTREAM_TOKEN=stl_xxxx_xxxxxxxx
```

## Docker / Compose uniquement

Définies par `docker-compose.yml` ; non lues directement par le code de
l'application.

```env
# AUTH_TRUST_HOST=true
# KOMGA_MAX_CONCURRENT_REQUESTS=5
# PRISMA_DATA_PATH=./prisma/data
```

## Génération du secret NextAuth

```bash
openssl rand -base64 32
```

## Développement

Pour le développement, les variables sont définies directement dans
`docker-compose.yml` (ou dans un fichier `.env` copié depuis `.env.example`).
La CLI Prisma et les scripts autonomes (`init-db.mjs`, etc.) lisent `.env` ;
c'est donc le fichier à utiliser pour `prisma migrate` et `init-db`. Après avoir
créé `.env`, exécuter `pnpm prisma generate` : le client généré à l'installation
par `pnpm install` précède `.env` et ne lit donc pas `DATABASE_URL`.
