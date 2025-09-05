// Database Factory - Automatically switches between SQLite (dev) and MongoDB (prod)
import { initializeDatabase, executeQuery, closeDatabase } from './database.js';
import { connectToMongoDB, getMongoDB } from './mongodb.js';
import { ObjectId } from 'mongodb';

let isMongoDB = false;
let mongoDB = null;

// Initialize the appropriate database based on environment
export async function initializeDatabaseFactory() {
  try {
    // Try MongoDB first, but fallback to SQLite more quickly
    console.log('🚀 Attempting MongoDB connection...');
    
    // Set a timeout for MongoDB connection
    const mongoPromise = connectToMongoDB();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('MongoDB timeout')), 3000)
    );
    
    try {
      const { db } = await Promise.race([mongoPromise, timeoutPromise]);
      console.log('✅ MongoDB connected successfully');
      isMongoDB = true;
      mongoDB = db;
      return { isMongoDB, db };
    } catch (mongoError) {
      console.warn('⚠️ MongoDB connection failed:', mongoError.message);
      throw mongoError;
    }
  } catch (error) {
    console.log('🔄 Falling back to SQLite for local development');
    isMongoDB = false;
    const db = await initializeDatabase();
    console.log('✅ SQLite database initialized');
    return { isMongoDB, db };
  }
}

// Execute query - automatically handles both SQLite and MongoDB
export async function executeQueryFactory(query, params = []) {
  try {
    if (isMongoDB) {
      // Ensure MongoDB connection is still valid
      if (!mongoDB) {
        console.warn('⚠️ MongoDB connection lost, reinitializing...');
        await initializeDatabaseFactory();
      }
      // MongoDB mode - convert SQL query to MongoDB operations
      return await executeMongoDBQuery(query, params);
    } else {
      // SQLite mode - use existing executeQuery
      return await executeQuery(query, params);
    }
  } catch (error) {
    console.error('❌ Query execution failed:', error);
    throw error;
  }
}

// Convert SQL queries to MongoDB operations
async function executeMongoDBQuery(sqlQuery, params) {
  try {
    // Simple query parsing for common operations
    const query = sqlQuery.toLowerCase().trim();
    
    if (query.includes('select') && query.includes('from articles')) {
      // Handle SELECT articles query with JOINs
      const collection = mongoDB.collection('articles');
      
      // Parse basic WHERE conditions
      let filter = {};
      if (query.includes('where a.status != \'deleted\'')) {
        filter.status = { $ne: 'deleted' };
      }
      if (query.includes('where a.status = ?')) {
        filter.status = params[0];
      }
      
      // Parse ORDER BY
      let sort = {};
      if (query.includes('order by a.created_at desc')) {
        sort.created_at = -1;
      }
      
      // Build aggregation pipeline for JOINs
      const pipeline = [
        { $match: filter }
      ];
      
      // Only add sort if there are sort fields
      if (Object.keys(sort).length > 0) {
        pipeline.push({ $sort: sort });
      }
      
      // Add category lookup if JOIN categories is present
      if (query.includes('left join categories')) {
        pipeline.push({
          $lookup: {
            from: 'categories',
            localField: 'category_id',
            foreignField: 'id', // Match integer to integer
            as: 'category'
          }
        });
        pipeline.push({
          $addFields: {
            category_name: { $arrayElemAt: ['$category.name', 0] },
            category_slug: { $arrayElemAt: ['$category.slug', 0] },
            category_color: { $arrayElemAt: ['$category.color', 0] },
            category_icon: { $arrayElemAt: ['$category.icon', 0] }
          }
        });
      }
      
      // Add user lookup if JOIN users is present
      if (query.includes('left join users')) {
        pipeline.push({
          $lookup: {
            from: 'users',
            localField: 'author_id',
            foreignField: 'id', // Match integer to integer
            as: 'user'
          }
        });
        pipeline.push({
          $addFields: {
            author_name: {
              $cond: {
                if: { 
                  $and: [
                    { $ne: [{ $arrayElemAt: ['$user.first_name', 0] }, null] }, 
                    { $ne: [{ $arrayElemAt: ['$user.last_name', 0] }, null] }
                  ] 
                },
                then: { 
                  $concat: [
                    { $arrayElemAt: ['$user.first_name', 0] }, 
                    ' ', 
                    { $arrayElemAt: ['$user.last_name', 0] }
                  ] 
                },
                else: { $arrayElemAt: ['$user.username', 0] }
              }
            }
          }
        });
      }
      
      // Execute MongoDB aggregation
      const articles = await collection.aggregate(pipeline).toArray();
      
      // Transform to match SQLite format
      return articles.map(article => ({
        ...article,
        id: article._id,
        category_name: article.category_name || '',
        category_slug: article.category_slug || '',
        category_color: article.category_color || '#3B82F6',
        category_icon: article.category_icon || '',
        author_name: article.author_name || 'Admin'
      }));
    }
    
    if (query.includes('select') && query.includes('from categories')) {
      // Handle SELECT categories query
      if (!mongoDB) {
        throw new Error('MongoDB connection not initialized');
      }
      const collection = mongoDB.collection('categories');
      
      // Check if this is a complex query with JOIN and GROUP BY (for article counts)
      if (query.includes('left join articles') && query.includes('group by')) {
        const categories = await collection.find({ 
          $or: [
            { is_active: true },
            { is_active: 1 }
          ]
        }).toArray();
        
        // Get article counts for each category
        const articlesCollection = mongoDB.collection('articles');
        const categoriesWithCounts = await Promise.all(
          categories.map(async (cat) => {
            const articleCount = await articlesCollection.countDocuments({
              category_id: cat.id,
              status: 'published'
            });
            
            return {
              id: cat.id,
              name: cat.name,
              slug: cat.slug,
              description: cat.description,
              color: cat.color,
              icon: cat.icon,
              parent_id: cat.parent_id,
              article_count: articleCount
            };
          })
        );
        
        return categoriesWithCounts;
      }
      
      // Handle simple category SELECT by name: SELECT id FROM categories WHERE name = ?
      if (query.includes('select id from categories where name = ?')) {
        console.log('🔧 Handling category lookup by name');
        console.log('🔧 Query:', sqlQuery);
        console.log('🔧 Params:', params);
        
        if (params.length >= 1) {
          const name = params[0];
          const result = await collection.findOne({ name: name });
          
          if (result) {
            console.log('🔧 Category found:', result.name, 'ID:', result.id);
            return [{ id: result.id || result._id }];
          } else {
            console.log('🔧 Category not found:', name);
            return [];
          }
        }
      }
      
      // Handle duplicate check for new categories: WHERE name = ? OR slug = ?
      if (query.includes('where name = ? or slug = ?') && !query.includes('and id !=')) {
        console.log('🔧 Handling category duplicate check for creation');
        console.log('🔧 Query:', sqlQuery);
        console.log('🔧 Params:', params);
        
        if (params.length >= 2) {
          const name = params[0];
          const slug = params[1];
          
          const filter = {
            $or: [
              { name: name },
              { slug: slug }
            ]
          };
          
          console.log('🔧 MongoDB filter for duplicate check:', JSON.stringify(filter));
          const result = await collection.find(filter).toArray();
          console.log('🔧 Duplicate check result:', result.length, 'matches found');
          
          return result.map(category => ({
            ...category,
            id: category.id || category._id
          }));
        }
      }
      
      // Handle uniqueness check for updates: WHERE (name = ? OR slug = ?) AND id != ?
      if (query.includes('and id !=') || query.includes('and id != ?')) {
        console.log('🔧 Handling category uniqueness check for update');
        console.log('🔧 Query:', sqlQuery);
        console.log('🔧 Params:', params);
        
        if (params.length >= 3) {
          const name = params[0];
          const slug = params[1];
          const excludeId = parseInt(params[2]);
          
          const filter = {
            $and: [
              {
                $or: [
                  { name: name },
                  { slug: slug }
                ]
              },
              { id: { $ne: excludeId } }
            ]
          };
          
          console.log('🔧 MongoDB filter for uniqueness check:', JSON.stringify(filter));
          const result = await collection.find(filter).toArray();
          console.log('🔧 Uniqueness check result:', result.length, 'conflicts found');
          
          return result.map(category => ({
            ...category,
            id: category.id || category._id
          }));
        }
      }
      
      // Simple categories query
      let filter = {};
      
      // Handle WHERE clauses
      if (query.includes('where is_active = true') || query.includes('where is_active = 1')) {
        filter = { 
          $or: [
            { is_active: true },
            { is_active: 1 }
          ]
        };
      } else if (query.includes('where is_active') || query.includes('is_active = true')) {
        // Handle any form of is_active filtering
        filter = { 
          $or: [
            { is_active: true },
            { is_active: 1 }
          ]
        };
      }
      
      const categories = await collection.find(filter).toArray();
      console.log('📁 MongoDB categories found:', categories.length);
      
      return categories.map(category => ({
        ...category,
        id: category.id || category._id
      }));
    }
    
    if (query.includes('select') && query.includes('from users')) {
      // Handle SELECT users query
      const collection = mongoDB.collection('users');
      const users = await collection.find({}).toArray();
      
      return users.map(user => ({
        ...user,
        id: user._id
      }));
    }
    
    // Handle INSERT operations
    if (query.includes('insert into categories')) {
      if (!mongoDB) {
        throw new Error('MongoDB connection not initialized');
      }
      const collection = mongoDB.collection('categories');
      
      // Get the next available integer ID
      const lastCategory = await collection.findOne({}, { sort: { id: -1 } });
      const nextId = lastCategory ? (lastCategory.id + 1) : 1;
      
      console.log('🔧 Creating category with ID:', nextId);
      console.log('🔧 SQL Query:', sqlQuery);
      console.log('🔧 Params:', params);
      
      // Use the params array directly instead of parsing the SQL
      if (params && params.length >= 7) {
        const categoryData = {
          _id: new (await import('mongodb')).ObjectId(),
          id: nextId, // Use integer ID for compatibility
          name: params[0],
          slug: params[1],
          description: params[2],
          color: params[3],
          icon: params[4],
          is_active: params[5] === true || params[5] === 1 || params[5] === 'true',
          sort_order: parseInt(params[6]) || 0,
          created_at: new Date(),
          updated_at: new Date()
        };
        
        console.log('🔧 Category data to insert:', categoryData);
        
        const result = await collection.insertOne(categoryData);
        console.log('✅ Category inserted with MongoDB ID:', result.insertedId);
        
        return { insertId: nextId, lastID: nextId }; // Return integer ID
      } else {
        throw new Error('Invalid parameters for category insertion');
      }
    }
    
    // Handle UPDATE operations
    if (query.includes('update categories') && query.includes('set')) {
      const collection = mongoDB.collection('categories');
      
      console.log('🔧 Updating category');
      console.log('🔧 SQL Query:', sqlQuery);
      console.log('🔧 Params:', params);
      console.log('🔧 Params length:', params.length);
      
      // The SQL query uses datetime('now') for updated_at, so we expect 7 params + id (8 total)
      // But the last param is the ID for WHERE clause
      if (params && params.length >= 7) {
        const id = parseInt(params[params.length - 1]); // Last parameter is always the ID
        
        const updates = {
          name: params[0],
          slug: params[1],
          description: params[2] || '',
          color: params[3] || '#3B82F6',
          icon: params[4] || '📁',
          is_active: params[5] === true || params[5] === 1 || params[5] === 'true',
          sort_order: parseInt(params[6]) || 0,
          updated_at: new Date() // Handle datetime('now') as current date
        };
        
        console.log('🔧 Updating category ID:', id);
        console.log('🔧 Update data:', JSON.stringify(updates, null, 2));
        
        // First check if the category exists
        const existingCategory = await collection.findOne({ id: id });
        if (!existingCategory) {
          console.log('❌ Category not found with ID:', id);
          return { affectedRows: 0 };
        }
        
        console.log('🔍 Found existing category:', existingCategory.name);
        
        const result = await collection.updateOne({ id: id }, { $set: updates });
        console.log('✅ Category updated, modified count:', result.modifiedCount);
        console.log('🔍 Match count:', result.matchedCount);
        
        // Verify the update by fetching the updated document
        const updatedDoc = await collection.findOne({ id: id });
        console.log('🔍 Updated document:', updatedDoc ? updatedDoc.name : 'not found');
        
        return { affectedRows: result.modifiedCount };
      } else {
        throw new Error(`Invalid parameters for category update. Expected at least 7 params, got ${params.length}`);
      }
    }
    
    // Handle DELETE operations
    if (query.includes('delete from categories')) {
      const collection = mongoDB.collection('categories');
      
      console.log('🔧 Deleting category');
      console.log('🔧 SQL Query:', sqlQuery);
      console.log('🔧 Params:', params);
      
      // Use the first parameter as the ID
      if (params && params.length >= 1) {
        const id = parseInt(params[0]);
        
        console.log('🔧 Deleting category ID:', id);
        
        const result = await collection.deleteOne({ id: id });
        console.log('✅ Category deleted, deleted count:', result.deletedCount);
        
        return { affectedRows: result.deletedCount };
      } else {
        throw new Error('Invalid parameters for category deletion');
      }
    }
    
    // Handle INSERT operations for articles
    if (query.includes('insert into articles')) {
      if (!mongoDB) {
        throw new Error('MongoDB connection not initialized');
      }
      const collection = mongoDB.collection('articles');
      
      // Get the next available integer ID by counting documents
      const documentCount = await collection.countDocuments();
      const nextId = documentCount + 1;
      
      console.log('🔧 Creating article with ID:', nextId);
      console.log('🔧 SQL Query:', sqlQuery);
      console.log('🔧 Params:', params);
      
      // Map SQL parameters to article fields
      if (params && params.length >= 11) {
        const articleData = {
          _id: new ObjectId(),
          id: nextId,
          title: params[0],
          slug: params[1],
          content: params[2],
          excerpt: params[3],
          category_id: params[4],
          author_id: params[5] || 1,
          status: params[6] || 'draft',
          featured_image: params[7] && params[7] !== 'null' ? (typeof params[7] === 'string' ? JSON.parse(params[7]) : params[7]) : null,
          tags: params[8] && params[8] !== 'null' ? (typeof params[8] === 'string' ? JSON.parse(params[8]) : params[8]) : null,
          is_featured: params[9] || false,
          published_at: params[6] === 'published' ? new Date() : null,
          created_at: new Date(),
          updated_at: new Date()
        };
        
        console.log('🔧 Article data to insert:', articleData);
        
        const result = await collection.insertOne(articleData);
        console.log('✅ Article inserted with MongoDB ID:', result.insertedId);
        
        return { insertId: nextId, lastID: nextId };
      } else {
        throw new Error('Invalid parameters for article insertion');
      }
    }
    
    // Handle simple SELECT * FROM articles WHERE id = ? queries
    if (query.includes('select * from articles where id = ?')) {
      if (!mongoDB) {
        throw new Error('MongoDB connection not initialized');
      }
      const collection = mongoDB.collection('articles');
      
      console.log('🔧 Handling simple article SELECT by ID');
      console.log('🔧 SQL Query:', sqlQuery);
      console.log('🔧 Params:', params);
      
      if (params.length > 0) {
        const articleId = parseInt(params[0]);
        const article = await collection.findOne({ id: articleId });
        
        if (article) {
          console.log('✅ Found article with ID:', articleId);
          return [{
            ...article,
            id: article.id || article._id,
            featured_image: typeof article.featured_image === 'string' 
              ? article.featured_image 
              : article.featured_image 
                ? JSON.stringify(article.featured_image) 
                : null,
            tags: typeof article.tags === 'string' 
              ? article.tags 
              : article.tags 
                ? JSON.stringify(article.tags) 
                : null
          }];
        } else {
          console.log('❌ Article not found with ID:', articleId);
          return [];
        }
      }
      
      return [];
    }
    
    // Handle article queries with JOINs
    if (query.includes('select') && query.includes('from articles')) {
      if (!mongoDB) {
        throw new Error('MongoDB connection not initialized');
      }
      const collection = mongoDB.collection('articles');
      
      console.log('🔧 Handling articles query');
      console.log('🔧 SQL Query:', sqlQuery);
      console.log('🔧 Params:', params);
      
      // Build filter based on query conditions
      let filter = {};
      
      // Handle WHERE status != 'deleted'
      if (query.includes("status != 'deleted'")) {
        filter.status = { $ne: 'deleted' };
      }
      
      // Handle specific status filtering (WHERE a.status = ?)
      if (query.includes('where a.status = ?') && params.length > 0) {
        filter.status = params[0];
      }
      
      console.log('🔧 MongoDB filter:', JSON.stringify(filter));
      
      // Get articles with safe sorting
      let articles;
      try {
        articles = await collection.find(filter).sort({ created_at: -1 }).toArray();
      } catch (sortError) {
        // If sorting fails (empty collection), get without sorting
        console.log('🔧 Sorting failed, fetching articles without sort');
        articles = await collection.find(filter).toArray();
      }
      console.log('📁 MongoDB articles found:', articles.length);
      
      // Get categories for lookup (with error handling)
      const categoriesCollection = mongoDB.collection('categories');
      let categories = [];
      try {
        categories = await categoriesCollection.find({}).toArray();
      } catch (categoriesError) {
        console.log('🔧 Categories lookup failed:', categoriesError.message);
        categories = [];
      }
      
      // Create a category lookup map
      const categoryMap = {};
      categories.forEach(cat => {
        categoryMap[cat.id] = cat;
      });
      
      // Transform to match SQL format with category data
      const transformedArticles = articles.map(article => {
        const category = categoryMap[article.category_id] || {};
        
        return {
          ...article,
          id: article.id || article._id,
          category_name: category.name || '',
          category_slug: category.slug || '',
          category_color: category.color || '#3B82F6',
          category_icon: category.icon || '📁',
          author_name: 'Admin', // TODO: Add user lookup if needed
          // Ensure featured_image is properly formatted
          featured_image: typeof article.featured_image === 'string' 
            ? article.featured_image 
            : article.featured_image 
              ? JSON.stringify(article.featured_image) 
              : null,
          // Ensure tags is properly formatted
          tags: typeof article.tags === 'string' 
            ? article.tags 
            : article.tags 
              ? JSON.stringify(article.tags) 
              : null
        };
      });
      
      console.log('✅ Transformed articles with categories:', transformedArticles.length);
      return transformedArticles;
    }
    
    // Handle UPDATE operations for articles
    if (query.includes('update articles set')) {
      if (!mongoDB) {
        throw new Error('MongoDB connection not initialized');
      }
      const collection = mongoDB.collection('articles');
      
      console.log('🔧 Handling article UPDATE');
      console.log('🔧 SQL Query:', sqlQuery);
      console.log('🔧 Params:', params);
      
      // Extract the article ID from WHERE clause (last parameter)
      const articleId = parseInt(params[params.length - 1]);
      
      // Build update object from parameters
      // Parameter order from API: title, slug, content, excerpt, category_id, author_id, status, featured_image, tags, is_featured, status, id
      const updateData = {
        title: params[0],
        slug: params[1],
        content: params[2],
        excerpt: params[3],
        category_id: params[4] ? parseInt(params[4]) : null,
        author_id: params[5] ? parseInt(params[5]) : 1,
        status: params[6],
        featured_image: params[7],
        tags: params[8],
        is_featured: Boolean(params[9]),
        updated_at: new Date()
      };
      
      // Handle published_at logic based on status
      if (updateData.status === 'published') {
        // Only set published_at if not already set
        const existing = await collection.findOne({ id: articleId });
        if (!existing?.published_at) {
          updateData.published_at = new Date();
        }
      }
      
      // Remove null/undefined values but keep false values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === null || updateData[key] === undefined) {
          delete updateData[key];
        }
      });
      
      console.log('🔧 Update data:', updateData);
      console.log('🔧 Article ID:', articleId);
      
      const result = await collection.updateOne(
        { id: articleId },
        { $set: updateData }
      );
      
      console.log('✅ Article updated, modified count:', result.modifiedCount);
      return { changes: result.modifiedCount, affectedRows: result.modifiedCount };
    }
    
    // Handle DELETE operations for articles
    if (query.includes('delete from articles where id = ?')) {
      if (!mongoDB) {
        throw new Error('MongoDB connection not initialized');
      }
      const collection = mongoDB.collection('articles');
      
      console.log('🔧 Handling article DELETE');
      console.log('🔧 SQL Query:', sqlQuery);
      console.log('🔧 Params:', params);
      
      const articleId = parseInt(params[0]);
      
      const result = await collection.deleteOne({ id: articleId });
      
      console.log('✅ Article deleted, deleted count:', result.deletedCount);
      return { changes: result.deletedCount, affectedRows: result.deletedCount };
    }
    
    // Handle soft DELETE operations (UPDATE status to 'deleted')
    if (query.includes('update articles') && query.includes('status = \'deleted\'')) {
      if (!mongoDB) {
        throw new Error('MongoDB connection not initialized');
      }
      const collection = mongoDB.collection('articles');
      
      console.log('🔧 Handling article soft DELETE');
      console.log('🔧 SQL Query:', sqlQuery);
      console.log('🔧 Params:', params);
      
      const articleId = parseInt(params[params.length - 1]);
      
      const result = await collection.updateOne(
        { id: articleId },
        { 
          $set: { 
            status: 'deleted',
            updated_at: new Date()
          }
        }
      );
      
      console.log('✅ Article soft deleted, modified count:', result.modifiedCount);
      return { changes: result.modifiedCount, affectedRows: result.modifiedCount };
    }
    
    // Default fallback
    console.log('⚠️ Unhandled SQL query, returning empty result:', sqlQuery);
    return [];
    
  } catch (error) {
    console.error('❌ MongoDB query execution failed:', error);
    throw error;
  }
}

// Close database connection
export async function closeDatabaseFactory() {
  try {
    if (isMongoDB) {
      // MongoDB cleanup handled by mongodb.js
      console.log('✅ MongoDB connection closed');
    } else {
      // SQLite cleanup
      await closeDatabase();
      console.log('✅ SQLite connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing database:', error);
  }
}

// Get database instance
export function getDatabaseFactory() {
  if (isMongoDB) {
    return mongoDB;
  } else {
    // For SQLite, we need to return the pool
    return database;
  }
}