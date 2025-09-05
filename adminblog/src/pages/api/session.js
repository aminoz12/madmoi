import { initializeDatabase, executeQuery } from '../../utils/database.js';
import bcrypt from 'bcryptjs';

// Simple in-memory session store (in production, use Redis or database)
const sessions = new Map();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// OPTIONS - Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  });
}

// GET - Get current session
export async function GET({ request }) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    
    if (!sessionId || !sessions.has(sessionId)) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 401,
        headers: corsHeaders
      });
    }
    
    const session = sessions.get(sessionId);
    return new Response(JSON.stringify(session), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('❌ Error getting session:', error);
    return new Response(JSON.stringify({ error: 'Failed to get session' }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// POST - Create new session
export async function POST({ request }) {
  try {
    const body = await request.json();
    const { username, password } = body;
    
    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Username and password are required' }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Verify user against database
    await initializeDatabase();
    const users = await executeQuery('SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1', [username, username]);
    const user = users[0];

    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers: corsHeaders });
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk || user.is_active === false) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers: corsHeaders });
    }

    const sessionId = generateSessionId();
    const session = {
      id: sessionId,
      userId: user.id,
      username: user.username,
      role: user.role,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
    sessions.set(sessionId, session);

    return new Response(JSON.stringify({ 
      success: true, 
      sessionId,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar_url: user.avatar_url
      }
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('❌ Error creating session:', error);
    return new Response(JSON.stringify({ error: 'Failed to create session' }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// DELETE - Destroy session
export async function DELETE({ request }) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    
    if (sessionId && sessions.has(sessionId)) {
      sessions.delete(sessionId);
    }
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('❌ Error destroying session:', error);
    return new Response(JSON.stringify({ error: 'Failed to destroy session' }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Helper function to generate session ID
function generateSessionId() {
  return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// Clean up expired sessions (run periodically)
setInterval(() => {
  const now = new Date();
  for (const [sessionId, session] of sessions.entries()) {
    if (new Date(session.expiresAt) < now) {
      sessions.delete(sessionId);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour
