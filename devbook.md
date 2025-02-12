# 📚 Paniels - Devbook

## 🎯 Objectifs

Application web moderne pour la lecture de BD/mangas/comics via un serveur Komga.

## 📋 Fonctionnalités principales

- [x] Interface de connexion
  - [x] Formulaire de connexion
  - [x] Déconnexion
- [x] Page de paramétrage pour la configuration Komga
- [x] Visualisation et navigation dans la bibliothèque
  - [x] Liste des bibliothèques
  - [x] Affichage des séries par bibliothèque
  - [x] Couvertures et informations des séries
  - [ ] Filtres et recherche
  - [x] Pagination
  - [x] Statut de lecture avec transparence pour les éléments lus
  - [x] Informations au survol
- [x] Lecteur de fichiers (CBZ, CBR)
  - [x] Navigation entre les pages
  - [x] Mode plein écran
  - [x] Raccourcis clavier
  - [x] Mode double page
  - [x] Zoom et pan
  - [x] Préchargement des pages

## 🚀 Fonctionnalités à venir

### Gestion des séries

- [ ] Système de favoris
  - [ ] Ajout/suppression des favoris sur les séries
  - [ ] Menu dédié dans la sidebar
  - [ ] Synchronisation avec Komga

### Améliorations techniques

- [x] Refactorisation des services API
  - [x] Création d'un service de base avec gestion des cookies
  - [x] Création d'un middleware commun
  - [x] Mutualisation du code de gestion du cache
  - [x] Création des services spécialisés (Library, Series, Book, Home)
- [ ] Mise à jour des API deprecated
- [ ] Synchronisation de l'état de lecture avec Komga
- [ ] Revue du système de cache
  - [ ] Optimisation du cache côté serveur
  - [x] Gestion intelligente du TTL par type de données
  - [ ] Invalidation du cache sur les mutations
  - [x] Stratégie de revalidation à la demande

### Gestion des utilisateurs

- [ ] Système d'inscription
- [ ] Profil utilisateur enrichi
  - [ ] Nom/Prénom
  - [ ] Email
  - [ ] Préférences personnalisées
- [ ] Gestion des rôles et permissions

### Fonctionnalités avancées

- [ ] Téléchargement local des livres
  - [ ] Bouton de téléchargement
  - [ ] Gestion de la progression
  - [ ] Stockage local sécurisé

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

## 🔒 Authentification et Configuration

- [x] Page de connexion
  - [x] Formulaire de connexion (email/password)
  - [x] Validation des champs
  - [x] Gestion des erreurs de connexion
  - [x] Stockage sécurisé du token
  - [x] Redirection après connexion
- [x] Page de paramètres
  - [x] Formulaire de configuration Komga
    - [x] Validation de l'URL du serveur
    - [x] Test de connexion en direct
    - [x] Gestion des erreurs détaillée
    - [x] Messages d'erreur contextuels
  - [x] Sauvegarde des préférences
    - [x] Stockage sécurisé des credentials Komga
    - [x] Persistance des paramètres
  - [x] Configuration du cache
    - [x] Gestion des TTL par type de données
    - [x] Interface de configuration intuitive
    - [x] Nettoyage du cache à la demande
  - [x] UI/UX optimisée
    - [x] Layout compact et centré
    - [x] Hiérarchie visuelle claire
    - [x] Composants redimensionnés
    - [x] Espacement optimisé

## 📱 Interface utilisateur

- [x] Layout principal
  - [x] Header avec navigation
  - [x] Sidebar rétractable
  - [x] Thème clair/sombre
  - [x] Responsive design
- [x] Page d'accueil
  - [x] Présentation des fonctionnalités principales
  - [x] Liste des collections récentes
- [x] Page de collection
  - [x] Grille de séries avec lazy loading
  - [x] Affichage des couvertures
  - [x] Métadonnées des séries
  - [x] État des séries (En cours, Terminé, etc.)
  - [ ] Vue liste/grille
  - [ ] Filtres et tri
- [x] Page de détails de la série
  - [x] Couverture et informations
  - [x] Liste des tomes
  - [x] Progression de lecture
  - [x] Pagination des tomes
  - [x] Filtre "À lire" (non lus et en cours)
  - [x] Bouton de lecture contextuel
- [x] Page de détails du tome
  - [x] Couverture et informations
  - [x] Métadonnées (auteurs, date, etc.)
  - [x] Bouton de lecture
  - [x] Lecteur plein écran

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

## 🚀 Prochaines étapes

- [ ] Amélioration de l'UX
  - [ ] Animations de transition
  - [ ] Retour haptique
  - [ ] Messages de confirmation
  - [ ] Tooltips d'aide
- [ ] Fonctionnalités avancées
  - [ ] Recherche globale
  - [ ] Filtres avancés
  - [ ] Tri personnalisé
  - [ ] Vue liste/grille configurable
- [ ] Performance
  - [ ] Optimisation des images
  - [ ] Lazy loading amélioré
  - [ ] Prefetching intelligent
  - [ ] Cache optimisé
- [ ] Accessibilité
  - [ ] Navigation au clavier
  - [ ] Support lecteur d'écran
  - [ ] Contraste et lisibilité
  - [ ] ARIA labels

## 🎨 UI/UX

- [x] Design responsive
  - [x] Mobile-first
  - [x] Breakpoints cohérents
  - [x] Touch-friendly
- [x] Animations et transitions
  - [x] Page transitions
  - [x] Loading states
  - [x] Micro-interactions
- [x] Messages de feedback
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

## 🧪 Tests

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

## 📦 Déploiement

- [ ] Configuration du build
  - [ ] Optimisations de build
  - [ ] Analyse de bundle
- [ ] Scripts de déploiement
  - [ ] CI/CD
  - [ ] Environnements
- [ ] Documentation d'installation
  - [ ] Requirements
  - [ ] Step-by-step guide

## 📝 Documentation

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

## 🔍 Optimisations

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
- [ ] SEO
  - [ ] Meta tags
  - [ ] Sitemap
  - [ ] robots.txt
- [x] Accessibilité
  - [x] ARIA labels
  - [x] Keyboard navigation
  - [x] Screen readers
  - [x] Color contrast

## 🔄 Futures évolutions possibles

- [ ] Support de nouveaux formats
  - [ ] EPUB
  - [ ] PDF
- [ ] Synchronisation des favoris
  - [ ] Sync avec Komga
  - [ ] Listes personnalisées
- [ ] Mode hors ligne
  - [ ] Service worker
  - [ ] Sync en background
- [ ] PWA
  - [ ] Installation
  - [ ] Notifications
  - [ ] Background sync
- [ ] Support multi-langues
  - [ ] i18n
  - [ ] RTL support
