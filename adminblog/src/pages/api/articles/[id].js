// Individual article operations: GET, PUT, DELETE by ID
import { initializeDatabaseFactory, executeQueryFactory } from '../../../utils/databaseFactory.js';
import BlogSyncService from '../../../services/blogSyncService.js';

// GET - Get single article by ID
export async function GET({ params }) {
  try {
    await initializeDatabaseFactory();
    
    const { id } = params;
    
    if (!id || isNaN(parseInt(id))) {
      return new Response(JSON.stringify({ error: 'Valid article ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const query = `
      SELECT 
        a.id, a.title, a.slug, a.content, a.excerpt, a.status, a.is_featured, 
        a.author_id, a.category_id, a.featured_image, a.tags, a.meta_title, a.meta_description,
        a.created_at, a.updated_at, a.published_at, a.view_count,
        c.name as category_name, c.slug as category_slug, c.color as category_color, c.icon as category_icon,
        u.username as author_name
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.id = ?
    `;
    
    const articles = await executeQueryFactory(query, [id]);
    
    if (articles.length === 0) {
      return new Response(JSON.stringify({ error: 'Article not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify(articles[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error fetching article:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch article',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// PUT - Update article by ID
export async function PUT({ params, request }) {
  try {
    await initializeDatabaseFactory();
    
    const { id } = params;
    
    if (!id || isNaN(parseInt(id))) {
      return new Response(JSON.stringify({ error: 'Valid article ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check if article exists
    const existingQuery = 'SELECT id, title, status FROM articles WHERE id = ?';
    const existing = await executeQueryFactory(existingQuery, [id]);
    
    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Article not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const updateData = await request.json();
    const { title, content, excerpt, status, category_id, is_featured, tags, meta_title, meta_description } = updateData;
    
    if (!title || !content) {
      return new Response(JSON.stringify({ error: 'Title and content are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generate slug from title if needed
    const slug = title.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    const updateQuery = `
      UPDATE articles SET 
        title = ?, 
        slug = ?, 
        content = ?, 
        excerpt = ?, 
        status = ?, 
        category_id = ?, 
        is_featured = ?, 
        tags = ?, 
        meta_title = ?, 
        meta_description = ?,
        updated_at = datetime('now'),
        published_at = CASE WHEN ? = 'published' AND status != 'published' THEN datetime('now') ELSE published_at END
      WHERE id = ?
    `;
    
    const params_array = [
      title,
      slug,
      content,
      excerpt || '',
      status || 'draft',
      category_id || null,
      is_featured || false,
      tags ? JSON.stringify(tags) : null,
      meta_title || title,
      meta_description || excerpt,
      status || 'draft',
      id
    ];
    
    await executeQueryFactory(updateQuery, params_array);
    
    // Get updated article
    const updatedArticles = await executeQueryFactory(`
      SELECT 
        a.*,
        c.name as category_name, c.slug as category_slug, c.color as category_color,
        u.username as author_name
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.id = ?
    `, [id]);
    
    // Sync to blog if published
    try {
      await BlogSyncService.syncArticleToBlog(parseInt(id));
    } catch (syncError) {
      console.error('⚠️ Blog sync failed after update:', syncError);
    }
    
    return new Response(JSON.stringify(updatedArticles[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error updating article:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to update article',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// DELETE - Delete article by ID
export async function DELETE({ params, request }) {
  try {
    await initializeDatabaseFactory();
    
    const { id } = params;
    
    if (!id || isNaN(parseInt(id))) {
      return new Response(JSON.stringify({ error: 'Valid article ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check if article exists
    const existingQuery = 'SELECT id, title, status FROM articles WHERE id = ?';
    const existing = await executeQueryFactory(existingQuery, [id]);
    
    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Article not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === 'true';
    
    if (force) {
      // Hard delete - completely remove from database
      console.log(`🗑️ Hard deleting article ID: ${id}`);
      
      // Remove from blog first
      try {
        await BlogSyncService.removeArticleFromBlog(parseInt(id));
      } catch (syncError) {
        console.error('⚠️ Blog removal failed before hard delete:', syncError);
      }
      
      // Delete the article record
      const deleteQuery = 'DELETE FROM articles WHERE id = ?';
      await executeQueryFactory(deleteQuery, [id]);
      
      return new Response(JSON.stringify({ 
        message: 'Article permanently deleted',
        id: parseInt(id)
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } else {
      // Soft delete - mark as deleted
      console.log(`📁 Soft deleting article ID: ${id}`);
      
      const softDeleteQuery = `
        UPDATE articles 
        SET status = 'deleted', updated_at = datetime('now')
        WHERE id = ?
      `;
      
      await executeQueryFactory(softDeleteQuery, [id]);
      
      // Remove from blog
      try {
        await BlogSyncService.removeArticleFromBlog(parseInt(id));
      } catch (syncError) {
        console.error('⚠️ Blog removal failed after soft delete:', syncError);
      }
      
      return new Response(JSON.stringify({ 
        message: 'Article moved to trash',
        id: parseInt(id)
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
  } catch (error) {
    console.error('❌ Error deleting article:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to delete article',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

