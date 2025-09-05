// Database connection test endpoint
export async function GET() {
  try {
    console.log('🔧 DB Test: Starting database connection test...');
    
    // Check environment variables
    console.log('🔧 DB Test: Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      DB_DRIVER: process.env.DB_DRIVER,
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_USER: process.env.DB_USER,
      DB_NAME: process.env.DB_NAME
    });
    
    const { initializeDatabase, executeQuery, closeDatabase } = await import('../../utils/database.js');
    
    // Initialize database connection
    console.log('🔧 DB Test: Initializing database...');
    await initializeDatabase();
    console.log('🔧 DB Test: Database initialized successfully');
    
    // Test database connection with a simple query
    console.log('🔧 DB Test: Testing database connection...');
    const testQuery = await executeQuery('SELECT 1 as test, NOW() as timestamp');
    console.log('🔧 DB Test: Database connection test successful:', testQuery);
    
    // Test if categories table exists
    console.log('🔧 DB Test: Checking if categories table exists...');
    const tableCheck = await executeQuery(`
      SELECT TABLE_NAME, TABLE_ROWS 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'categories'
    `, [process.env.DB_NAME]);
    console.log('🔧 DB Test: Categories table check:', tableCheck);
    
    // Close database connection
    console.log('🔧 DB Test: Closing database connection...');
    await closeDatabase();
    console.log('🔧 DB Test: Database connection closed successfully');
    
    return new Response(JSON.stringify({
      success: true,
      status: 'Database connection successful',
      testQuery: testQuery,
      tableCheck: tableCheck,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('❌ DB Test: Error testing database:', error);
    console.error('❌ DB Test: Error stack:', error.stack);
    
    try {
      const { closeDatabase } = await import('../../utils/database.js');
      await closeDatabase();
      console.log('🔧 DB Test: Database connection closed after error');
    } catch (closeError) {
      console.error('❌ DB Test: Error closing database:', closeError);
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Database connection test failed',
      details: error.message,
      stack: error.stack
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}


