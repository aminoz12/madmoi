// Production-safe API endpoint for categories
export async function POST({ request }) {
  // Check if we're in production (Netlify)
  if (process.env.NODE_ENV === 'production' || process.env.NETLIFY) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Database operations are not available in production. Use local development for full functionality.' 
    }), { 
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Only run database operations in development
  try {
    const { initializeDatabaseFactory, executeQueryFactory, closeDatabaseFactory } = await import('../../utils/databaseFactory.js');
    
    // Initialize database connection
    await initializeDatabaseFactory();
    
    const categoryData = await request.json();
    
    console.log('📁 Received category data:', categoryData);
    
    // Validate required fields
    if (!categoryData.name) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Le nom de la catégorie est requis' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generate slug from name
    const slug = generateSlug(categoryData.name);
    
    // Check if category already exists
    const existingCategory = await executeQueryFactory(
      'SELECT id FROM categories WHERE name = ? OR slug = ?',
      [categoryData.name, slug]
    );
    
    if (existingCategory.length > 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Une catégorie avec ce nom ou slug existe déjà' 
      }), { 
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Insert category into database
    const result = await executeQueryFactory(`
      INSERT INTO categories (
        name, 
        slug, 
        description, 
        color, 
        icon, 
        is_active, 
        sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      categoryData.name,
      slug,
      categoryData.description || '',
      categoryData.color || '#3B82F6',
      categoryData.icon || '📁',
      true,
      categoryData.sortOrder || 0
    ]);
    
    const categoryId = result.insertId;
    
    console.log('✅ Category saved to database with ID:', categoryId);
    
    // Close database connection
    await closeDatabaseFactory();
    
    return new Response(JSON.stringify({ 
      success: true, 
      categoryId: categoryId,
      message: 'Catégorie créée avec succès' 
    }), { 
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error saving category:', error);
    
    try {
      const { closeDatabaseFactory } = await import('../../utils/databaseFactory.js');
      await closeDatabaseFactory();
    } catch (closeError) {
      console.error('Error closing database:', closeError);
    }
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Erreur lors de la création de la catégorie: ' + error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET() {
  // Check if we're in production (Netlify)
  if (process.env.NODE_ENV === 'production' || process.env.NETLIFY) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Database operations are not available in production. Use local development for full functionality.' 
    }), { 
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Only run database operations in development
  try {
    const { initializeDatabaseFactory, executeQueryFactory, closeDatabaseFactory } = await import('../../utils/databaseFactory.js');
    
    // Initialize database connection
    await initializeDatabaseFactory();
    
    // Check if categories collection exists (MongoDB) or table exists (SQLite)
    try {
      // For MongoDB, we'll just try to query the collection
      // For SQLite, we'll check if the table exists
      const tableCheck = await executeQueryFactory(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='categories'
      `);
      console.log('🔧 Categories API: Categories table check:', tableCheck);
      
      if (tableCheck.length === 0) {
        console.log('🔧 Categories API: Table not found, might be MongoDB or empty database');
      }
    } catch (tableError) {
      console.log('🔧 Categories API: Table check failed (expected for MongoDB):', tableError.message);
      // Continue anyway - this might be MongoDB where tables don't exist
    }

    const categories = await executeQueryFactory(`
      SELECT 
        id, 
        name, 
        slug, 
        description, 
        color, 
        icon, 
        is_active, 
        sort_order, 
        created_at, 
        updated_at
      FROM categories 
      WHERE is_active = true 
      ORDER BY sort_order ASC, name ASC
    `);
    
    console.log(`📁 Retrieved ${categories.length} categories from database`);
    
    // Close database connection
    await closeDatabaseFactory();
    
    return new Response(JSON.stringify(categories), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    
    try {
      const { closeDatabaseFactory } = await import('../../utils/databaseFactory.js');
      await closeDatabaseFactory();
    } catch (closeError) {
      console.error('Error closing database:', closeError);
    }
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Erreur lors de la récupération des catégories: ' + error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Update category
export async function PUT({ request }) {
  if (process.env.NODE_ENV === 'production' || process.env.NETLIFY) {
    return new Response(JSON.stringify({ success: false, error: 'Database operations are not available in production.' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { initializeDatabaseFactory, executeQueryFactory, closeDatabaseFactory } = await import('../../utils/databaseFactory.js');
    await initializeDatabaseFactory();

    const body = await request.json();
    const { id, name, description, color, icon, featured, sort_order } = body || {};

    if (!id || !name) {
      return new Response(JSON.stringify({ success: false, error: 'ID et nom sont requis' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const slug = generateSlug(name);

    // Ensure uniqueness of name/slug excluding current id
    const dup = await executeQueryFactory('SELECT id FROM categories WHERE (name = ? OR slug = ?) AND id != ?', [name, slug, id]);
    if (dup.length > 0) {
      await closeDatabaseFactory();
      return new Response(JSON.stringify({ success: false, error: 'Une catégorie avec ce nom ou slug existe déjà' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
    }

    await executeQueryFactory(`
      UPDATE categories 
      SET name = ?, slug = ?, description = ?, color = ?, icon = ?, is_active = ?, sort_order = ?, updated_at = datetime('now') 
      WHERE id = ?
    `, [
      name,
      slug,
      description || '',
      color || '#3B82F6',
      icon || '📁',
      featured === true ? 1 : 1, // keep active by default
      typeof sort_order === 'number' ? sort_order : 0,
      id
    ]);

    const updated = await executeQueryFactory('SELECT id, name, slug, description, color, icon, is_active, sort_order, created_at, updated_at FROM categories WHERE id = ?', [id]);
    await closeDatabaseFactory();

    return new Response(JSON.stringify(updated[0] || null), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('❌ Error updating category:', error);
    try {
      const { closeDatabaseFactory } = await import('../../utils/databaseFactory.js');
      await closeDatabaseFactory();
    } catch {}
    return new Response(JSON.stringify({ success: false, error: 'Erreur lors de la mise à jour de la catégorie: ' + (error?.message || 'Unknown') }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// Delete category
export async function DELETE({ request }) {
  if (process.env.NODE_ENV === 'production' || process.env.NETLIFY) {
    return new Response(JSON.stringify({ success: false, error: 'Database operations are not available in production.' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { initializeDatabaseFactory, executeQueryFactory, closeDatabaseFactory } = await import('../../utils/databaseFactory.js');
    await initializeDatabaseFactory();
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      await closeDatabaseFactory();
      return new Response(JSON.stringify({ success: false, error: 'ID requis' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Delete category (FK on articles is ON DELETE SET NULL)
    const result = await executeQueryFactory('DELETE FROM categories WHERE id = ?', [id]);
    await closeDatabaseFactory();

    return new Response(JSON.stringify({ success: true, deleted: result?.affectedRows ?? 1 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('❌ Error deleting category:', error);
    try {
      const { closeDatabaseFactory } = await import('../../utils/databaseFactory.js');
      await closeDatabaseFactory();
    } catch {}
    return new Response(JSON.stringify({ success: false, error: 'Erreur lors de la suppression de la catégorie: ' + (error?.message || 'Unknown') }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// Helper function to generate slug
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[éèêë]/g, 'e')
    .replace(/[àâä]/g, 'a')
    .replace(/[îï]/g, 'i')
    .replace(/[ôö]/g, 'o')
    .replace(/[ûüù]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
}