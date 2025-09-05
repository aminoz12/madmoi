import { initializeDatabase, executeQuery, closeDatabase } from '../../utils/database.js';

// GET - Get chat conversations and messages
export async function GET({ request }) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    
    if (action === 'conversations') {
      // Get all conversations for admin
      const { initializeDatabase, executeQuery, closeDatabase } = await import('../../utils/database.js');
      await initializeDatabase();
      
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
    
    if (action === 'messages') {
      const conversationId = url.searchParams.get('conversation_id');
      if (!conversationId) {
        return new Response(JSON.stringify({ error: 'Conversation ID required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const { initializeDatabase, executeQuery, closeDatabase } = await import('../../utils/database.js');
      await initializeDatabase();
      
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
    
    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error in chat API GET:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch chat data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST - Create new message or conversation
export async function POST({ request }) {
  try {
    const body = await request.json();
    const { action, session_id, message, visitor_name, visitor_email, conversation_id, sender_type } = body;
    
    const { initializeDatabase, executeQuery, closeDatabase } = await import('../../utils/database.js');
    await initializeDatabase();
    
    if (action === 'start_conversation') {
      // Create new conversation
      const result = await executeQuery(`
        INSERT INTO chat_conversations (session_id, visitor_name, visitor_email, status)
        VALUES (?, ?, ?, 'active')
      `, [session_id, visitor_name || null, visitor_email || null]);
      
      const conversationId = result.insertId;
      
      // Add welcome message
      await executeQuery(`
        INSERT INTO chat_messages (conversation_id, sender_type, message)
        VALUES (?, 'ai', 'Bonjour ! Je suis Sarah, votre assistante personnelle. Comment puis-je vous aider aujourd''hui ? 😊')
      `, [conversationId]);
      
      await closeDatabase();
      
      return new Response(JSON.stringify({ 
        conversation_id: conversationId,
        message: 'Conversation started successfully' 
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'send_message') {
      if (!conversation_id || !message || !sender_type) {
        await closeDatabase();
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Add message to conversation
      await executeQuery(`
        INSERT INTO chat_messages (conversation_id, sender_type, message)
        VALUES (?, ?, ?)
      `, [conversation_id, sender_type, message]);
      
      // Update conversation last message time
      await executeQuery(`
        UPDATE chat_conversations 
        SET last_message_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [conversation_id]);
      
      await closeDatabase();
      
      return new Response(JSON.stringify({ 
        message: 'Message sent successfully' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    await closeDatabase();
    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error in chat API POST:', error);
    
    try {
      const { closeDatabase } = await import('../../utils/database.js');
      await closeDatabase();
    } catch (closeError) {
      console.error('Error closing database:', closeError);
    }
    
    return new Response(JSON.stringify({ error: 'Failed to process chat action' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// PUT - Update conversation status or mark messages as read
export async function PUT({ request }) {
  try {
    const body = await request.json();
    const { action, conversation_id, status, message_ids } = body;
    
    const { initializeDatabase, executeQuery, closeDatabase } = await import('../../utils/database.js');
    await initializeDatabase();
    
    if (action === 'update_status') {
      await executeQuery(`
        UPDATE chat_conversations 
        SET status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [status, conversation_id]);
    }
    
    if (action === 'mark_read') {
      if (message_ids && message_ids.length > 0) {
        const placeholders = message_ids.map(() => '?').join(',');
        await executeQuery(`
          UPDATE chat_messages 
          SET is_read = 1 
          WHERE id IN (${placeholders})
        `, message_ids);
      }
    }
    
    await closeDatabase();
    
    return new Response(JSON.stringify({ 
      message: 'Updated successfully' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error in chat API PUT:', error);
    
    try {
      const { closeDatabase } = await import('../../utils/database.js');
      await closeDatabase();
    } catch (closeError) {
      console.error('Error closing database:', closeError);
    }
    
    return new Response(JSON.stringify({ error: 'Failed to update chat' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}






