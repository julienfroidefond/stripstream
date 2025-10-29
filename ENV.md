# Variables d'environnement requises

## Production (.env)
```env
# Database Configuration (SQLite)
DATABASE_URL=file:./data/stripstream.db

# NextAuth Configuration
NEXTAUTH_SECRET=your-secret-key-here-generate-with-openssl-rand-base64-32
# Si derrière un reverse proxy HTTPS, utiliser l'URL HTTPS publique :
NEXTAUTH_URL=https://ton-domaine.com
# Sinon en local :
# NEXTAUTH_URL=http://localhost:3020

# Admin User (optional - default password for julienfroidefond@gmail.com)
ADMIN_DEFAULT_PASSWORD=Admin@2025

# Cache Debug (optional - logs cache operations)
# CACHE_DEBUG=true

# Komga Debug (optional - logs all requests to Komga and disables artificial delays)
# KOMGA_DEBUG=true

# Komga Request Queue (optional - max concurrent requests to Komga, default: 5)
# Augmenter à 10-20 pour du local avec des gros fichiers CBZ
# KOMGA_MAX_CONCURRENT_REQUESTS=5

# Node Environment
NODE_ENV=production
```

## Génération du secret NextAuth
```bash
openssl rand -base64 32
```

## Développement
Pour le développement, les variables sont définies directement dans `docker-compose.dev.yml`.
