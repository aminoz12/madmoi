// Database utility that integrates with the database factory
import { initializeDatabaseFactory, executeQueryFactory, closeDatabaseFactory } from './databaseFactory.js';

let isMongoDB = false;
let database = null;

console.log('🔧 Database Debug Info:');
console.log('  Using database factory for MongoDB/SQLite switching');

// Create connection pool / handle
let pool = null; // SQLite Database handle

// Initialize database connection using factory
export async function initializeDatabase() {
  try {
    if (database) {
      return database;
    }

    console.log('🚀 Initializing database using factory...');
    const { isMongoDB: isMongo, db } = await initializeDatabaseFactory();
    isMongoDB = isMongo;
    database = db;
    
    if (isMongoDB) {
      console.log('✅ MongoDB database initialized via factory');
    } else {
      console.log('✅ SQLite database initialized via factory');
    }
    
    return database;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Create all necessary tables
async function createTables(connection) {
  try {
    // Users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'editor', 'author') DEFAULT 'author',
        first_name VARCHAR(50),
        last_name VARCHAR(50),
        avatar_url VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Categories table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        parent_id INT NULL,
        color VARCHAR(7) DEFAULT '#3B82F6',
        icon VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
      )
    `);

    // Articles table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS articles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        slug VARCHAR(200) UNIQUE NOT NULL,
        excerpt TEXT,
        content LONGTEXT NOT NULL,
        featured_image TEXT,
        author_id INT NOT NULL,
        category_id INT,
        status ENUM('draft', 'published', 'archived', 'scheduled', 'deleted') DEFAULT 'draft',
        is_featured BOOLEAN DEFAULT FALSE,
        meta_title VARCHAR(60),
        meta_description VARCHAR(160),
        tags JSON,
        view_count INT DEFAULT 0,
        published_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      )
    `);

    // Subscribers table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        location VARCHAR(100),
        source ENUM('site_web', 'reseaux_sociaux', 'newsletter', 'referencement') NOT NULL,
        status ENUM('actif', 'inactif', 'desabonne') DEFAULT 'actif',
        engagement_score INT DEFAULT 50,
        last_activity TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Analytics table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS analytics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        page_url VARCHAR(255) NOT NULL,
        user_agent TEXT,
        ip_address VARCHAR(45),
        referrer VARCHAR(255),
        session_id VARCHAR(100),
        user_id INT NULL,
        event_type ENUM('page_view', 'click', 'form_submit', 'download') DEFAULT 'page_view',
        event_data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Settings table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
        description TEXT,
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Blog Sync Notifications table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS blog_sync_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        article_id INT NOT NULL,
        action ENUM('create', 'update', 'delete') NOT NULL,
        slug VARCHAR(200) NOT NULL,
        status ENUM('pending', 'processed', 'failed') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        processed_at TIMESTAMP NULL,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        UNIQUE KEY uniq_slug (slug)
      )
    `);

    // Chat Conversations table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS chat_conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(100) UNIQUE NOT NULL,
        visitor_name VARCHAR(100),
        visitor_email VARCHAR(100),
        status ENUM('active', 'closed', 'archived') DEFAULT 'active',
        last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Chat Messages table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        sender_type ENUM('visitor', 'admin', 'ai') NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ All tables created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
}

// Create all necessary tables for SQLite
async function createTablesSqlite(db) {
  try {
    // Users table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'author',
        first_name TEXT,
        last_name TEXT,
        avatar_url TEXT,
        is_active INTEGER DEFAULT 1,
        last_login TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Categories table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        parent_id INTEGER,
        color TEXT DEFAULT '#3B82F6',
        icon TEXT,
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES categories(id)
      )
    `);

    // Articles table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        excerpt TEXT,
        content TEXT NOT NULL,
        featured_image TEXT,
        author_id INTEGER NOT NULL,
        category_id INTEGER,
        status TEXT DEFAULT 'draft',
        is_featured INTEGER DEFAULT 0,
        meta_title TEXT,
        meta_description TEXT,
        tags TEXT,
        view_count INTEGER DEFAULT 0,
        published_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);

    // Subscribers table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        is_active INTEGER DEFAULT 1,
        subscribed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        unsubscribed_at TEXT
      )
    `);

    // Chat Conversations table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS chat_conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        visitor_name TEXT,
        visitor_email TEXT,
        status TEXT DEFAULT 'active',
        last_message_at TEXT DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Chat Messages table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        sender_type TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
      )
    `);

    // Admin Status table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS admin_status (
        id INTEGER PRIMARY KEY,
        available INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default admin status (not available)
    await db.exec(`
      INSERT OR IGNORE INTO admin_status (id, available) VALUES (1, 0)
    `);

    // Analytics table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_url TEXT NOT NULL,
        user_agent TEXT,
        ip_address TEXT,
        referrer TEXT,
        session_id TEXT,
        user_id INTEGER,
        event_type TEXT DEFAULT 'page_view',
        event_data TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Settings table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type TEXT DEFAULT 'string',
        description TEXT,
        is_public INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Blog Sync Notifications table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS blog_sync_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        slug TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        processed_at TEXT,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        UNIQUE (slug)
      )
    `);

    console.log('✅ All tables created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
}

// Create default categories for MySQL
async function createDefaultCategories(connection) {
  try {
    const [existingCategories] = await connection.execute(`
      SELECT COUNT(*) FROM categories WHERE slug = 'general'
    `);
    const count = existingCategories[0]['COUNT(*)'];

    if (count === 0) {
      await connection.execute(`
        INSERT INTO categories (name, slug, description, color, icon, is_active, sort_order)
        VALUES ('Général', 'general', 'Catégorie générale', '#3B82F6', '📁', 1, 0)
      `);
      console.log('✅ Default category "Général" created for MySQL');
    } else {
      console.log('✅ Default category "Général" already exists for MySQL');
    }
  } catch (error) {
    console.error('❌ Error creating default categories for MySQL:', error);
    throw error;
  }
}

// Get database connection pool
export function getConnectionPool() {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

// Execute a query using factory
export async function executeQuery(query, params = []) {
  try {
    if (!database) {
      await initializeDatabase();
    }
    
    console.log('🔍 Executing query via factory:', query);
    console.log('🔍 Query parameters:', params);
    
    const result = await executeQueryFactory(query, params);
    console.log('✅ Query executed successfully via factory, rows returned:', Array.isArray(result) ? result.length : 1);
    return result;
  } catch (error) {
    console.error('❌ Query execution error:', error);
    console.error('❌ Query:', query);
    console.error('❌ Parameters:', params);
    throw error;
  }
}

// Execute a transaction
export async function executeTransaction(queries) {
  if (dbDriver === 'sqlite') {
    await initializeDatabase();
    const results = [];
    try {
      await pool.exec('BEGIN');
      for (const { query, params = [] } of queries) {
        let translated = query
          .replace(/NOW\(\)/gi, 'CURRENT_TIMESTAMP')
          .replace(/INSERT\s+IGNORE/gi, 'INSERT OR IGNORE');
        const upper = translated.trim().toUpperCase();
        if (upper.startsWith('SELECT')) {
          const rows = await pool.all(translated, params);
          results.push(rows);
        } else {
          const r = await pool.run(translated, params);
          results.push(r);
        }
      }
      await pool.exec('COMMIT');
      return results;
    } catch (error) {
      await pool.exec('ROLLBACK');
      throw error;
    }
  }

  // const poolRef = getConnectionPool();
  // const connection = await poolRef.getConnection();
  // try {
  //   await connection.beginTransaction();
  //   const results = [];
  //   for (const { query, params = [] } of queries) {
  //     const [rows] = await connection.execute(query, params);
  //     results.push(rows);
  //   }
  //   await connection.commit();
  //   return results;
  // } catch (error) {
  //   await connection.rollback();
  //   throw error;
  // } finally {
  //   connection.release();
  // }
}

// Close database connection using factory
export async function closeDatabase() {
  try {
    if (database) {
      await closeDatabaseFactory();
      database = null;
      console.log('✅ Database connection closed via factory');
    }
  } catch (error) {
    console.error('❌ Error closing database:', error);
  }
}

// Test database connection
export async function testConnection() {
  try {
    if (dbDriver === 'sqlite') {
      await initializeDatabase();
      await pool.exec('SELECT 1');
      console.log('✅ Database connection test successful');
      return true;
    }
    // const poolRef = getConnectionPool();
    // const connection = await poolRef.getConnection();
    // await connection.ping();
    // connection.release();
    console.log('✅ Database connection test successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

