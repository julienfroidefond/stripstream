# Variables d'environnement

Référence complète des variables reconnues par Stripstream. Le modèle à copier
est `.env.example` (`cp .env.example .env`).

## Requises (lues par le code de l'application)

```env
# Base de données SQLite utilisée par Prisma (voir prisma/schema.prisma).
# Prisma 7 résout un chemin relatif `file:` depuis le répertoire de travail du
# process (la racine du projet) : le chemin inclut donc prisma/.
DATABASE_URL=file:./prisma/data/stripstream.db

# OBLIGATOIRE. Clé de chiffrement des sessions/JWT NextAuth.
# Générer avec : openssl rand -base64 32
NEXTAUTH_SECRET=

# URL publique de base de l'application (utilisée par NextAuth pour les callbacks).
# Si derrière un reverse proxy HTTPS, utiliser l'URL HTTPS publique :
NEXTAUTH_URL=https://ton-domaine.com
# Sinon en local :
# NEXTAUTH_URL=http://localhost:3000
```

## Fortement recommandées (lues par le code de l'application)

```env
# Chiffre les identifiants des providers au repos (mot de passe Komga, token du
# Librarian) : AES-256-GCM, 32 octets en base64 ou 64 caractères hexadécimaux.
# Générer avec : openssl rand -base64 32
# Sans cette clé, les identifiants sont stockés en clair et un avertissement est
# journalisé à chaque écriture. OBLIGATOIRE avec docker-compose.yml, qui refuse
# de démarrer sans elle (`${CREDENTIALS_ENCRYPTION_KEY:?}`).
# CREDENTIALS_ENCRYPTION_KEY=
```

## Optionnelles (lues par le code de l'application)

```env
# "development" | "production" | "test" (défaut : development).
# NODE_ENV=production

# Mot de passe du compte admin créé par scripts/init-db.ts au premier démarrage.
# Aucune valeur par défaut : si le compte admin n'existe pas et que la variable
# est vide (ou fait moins de 8 caractères), il n'est PAS créé ; le script le
# signale et sort en code 3, que docker-entrypoint.sh tolère (l'app démarre
# quand même). Un compte existant n'est jamais modifié (ni mot de passe ni
# rôle) : on peut retirer la variable une fois l'admin créé. Variable
# d'exécution uniquement, jamais un argument de build.
# ADMIN_DEFAULT_PASSWORD=

# Inscription en libre-service. Fermée par défaut : seule la valeur "true"
# l'ouvre. Changement de comportement : avant cette variable, l'inscription
# était toujours ouverte. Fermée, la page de connexion n'affiche plus l'onglet
# d'inscription et l'action renvoie AUTH_REGISTRATION_DISABLED.
# REGISTRATION_ENABLED=false

# Journaux de debug (1/true pour activer).
# CACHE_DEBUG=false
# KOMGA_DEBUG=false
# STRIPSTREAM_DEBUG=false

# Store des compteurs de quota (rate limiting) : "sqlite" (défaut) persiste les
# fenêtres dans la table rate_limit_buckets, "memory" garde les compteurs dans
# le process (remis à zéro au redémarrage, non partagés entre instances).
# RATE_LIMIT_STORE=sqlite

# Répertoire de build Next.js (défaut : .next). La suite E2E construit dans
# .next-e2e pour ne pas écraser le build de dev (voir playwright.config.ts).
# NEXT_DIST_DIR=.next
```

### Variables retirées

`STRIPSTREAM_URL` et `STRIPSTREAM_TOKEN` ne sont plus lues : il n'y a plus de
connexion Stripstream de repli issue de l'environnement (ADR 0032). Chaque
utilisateur enregistre ses propres connexions dans les réglages ; un
utilisateur sans connexion n'emprunte plus jamais le token de l'instance.

### Reverse proxy et rate limiting

Les budgets de connexion et d'inscription par IP lisent `X-Forwarded-For` (à
défaut `X-Real-IP`).

```env
# Nombre de reverse proxys de confiance devant l'app (1 = un nginx/Traefik/Caddy).
# TRUSTED_PROXY_HOPS=1
```

- **Sans `TRUSTED_PROXY_HOPS`** : premier élément de l'en-tête. Correct seulement
  si le proxy *réécrit* `X-Forwarded-For` (`proxy_set_header X-Forwarded-For
  $remote_addr;`). Un proxy qui *ajoute* l'adresse vue (nginx
  `$proxy_add_x_forwarded_for`, Traefik, Caddy par défaut) laisse le client
  choisir ce premier élément, et le budget par IP devient contournable.
- **Avec `TRUSTED_PROXY_HOPS=N`** : N-ième élément en partant de la droite,
  c'est-à-dire l'adresse écrite par le proxy de confiance le plus éloigné.
  Une chaîne plus courte que N n'est pas crue (repli sur `X-Real-IP`).

Sans proxy, l'en-tête est fourni par le client : le budget par IP est
contournable et le budget des échecs par compte reste la protection de fond.
Sans adresse exploitable, le budget par IP est ignoré.

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

## Migration des identifiants déjà stockés

Les connexions enregistrées avant l'introduction du chiffrement restent en clair
lisible (rétro-compatibilité). Pour les chiffrer, renseigner
`CREDENTIALS_ENCRYPTION_KEY` puis lancer une fois :

```bash
pnpm encrypt-credentials
# en production, dans le conteneur (pnpm n'y est pas installé) :
docker exec <conteneur> ./node_modules/.bin/tsx scripts/encrypt-credentials.ts
```

Le script est **idempotent** : les lignes déjà au format `enc:v1:` sont
ignorées, on peut donc le rejouer sans risque. **La clé doit rester stable** —
si elle est perdue ou remplacée, il faut ressaisir les mots de passe / tokens
dans les réglages (les valeurs existantes deviennent indéchiffrables).

Sans clé, rien n'est écrit : le script avertit et sort en `0`, l'application
tournant de toute façon en mode dégradé (voir `src/lib/connections/credentials.ts`). Ajouter
`--strict` le rend bloquant (sortie `1`) pour les pipelines qui veulent la
garantie :

```bash
pnpm encrypt-credentials -- --strict
# ou, dans le conteneur :
./node_modules/.bin/tsx scripts/encrypt-credentials.ts --strict
```

Pourquoi un script et pas une migration Prisma ? Les migrations sont du SQL pur,
exécuté par des environnements qui n'ont pas forcément la clé (CI, démarrage du
conteneur, nouveau clone) ; SQLite ne sait pas calculer de l'AES-256-GCM, et une
clé ne peut pas figurer dans un fichier de migration versionné.

## Développement

Pour le développement, les variables sont définies directement dans
`docker-compose.yml` (ou dans un fichier `.env` copié depuis `.env.example`).
La CLI Prisma et les scripts autonomes (`init-db.ts`, etc.) lisent `.env` ;
c'est donc le fichier à utiliser pour `prisma migrate` et `init-db`. Après avoir
créé `.env`, exécuter `pnpm prisma generate` : le client généré à l'installation
par `pnpm install` précède `.env` et ne lit donc pas `DATABASE_URL`.
