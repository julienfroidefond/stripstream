# Documentation des API

## 🔐 Authentification

### POST /api/auth/login

- **Description** : Connexion d'un utilisateur
- **Body** : `{ email: string, password: string }`
- **Réponse** : `{ message: string, user: UserData }`

### POST /api/auth/register

- **Description** : Inscription d'un utilisateur
- **Body** : `{ email: string, password: string }`
- **Réponse** : `{ message: string, user: UserData }`

## ⚙️ Configuration

### GET /api/komga/config

- **Description** : Récupération de la configuration Komga
- **Réponse** : `{ url: string, username: string, password: string, userId: string }`

### POST /api/komga/config

- **Description** : Sauvegarde de la configuration Komga
- **Body** : `{ url: string, username: string, password: string }`
- **Réponse** : `{ message: string, config: Config }`

### GET /api/komga/ttl-config

- **Description** : Récupération de la configuration TTL du cache
- **Réponse** : `{ defaultTTL: number, homeTTL: number, ... }`

### POST /api/komga/ttl-config

- **Description** : Sauvegarde de la configuration TTL
- **Body** : `{ defaultTTL: number, homeTTL: number, ... }`
- **Réponse** : `{ message: string, config: TTLConfig }`

### GET /api/komga/cache/mode

- **Description** : Récupération du mode de cache actuel
- **Réponse** : `{ mode: string }`

## 📚 Bibliothèques

### GET /api/komga/libraries

- **Description** : Liste des bibliothèques
- **Réponse** : `Library[]`

## 📖 Séries

### GET /api/komga/series/[seriesId]

- **Description** : Détails d'une série
- **Paramètres** : `seriesId` dans l'URL
- **Réponse** : `Series`

## 📑 Livres

### GET /api/komga/books/[bookId]

- **Description** : Détails d'un livre
- **Paramètres** : `bookId` dans l'URL
- **Réponse** : `{ book: Book, pages: number[] }`

### PATCH /api/komga/books/[bookId]/read-progress

- **Description** : Mise à jour de la progression de lecture
- **Paramètres** : `bookId` dans l'URL
- **Body** : `{ page: number, completed: boolean }`
- **Réponse** : `{ message: string }`

## 🖼️ Images

### GET /api/komga/images/series/[seriesId]/thumbnail

- **Description** : Miniature d'une série
- **Paramètres** : `seriesId` dans l'URL
- **Réponse** : Image

### GET /api/komga/images/books/[bookId]/thumbnail

- **Description** : Miniature d'un livre
- **Paramètres** : `bookId` dans l'URL
- **Réponse** : Image

### GET /api/komga/images/books/[bookId]/pages/[pageNumber]

- **Description** : Page d'un livre
- **Paramètres** : `bookId` et `pageNumber` dans l'URL
- **Réponse** : Image

### GET /api/komga/images/books/[bookId]/pages/[pageNumber]/thumbnail

- **Description** : Miniature d'une page
- **Paramètres** : `bookId` et `pageNumber` dans l'URL
- **Réponse** : Image

## ⭐ Favoris

### GET /api/komga/favorites

- **Description** : Liste des IDs des séries favorites
- **Réponse** : `string[]`

## 🔧 Préférences

### GET /api/preferences

- **Description** : Récupération des préférences utilisateur
- **Réponse** : `Preferences`

## 🧪 Test

### POST /api/komga/test

- **Description** : Test de connexion au serveur Komga
- **Body** : `{ serverUrl: string, username: string, password: string }`
- **Réponse** : `{ message: string, librariesCount: number }`
