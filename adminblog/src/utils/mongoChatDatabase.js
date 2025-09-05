// MongoDB Chat Database - Dedicated chat system for MongoDB Atlas
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB Atlas configuration for chat
const MONGODB_URI = process.env.MONGO_URI || 'mongodb+srv://jules:123jules@cluster0.jzw94.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.MONGO_DB_NAME || 'mad2moi_blog';

let client = null;
let db = null;

/**
 * Initialize MongoDB connection for chat system
 */
export async function initializeChatDatabase() {
  try {
    if (!client) {
      client = new MongoClient(MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      await client.connect();
      db = client.db(DB_NAME);

      console.log('✅ Chat MongoDB Atlas connected');
      console.log(`📱 Chat using database: ${DB_NAME}`);

      // Verify connection
      await client.db('admin').command({ ping: 1 });
      console.log('✅ Chat MongoDB ping successful');

      // Create indexes for better performance
      await createChatIndexes();
    }
    return db;
  } catch (error) {
    console.error('❌ Chat MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Create indexes for chat collections
 */
async function createChatIndexes() {
  try {
    const conversationsCollection = db.collection('chat_conversations');
    const messagesCollection = db.collection('chat_messages');

    // Indexes for chat_conversations
    await conversationsCollection.createIndex({ session_id: 1 }, { unique: true });
    await conversationsCollection.createIndex({ status: 1 });
    await conversationsCollection.createIndex({ last_message_at: -1 });
    await conversationsCollection.createIndex({ created_at: -1 });

    // Indexes for chat_messages
    await messagesCollection.createIndex({ conversation_id: 1 });
    await messagesCollection.createIndex({ sender_type: 1 });
    await messagesCollection.createIndex({ created_at: -1 });
    await messagesCollection.createIndex({ is_read: 1 });

    console.log('✅ Chat indexes created successfully');
  } catch (error) {
    console.warn('⚠️ Chat indexes creation warning:', error.message);
  }
}

/**
 * Create a new chat conversation
 */
export async function createConversation(sessionId, visitorName = null, visitorEmail = null) {
  try {
    const db = await initializeChatDatabase();
    const collection = db.collection('chat_conversations');

    const conversation = {
      session_id: sessionId,
      visitor_name: visitorName,
      visitor_email: visitorEmail,
      status: 'active',
      last_message_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await collection.insertOne(conversation);
    console.log(`✅ Chat conversation created: ${result.insertedId}`);
    
    return {
      insertedId: result.insertedId.toString(),
      conversation_id: result.insertedId.toString()
    };
  } catch (error) {
    console.error('❌ Error creating conversation:', error);
    throw error;
  }
}

/**
 * Add a message to a conversation
 */
export async function addMessage(conversationId, senderType, message) {
  try {
    const db = await initializeChatDatabase();
    const messagesCollection = db.collection('chat_messages');
    const conversationsCollection = db.collection('chat_conversations');

    // Create message document
    const messageDoc = {
      conversation_id: new ObjectId(conversationId),
      sender_type: senderType, // 'visitor', 'admin', 'ai'
      message: message,
      is_read: false,
      created_at: new Date()
    };

    // Insert message
    const messageResult = await messagesCollection.insertOne(messageDoc);

    // Update conversation last_message_at
    await conversationsCollection.updateOne(
      { _id: new ObjectId(conversationId) },
      { 
        $set: { 
          last_message_at: new Date(),
          updated_at: new Date()
        } 
      }
    );

    console.log(`✅ Chat message added: ${messageResult.insertedId}`);
    return messageResult.insertedId.toString();
  } catch (error) {
    console.error('❌ Error adding message:', error);
    throw error;
  }
}

/**
 * Get all conversations with message counts
 */
export async function getConversations() {
  try {
    const db = await initializeChatDatabase();
    const collection = db.collection('chat_conversations');

    const conversations = await collection.aggregate([
      {
        $lookup: {
          from: 'chat_messages',
          localField: '_id',
          foreignField: 'conversation_id',
          as: 'messages'
        }
      },
      {
        $addFields: {
          id: { $toString: '$_id' },
          message_count: { $size: '$messages' },
          last_activity: {
            $ifNull: [
              { $max: '$messages.created_at' },
              '$created_at'
            ]
          }
        }
      },
      {
        $project: {
          _id: 0,
          id: 1,
          session_id: 1,
          visitor_name: 1,
          visitor_email: 1,
          status: 1,
          last_message_at: 1,
          created_at: 1,
          message_count: 1,
          last_activity: 1
        }
      },
      {
        $sort: { last_message_at: -1 }
      }
    ]).toArray();

    console.log(`✅ Retrieved ${conversations.length} chat conversations`);
    return conversations;
  } catch (error) {
    console.error('❌ Error getting conversations:', error);
    throw error;
  }
}

/**
 * Get messages for a specific conversation
 */
export async function getMessages(conversationId) {
  try {
    const db = await initializeChatDatabase();
    const collection = db.collection('chat_messages');

    const messages = await collection.find({
      conversation_id: new ObjectId(conversationId)
    })
    .sort({ created_at: 1 })
    .toArray();

    // Convert to expected format
    const formattedMessages = messages.map(msg => ({
      id: msg._id.toString(),
      sender_type: msg.sender_type,
      message: msg.message,
      is_read: msg.is_read,
      created_at: msg.created_at
    }));

    console.log(`✅ Retrieved ${formattedMessages.length} messages for conversation ${conversationId}`);
    return formattedMessages;
  } catch (error) {
    console.error('❌ Error getting messages:', error);
    throw error;
  }
}

/**
 * Update conversation status
 */
export async function updateConversationStatus(conversationId, status) {
  try {
    const db = await initializeChatDatabase();
    const collection = db.collection('chat_conversations');

    await collection.updateOne(
      { _id: new ObjectId(conversationId) },
      { 
        $set: { 
          status: status,
          updated_at: new Date()
        } 
      }
    );

    console.log(`✅ Conversation ${conversationId} status updated to ${status}`);
  } catch (error) {
    console.error('❌ Error updating conversation status:', error);
    throw error;
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(conversationId) {
  try {
    const db = await initializeChatDatabase();
    const collection = db.collection('chat_messages');

    const result = await collection.updateMany(
      { 
        conversation_id: new ObjectId(conversationId),
        is_read: false
      },
      { 
        $set: { is_read: true } 
      }
    );

    console.log(`✅ Marked ${result.modifiedCount} messages as read in conversation ${conversationId}`);
    return result.modifiedCount;
  } catch (error) {
    console.error('❌ Error marking messages as read:', error);
    throw error;
  }
}

/**
 * Get chat statistics
 */
export async function getChatStats() {
  try {
    const db = await initializeChatDatabase();
    const conversationsCollection = db.collection('chat_conversations');
    const messagesCollection = db.collection('chat_messages');

    const [totalConversations, activeConversations, totalMessages, unreadMessages] = await Promise.all([
      conversationsCollection.countDocuments(),
      conversationsCollection.countDocuments({ status: 'active' }),
      messagesCollection.countDocuments(),
      messagesCollection.countDocuments({ is_read: false })
    ]);

    const stats = {
      total_conversations: totalConversations,
      active_conversations: activeConversations,
      total_messages: totalMessages,
      unread_messages: unreadMessages
    };

    console.log('✅ Chat stats retrieved:', stats);
    return stats;
  } catch (error) {
    console.error('❌ Error getting chat stats:', error);
    throw error;
  }
}

/**
 * Close database connection
 */
export async function closeChatDatabase() {
  try {
    if (client) {
      await client.close();
      client = null;
      db = null;
      console.log('✅ Chat MongoDB connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing chat database:', error);
  }
}

