# Base de données - Documentation

## Vue d'ensemble

Ce projet utilise une approche hybride pour le stockage des données :
- **Fichiers Markdown** pour le contenu des articles (approche Astro native)
- **Base de données** pour les métadonnées, utilisateurs, et analytics (optionnel)
- **Stockage local** pour les sessions et cache (développement)

## Structure des données

### Articles (Markdown + Frontmatter)

Les articles sont stockés sous forme de fichiers Markdown dans le dossier `src/content/blog/` avec des métadonnées en frontmatter :

```markdown
---
title: "Titre de l'article"
description: "Description courte pour le SEO"
pubDate: 2025-01-18
author: "Nom de l'auteur"
image: "/images/article-image.jpg"
imageAlt: "Description de l'image"
tags: ["technologie", "ia", "astro"]
category: "Technologie"
featured: true
draft: false
aiGenerated: true
generatedAt: 2025-01-18T10:00:00Z
socialPosts:
  twitter: "Post Twitter généré automatiquement"
  linkedin: "Post LinkedIn généré automatiquement"
seo:
  metaTitle: "Titre SEO optimisé"
  metaDescription: "Meta description SEO"
  keywords: ["mot-clé1", "mot-clé2"]
---

# Contenu de l'article en Markdown

Votre contenu ici...
```

### Utilisateurs (Base de données optionnelle)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  avatar_url VARCHAR(500),
  bio TEXT,
  preferences JSONB DEFAULT '{}'
);
```

### Sessions (Base de données optionnelle)

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address INET,
  user_agent TEXT
);
```

### Analytics (Base de données optionnelle)

```sql
CREATE TABLE page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path VARCHAR(500) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  referrer VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  country VARCHAR(2),
  city VARCHAR(100),
  device_type VARCHAR(50),
  browser VARCHAR(100)
);

CREATE TABLE post_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_slug VARCHAR(255) NOT NULL,
  views_count INTEGER DEFAULT 0,
  unique_views_count INTEGER DEFAULT 0,
  avg_time_on_page INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  social_shares JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Configuration IA (Base de données optionnelle)

```sql
CREATE TABLE ai_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exemples de configuration
INSERT INTO ai_config (name, value, description) VALUES
('content_generation_topics', '["technologie", "entrepreneuriat", "lifestyle", "productivité"]', 'Sujets pour la génération automatique de contenu'),
('posting_schedule', '{"frequency": "daily", "time": "09:00", "timezone": "Europe/Paris"}', 'Planification de publication'),
('ai_model_settings', '{"model": "gpt-4", "temperature": 0.7, "max_tokens": 2000}', 'Paramètres du modèle IA'),
('image_generation_style', '{"style": "modern", "aspect_ratio": "16:9", "quality": "high"}', 'Style pour la génération d\'images');
```

### Génération de contenu (Base de données optionnelle)

```sql
CREATE TABLE content_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  prompt TEXT NOT NULL,
  generated_content JSONB,
  error_message TEXT,
  scheduled_for TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE generated_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  tags TEXT[],
  category VARCHAR(100),
  featured_image_url VARCHAR(500),
  ai_prompt TEXT,
  generation_job_id UUID REFERENCES content_generation_jobs(id) ON DELETE SET NULL,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_published BOOLEAN DEFAULT false,
  seo_data JSONB DEFAULT '{}'
);
```

## Configuration de base de données

### Option 1 : Sans base de données (Recommandé pour débuter)

Le projet fonctionne entièrement avec des fichiers locaux :
- Articles : Fichiers Markdown dans `src/content/blog/`
- Utilisateurs : Tableau en mémoire (voir `src/middleware/auth.ts`)
- Sessions : Map en mémoire
- Configuration : Fichiers JSON

### Option 2 : Avec PostgreSQL

```bash
# Installation de PostgreSQL
npm install pg @types/pg

# Variables d'environnement
DATABASE_URL=postgresql://username:password@localhost:5432/blog_db
```

```typescript
// src/utils/database.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;
```

### Option 3 : Avec SQLite (Développement)

```bash
# Installation de SQLite
npm install sqlite3 @types/sqlite3

# Variables d'environnement
DATABASE_URL=sqlite:./blog.db
```

### Option 4 : Avec Supabase (Cloud)

```bash
# Installation du client Supabase
npm install @supabase/supabase-js

# Variables d'environnement
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Migration et initialisation

### Script de migration (PostgreSQL)

```sql
-- migrations/001_initial.sql
-- Créer les tables principales
\i create_users_table.sql
\i create_sessions_table.sql
\i create_analytics_table.sql
\i create_ai_config_table.sql
\i create_content_generation_table.sql

-- Insérer les données initiales
INSERT INTO users (email, name, password_hash, role) VALUES
('admin@example.com', 'Admin User', '$2b$10$...', 'admin');

INSERT INTO ai_config (name, value, description) VALUES
('content_topics', '["tech", "business", "lifestyle"]', 'Topics for content generation'),
('posting_schedule', '{"daily": true, "time": "09:00"}', 'Posting schedule configuration');
```

### Script d'initialisation

```javascript
// scripts/init-db.js
import pool from '../src/utils/database.js';
import fs from 'fs';
import path from 'path';

async function initDatabase() {
  try {
    const migrationFiles = fs.readdirSync('./migrations').sort();
    
    for (const file of migrationFiles) {
      if (file.endsWith('.sql')) {
        const sql = fs.readFileSync(path.join('./migrations', file), 'utf8');
        await pool.query(sql);
        console.log(`Executed migration: ${file}`);
      }
    }
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
  } finally {
    await pool.end();
  }
}

initDatabase();
```

## Sauvegarde et restauration

### Sauvegarde PostgreSQL

```bash
# Sauvegarde complète
pg_dump blog_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Sauvegarde des données uniquement
pg_dump --data-only blog_db > data_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restauration PostgreSQL

```bash
# Restauration complète
psql blog_db < backup_20250118_120000.sql

# Restauration des données uniquement
psql blog_db < data_backup_20250118_120000.sql
```

### Sauvegarde des fichiers Markdown

```bash
# Script de sauvegarde automatique
#!/bin/bash
tar -czf content_backup_$(date +%Y%m%d_%H%M%S).tar.gz src/content/
```

## Performance et optimisation

### Index recommandés

```sql
-- Index pour les performances
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_page_views_created_at ON page_views(created_at);
CREATE INDEX idx_page_views_page_path ON page_views(page_path);
CREATE INDEX idx_post_analytics_post_slug ON post_analytics(post_slug);
CREATE INDEX idx_generated_posts_slug ON generated_posts(slug);
CREATE INDEX idx_generated_posts_published_at ON generated_posts(published_at);
```

### Nettoyage automatique

```sql
-- Nettoyer les sessions expirées
DELETE FROM sessions WHERE expires_at < NOW();

-- Nettoyer les anciennes vues (garder 1 an)
DELETE FROM page_views WHERE created_at < NOW() - INTERVAL '1 year';

-- Nettoyer les jobs de génération terminés (garder 30 jours)
DELETE FROM content_generation_jobs 
WHERE status IN ('completed', 'failed') 
AND created_at < NOW() - INTERVAL '30 days';
```

## Sécurité

### Bonnes pratiques

1. **Mots de passe** : Toujours hasher avec bcrypt
2. **Sessions** : Utiliser des tokens sécurisés et des expirations
3. **SQL Injection** : Utiliser des requêtes préparées
4. **CORS** : Configurer correctement les origines autorisées
5. **Rate Limiting** : Limiter les requêtes API
6. **Validation** : Valider toutes les entrées utilisateur

### Exemple de validation

```typescript
// src/utils/validation.ts
import { z } from 'zod';

export const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  password: z.string().min(8),
  role: z.enum(['admin', 'editor', 'viewer'])
});

export const postSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  tags: z.array(z.string()).max(10),
  category: z.string().max(100)
});
```

## Monitoring

### Métriques importantes

- Nombre d'articles publiés
- Vues par article
- Temps de génération IA
- Erreurs de génération
- Performance des requêtes
- Utilisation de l'API OpenAI

### Logs

```typescript
// src/utils/logger.ts
export function logContentGeneration(topic: string, success: boolean, duration: number) {
  console.log(`[AI] Content generation - Topic: ${topic}, Success: ${success}, Duration: ${duration}ms`);
}

export function logPageView(path: string, userAgent: string) {
  console.log(`[Analytics] Page view - Path: ${path}, UA: ${userAgent}`);
}
```

Cette documentation couvre les aspects essentiels de la gestion des données pour le blog Astro avec IA. Adaptez la configuration selon vos besoins spécifiques.

