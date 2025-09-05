import { executeQuery, executeTransaction } from '../utils/database.js';

export class SubscriberService {
  
  // Get all subscribers with pagination and filtering
  static async getSubscribers(options = {}) {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      source = '',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;

    try {
      let whereClause = 'WHERE 1=1';
      const params = [];

      // Search filter
      if (search) {
        whereClause += ' AND (name LIKE ? OR email LIKE ? OR location LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // Status filter
      if (status) {
        whereClause += ' AND status = ?';
        params.push(status);
      }

      // Source filter
      if (source) {
        whereClause += ' AND source = ?';
        params.push(source);
      }

      // Count total results
      const countQuery = `SELECT COUNT(*) as total FROM subscribers ${whereClause}`;
      const countResult = await executeQuery(countQuery, params);
      const total = countResult[0].total;

      // Get paginated results
      const offset = (page - 1) * limit;
      const selectQuery = `
        SELECT * FROM subscribers 
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;
      
      const subscribers = await executeQuery(selectQuery, [...params, limit, offset]);

      return {
        subscribers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error getting subscribers:', error);
      throw new Error('Failed to fetch subscribers');
    }
  }

  // Get subscriber by ID
  static async getSubscriberById(id) {
    try {
      const query = 'SELECT * FROM subscribers WHERE id = ?';
      const subscribers = await executeQuery(query, [id]);
      return subscribers[0] || null;
    } catch (error) {
      console.error('Error getting subscriber by ID:', error);
      throw new Error('Failed to fetch subscriber');
    }
  }

  // Create new subscriber
  static async createSubscriber(subscriberData) {
    try {
      const {
        name,
        email,
        location,
        source,
        status = 'actif',
        engagement_score = 50
      } = subscriberData;

      // Check if email already exists
      const existingSubscriber = await executeQuery(
        'SELECT id FROM subscribers WHERE email = ?',
        [email]
      );

      if (existingSubscriber.length > 0) {
        throw new Error('Email already exists');
      }

      const query = `
        INSERT INTO subscribers (name, email, location, source, status, engagement_score)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const result = await executeQuery(query, [
        name, email, location, source, status, engagement_score
      ]);

      return {
        id: result.insertId,
        ...subscriberData,
        created_at: new Date()
      };
    } catch (error) {
      console.error('Error creating subscriber:', error);
      throw error;
    }
  }

  // Update subscriber
  static async updateSubscriber(id, updateData) {
    try {
      const allowedFields = ['name', 'email', 'location', 'source', 'status', 'engagement_score'];
      const updates = [];
      const params = [];

      // Build update query dynamically
      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updates.push(`${key} = ?`);
          params.push(value);
        }
      }

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Check if email is being updated and if it already exists
      if (updateData.email) {
        const existingSubscriber = await executeQuery(
          'SELECT id FROM subscribers WHERE email = ? AND id != ?',
          [updateData.email, id]
        );

        if (existingSubscriber.length > 0) {
          throw new Error('Email already exists');
        }
      }

      params.push(id);
      const query = `
        UPDATE subscribers 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      const result = await executeQuery(query, params);

      if (result.affectedRows === 0) {
        throw new Error('Subscriber not found');
      }

      return await this.getSubscriberById(id);
    } catch (error) {
      console.error('Error updating subscriber:', error);
      throw error;
    }
  }

  // Delete subscriber
  static async deleteSubscriber(id) {
    try {
      const query = 'DELETE FROM subscribers WHERE id = ?';
      const result = await executeQuery(query, [id]);

      if (result.affectedRows === 0) {
        throw new Error('Subscriber not found');
      }

      return { success: true, message: 'Subscriber deleted successfully' };
    } catch (error) {
      console.error('Error deleting subscriber:', error);
      throw error;
    }
  }

  // Bulk delete subscribers
  static async bulkDeleteSubscribers(ids) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error('Invalid subscriber IDs');
      }

      const placeholders = ids.map(() => '?').join(',');
      const query = `DELETE FROM subscribers WHERE id IN (${placeholders})`;
      
      const result = await executeQuery(query, ids);

      return {
        success: true,
        deletedCount: result.affectedRows,
        message: `${result.affectedRows} subscribers deleted successfully`
      };
    } catch (error) {
      console.error('Error bulk deleting subscribers:', error);
      throw error;
    }
  }

  // Get subscriber statistics
  static async getSubscriberStats() {
    try {
      const stats = {};

      // Total subscribers
      const totalResult = await executeQuery('SELECT COUNT(*) as total FROM subscribers');
      stats.total = totalResult[0].total;

      // Active subscribers
      const activeResult = await executeQuery(
        'SELECT COUNT(*) as count FROM subscribers WHERE status = "actif"'
      );
      stats.active = activeResult[0].count;

      // Inactive subscribers
      const inactiveResult = await executeQuery(
        'SELECT COUNT(*) as count FROM subscribers WHERE status = "inactif"'
      );
      stats.inactive = inactiveResult[0].count;

      // Unsubscribed subscribers
      const unsubscribedResult = await executeQuery(
        'SELECT COUNT(*) as count FROM subscribers WHERE status = "desabonne"'
      );
      stats.unsubscribed = unsubscribedResult[0].count;

      // New subscribers this month
      const thisMonthResult = await executeQuery(`
        SELECT COUNT(*) as count 
        FROM subscribers 
        WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) 
        AND YEAR(created_at) = YEAR(CURRENT_DATE())
      `);
      stats.newThisMonth = thisMonthResult[0].count;

      // New subscribers last month
      const lastMonthResult = await executeQuery(`
        SELECT COUNT(*) as count 
        FROM subscribers 
        WHERE MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)) 
        AND YEAR(created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
      `);
      stats.newLastMonth = lastMonthResult[0].count;

      // Calculate growth
      stats.growth = stats.newThisMonth - stats.newLastMonth;
      stats.growthPercentage = stats.newLastMonth > 0 
        ? ((stats.growth / stats.newLastMonth) * 100).toFixed(1)
        : 0;

      // Active percentage
      stats.activePercentage = stats.total > 0 
        ? ((stats.active / stats.total) * 100).toFixed(1)
        : 0;

      // Source distribution
      const sourceResult = await executeQuery(`
        SELECT source, COUNT(*) as count 
        FROM subscribers 
        GROUP BY source
      `);
      stats.sourceDistribution = sourceResult;

      return stats;
    } catch (error) {
      console.error('Error getting subscriber stats:', error);
      throw new Error('Failed to fetch subscriber statistics');
    }
  }

  // Import subscribers from CSV
  static async importSubscribers(csvData) {
    try {
      const queries = [];
      let importedCount = 0;

      for (const row of csvData) {
        if (row.name && row.email) {
          // Check if email already exists
          const existingSubscriber = await executeQuery(
            'SELECT id FROM subscribers WHERE email = ?',
            [row.email]
          );

          if (existingSubscriber.length === 0) {
            queries.push({
              query: `
                INSERT INTO subscribers (name, email, location, source, status, engagement_score)
                VALUES (?, ?, ?, ?, ?, ?)
              `,
              params: [
                row.name,
                row.email,
                row.location || '',
                row.source || 'site_web',
                row.status || 'actif',
                row.engagement_score || 50
              ]
            });
            importedCount++;
          }
        }
      }

      if (queries.length > 0) {
        await executeTransaction(queries);
      }

      return {
        success: true,
        importedCount,
        message: `${importedCount} subscribers imported successfully`
      };
    } catch (error) {
      console.error('Error importing subscribers:', error);
      throw new Error('Failed to import subscribers');
    }
  }

  // Export subscribers to CSV format
  static async exportSubscribers(options = {}) {
    try {
      const { subscribers } = await this.getSubscribers({
        ...options,
        limit: 10000 // Export all subscribers
      });

      return subscribers.map(subscriber => ({
        name: subscriber.name,
        email: subscriber.email,
        location: subscriber.location,
        source: subscriber.source,
        status: subscriber.status,
        engagement_score: subscriber.engagement_score,
        created_at: subscriber.created_at
      }));
    } catch (error) {
      console.error('Error exporting subscribers:', error);
      throw new Error('Failed to export subscribers');
    }
  }
}

