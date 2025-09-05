import { initializeDatabaseFactory, executeQueryFactory, closeDatabaseFactory } from '../../utils/databaseFactory.js';
import BlogSyncService from '../../services/blogSyncService.js';
import { processFeaturedImage, isValidImageUrl, sanitizeImageUrl } from '../../utils/imageHandler.js';
import path from 'path';

// GET - Get all articles (excluding deleted ones by default)
export async function GET({ request }) {
  try {
    // Initialize database connection (auto-switches between SQLite/MongoDB)
    await initializeDatabaseFactory();
    
    const url = new URL(request.url);
    const includeDeleted = url.searchParams.get('includeDeleted') === 'true';
    const status = url.searchParams.get('status');
    
    let query = `
      SELECT 
        a.id, a.title, a.slug, a.content, a.excerpt, a.status, a.is_featured, a.author_id, 
        a.featured_image, a.tags, a.created_at, a.updated_at, a.published_at,
        c.name as category_name, c.slug as category_slug, c.color as category_color, c.icon as category_icon,
        u.username as author_name
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
    `;
    
    // Add status filtering
    if (status) {
      query += ` WHERE a.status = ?`;
    } else if (!includeDeleted) {
      query += ` WHERE a.status != 'deleted'`;
    }
    
    query += ` ORDER BY a.created_at DESC`;
    
    const queryParams = status ? [status] : [];
    const articles = await executeQueryFactory(query, queryParams);
    
    return new Response(JSON.stringify(articles), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Error fetching articles:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch articles',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

// POST - Create new article
export async function POST({ request }) {
  try {
    // Check if the request is FormData (for file uploads) or JSON
    const contentType = request.headers.get('content-type');
    let body;
    
    if (contentType && contentType.includes('multipart/form-data')) {
      // Handle FormData
      body = await request.formData();
      console.log('📁 Received FormData request with fields:', Array.from(body.keys()));
    } else {
      // Handle JSON
      body = await request.json();
      console.log('📄 Received JSON request');
    }
    
    // Extract data from either FormData or JSON
    const title = body.get ? body.get('title') : body.title;
    const content = body.get ? body.get('content') : body.content;
    const excerpt = body.get ? body.get('excerpt') : body.excerpt;
    const category = body.get ? body.get('category') : body.category;
    const category_id = body.get ? body.get('category_id') : body.category_id;
    const author_id = body.get ? body.get('authorId') : body.authorId;
    const status = body.get ? body.get('status') : body.status;
    const featured_image = body.get ? body.get('featured_image') : body.featured_image;
    const tags = body.get ? body.get('tags') : body.tags;
    const keywords = body.get ? body.get('keywords') : body.keywords;
    const is_featured = body.get ? body.get('is_featured') : body.is_featured;
    
    // Debug FormData extraction
    if (body.get) {
      console.log('🔍 FormData extraction details (POST):');
      console.log('  - featured_image type:', typeof featured_image);
      console.log('  - featured_image name:', featured_image?.name);
      console.log('  - featured_image size:', featured_image?.size);
      console.log('  - All FormData keys:', Array.from(body.keys()));
      
      // Log all FormData entries for debugging
      for (const [key, value] of body.entries()) {
        console.log(`  - ${key}:`, {
          type: typeof value,
          instanceofFile: value instanceof File,
          value: value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value
        });
      }
    }
    
    console.log('📝 Extracted article data:', {
      title, content, excerpt, category, category_id, author_id, status, 
      has_featured_image: !!featured_image, tags, keywords, is_featured
    });
    
    if (!title || !content) {
      return new Response(JSON.stringify({ error: 'Title and content are required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Initialize database connection
    await initializeDatabaseFactory();
    
    // Resolve category_id from category name or use provided category_id
    let finalCategoryId = null;
    if (category_id) {
      // Use provided category_id directly
      finalCategoryId = parseInt(category_id);
      console.log('✅ Using provided category_id:', finalCategoryId);
    } else if (category) {
      // Resolve category_id from category name
      const categoryQuery = 'SELECT id FROM categories WHERE name = ?';
      const categoryResult = await executeQueryFactory(categoryQuery, [category]);
      if (categoryResult && categoryResult.length > 0) {
        finalCategoryId = categoryResult[0].id;
        console.log('✅ Category resolved:', category, '-> ID:', finalCategoryId);
      } else {
        console.log('⚠️ Category not found:', category, '- creating article without category');
      }
    }
    
    console.log('🔍 Final category ID for article:', finalCategoryId);
    
    // Generate slug from title
    let slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
    
    // Ensure slug uniqueness by adding a number if it already exists
    let counter = 1;
    let originalSlug = slug;
    while (true) {
      const existingSlug = await executeQueryFactory('SELECT id FROM articles WHERE slug = ?', [slug]);
      if (existingSlug.length === 0) {
        break; // Slug is unique
      }
      slug = `${originalSlug}-${counter}`;
      counter++;
      
      // Prevent infinite loop (max 100 attempts)
      if (counter > 100) {
        slug = `${originalSlug}-${Date.now()}`;
        break;
      }
    }
    
    // Combine tags/keywords into one tags field (SQLite schema has no keywords)
    const tagsValue = Array.isArray(tags) ? tags : (Array.isArray(keywords) ? keywords : null);

    // Process featured image
    let processedFeaturedImage = null;
    if (featured_image) {
      try {
        console.log('📁 Processing featured image:', featured_image);
        console.log('🔍 Featured image details:', {
          type: typeof featured_image,
          isObject: typeof featured_image === 'object',
          hasUrl: typeof featured_image === 'object' && featured_image ? !!featured_image.url : false,
          hasFile: typeof featured_image === 'object' && featured_image ? !!featured_image.file : false,
          isFile: featured_image instanceof File,
          keys: typeof featured_image === 'object' && featured_image ? Object.keys(featured_image) : [],
          data: featured_image
        });
        processedFeaturedImage = await processFeaturedImage(featured_image);
        console.log('✅ Featured image processed:', processedFeaturedImage);
      } catch (error) {
        console.error('❌ Error processing featured image:', error);
        // Continue without image rather than failing the entire article creation
        processedFeaturedImage = null;
      }
    } else {
      console.log('📁 No featured image provided');
    }

    const query = `
      INSERT INTO articles (
        title, slug, content, excerpt, category_id, author_id, status, 
        featured_image, tags, is_featured, published_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'published' THEN datetime('now') ELSE NULL END, datetime('now'), datetime('now'))
    `;
    
    console.log('🔍 SQL Query:', query);
    console.log('🔍 Query Parameters:', [
      title, 
      slug, 
      content, 
      excerpt || '', 
      finalCategoryId || null, 
      author_id || 1, // Default author
      status || 'draft', 
      processedFeaturedImage ? JSON.stringify(processedFeaturedImage) : null,
      tagsValue ? JSON.stringify(tagsValue) : null,
      is_featured || false,
      status || 'draft'
    ]);
    
    const result = await executeQueryFactory(query, [
      title, 
      slug, 
      content, 
      excerpt || '', 
      finalCategoryId || null, 
      author_id || 1, // Default author
      status || 'draft', 
      processedFeaturedImage ? JSON.stringify(processedFeaturedImage) : null,
      tagsValue ? JSON.stringify(tagsValue) : null,
      is_featured || false,
      status || 'draft'
    ]);
    
    // Get the created article
    const getQuery = 'SELECT * FROM articles WHERE id = ?';
    const [article] = await executeQueryFactory(getQuery, [result.lastID || result.insertId]);

    // Sync to blog if published
    try {
      await BlogSyncService.syncArticleToBlog(result.lastID || result.insertId);
    } catch (syncError) {
      console.error('⚠️ Blog sync failed after create:', syncError);
    }
    
    return new Response(JSON.stringify(article), {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Error creating article:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      errno: error.errno
    });
    return new Response(JSON.stringify({ 
      error: 'Failed to create article',
      details: error.message,
      code: error.code || 'unknown'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

// PUT - Update article
export async function PUT({ request }) {
  try {
    // Check if the request is FormData (for file uploads) or JSON
    const contentType = request.headers.get('content-type');
    let body;
    
    if (contentType && contentType.includes('multipart/form-data')) {
      // Handle FormData
      body = await request.formData();
      console.log('📁 Received FormData request with fields:', Array.from(body.keys()));
    } else {
      // Handle JSON
      body = await request.json();
      console.log('📄 Received JSON request');
    }
    
    // Extract data from either FormData or JSON
    const id = body.get ? body.get('id') : body.id;
    const title = body.get ? body.get('title') : body.title;
    const content = body.get ? body.get('content') : body.content;
    const excerpt = body.get ? body.get('excerpt') : body.excerpt;
    const category_id = body.get ? body.get('category_id') : body.category_id;
    const author_id = body.get ? body.get('author_id') : body.author_id;
    const status = body.get ? body.get('status') : body.status;
    const featured_image = body.get ? body.get('featured_image') : body.featured_image;
    const tags = body.get ? body.get('tags') : body.tags;
    const is_featured = body.get ? body.get('is_featured') : body.is_featured;
    
    // Debug FormData extraction
    if (body.get) {
      console.log('🔍 FormData extraction details:');
      console.log('  - featured_image type:', typeof featured_image);
      console.log('  - featured_image instanceof File:', featured_image instanceof File);
      console.log('  - featured_image name:', featured_image?.name);
      console.log('  - featured_image size:', featured_image?.size);
      console.log('  - All FormData keys:', Array.from(body.keys()));
      
      // Log all FormData entries for debugging
      for (const [key, value] of body.entries()) {
        console.log(`  - ${key}:`, {
          type: typeof value,
          instanceofFile: value instanceof File,
          value: value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value
        });
      }
    }
    
    console.log('📝 Update article data:', {
      id, title, content, excerpt, category_id, author_id, status, 
      has_featured_image: !!featured_image, is_featured
    });
    
    if (!id || !title || !content) {
      return new Response(JSON.stringify({ error: 'ID, title and content are required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Initialize database connection
    await initializeDatabaseFactory();
    
    // Generate slug from title
    const slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
    
    console.log('🔍 Generated slug:', slug);
    
    // Combine tags/keywords into one tags field
    const tagsValueUpdate = Array.isArray(tags) ? tags : [];
    
    // Process featured image - only if a new one is provided
    let processedFeaturedImage = null;
    let shouldUpdateImage = false;
    
    if (featured_image) {
      try {
        console.log('📁 Processing featured image for update:', featured_image);
        console.log('🔍 Featured image details:', {
          type: typeof featured_image,
          isObject: typeof featured_image === 'object',
          hasUrl: typeof featured_image === 'object' && featured_image ? !!featured_image.url : false,
          hasFile: typeof featured_image === 'object' && featured_image ? !!featured_image.file : false,
          isFile: featured_image instanceof File,
          keys: typeof featured_image === 'object' && featured_image ? Object.keys(featured_image) : [],
          data: featured_image
        });
        
        processedFeaturedImage = await processFeaturedImage(featured_image);
        shouldUpdateImage = true;
        console.log('✅ Featured image processed for update:', processedFeaturedImage);
        console.log('🔍 Processed image will be stored as JSON:', JSON.stringify(processedFeaturedImage));
        console.log('🔍 Processed image type:', typeof processedFeaturedImage);
        console.log('🔍 Processed image has url:', processedFeaturedImage && processedFeaturedImage.url);
        console.log('🔍 Processed image url value:', processedFeaturedImage && processedFeaturedImage.url);
      } catch (error) {
        console.error('❌ Error processing featured image for update:', error);
        // Continue without image rather than failing the entire article update
        processedFeaturedImage = null;
        shouldUpdateImage = false;
      }
    } else {
      console.log('🔄 No new image provided, keeping existing image');
      shouldUpdateImage = false;
      
      // Get the existing article to see what image it currently has
      try {
        const existingArticleQuery = 'SELECT featured_image FROM articles WHERE id = ?';
        const [existingArticle] = await executeQueryFactory(existingArticleQuery, [id]);
        if (existingArticle) {
          console.log('🔍 Existing article image data:', {
            featured_image: existingArticle.featured_image,
            featured_image_type: typeof existingArticle.featured_image,
            has_image: !!existingArticle.featured_image
          });
        }
      } catch (error) {
        console.error('❌ Error fetching existing article image:', error);
      }
    }
    
    // Build dynamic query based on whether we're updating the image
    let query;
    let queryParams;
    
    if (shouldUpdateImage) {
      // Update including featured_image
      query = `
        UPDATE articles 
        SET title = ?, slug = ?, content = ?, excerpt = ?, category_id = ?, 
            author_id = ?, status = ?, featured_image = ?, tags = ?, 
            is_featured = ?, 
            published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, datetime('now')) ELSE published_at END,
            updated_at = datetime('now')
        WHERE id = ?
      `;
      const imageJsonString = JSON.stringify(processedFeaturedImage);
      console.log('🔍 Image JSON string to be stored:', imageJsonString);
      console.log('🔍 Image JSON string length:', imageJsonString.length);
      
      queryParams = [
        title, 
        slug, 
        content, 
        excerpt || '', 
        category_id || null, 
        author_id || 1,
        status || 'draft', 
        imageJsonString,
        tagsValueUpdate ? JSON.stringify(tagsValueUpdate) : null,
        is_featured || false,
        status || 'draft',
        id
      ];
      console.log('🖼️ Will update with new image data:', processedFeaturedImage);
    } else {
      // Update without changing featured_image - but we need to preserve the existing image
      // First, get the existing image data
      let existingImageData = null;
      try {
        const existingArticleQuery = 'SELECT featured_image FROM articles WHERE id = ?';
        const [existingArticle] = await executeQueryFactory(existingArticleQuery, [id]);
        if (existingArticle && existingArticle.featured_image) {
          existingImageData = existingArticle.featured_image;
          console.log('🔄 Preserving existing image data:', existingImageData);
        }
      } catch (error) {
        console.error('❌ Error fetching existing image data:', error);
      }
      
      // Update without changing featured_image
      query = `
        UPDATE articles 
        SET title = ?, slug = ?, content = ?, excerpt = ?, category_id = ?, 
            author_id = ?, status = ?, featured_image = ?, tags = ?, 
            is_featured = ?, 
            published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, datetime('now')) ELSE published_at END,
            updated_at = datetime('now')
        WHERE id = ?
      `;
      queryParams = [
        title, 
        slug, 
        content, 
        excerpt || '', 
        category_id || null, 
        author_id || 1,
        status || 'draft', 
        existingImageData, // Preserve existing image data
        tagsValueUpdate ? JSON.stringify(tagsValueUpdate) : null,
        is_featured || false,
        status || 'draft',
        id
      ];
      console.log('🔄 Will preserve existing image data:', existingImageData);
    }
    
    console.log('🔍 Update SQL Query:', query);
    console.log('🔍 Update Query Parameters:', queryParams);
    console.log('🖼️ Image update strategy:', shouldUpdateImage ? 'Updating with new image' : 'Keeping existing image');
    
    try {
      const updateResult = await executeQueryFactory(query, queryParams);
      console.log('✅ Article update query executed successfully');
      console.log('🔍 Update result:', updateResult);
      
      // Immediately verify the update worked by checking the database
      const verifyQuery = 'SELECT featured_image FROM articles WHERE id = ?';
      const [verifyResult] = await executeQueryFactory(verifyQuery, [id]);
      console.log('🔍 Verification query result:', verifyResult);
      console.log('🔍 Featured image in database after update:', verifyResult.featured_image);
      
    } catch (dbError) {
      console.error('❌ Database update failed:', dbError);
      throw new Error(`Database update failed: ${dbError.message}`);
    }
    console.log('🔍 Database update completed with query:', query);
    console.log('🔍 Database update parameters:', queryParams);
    
    // Log what was actually stored in the database
    if (shouldUpdateImage) {
      console.log('🖼️ NEW image data that was stored:', JSON.stringify(processedFeaturedImage));
    } else {
      console.log('🖼️ EXISTING image data that was preserved:', existingImageData);
    }
    
    // Get the updated article
    const getQuery = 'SELECT * FROM articles WHERE id = ?';
    console.log('🔍 Fetching updated article with query:', getQuery, 'and ID:', id);
    const [article] = await executeQueryFactory(getQuery, [id]);
    
    if (!article) {
      console.error('❌ Article not found after update, ID:', id);
      return new Response(JSON.stringify({ error: 'Article not found after update' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Debug: Log the raw article data from database
    console.log('🔍 Raw article from database:', {
      id: article.id,
      title: article.title,
      featured_image_raw: article.featured_image,
      featured_image_type: typeof article.featured_image,
      featured_image_length: article.featured_image ? article.featured_image.length : 0
    });
    
    // Also check if the image file actually exists on disk
    if (article.featured_image && typeof article.featured_image === 'string') {
      try {
        const parsedImage = JSON.parse(article.featured_image);
        if (parsedImage.url && parsedImage.url.startsWith('/uploads/')) {
          const imagePath = path.join(process.cwd(), 'public', parsedImage.url);
          console.log('🔍 Checking if image file exists on disk:', imagePath);
          try {
            const fs = await import('fs/promises');
            const stats = await fs.stat(imagePath);
            console.log('✅ Image file exists on disk, size:', stats.size, 'bytes');
          } catch (fsError) {
            console.error('❌ Image file NOT found on disk:', fsError.message);
          }
        }
      } catch (parseError) {
        console.error('❌ Could not parse featured_image JSON:', parseError);
      }
    }
    
    // Parse featured_image if it's a JSON string
    if (article.featured_image && typeof article.featured_image === 'string') {
      try {
        const parsedImage = JSON.parse(article.featured_image);
        article.featured_image = parsedImage;
        console.log('✅ Parsed featured_image from JSON:', parsedImage);
      } catch (parseError) {
        console.error('❌ Error parsing featured_image JSON:', parseError);
        console.log('🔍 Raw featured_image value:', article.featured_image);
      }
    }
    
    console.log('🔍 Final article data being returned:', {
      id: article.id,
      title: article.title,
      featured_image: article.featured_image,
      featured_image_type: typeof article.featured_image
    });

    // Sync to blog (handles published/draft logic internally)
    try {
      await BlogSyncService.syncArticleToBlog(id);
      console.log('✅ Blog sync completed successfully');
    } catch (syncError) {
      console.error('⚠️ Blog sync failed after update:', syncError);
      // Don't fail the update if sync fails
    }
    
    console.log('✅ Article update completed successfully, ID:', id);
    return new Response(JSON.stringify(article), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Error updating article:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return new Response(JSON.stringify({ 
      error: 'Failed to update article',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

// DELETE - Delete article (soft delete by default, hard delete with force=true)
export async function DELETE({ request }) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const force = url.searchParams.get('force') === 'true';
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'Article ID is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    if (force) {
      // Hard delete - completely remove from database
      console.log(`🗑️ Hard deleting article ID: ${id}`);
      
      // First, get article info for cleanup
      const articleQuery = 'SELECT featured_image FROM articles WHERE id = ?';
      const [article] = await executeQueryFactory(articleQuery, [id]);
      
      // Remove from blog
      try {
        await BlogSyncService.removeArticleFromBlog(Number(id));
      } catch (syncError) {
        console.error('⚠️ Blog removal failed before hard delete:', syncError);
      }
      
      // Delete the article record
      const deleteQuery = 'DELETE FROM articles WHERE id = ?';
      await executeQueryFactory(deleteQuery, [id]);
      
      // Clean up associated image files if they exist
      if (article && article.featured_image) {
        try {
          const imageData = JSON.parse(article.featured_image);
          if (imageData.path) {
            const fs = await import('fs/promises');
            const imagePath = path.join(process.cwd(), 'public', imageData.path);
            await fs.unlink(imagePath);
            console.log('✅ Associated image file deleted:', imagePath);
          }
        } catch (cleanupError) {
          console.warn('⚠️ Could not clean up image file:', cleanupError);
        }
      }
      
      return new Response(JSON.stringify({ message: 'Article permanently deleted' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } else {
      // Soft delete (set status to deleted)
      console.log(`📁 Soft deleting (archiving) article ID: ${id}`);
      
      const query = 'UPDATE articles SET status = "deleted", updated_at = datetime("now") WHERE id = ?';
      await executeQueryFactory(query, [id]);

      // Remove from blog
      try {
        await BlogSyncService.removeArticleFromBlog(Number(id));
      } catch (syncError) {
        console.error('⚠️ Blog removal failed after soft delete:', syncError);
      }
      
      return new Response(JSON.stringify({ message: 'Article archived successfully' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (error) {
    console.error('❌ Error deleting article:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete article' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

// PATCH - Restore archived article
export async function PATCH({ request }) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const action = url.searchParams.get('action');
    
    if (!id || !action) {
      return new Response(JSON.stringify({ error: 'Article ID and action are required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    if (action === 'restore') {
      // Restore archived article
      console.log(`📁 Restoring archived article ID: ${id}`);
      
      const query = 'UPDATE articles SET status = "draft", updated_at = datetime("now") WHERE id = ? AND status = "deleted"';
      const result = await executeQueryFactory(query, [id]);
      
      if (result.changes > 0) {
        return new Response(JSON.stringify({ message: 'Article restored successfully' }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      } else {
        return new Response(JSON.stringify({ error: 'Article not found or not archived' }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (error) {
    console.error('❌ Error restoring article:', error);
    return new Response(JSON.stringify({ error: 'Failed to restore article' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}