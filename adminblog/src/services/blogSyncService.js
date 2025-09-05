import { executeQuery, executeTransaction } from '../utils/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Blog Sync Service
 * Handles synchronization between admin panel and blog
 */
export class BlogSyncService {
  
  /**
   * Sync article to blog when created/updated
   */
  static async syncArticleToBlog(articleId) {
    try {
      // Get the article with all related data
      const article = await this.getArticleWithDetails(articleId);
      
      if (!article) {
        console.error(`❌ Article ${articleId} not found for sync`);
        return false;
      }
      
      // If article is published, sync to blog
      if (article.status === 'published') {
        // Create the article file in the blog system
        await this.createArticleFile(article);
        
        // Trigger blog rebuild
        await this.triggerBlogRebuild(article);
        console.log(`✅ Article ${articleId} synced to blog successfully`);
        return true;
      } else {
        console.log(`ℹ️ Article ${articleId} is not published, skipping blog sync`);
        return true;
      }
      
    } catch (error) {
      console.error('❌ Error syncing article to blog:', error);
      return false;
    }
  }
  
  /**
   * Remove article from blog when deleted
   */
  static async removeArticleFromBlog(articleId) {
    try {
      // Get article details before deletion
      const article = await this.getArticleWithDetails(articleId);
      
      if (article) {
        // Remove the article file from the blog system
        await this.removeArticleFile(article);
      }
      
      // Trigger blog rebuild to remove the article
      await this.triggerBlogRebuild({ id: articleId, action: 'delete' });
      console.log(`✅ Article ${articleId} removed from blog successfully`);
      return true;
      
    } catch (error) {
      console.error('❌ Error removing article from blog:', error);
      return false;
    }
  }
  
  /**
   * Create article file in the blog system
   */
  static async createArticleFile(article) {
    try {
      // No need to create static files anymore - articles are served dynamically from database
      console.log(`📝 Article ${article.slug} will be served dynamically from database`);
      return true;
      
    } catch (error) {
      console.error('❌ Error processing article:', error);
      throw error;
    }
  }
  
  /**
   * Remove article file from the blog system
   */
  static async removeArticleFile(article) {
    try {
      // No need to remove static files anymore - articles are served dynamically from database
      console.log(`🗑️ Article ${article.slug} will be removed dynamically from database`);
      return true;
      
    } catch (error) {
      console.error('❌ Error processing article removal:', error);
      throw error;
    }
  }
  
  /**
   * Get article with all related details
   */
  static async getArticleWithDetails(articleId) {
    try {
      const query = `
        SELECT 
          a.*,
          c.name as category_name,
          c.slug as category_slug,
          c.color as category_color,
          u.username as author_name
        FROM articles a
        LEFT JOIN categories c ON a.category_id = c.id
        LEFT JOIN users u ON a.author_id = u.id
        WHERE a.id = ?
      `;
      
      const articles = await executeQuery(query, [articleId]);
      return articles.length > 0 ? articles[0] : null;
      
    } catch (error) {
      console.error('❌ Error getting article details:', error);
      return null;
    }
  }
  
  /**
   * Trigger blog rebuild via webhook
   */
  static async triggerBlogRebuild(article) {
    try {
      // Option 1: Webhook to trigger rebuild
      if (process.env.BLOG_REBUILD_WEBHOOK) {
        await this.callRebuildWebhook(article);
      }
      
      // Option 2: File-based sync (for development)
      else if (process.env.NODE_ENV === 'development') {
        await this.syncToFileSystem(article);
      }
      
      // Option 3: Database notification (for real-time updates)
      else {
        await this.notifyBlogUpdate(article);
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Error triggering blog rebuild:', error);
      return false;
    }
  }
  
  /**
   * Call webhook to trigger blog rebuild
   */
  static async callRebuildWebhook(article) {
    try {
      const response = await fetch(process.env.BLOG_REBUILD_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BLOG_REBUILD_TOKEN || ''}`
        },
        body: JSON.stringify({
          action: article.action || 'update',
          articleId: article.id,
          slug: article.slug,
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }
      
      console.log('✅ Blog rebuild webhook called successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Error calling rebuild webhook:', error);
      throw error;
    }
  }
  
  /**
   * Sync to file system (development mode)
   */
  static async syncToFileSystem(article) {
    try {
      // This creates/updates the actual article files for the blog
      if (article.action === 'delete') {
        await this.removeArticleFile(article);
      } else {
        await this.createArticleFile(article);
      }
      
      console.log('📝 File system sync completed for article:', article.slug);
      return true;
      
    } catch (error) {
      console.error('❌ Error syncing to file system:', error);
      throw error;
    }
  }
  
  /**
   * Notify blog of update via database
   */
  static async notifyBlogUpdate(article) {
    try {
      // Cross-dialect upsert: MySQL uses ON DUPLICATE KEY, SQLite uses INSERT OR IGNORE then UPDATE
      const insertRes = await executeQuery(
        `INSERT IGNORE INTO blog_sync_notifications (article_id, action, slug, status, created_at)
         VALUES (?, ?, ?, 'pending', NOW())`,
        [article.id, article.action || 'update', article.slug]
      );
      // If already existed, perform update
      await executeQuery(
        `UPDATE blog_sync_notifications SET action = ?, status = 'pending', updated_at = NOW() WHERE slug = ?`,
        [article.action || 'update', article.slug]
      );
      
      console.log('✅ Blog update notification created');
      return true;
      
    } catch (error) {
      console.error('❌ Error creating blog notification:', error);
      throw error;
    }
  }
  
  /**
   * Get pending blog sync notifications
   */
  static async getPendingSyncNotifications() {
    try {
      const query = `
        SELECT * FROM blog_sync_notifications 
        WHERE status = 'pending' 
        ORDER BY created_at ASC
      `;
      
      return await executeQuery(query);
      
    } catch (error) {
      console.error('❌ Error getting pending sync notifications:', error);
      return [];
    }
  }
  
  /**
   * Mark sync notification as processed
   */
  static async markSyncNotificationProcessed(notificationId) {
    try {
      const query = `
        UPDATE blog_sync_notifications 
        SET status = 'processed', processed_at = NOW() 
        WHERE id = ?
      `;
      
      await executeQuery(query, [notificationId]);
      return true;
      
    } catch (error) {
      console.error('❌ Error marking notification as processed:', error);
      return false;
    }
  }
  
  /**
   * Bulk sync all published articles
   */
  static async bulkSyncAllArticles() {
    try {
      const query = `
        SELECT id FROM articles 
        WHERE status = 'published'
        ORDER BY updated_at DESC
      `;
      
      const articles = await executeQuery(query);
      let successCount = 0;
      let errorCount = 0;
      
      for (const article of articles) {
        try {
          const success = await this.syncArticleToBlog(article.id);
          if (success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error(`❌ Error syncing article ${article.id}:`, error);
          errorCount++;
        }
      }
      
      console.log(`✅ Bulk sync completed: ${successCount} success, ${errorCount} errors`);
      return { successCount, errorCount };
      
    } catch (error) {
      console.error('❌ Error in bulk sync:', error);
      throw error;
    }
  }
}

export default BlogSyncService;