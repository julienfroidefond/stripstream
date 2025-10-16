# Variables d'environnement requises

## Production (.env)
```env
# MongoDB Configuration
MONGO_USER=admin
MONGO_PASSWORD=your-secure-password
MONGODB_URI=mongodb://admin:your-secure-password@mongodb:27017/stripstream?authSource=admin

# NextAuth Configuration
NEXTAUTH_SECRET=your-secret-key-here-generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3020

# Node Environment
NODE_ENV=production
```

## Génération du secret NextAuth
```bash
openssl rand -base64 32
```

## Développement
Pour le développement, les variables sont définies directement dans `docker-compose.dev.yml`.
