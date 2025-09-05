import type { APIRoute } from 'astro';
import { initializeDatabase, getCategories } from '../../utils/database.js';

// Prefer database-backed categories to stay in sync with admin
export const GET: APIRoute = async () => {
  try {
    await initializeDatabase();
    const categories = await getCategories();
    return new Response(JSON.stringify({
      success: true,
      data: categories,
      total: categories.length,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: 'Failed to fetch categories' }), { status: 500 });
  }
};
