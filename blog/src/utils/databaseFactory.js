import mysql from 'mysql2/promise';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import fs from 'fs';
import fsp from 'fs/promises';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from blog's .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mad2moi_blog',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// MongoDB configuration
const mongoConfig = {
  uri: process.env.MONGO_URI || 'mongodb+srv://jules:123jules@cluster0.jzw94.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
  dbName: process.env.MONGO_DB_NAME || 'mad2moi_blog'
};

// Driver: mysql (default) or sqlite
const dbDriver = (process.env.DB_DRIVER || 'mysql').toLowerCase();

// Create connection pool
let pool = null; // MySQL pool or SQLite handle
let mongoClient = null; // MongoDB client

// Initialize database connection
export async function initializeDatabaseFactory() {
  try {
    // Always use MongoDB for now (you can change this logic later)
    console.log('🚀 Blog: Using MongoDB as configured');
    
    if (mongoClient) return mongoClient;
    
    // Import MongoDB dynamically
    const { MongoClient } = await import('mongodb');
    
    mongoClient = new MongoClient(mongoConfig.uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    await mongoClient.connect();
    console.log('✅ Blog MongoDB connection established');
    return mongoClient;
  } catch (error) {
    console.error('❌ Blog MongoDB initialization failed:', error);
    // Fallback to SQLite if MongoDB fails
    console.log('🔄 MongoDB failed, falling back to SQLite');
    
    if (pool) return pool;

    if (dbDriver === 'sqlite') {
      const dbDir = path.join(__dirname, '../../../database');
      const dbFile = path.join(dbDir, `${dbConfig.database}.sqlite`);
      
      if (!fs.existsSync(dbDir)) {
        await fsp.mkdir(dbDir, { recursive: true });
      }
      
      pool = await open({ filename: dbFile, driver: sqlite3.Database });
      await pool.exec('PRAGMA foreign_keys = ON;');
      await pool.exec('PRAGMA journal_mode = WAL;');
      console.log('✅ Blog SQLite connection established (fallback)');
      return pool;
    }

    pool = mysql.createPool(dbConfig);
    console.log('✅ Blog MySQL connection established');
    return pool;
  }
}

// Execute a query with automatic database selection
export async function executeQueryFactory(query, params = []) {
  try {
    console.log('🔍 Debug: Executing query:', query);
    console.log('🔍 Debug: Query params:', params);
    console.log('🔍 Debug: Query type:', query.trim().toUpperCase().split(' ')[0]);
    
    const dbClient = await initializeDatabaseFactory();
    
    // Check if we got MongoDB client
    if (dbClient && typeof dbClient.db === 'function') {
      console.log('✅ Got MongoDB client, connecting to database:', mongoConfig.dbName);
      const db = dbClient.db(mongoConfig.dbName);
      
      // Basic SQL to MongoDB query conversion for common operations
      const upperQuery = query.trim().toUpperCase();
      
      if (upperQuery.startsWith('SELECT')) {
        // Handle SELECT queries for articles, categories, users
        if (query.includes('FROM articles')) {
          const collection = db.collection('articles');
          const pipeline = [];
          
          // Basic WHERE clause handling for status = 'published'
          if (query.includes("WHERE a.status = 'published'")) {
            pipeline.push({ $match: { status: 'published' } });
          }
          
          // Handle WHERE slug = ? query for individual articles
          if (query.includes('WHERE a.slug = ?') && params.length > 0) {
            console.log('🔍 Debug: Adding slug match to pipeline:', params[0]);
            pipeline.push({ $match: { slug: params[0], status: 'published' } });
          }
          
          // Basic ORDER BY handling
          if (query.includes('ORDER BY a.published_at DESC')) {
            pipeline.push({ $sort: { published_at: -1, created_at: -1 } });
          }
          
          // Basic JOIN simulation for categories and users
          if (query.includes('LEFT JOIN categories')) {
            // Categories have both _id (ObjectId) and id (integer)
            // Articles have category_id as integer, so match with categories.id
            console.log('🔍 Debug: Adding categories lookup to pipeline');
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
          
          if (query.includes('LEFT JOIN users')) {
            pipeline.push({
              $lookup: {
                from: 'users',
                localField: 'author_id',
                foreignField: 'id', // Match integer to integer (users have both _id and id)
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
          
          // Check if this is the complex getPublishedArticles query
          if (query.includes('LEFT JOIN categories') && query.includes('LEFT JOIN users')) {
            console.log('🔍 Debug: Complex articles query detected, executing pipeline');
            console.log('🔍 Debug: Pipeline:', JSON.stringify(pipeline, null, 2));
            
            const result = await collection.aggregate(pipeline).toArray();
            console.log('🔍 Debug: MongoDB complex query result:', result.length, 'articles');
            
            // Debug: Show all documents in collection first
            const allDocs = await collection.find({}).limit(5).toArray();
            console.log('🔍 Debug: Total documents in articles collection:', await collection.countDocuments());
            console.log('🔍 Debug: Sample raw documents:', allDocs);
            
            // Debug: Show sample article with category data
            if (result.length > 0) {
              console.log('🔍 Debug: Sample article data:', {
                title: result[0].title,
                category_id: result[0].category_id,
                category_name: result[0].category_name,
                category_slug: result[0].category_slug,
                category_color: result[0].category_color,
                category: result[0].category
              });
            } else {
              console.log('⚠️ Debug: No results from pipeline - checking if collection has data');
              const simpleResult = await collection.find({}).limit(5).toArray();
              console.log('🔍 Debug: Simple find result:', simpleResult.length, 'documents');
            }
            
            return result;
          }
          
          // For simpler queries, execute the pipeline
          const result = await collection.aggregate(pipeline).toArray();
          console.log('🔍 Debug: MongoDB simple query result:', result);
          return result;
        }
        
        if (query.includes('FROM categories')) {
          const collection = db.collection('categories');
          
          // Debug: Show all categories first
          const allCategories = await collection.find({}).toArray();
          console.log('🔍 Debug: All categories in MongoDB:', allCategories.length);
          if (allCategories.length > 0) {
            console.log('🔍 Debug: Sample category structure:', {
              _id: allCategories[0]._id,
              id: allCategories[0].id,
              name: allCategories[0].name,
              slug: allCategories[0].slug,
              color: allCategories[0].color
            });
          }
          
          // Handle complex categories query with JOIN and GROUP BY
          if (query.includes('LEFT JOIN articles') && query.includes('GROUP BY')) {
            // This is the getCategories query - get categories with article counts
            // Check for both boolean true and number 1 (MongoDB might store it as number)
            const categories = await collection.find({ 
              $or: [
                { is_active: true },
                { is_active: 1 }
              ]
            }).toArray();
            
            console.log('🔍 Debug: Raw categories from MongoDB:', categories.length);
            if (categories.length > 0) {
              console.log('🔍 Debug: Sample category:', {
                _id: categories[0]._id,
                name: categories[0].name,
                is_active: categories[0].is_active,
                type: typeof categories[0].is_active
              });
            }
            
                         // Get article counts for each category
             const articlesCollection = db.collection('articles');
             const categoriesWithCounts = await Promise.all(
               categories.map(async (cat) => {
                 // Articles use ObjectIds for category_id, so we can match directly
                 const articleCount = await articlesCollection.countDocuments({
                   category_id: cat._id,
                   status: 'published'
                 });
                 
                 return {
                   id: cat._id.toString(), // Use ObjectId as string for compatibility
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
            
            // Sort by sort_order and name
            categoriesWithCounts.sort((a, b) => {
              if (a.sort_order !== b.sort_order) {
                return (a.sort_order || 0) - (b.sort_order || 0);
              }
              return a.name.localeCompare(b.name);
            });
            
            console.log('🔍 Debug: MongoDB categories with counts result:', categoriesWithCounts);
            return categoriesWithCounts;
          }
          
          // Simple categories query
          const result = await collection.find({}).toArray();
          console.log('🔍 Debug: MongoDB categories result:', result);
          return result;
        }
        
        if (query.includes('FROM users')) {
          const collection = db.collection('users');
          const result = await collection.find({}).toArray();
          console.log('🔍 Debug: MongoDB users result:', result);
          return result;
        }
        
        // Default fallback
        const collection = db.collection('articles');
        const result = await collection.find({}).toArray();
        return result;
      }
      
      if (upperQuery.startsWith('INSERT')) {
        // Handle INSERT queries
        const collection = db.collection('articles');
        const result = await collection.insertOne(params[0]);
        return result;
      }
      
      if (upperQuery.startsWith('UPDATE')) {
        // Handle UPDATE queries
        const collection = db.collection('articles');
        const result = await collection.updateOne(
          { _id: params[0] },
          { $set: params[1] }
        );
        return result;
      }
      
      if (upperQuery.startsWith('DELETE')) {
        // Handle DELETE queries
        const collection = db.collection('articles');
        const result = await collection.deleteOne({ _id: params[0] });
        return result;
      }
      
      if (upperQuery.startsWith('SELECT COUNT(*)')) {
        // Handle COUNT queries
        if (query.includes('FROM categories')) {
          const collection = db.collection('categories');
          const count = await collection.countDocuments();
          return [{ count }];
        }
        if (query.includes('FROM articles')) {
          const collection = db.collection('articles');
          const count = await collection.countDocuments();
          return [{ count }];
        }
        return [{ count: 0 }];
      }
      
      // If we reach here, return empty result for unhandled queries
      console.log('⚠️ Unhandled MongoDB query, returning empty result:', query);
      return [];
    }
    
    // Fallback to SQLite/MySQL if MongoDB is not available
    console.log('🔄 Using fallback database (SQLite/MySQL)');
    
    if (dbDriver === 'sqlite') {
      let translated = query
        .replace(/NOW\(\)/gi, 'CURRENT_TIMESTAMP')
        .replace(/INSERT\s+IGNORE/gi, 'INSERT OR IGNORE');
      
      const upper = translated.trim().toUpperCase();
      
      if (upper.startsWith('SELECT')) {
        const result = await pool.all(translated, params);
        return result;
      }
      if (upper.startsWith('INSERT')) {
        const result = await pool.run(translated, params);
        return result;
      }
      if (upper.startsWith('UPDATE')) {
        const result = await pool.run(translated, params);
        return result;
      }
      if (upper.startsWith('DELETE')) {
        const result = await pool.run(translated, params);
        return result;
      }
    } else {
      // MySQL
      const [rows] = await pool.execute(query, params);
      return rows;
    }
  } catch (error) {
    console.error('❌ Query execution error:', error);
    throw error;
  }
}

// Close database connections
export async function closeDatabaseFactory() {
  try {
    if (mongoClient) {
      await mongoClient.close();
      mongoClient = null;
      console.log('✅ MongoDB connection closed');
    }
    if (pool) {
      if (dbDriver === 'sqlite') {
        await pool.close();
      } else {
        await pool.end();
      }
      pool = null;
      console.log('✅ Database connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing database:', error);
  }
}

// Get database connection (for backward compatibility)
export function getConnectionPool() {
  // Always try to use MongoDB first
  if (mongoClient) {
    return mongoClient;
  }
  
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabaseFactory() first.');
  }
  return pool;
}

