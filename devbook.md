# 📚 StripStream - Devbook

## 🎯 Objectifs

Application web moderne pour la lecture de BD/mangas/comics via un serveur Komga.

## 🚀 Fonctionnalités à venir

### 📚 Gestion des séries

- [x] Système de favoris
  - [x] Service de gestion des favoris
  - [x] Bouton d'ajout/retrait des favoris
  - [x] Menu dédié dans la sidebar avec la liste des séries favorites
  - [ ] Carousel dédié dans sur la homepage de toutes les séries favorites
- [ ] Vue liste/grille configurable
- [ ] Filtres et tri avancés
- [ ] Recherche globale
- [ ] Bouton pour marquer comme lu

### 📖 Lecteur

- [ ] Revue API thumbnail => thumbnails
- [ ] Thumbnails : prefetch en 2 secondes
- [ ] Thumbnails : UI : barre de scroll plus grande
- [ ] Thumbnails : UI : scroll horizontal
- [ ] Page fantome avant le lecteur
- [ ] switch to page

### 📖 Lecture

- [ ] Téléchargement local des livres
  - [ ] Bouton de téléchargement
  - [ ] Gestion de la progression
  - [ ] Stockage local sécurisé
  - [ ] Bouton pour supprimer le téléchargement
  - [ ] Bouton pour supprimer tous les livres téléchargés dans les préférences
- [ ] Support de nouveaux formats
  - [ ] EPUB
  - [ ] PDF

### 🔄 Cache et Performance

- [ ] Revoir si tous les services utilisent bien le cache
- [ ] Invalidation du cache sur les mutations
- [ ] Stratégie de revalidation à la demande
- [ ] Prefetching intelligent
- [ ] Lazy loading amélioré
- [ ] Préférences : pouvoir vider chaque cache indépendemment

### 👥 Gestion des utilisateurs

- [ ] Système d'inscription
- [ ] Profil utilisateur enrichi
  - [ ] Nom/Prénom
  - [ ] Email
  - [ ] Préférences personnalisées
- [ ] Gestion des rôles et permissions

### 🌍 Internationalisation

- [ ] Support multi-langues
  - [ ] i18n
  - [ ] RTL support

### 🧪 Tests

- [ ] Tests unitaires
  - [ ] Services
  - [ ] Hooks
  - [ ] Utils
- [ ] Tests d'intégration
  - [ ] Flows utilisateur
  - [ ] API integration
- [ ] Tests E2E
  - [ ] User journeys
  - [ ] Cross-browser

### 📝 Documentation

- [ ] README
  - [ ] Installation
  - [ ] Configuration
  - [ ] Development
- [ ] Guide d'utilisation
  - [ ] Features
  - [ ] Shortcuts
  - [ ] Tips & tricks
- [ ] Documentation API
  - [ ] Endpoints
  - [ ] Types
  - [ ] Examples

### 🚀 Déploiement

- [ ] Configuration du build
  - [ ] Optimisations de build
  - [ ] Analyse de bundle
- [ ] Scripts de déploiement
  - [ ] CI/CD
  - [ ] Environnements
- [ ] Documentation d'installation
  - [ ] Requirements
  - [ ] Step-by-step guide

## 📋 Fonctionnalités principales

### 🔐 Authentification et Configuration

- [x] Interface de connexion
  - [x] Formulaire de connexion
  - [x] Déconnexion
- [x] Page de paramétrage pour la configuration Komga
  - [x] Configuration du serveur
  - [x] Test de connexion
  - [x] Gestion du cache

### 📚 Bibliothèque

- [x] Visualisation et navigation
  - [x] Liste des bibliothèques
  - [x] Affichage des séries par bibliothèque
  - [x] Couvertures et informations des séries
  - [x] Pagination
  - [x] Statut de lecture avec transparence pour les éléments lus
  - [x] Informations au survol

### 📖 Lecteur

- [x] Lecteur de fichiers (CBZ, CBR)
  - [x] Navigation entre les pages
  - [x] Mode plein écran
  - [x] Raccourcis clavier
  - [x] Mode double page
  - [x] Zoom et pan
  - [x] Préchargement des pages

### 📱 PWA

- [x] Installation
  - [x] Manifest
  - [x] Service worker
  - [x] Icons
  - [x] Splash screens
- [x] Mode hors ligne
  - [x] Offline page
  - [x] Cache stratégies
  - [x] Background sync
- [x] Support iOS
  - [x] Configurations spécifiques
  - [x] Splash screens iOS
  - [x] Status bar

### 🎨 UI/UX

- [x] Design responsive
  - [x] Mobile-first
  - [x] Breakpoints cohérents
  - [x] Touch-friendly
- [x] Animations et transitions
  - [x] Page transitions
  - [x] Loading states
  - [x] Micro-interactions
- [x] Feedback utilisateur
  - [x] Toasts pour les actions
  - [x] Messages d'erreur contextuels
  - [x] Indicateurs de progression
- [x] États de chargement
  - [x] Skeletons
  - [x] Suspense boundaries
  - [x] Loading spinners
- [x] Gestion des erreurs UI
  - [x] Error boundaries
  - [x] Fallbacks élégants
  - [x] Recovery options

### 🔍 Optimisations

- [x] Performance
  - [x] Optimisation des images
    - [x] Format WebP
    - [x] Responsive images
  - [x] Lazy loading
    - [x] Components
    - [x] Images
    - [x] Routes
  - [x] Mise en cache
    - [x] API responses
    - [x] Static assets
    - [x] Images
- [x] SEO
  - [x] Meta tags
  - [x] Sitemap
  - [x] robots.txt
- [x] Accessibilité
  - [x] ARIA labels
  - [x] Keyboard navigation
  - [x] Screen readers
  - [x] Color contrast

## 🛠 Configuration initiale

- [x] Mise en place du projet Next.js
  - [x] Configuration TypeScript
  - [x] Configuration ESLint et Prettier
  - [x] Configuration Tailwind CSS
  - [x] Configuration des alias de chemins
- [x] Mise en place de l'authentification
  - [x] Configuration du stockage sécurisé des credentials
    - [x] Service de stockage avec localStorage/sessionStorage
    - [x] Encodage basique des données sensibles
    - [x] Gestion des cookies pour le middleware
  - [x] Middleware d'authentification (protection des routes)
    - [x] Protection des routes publiques/privées
    - [x] Redirection vers la page de login
    - [x] Gestion des routes d'API
- [x] Configuration des variables d'environnement
  - [x] Création du fichier .env.local.example
    - [x] URL de l'application
    - [x] URL par défaut du serveur Komga
    - [x] Version de l'application
  - [x] Types pour les variables d'environnement
    - [x] Déclaration des types ProcessEnv
    - [x] Variables publiques (NEXT*PUBLIC*\*)

## 📚 Structure de l'application

- [x] Mise en place de l'architecture des dossiers
  - [x] Components
  - [x] Layouts
  - [x] Pages (routes)
  - [x] Services (API)
  - [x] Types
  - [x] Hooks personnalisés
  - [x] Utils
- [x] Création des types TypeScript
  - [x] Types pour l'API Komga
    - [x] Types des utilisateurs et rôles
    - [x] Types des bibliothèques
    - [x] Types des séries et livres
    - [x] Types des métadonnées
  - [x] Types pour les états d'authentification
    - [x] Configuration d'authentification
    - [x] État d'authentification
    - [x] Gestion des erreurs
  - [x] Types pour les préférences utilisateur

## 🔄 Intégration Komga

- [x] Service d'API
  - [x] Client HTTP avec fetch natif
  - [x] Gestion des tokens Basic Auth
  - [x] Cache des requêtes
  - [x] Gestion des erreurs
  - [x] Typage des réponses
- [x] Endpoints
  - [x] Authentification
  - [x] Collections
  - [x] Séries
  - [x] Tomes
  - [x] Progression de lecture
  - [x] Images et miniatures

### Gestion des séries

- [x] Système de favoris (ajout/retrait d'une série des favoris)
