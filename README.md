# Stripstream

Une application web moderne pour lire des bandes dessinées numériques, construite avec Next.js 14 et l'API Komga.

## 🚀 Technologies

- [Next.js 14](https://nextjs.org/)
- [React 18](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn/ui](https://ui.shadcn.com/)
- [Docker](https://www.docker.com/)

## 🛠 Prérequis

- Node.js 20.x ou supérieur
- npm 10.x ou supérieur
- Docker et Docker Compose (optionnel)

## 📦 Installation

### Méthode classique

1. Cloner le repository

```bash
git clone [url-du-repo]
cd stripstream
```

2. Installer les dépendances

```bash
npm install
```

3. Créer un fichier `.env.local` à la racine du projet

```bash
NEXT_PUBLIC_API_URL=https://cloud.julienfroidefond.com
```

4. Lancer le serveur de développement

```bash
npm run dev
```

### Avec Docker

1. Cloner le repository et se placer dans le dossier

```bash
git clone [url-du-repo]
cd stripstream
```

2. Lancer avec Docker Compose

```bash
docker-compose up --build
```

L'application sera accessible sur `http://localhost:3000`

## 🔧 Scripts disponibles

- `npm run dev` - Lance le serveur de développement
- `npm run build` - Crée une version de production
- `npm start` - Lance la version de production
- `npm run lint` - Vérifie le code avec ESLint

## 🌐 API Komga

L'application utilise l'API Komga pour la gestion des bandes dessinées. La documentation de l'API est disponible ici :
[Documentation Komga API](https://cloud.julienfroidefond.com/swagger-ui/index.html#/)

## 🏗 Structure du projet

```
src/
├── app/                 # Pages et routes Next.js
├── components/          # Composants React réutilisables
│   ├── home/           # Composants spécifiques à la page d'accueil
│   ├── layout/         # Composants de mise en page
│   ├── reader/         # Composants du lecteur de BD
│   └── ui/             # Composants UI réutilisables
├── lib/                # Utilitaires et services
│   └── services/       # Services pour l'API et autres fonctionnalités
└── styles/             # Styles globaux
```

## 🤝 Contribution

1. Créer une branche pour votre fonctionnalité
2. Commiter vos changements
3. Pousser vers la branche
4. Ouvrir une Pull Request

## 📝 Guidelines de développement

- Suivre les principes DRY (Don't Repeat Yourself)
- Utiliser TypeScript pour tout nouveau code
- Utiliser les classes Tailwind pour le styling
- Implémenter les fonctionnalités d'accessibilité
- Mettre à jour le devbook.md pour toute modification significative

## 📄 Licence

Ce projet est sous licence [insérer type de licence]
