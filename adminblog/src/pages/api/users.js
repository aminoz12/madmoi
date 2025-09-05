import bcrypt from 'bcryptjs';

// Helper function to hash passwords
function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

// Helper function to verify passwords
function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

// GET - Get all users
export async function GET() {
  try {
    console.log('📊 Users API: Fetching users from database...');
    
    const { initializeDatabase, executeQuery, closeDatabase } = await import('../../utils/database.js');
    
    // Initialize database connection
    await initializeDatabase();
    
    const rows = await executeQuery(`
      SELECT id, username, email, role, first_name, last_name, avatar_url, is_active, last_login, created_at, updated_at
      FROM users 
      ORDER BY created_at DESC
    `);
    
    console.log(`✅ Users API: Retrieved ${rows.length} users from database`);
    
    // Close database connection
    await closeDatabase();
    
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Error in users API:', error);
    
    try {
      const { closeDatabase } = await import('../../utils/database.js');
      await closeDatabase();
    } catch (closeError) {
      console.error('Error closing database:', closeError);
    }
    
    return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

// PUT - Update user
export async function PUT({ request }) {
  try {
    console.log('📊 Users API: Updating user...');
    
    const body = await request.json();
    const { id, username, email, password, role, first_name, last_name, is_active } = body;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { initializeDatabase, executeQuery, closeDatabase } = await import('../../utils/database.js');
    
    // Initialize database connection
    await initializeDatabase();
    
    // Check if username or email already exists for other users
    const existingUsers = await executeQuery(
      'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
      [username, email, id]
    );
    
    if (existingUsers.length > 0) {
      await closeDatabase();
      return new Response(JSON.stringify({ error: 'Username or email already exists' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    let updateQuery = `
      UPDATE users 
      SET username = ?, email = ?, role = ?, first_name = ?, last_name = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
    `;
    let params = [username, email, role, first_name || null, last_name || null, is_active];
    
    // Add password update if provided
    if (password) {
      updateQuery = updateQuery.replace('SET', 'SET password_hash = ?,');
      params.splice(2, 0, hashPassword(password));
    }
    
    updateQuery += ' WHERE id = ?';
    params.push(id);
    
    await executeQuery(updateQuery, params);
    
    console.log(`✅ Users API: User ${id} updated successfully`);
    
    // Return updated user
    const updatedUser = await executeQuery(
      'SELECT id, username, email, role, first_name, last_name, is_active, updated_at FROM users WHERE id = ?',
      [id]
    );
    
    // Close database connection
    await closeDatabase();
    
    return new Response(JSON.stringify(updatedUser[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error updating user:', error);
    
    try {
      const { closeDatabase } = await import('../../utils/database.js');
      await closeDatabase();
    } catch (closeError) {
      console.error('Error closing database:', closeError);
    }
    
    return new Response(JSON.stringify({ error: 'Failed to update user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// DELETE - Delete user
export async function DELETE({ request }) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`📊 Users API: Deleting user ${id}...`);
    
    const { initializeDatabase, executeQuery, closeDatabase } = await import('../../utils/database.js');
    
    // Initialize database connection
    await initializeDatabase();
    
    // Check if user exists and is not the last admin
    const user = await executeQuery('SELECT role FROM users WHERE id = ?', [id]);
    if (user.length === 0) {
      await closeDatabase();
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Prevent deletion of the last admin
    if (user[0].role === 'admin') {
      const adminCount = await executeQuery('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
      if (adminCount[0].count <= 1) {
        await closeDatabase();
        return new Response(JSON.stringify({ error: 'Cannot delete the last admin user' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    await executeQuery('DELETE FROM users WHERE id = ?', [id]);
    
    console.log(`✅ Users API: User ${id} deleted successfully`);
    
    // Close database connection
    await closeDatabase();
    
    return new Response(JSON.stringify({ message: 'User deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    
    try {
      const { closeDatabase } = await import('../../utils/database.js');
      await closeDatabase();
    } catch (closeError) {
      console.error('Error closing database:', closeError);
    }
    
    return new Response(JSON.stringify({ error: 'Failed to delete user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST - Create new user
export async function POST({ request }) {
  try {
    console.log('📊 Users API: Creating new user...');
    
    const body = await request.json();
    const { username, email, password, role, first_name, last_name } = body;
    
    // Validate required fields
    if (!username || !email || !password || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { initializeDatabase, executeQuery, closeDatabase } = await import('../../utils/database.js');
    
    // Initialize database connection
    await initializeDatabase();
    
    // Check if username or email already exists
    const existingUsers = await executeQuery(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    
    if (existingUsers.length > 0) {
      await closeDatabase();
      return new Response(JSON.stringify({ error: 'Username or email already exists' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Hash password and create user
    const password_hash = hashPassword(password);
    
    const result = await executeQuery(`
      INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_active)
      VALUES (?, ?, ?, ?, ?, ?, TRUE)
    `, [username, email, password_hash, role, first_name || null, last_name || null]);
    
    console.log(`✅ Users API: User created successfully with ID ${result.insertId}`);
    
    // Return the created user (without password)
    const newUser = await executeQuery(
      'SELECT id, username, email, role, first_name, last_name, is_active, created_at FROM users WHERE id = ?',
      [result.insertId]
    );
    
    // Close database connection
    await closeDatabase();
    
    return new Response(JSON.stringify(newUser[0]), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error creating user:', error);
    
    try {
      const { closeDatabase } = await import('../../utils/database.js');
      await closeDatabase();
    } catch (closeError) {
      console.error('Error closing database:', closeError);
    }
    
    return new Response(JSON.stringify({ error: 'Failed to create user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
