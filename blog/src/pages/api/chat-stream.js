// Chat Stream API Proxy for Blog - Forwards SSE requests to admin panel
export async function GET({ request }) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');
    const conversationId = url.searchParams.get('conversation_id');
    
    if (!sessionId && !conversationId) {
      return new Response(JSON.stringify({ error: 'Session ID or Conversation ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Forward request to admin panel
    const adminUrl = `http://localhost:4322/api/chat-stream?`;
    if (sessionId) adminUrl += `session_id=${sessionId}`;
    if (conversationId) adminUrl += `conversation_id=${conversationId}`;
    
    const response = await fetch(adminUrl);
    
    if (!response.ok) {
      throw new Error(`Admin panel responded with ${response.status}`);
    }
    
    // Return the SSE stream from admin panel
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    });
    
  } catch (error) {
    console.error('❌ Error in blog chat stream API:', error);
    return new Response(JSON.stringify({ error: 'Failed to establish chat stream' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}






