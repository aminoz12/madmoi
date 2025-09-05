# Blog Astro avec IA - Documentation

## Vue d'ensemble

Ce projet est un blog moderne construit avec Astro, intégrant des fonctionnalités d'intelligence artificielle pour la génération automatique de contenu. Il comprend un panneau d'administration complet pour la gestion du contenu et des utilisateurs.

## Fonctionnalités principales

### Blog public
- **Design responsive** : Compatible desktop et mobile
- **Performance optimisée** : Génération de sites statiques avec Astro
- **SEO avancé** : Balises meta, sitemap, robots.txt
- **Navigation intuitive** : Menu clair avec pages principales
- **Articles dynamiques** : Support Markdown et MDX
- **Catégories et tags** : Organisation du contenu
- **Recherche** : Fonction de recherche intégrée

### Génération de contenu par IA
- **Création automatique d'articles** : Génération de contenu selon des thèmes prédéfinis
- **Génération d'images** : Images libres de droit via API
- **Optimisation SEO** : Génération automatique de meta descriptions et tags
- **Planification** : Publication programmée d'articles
- **Réseaux sociaux** : Génération de posts pour Twitter et LinkedIn

### Panneau d'administration
- **Dashboard** : Vue d'ensemble des statistiques
- **Gestion des articles** : Création, édition, publication
- **Gestion des utilisateurs** : Rôles et permissions
- **Analytics** : Suivi du trafic et des performances
- **Paramètres** : Configuration du site et de l'IA
- **Outils** : Utilitaires pour la maintenance

## Architecture du projet

```
📁 project/
├── 📄 package.json              # Dépendances et scripts
├── 📄 astro.config.mjs          # Configuration Astro
├── 📄 tailwind.config.js        # Configuration Tailwind CSS
├── 📄 tsconfig.json             # Configuration TypeScript

├── 📁 src/
│   ├── 📁 pages/                # Pages du site
│   │   ├── index.astro          # Page d'accueil
│   │   ├── about.astro          # Page à propos
│   │   ├── services.astro       # Page services
│   │   ├── contact.astro        # Page contact
│   │   ├── 📁 blog/             # Pages du blog
│   │   │   ├── index.astro      # Liste des articles
│   │   │   └── [slug].astro     # Page article individuel
│   │   └── 📁 admin/            # Pages d'administration
│   │       ├── index.astro      # Dashboard admin
│   │       ├── login.astro      # Page de connexion
│   │       ├── 📁 users/        # Gestion des utilisateurs
│   │       ├── 📁 content/      # Gestion du contenu
│   │       ├── 📁 analytics/    # Analytics
│   │       ├── 📁 settings/     # Paramètres
│   │       └── 📁 tools/        # Outils
│   ├── 📁 components/           # Composants réutilisables
│   │   ├── 📁 common/           # Composants communs
│   │   ├── 📁 sections/         # Sections de pages
│   │   └── 📁 admin/            # Composants admin
│   ├── 📁 layouts/              # Layouts de pages
│   │   ├── Layout.astro         # Layout principal
│   │   └── AdminLayout.astro    # Layout admin
│   ├── 📁 middleware/           # Middleware
│   │   ├── auth.ts              # Authentification
│   │   └── admin-guard.ts       # Protection admin
│   ├── 📁 utils/                # Utilitaires
│   │   ├── 📁 admin/            # Utilitaires admin
│   │   └── 📁 public/           # Utilitaires publics
│   └── 📁 styles/               # Styles CSS
│       ├── global.css           # Styles globaux
│       └── 📁 admin/            # Styles admin
├── 📁 public/                   # Fichiers statiques
│   ├── favicon.svg              # Icône du site
│   ├── robots.txt               # Instructions pour les robots
│   └── sitemap.xml              # Plan du site
└── 📁 docs/                     # Documentation
    ├── README.md                # Ce fichier
    └── base-de-donnees.md       # Documentation BDD
```

## Technologies utilisées

- **Astro** : Framework de génération de sites statiques
- **TypeScript** : Langage de programmation typé
- **Tailwind CSS** : Framework CSS utilitaire
- **OpenAI API** : Intelligence artificielle pour la génération de contenu
- **MDX** : Markdown avec composants React
- **Sharp** : Traitement d'images
- **Node-cron** : Planification de tâches

## Installation et démarrage

### Prérequis
- Node.js 18+ 
- npm ou yarn
- Clé API OpenAI

### Installation
```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos clés API
```

### Développement
```bash
# Démarrer le serveur de développement
npm run dev

# Le site sera accessible sur http://localhost:4321
```

### Production
```bash
# Construire le site
npm run build

# Prévisualiser la version de production
npm run preview
```

## Configuration

### Variables d'environnement
Créez un fichier `.env` à la racine du projet :

```env
# OpenAI API
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_API_BASE=https://api.openai.com/v1

# Site configuration
SITE_URL=https://your-domain.com
SITE_NAME=Mon Blog IA

# Admin credentials (changez ces valeurs !)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123

# Database (si vous utilisez une base de données)
DATABASE_URL=your_database_url_here
```

### Personnalisation
- **Couleurs** : Modifiez `tailwind.config.js`
- **Polices** : Changez les imports dans `src/styles/global.css`
- **Logo** : Remplacez `public/favicon.svg`
- **Contenu** : Éditez les pages dans `src/pages/`

## Utilisation

### Génération de contenu
```bash
# Générer du contenu automatiquement
npm run generate-content
```

### Administration
1. Accédez à `/admin/login`
2. Connectez-vous avec vos identifiants
3. Utilisez le dashboard pour gérer le contenu

### API
Le projet expose plusieurs endpoints API :
- `POST /api/auth/login` : Connexion
- `POST /api/auth/logout` : Déconnexion
- `GET /api/posts` : Liste des articles
- `POST /api/posts` : Créer un article
- `POST /api/generate-content` : Générer du contenu IA

## Déploiement

### Netlify
```bash
# Build command
npm run build

# Publish directory
dist
```

### Vercel
```bash
# Le projet est automatiquement détecté comme un projet Astro
```

### Serveur personnalisé
```bash
npm run build
# Servir le dossier dist/ avec votre serveur web
```

## Contribution

1. Fork le projet
2. Créez une branche pour votre fonctionnalité
3. Committez vos changements
4. Poussez vers la branche
5. Ouvrez une Pull Request

## Support

Pour toute question ou problème :
- Consultez la documentation Astro : https://docs.astro.build
- Ouvrez une issue sur le repository
- Contactez l'équipe de développement

## Licence

Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.

