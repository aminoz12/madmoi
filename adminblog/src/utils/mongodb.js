import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

 // Use MongoDB Atlas connection string
const MONGODB_URI = process.env.MONGO_URI || 'mongodb+srv://jules:123jules@cluster0.jzw94.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.MONGO_DB_NAME || 'mad2moi_blog';

let client;
let db;

/**
 * Connect to MongoDB
 */
export async function connectToMongoDB() {
  try {
    if (!client) {
      client = new MongoClient(MONGODB_URI, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      await client.connect();
      db = client.db(DB_NAME);

      console.log('✅ Connected to MongoDB');
      console.log(`🌐 Using database: ${DB_NAME}`);

      // Optional ping to verify connection
      await client.db('admin').command({ ping: 1 });
      console.log('✅ MongoDB ping successful');
    }
    return { client, db };
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Get database instance
 */
export function getMongoDB() {
  if (!db) throw new Error('Database not connected. Call connectToMongoDB() first.');
  return db;
}

/**
 * Get collection
 */
export function getCollection(name) {
  return getMongoDB().collection(name);
}

/**
 * Close MongoDB connection
 */
export async function closeMongoDBConnection() {
  try {
    if (client) {
      await client.close();
      console.log('✅ MongoDB connection closed');
      client = null;
      db = null;
    }
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
  }
}

/**
 * Test MongoDB connection
 */
export async function testMongoDBConnection() {
  try {
    await connectToMongoDB();
    const collections = await db.listCollections().toArray();
    console.log('📚 Available collections:', collections.map((c) => c.name));
    return true;
  } catch (error) {
    console.error('❌ MongoDB test failed:', error);
    return false;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeMongoDBConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeMongoDBConnection();
  process.exit(0);
});