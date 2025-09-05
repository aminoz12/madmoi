// Re-export from databaseFactory for automatic environment switching
export { 
  initializeDatabaseFactory as initializeDatabase,
  executeQueryFactory as executeQuery,
  closeDatabaseFactory as closeDatabase,
  getConnectionPool
} from './databaseFactory.js';

// Re-export specific functions that are used in the blog
export async function getPublishedArticles() {
  const { executeQueryFactory } = await import('./databaseFactory.js');
  const query = `
    SELECT 
      a.*,
      c.name as category_name,
      c.slug as category_slug,
      c.color as category_color,
      c.icon as category_icon,
      COALESCE(u.first_name || ' ' || u.last_name, u.username) AS author_name
    FROM articles a
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN users u ON a.author_id = u.id
    WHERE a.status = 'published'
    ORDER BY a.published_at DESC, a.created_at DESC
  `;
  return await executeQueryFactory(query);
}

export async function getAllArticles() {
  const { executeQueryFactory } = await import('./databaseFactory.js');
  const query = `
    SELECT 
      a.*,
      c.name as category_name,
      c.slug as category_slug,
      c.color as category_color,
      c.icon as category_icon,
      COALESCE(u.first_name || ' ' || u.last_name, u.username) AS author_name
    FROM articles a
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN users u ON a.author_id = u.id
    ORDER BY a.published_at DESC, a.created_at DESC
  `;
  return await executeQueryFactory(query);
}

export async function getCategories() {
  const { executeQueryFactory } = await import('./databaseFactory.js');
  const query = `
    SELECT 
      c.id, c.name, c.slug, c.description, c.color, c.icon, c.parent_id,
      COUNT(a.id) as article_count
    FROM categories c
    LEFT JOIN articles a ON c.id = a.category_id AND a.status = 'published'
    WHERE c.is_active = 1
    GROUP BY c.id, c.name, c.slug, c.description, c.color, c.icon, c.parent_id
    ORDER BY c.sort_order ASC, c.name ASC
  `;
  return await executeQueryFactory(query);
}

export async function getArticleBySlug(slug) {
  const { executeQueryFactory } = await import('./databaseFactory.js');
  const query = `
    SELECT 
      a.*,
      c.name as category_name,
      c.color as category_color,
      c.slug as category_slug,
      u.username as author_name
    FROM articles a
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN users u ON a.author_id = u.id
    WHERE a.slug = ? AND a.status = 'published'
  `;
  const articles = await executeQueryFactory(query, [slug]);
  return articles.length > 0 ? articles[0] : null;
}

export async function incrementViewCount(articleId) {
  const { executeQueryFactory } = await import('./databaseFactory.js');
  const query = `
    UPDATE articles 
    SET view_count = view_count + 1 
    WHERE id = ?
  `;
  await executeQueryFactory(query, [articleId]);
  return true;
}
