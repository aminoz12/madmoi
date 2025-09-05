import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Verify webhook token
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.BLOG_REBUILD_TOKEN || 'your-secret-token';
    
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== expectedToken) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Parse webhook payload
    const payload = await request.json();
    const { action, articleId, slug, timestamp } = payload;
    
    console.log(`🔄 Webhook received: ${action} for article ${articleId} (${slug})`);
    
    // Handle different actions
    switch (action) {
      case 'create':
      case 'update':
        await handleArticleUpdate(articleId, slug);
        break;
        
      case 'delete':
        await handleArticleDelete(articleId, slug);
        break;
        
      default:
        console.warn(`⚠️ Unknown action: ${action}`);
    }
    
    // In a real implementation, you would:
    // 1. Trigger a rebuild of your static site
    // 2. Update any caches
    // 3. Notify CDN to refresh content
    
    console.log('✅ Webhook processed successfully');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Webhook processed successfully',
      action,
      articleId,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * Handle article update/create
 */
async function handleArticleUpdate(articleId: number, slug: string) {
  try {
    console.log(`📝 Processing article update: ${slug}`);
    
    // Here you would:
    // 1. Fetch the updated article from the shared database
    // 2. Regenerate the static page for this article
    // 3. Update any related pages (blog index, category pages, etc.)
    // 4. Clear any caches
    
    // For now, we'll just log the action
    // In a real implementation, you would trigger a rebuild here
    console.log(`✅ Article update processed: ${slug}`);
    
    // Trigger rebuild (this could be a call to your build system)
    await triggerRebuild();
    
  } catch (error) {
    console.error(`❌ Error processing article update for ${slug}:`, error);
    throw error;
  }
}

/**
 * Handle article deletion
 */
async function handleArticleDelete(articleId: number, slug: string) {
  try {
    console.log(`🗑️ Processing article deletion: ${slug}`);
    
    // Here you would:
    // 1. Remove the article file from the blog
    // 2. Update any related pages (blog index, category pages, etc.)
    // 3. Clear any caches
    
    // For now, we'll just log the action
    console.log(`✅ Article deletion processed: ${slug}`);
    
    // Trigger rebuild (this could be a call to your build system)
    await triggerRebuild();
    
  } catch (error) {
    console.error(`❌ Error processing article deletion for ${slug}:`, error);
    throw error;
  }
}

/**
 * Trigger a rebuild of the blog
 */
async function triggerRebuild() {
  try {
    console.log('🚀 Triggering blog rebuild...');
    
    // In a real implementation, this would:
    // 1. Call your build system (e.g., Astro build)
    // 2. Deploy the updated site
    // 3. Clear CDN caches
    
    // For development, we'll just log the action
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Development mode: Rebuild would be triggered here');
    } else {
      // In production, you might call a deployment service
      console.log('🚀 Production mode: Deployment rebuild triggered');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error triggering rebuild:', error);
    throw error;
  }
}

// Handle preflight request for CORS
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
};
