// MongoDB Admin Chat API - Admin-specific chat operations
import { 
  initializeChatDatabase,
  addMessage,
  getConversations,
  getMessages,
  updateConversationStatus,
  markMessagesAsRead,
  getChatStats
} from '../../../utils/mongoChatDatabase.js';

// GET /api/admin/mongo-chat - Get chat data for admin panel (MongoDB)
export async function GET({ request }) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    
    await initializeChatDatabase();
    
    if (action === 'conversations') {
      const conversations = await getConversations();
      return new Response(JSON.stringify(conversations), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'messages') {
      const conversationId = url.searchParams.get('conversation_id');
      if (!conversationId) {
        return new Response(JSON.stringify({ 
          error: 'Conversation ID required' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const messages = await getMessages(conversationId);
      return new Response(JSON.stringify(messages), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'stats') {
      const stats = await getChatStats();
      return new Response(JSON.stringify(stats), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'status') {
      // Get admin availability status - you can implement this based on your needs
      const adminStatus = { available: true }; // Placeholder
      return new Response(JSON.stringify(adminStatus), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error in MongoDB admin chat API GET:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch admin chat data',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST /api/admin/mongo-chat - Admin actions (MongoDB)
export async function POST({ request }) {
  try {
    const body = await request.json();
    const { action, conversation_id, message, admin_name, available } = body;
    
    await initializeChatDatabase();
    
    if (action === 'send_message') {
      if (!conversation_id || !message || !admin_name) {
        return new Response(JSON.stringify({ 
          error: 'conversation_id, message, and admin_name are required' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Add admin message to conversation
      const messageId = await addMessage(conversation_id, 'admin', message);
      
      return new Response(JSON.stringify({
        message_id: messageId,
        success: true,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'availability') {
      // Update admin availability - you can implement this with a separate collection if needed
      // For now, just return success
      return new Response(JSON.stringify({
        success: true,
        available: available,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'close_conversation') {
      if (!conversation_id) {
        return new Response(JSON.stringify({ 
          error: 'conversation_id is required' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      await updateConversationStatus(conversation_id, 'closed');
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Conversation closed successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'mark_read') {
      if (!conversation_id) {
        return new Response(JSON.stringify({ 
          error: 'conversation_id is required' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const count = await markMessagesAsRead(conversation_id);
      
      return new Response(JSON.stringify({
        success: true,
        messages_marked: count
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error in MongoDB admin chat API POST:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process admin chat action',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

