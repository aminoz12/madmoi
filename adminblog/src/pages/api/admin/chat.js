import { 
  initializeDatabase, 
  executeQuery, 
  closeDatabase 
} from '../../../utils/database.js';

// GET /api/admin/chat - Get chat data for admin panel
export async function GET({ request }) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    
    await initializeDatabase();
    
    if (action === 'messages') {
      const conversationId = url.searchParams.get('conversation_id');
      if (!conversationId) {
        await closeDatabase();
        return new Response(JSON.stringify({ 
          error: 'Conversation ID required' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const messages = await executeQuery(`
        SELECT id, sender_type, message, is_read, created_at
        FROM chat_messages 
        WHERE conversation_id = ?
        ORDER BY created_at ASC
      `, [conversationId]);
      
      await closeDatabase();
      return new Response(JSON.stringify(messages), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'conversations') {
      const conversations = await executeQuery(`
        SELECT 
          c.id, c.session_id, c.visitor_name, c.visitor_email, c.status, 
          c.last_message_at, c.created_at,
          COUNT(m.id) as message_count,
          MAX(m.created_at) as last_activity
        FROM chat_conversations c
        LEFT JOIN chat_messages m ON c.id = m.conversation_id
        GROUP BY c.id
        ORDER BY c.last_message_at DESC
      `);
      
      await closeDatabase();
      return new Response(JSON.stringify(conversations), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'stats') {
      const stats = await executeQuery(`
        SELECT 
          COUNT(DISTINCT c.id) as total_conversations,
          COUNT(DISTINCT m.id) as total_messages,
          COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_conversations
        FROM chat_conversations c
        LEFT JOIN chat_messages m ON c.id = m.conversation_id
      `);
      
      await closeDatabase();
      return new Response(JSON.stringify(stats[0] || {}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'status') {
      const status = await executeQuery('SELECT available FROM admin_status WHERE id = 1');
      const available = status.length > 0 ? status[0].available === 1 : false;
      
      await closeDatabase();
      return new Response(JSON.stringify({ available }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    await closeDatabase();
    return new Response(JSON.stringify({ 
      error: 'Invalid action' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error in admin chat API GET:', error);
    
    try {
      await closeDatabase();
    } catch (closeError) {
      console.error('Error closing database:', closeError);
    }
    
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch chat data' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST /api/admin/chat - Admin actions
export async function POST({ request }) {
  try {
    const body = await request.json();
    const { action, conversation_id, message, admin_name } = body;
    
    await initializeDatabase();
    
    if (action === 'send_message') {
      if (!conversation_id || !message || !admin_name) {
        await closeDatabase();
        return new Response(JSON.stringify({ 
          error: 'conversation_id, message, and admin_name are required' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Add admin message to conversation
      await executeQuery(`
        INSERT INTO chat_messages (conversation_id, sender_type, message)
        VALUES (?, 'admin', ?)
      `, [conversation_id, message]);
      
      // Update conversation last message time
      await executeQuery(`
        UPDATE chat_conversations 
        SET last_message_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [conversation_id]);
      
      await closeDatabase();
      
      return new Response(JSON.stringify({
        success: true,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'availability') {
      const { available } = body;
      if (typeof available !== 'boolean') {
        await closeDatabase();
        return new Response(JSON.stringify({ 
          error: 'available must be a boolean' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      await executeQuery(`
        UPDATE admin_status 
        SET available = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = 1
      `, [available ? 1 : 0]);
      
      await closeDatabase();
      
      return new Response(JSON.stringify({
        success: true,
        available,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'close_conversation') {
      if (!conversation_id) {
        await closeDatabase();
        return new Response(JSON.stringify({ 
          error: 'conversation_id is required' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      await executeQuery(`
        UPDATE chat_conversations 
        SET status = 'closed', updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [conversation_id]);
      
      await closeDatabase();
      
      return new Response(JSON.stringify({
        success: true,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    await closeDatabase();
    return new Response(JSON.stringify({ 
      error: 'Invalid action' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error in admin chat API POST:', error);
    
    try {
      await closeDatabase();
    } catch (closeError) {
      console.error('Error closing database:', closeError);
    }
    
    return new Response(JSON.stringify({ 
      error: 'Failed to process admin request' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
