import { initializeDatabaseFactory, executeQueryFactory } from '../../utils/databaseFactory.js';
import { getMongoDB } from '../../utils/mongodb.js';

// GET - Get real dashboard statistics from database
export async function GET({ request }) {
  try {
    // Initialize database connection
    const { isMongoDB, db } = await initializeDatabaseFactory();
    
    let stats = {
      totalViews: 0,
      published: 0,
      drafts: 0,
      archived: 0,
      total: 0,
      totalComments: 0,
      totalLikes: 0
    };
    
    if (isMongoDB) {
      // MongoDB approach - direct collection queries
      const articlesCollection = db.collection('articles');
      
      // Get all articles except deleted ones
      const articles = await articlesCollection.find({ 
        status: { $ne: 'deleted' } 
      }).toArray();
      
      console.log('📊 MongoDB articles found:', articles.length);
      
      // Calculate stats
      stats.total = articles.length;
      stats.totalViews = articles.reduce((sum, article) => sum + (article.view_count || 0), 0);
      
      // Count by status
      articles.forEach(article => {
        switch(article.status) {
          case 'published':
            stats.published++;
            break;
          case 'draft':
            stats.drafts++;
            break;
          case 'archived':
            stats.archived++;
            break;
        }
      });
      
    } else {
      // SQLite approach - use SQL queries
      try {
        // Get total views from all articles
        const totalViewsQuery = `
          SELECT COALESCE(SUM(view_count), 0) as total_views
          FROM articles 
          WHERE status != 'deleted'
        `;
        const totalViewsResult = await executeQueryFactory(totalViewsQuery);
        stats.totalViews = totalViewsResult[0]?.total_views || 0;
        
        // Get articles count by status
        const articlesStatsQuery = `
          SELECT 
            status,
            COUNT(*) as count
          FROM articles 
          WHERE status != 'deleted'
          GROUP BY status
        `;
        const articlesStatsResult = await executeQueryFactory(articlesStatsQuery);
        
        // Process article stats
        articlesStatsResult.forEach(row => {
          const count = parseInt(row.count || 0);
          stats.total += count;
          switch(row.status) {
            case 'published':
              stats.published = count;
              break;
            case 'draft':
              stats.drafts = count;
              break;
            case 'archived':
              stats.archived = count;
              break;
          }
        });
      } catch (sqlError) {
        console.error('❌ SQL query error:', sqlError);
        // Return zeros if database queries fail
      }
    }
    
    console.log('📊 Dashboard stats calculated:', stats);
    
    return new Response(JSON.stringify({
      success: true,
      stats: stats
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    console.error('❌ Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Failed to fetch dashboard statistics',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
