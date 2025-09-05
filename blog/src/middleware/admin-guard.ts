import { defineMiddleware } from 'astro:middleware';
import { requireAuth, requireAdminAuth } from './auth';

export const adminGuard = defineMiddleware(async (context, next) => {
  const { url, request, redirect } = context;
  
  // Check if this is an admin route
  if (url.pathname.startsWith('/admin')) {
    // Allow login page without authentication
    if (url.pathname === '/admin/login') {
      return next();
    }
    
    // Check authentication for all other admin routes
    const user = requireAuth(request);
    
    if (!user) {
      // Redirect to login if not authenticated
      return redirect('/admin/login');
    }
    
    // Check if user has admin privileges for admin routes
    if (url.pathname.startsWith('/admin') && user.role !== 'admin') {
      // Redirect to unauthorized page or main site
      return redirect('/?error=unauthorized');
    }
    
    // Add user to locals for use in pages
    context.locals.user = user;
  }
  
  return next();
});

// Utility function to protect API routes
export function protectAdminAPI(handler: Function) {
  return async (context: any) => {
    const user = requireAdminAuth(context.request);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Add user to context
    context.locals = { ...context.locals, user };
    
    return handler(context);
  };
}

// Utility function to protect regular API routes (any authenticated user)
export function protectAPI(handler: Function) {
  return async (context: any) => {
    const user = requireAuth(context.request);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Add user to context
    context.locals = { ...context.locals, user };
    
    return handler(context);
  };
}

export default adminGuard;

