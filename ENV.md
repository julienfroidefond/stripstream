# Variables d'environnement requises

## Production (.env)
```env
# MongoDB Configuration
MONGO_USER=admin
MONGO_PASSWORD=your-secure-password
MONGODB_URI=mongodb://admin:your-secure-password@mongodb:27017/stripstream?authSource=admin&replicaSet=rs0

# NextAuth Configuration
NEXTAUTH_SECRET=your-secret-key-here-generate-with-openssl-rand-base64-32
# Si derrière un reverse proxy HTTPS, utiliser l'URL HTTPS publique :
NEXTAUTH_URL=https://ton-domaine.com
# Sinon en local :
# NEXTAUTH_URL=http://localhost:3020

# Admin User (optional - default password for julienfroidefond@gmail.com)
ADMIN_DEFAULT_PASSWORD=Admin@2025

# Node Environment
NODE_ENV=production
```

## Génération du secret NextAuth
```bash
openssl rand -base64 32
```

## Génération du keyFile MongoDB (requis pour Prisma)
```bash
openssl rand -base64 756 > mongo-keyfile
chmod 400 mongo-keyfile
```

Ce fichier est nécessaire pour MongoDB en mode replica set (requis par Prisma pour les relations et transactions).

## Développement
Pour le développement, les variables sont définies directement dans `docker-compose.dev.yml`.
