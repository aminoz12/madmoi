import type { APIRoute } from 'astro';

// Simple authentication middleware
// In a production environment, you would use a proper authentication system
// like Auth0, Firebase Auth, or a custom JWT implementation

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt: Date;
  lastLogin?: Date;
}

// Mock user database (in production, use a real database)
const users: User[] = [
  {
    id: '1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    createdAt: new Date('2024-01-01'),
    lastLogin: new Date()
  }
];

// Simple session storage (in production, use Redis or a proper session store)
const sessions = new Map<string, { userId: string; expiresAt: Date }>();

export function generateSessionToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function createSession(userId: string): string {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  sessions.set(token, { userId, expiresAt });
  return token;
}

export function validateSession(token: string): User | null {
  const session = sessions.get(token);
  
  if (!session) {
    return null;
  }
  
  if (session.expiresAt < new Date()) {
    sessions.delete(token);
    return null;
  }
  
  const user = users.find(u => u.id === session.userId);
  return user || null;
}

export function destroySession(token: string): void {
  sessions.delete(token);
}

export function authenticateUser(email: string, password: string): User | null {
  // In production, hash and compare passwords properly
  // This is just for demonstration
  if (email === 'admin@example.com' && password === 'admin123') {
    const user = users.find(u => u.email === email);
    if (user) {
      user.lastLogin = new Date();
      return user;
    }
  }
  return null;
}

export function requireAuth(request: Request): User | null {
  const cookies = request.headers.get('cookie');
  if (!cookies) return null;
  
  const sessionToken = cookies
    .split(';')
    .find(c => c.trim().startsWith('session='))
    ?.split('=')[1];
    
  if (!sessionToken) return null;
  
  return validateSession(sessionToken);
}

export function requireAdminAuth(request: Request): User | null {
  const user = requireAuth(request);
  if (!user || user.role !== 'admin') {
    return null;
  }
  return user;
}

// Utility function to check if user has permission
export function hasPermission(user: User, action: string): boolean {
  switch (user.role) {
    case 'admin':
      return true; // Admin can do everything
    case 'editor':
      return ['read', 'write', 'edit'].includes(action);
    case 'viewer':
      return action === 'read';
    default:
      return false;
  }
}

// API route helpers
export const loginAPI: APIRoute = async ({ request }) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const { email, password } = await request.json();
    const user = authenticateUser(email, password);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const sessionToken = createSession(user.id);
    
    return new Response(JSON.stringify({ 
      success: true, 
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `session=${sessionToken}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const logoutAPI: APIRoute = async ({ request }) => {
  const cookies = request.headers.get('cookie');
  const sessionToken = cookies
    ?.split(';')
    .find(c => c.trim().startsWith('session='))
    ?.split('=')[1];
    
  if (sessionToken) {
    destroySession(sessionToken);
  }
  
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'session=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict'
    }
  });
};

