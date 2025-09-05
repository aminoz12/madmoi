// MongoDB Chat API - Pure MongoDB implementation for chat system
import { 
  initializeChatDatabase,
  createConversation,
  addMessage,
  getConversations,
  getMessages,
  updateConversationStatus,
  markMessagesAsRead,
  getChatStats
} from '../../utils/mongoChatDatabase.js';

// GET - Get chat conversations and messages (MongoDB)
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
    
    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error in MongoDB chat API GET:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch chat data',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST - Create new message or conversation (MongoDB)
export async function POST({ request }) {
  try {
    const body = await request.json();
    const { action, session_id, message, visitor_name, visitor_email, conversation_id, sender_type } = body;
    
    await initializeChatDatabase();
    
    if (action === 'start_conversation') {
      if (!session_id) {
        return new Response(JSON.stringify({ 
          error: 'Session ID is required' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Create new conversation
      const result = await createConversation(session_id, visitor_name, visitor_email);
      
      // Add welcome message
      await addMessage(
        result.conversation_id,
        'ai',
        'Bonjour ! Je suis Sarah, votre assistante personnelle. Comment puis-je vous aider aujourd\'hui ? 😊'
      );
      
      return new Response(JSON.stringify({ 
        conversation_id: result.conversation_id,
        message: 'Conversation started successfully' 
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'send_message') {
      if (!conversation_id || !message || !sender_type) {
        return new Response(JSON.stringify({ 
          error: 'conversation_id, message, and sender_type are required' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const messageId = await addMessage(conversation_id, sender_type, message);
      
      return new Response(JSON.stringify({ 
        message_id: messageId,
        message: 'Message sent successfully' 
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
    console.error('❌ Error in MongoDB chat API POST:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process chat action',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// PUT - Update conversation or mark messages as read (MongoDB)
export async function PUT({ request }) {
  try {
    const body = await request.json();
    const { action, conversation_id, status } = body;
    
    await initializeChatDatabase();
    
    if (action === 'update_status') {
      if (!conversation_id || !status) {
        return new Response(JSON.stringify({ 
          error: 'conversation_id and status are required' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      await updateConversationStatus(conversation_id, status);
      
      return new Response(JSON.stringify({ 
        message: 'Conversation status updated successfully' 
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
        message: `${count} messages marked as read` 
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
    console.error('❌ Error in MongoDB chat API PUT:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to update chat data',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

