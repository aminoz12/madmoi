// Chat API Proxy for Blog - Forwards requests to admin panel
export async function GET({ request }) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    
    // Forward request to MongoDB admin chat API
    let adminUrl;
    if (action === 'messages') {
      // For getting messages, use the MongoDB admin chat API
      const conversationId = url.searchParams.get('conversation_id');
      adminUrl = `http://localhost:4322/api/admin/mongo-chat?action=messages&conversation_id=${conversationId}`;
    } else if (action === 'conversations') {
      // For getting conversations, use the MongoDB admin chat API
      adminUrl = `http://localhost:4322/api/admin/mongo-chat?action=conversations`;
    } else {
      // For ALL other actions, use the MongoDB admin chat API
      adminUrl = `http://localhost:4322/api/admin/mongo-chat?action=${action}`;
    }
    
    const response = await fetch(adminUrl);
    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
    
  } catch (error) {
    console.error('❌ Error in blog chat API GET:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch chat data' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }
}

export async function POST({ request }) {
  try {
    // Check if request has a body
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    // Get the request body
    const body = await request.json();
    
    // Validate required fields
    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    if (!body.action) {
      return new Response(JSON.stringify({ error: 'Action is required' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    // Forward request to appropriate MongoDB chat API based on action
    let adminUrl;
    if (body.action === 'start_conversation' || body.action === 'send_message') {
      // Visitor actions go to MongoDB chat API
      adminUrl = 'http://localhost:4322/api/mongo-chat';
    } else {
      // Admin actions go to MongoDB admin chat API  
      adminUrl = 'http://localhost:4322/api/admin/mongo-chat';
    }
    
    const response = await fetch(adminUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Admin panel error:', response.status, errorText);
      return new Response(JSON.stringify({ 
        error: 'Admin panel error', 
        details: errorText,
        status: response.status 
      }), {
        status: response.status,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
    
  } catch (error) {
    console.error('❌ Error in blog chat API POST:', error);
    
    // Check if it's a JSON parsing error
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body',
        details: error.message 
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }
    
    return new Response(JSON.stringify({ 
      error: 'Failed to process chat action',
      details: error.message 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}
