import { chatWebSocketService } from '../../services/chatWebSocket.js';
import { 
  getChatDatabase, 
  createUser, 
  getUserBySessionId, 
  getMessagesByUserId,
  getActiveConversations,
  getChatStats
} from '../../utils/chatDatabase.js';

// WebSocket upgrade handler
export async function GET({ request, response }) {
  // This will be handled by the WebSocket server
  return new Response('WebSocket endpoint', { status: 200 });
}

// POST /api/chat/send - Send message from user
export async function POST({ request }) {
  try {
    const body = await request.json();
    const { user_id, message, attachment, session_id, name, email } = body;

    if (!message || !session_id) {
      return new Response(JSON.stringify({ 
        error: 'Message and session_id are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get or create user
    let user = await getUserBySessionId(session_id);
    if (!user) {
      const userId = await createUser(name || 'Anonymous', email, session_id);
      user = await getUserBySessionId(session_id);
    }

    // Save message to database
    const { saveMessage } = await import('../../utils/chatDatabase.js');
    const messageId = await saveMessage(
      user.id,
      message,
      'user',
      0,
      attachment ? 1 : 0,
      attachment?.url || null,
      attachment?.type || null
    );

    // Check admin availability
    const { getAdminStatus } = await import('../../utils/chatDatabase.js');
    const adminAvailable = await getAdminStatus();

    if (adminAvailable) {
      // Admin is available - message will be handled by WebSocket
      // The WebSocket service will notify admins and wait for approval
    } else {
      // Admin not available - generate auto GPT response
      const { generateAutoGPTResponse } = await import('../../services/chatWebSocket.js');
      await chatWebSocketService.generateAutoGPTResponse(user.id, message, session_id);
    }

    return new Response(JSON.stringify({
      success: true,
      messageId,
      adminAvailable,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in chat send API:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to send message' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// PUT /api/chat/send - Update message (for admin responses)
export async function PUT({ request }) {
  try {
    const body = await request.json();
    const { action, user_id, message, session_id, admin_name } = body;

    if (action === 'admin_send') {
      if (!user_id || !message || !session_id || !admin_name) {
        return new Response(JSON.stringify({ 
          error: 'user_id, message, session_id, and admin_name are required' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Send admin message via WebSocket service
      const messageId = await chatWebSocketService.sendAdminMessage(
        user_id, 
        message, 
        session_id, 
        admin_name
      );

      return new Response(JSON.stringify({
        success: true,
        messageId,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      error: 'Invalid action' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in chat update API:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process request' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}






