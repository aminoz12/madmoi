// Role-Based Access Control System
class RoleController {
    constructor() {
        this.currentUser = null;
        this.currentRole = null;
        this.init();
    }

    init() {
        // Check if user is logged in
        const isLoggedIn = localStorage.getItem('adminLoggedIn');
        console.log('RoleController: Checking authentication...', { isLoggedIn });
        
        if (!isLoggedIn) {
            console.log('RoleController: User not logged in, redirecting...');
            this.redirectToLogin();
            return;
        }

        // Get current user info
        this.currentUser = localStorage.getItem('adminUser');
        this.currentRole = localStorage.getItem('adminRole');
        
        console.log('RoleController: User info retrieved:', { 
            user: this.currentUser, 
            role: this.currentRole 
        });
        
        if (!this.currentUser || !this.currentRole) {
            console.log('RoleController: Missing user or role, redirecting...');
            this.redirectToLogin();
            return;
        }

        console.log(`RoleController: Authentication successful - User: ${this.currentUser}, Role: ${this.currentRole}`);
        this.applyRoleRestrictions();
    }

    applyRoleRestrictions() {
        const currentPath = window.location.pathname;
        
        // Hide navigation items based on role
        this.hideNavigationItems();
        
        // Hide page content based on role
        this.hidePageContent(currentPath);
        
        // Show role info
        this.showRoleInfo();
    }

    hideNavigationItems() {
        const navItems = {
            'admin': [], // Admin can see everything
            'editeur': ['subscribers', 'chat', 'settings'], // Editor can see articles, categories, analytics
            'auteur': ['analytics', 'subscribers', 'chat', 'categories', 'settings'] // Author only sees articles
        };

        const restrictedItems = navItems[this.currentRole] || [];
        
        restrictedItems.forEach(item => {
            // Hide navigation links
            const navLink = document.querySelector(`a[href*="${item}"]`);
            if (navLink) {
                navLink.parentElement.style.display = 'none';
            }
            
            // Hide sidebar items
            const sidebarItem = document.querySelector(`[data-nav="${item}"]`);
            if (sidebarItem) {
                sidebarItem.style.display = 'none';
            }
        });
    }

    hidePageContent(currentPath) {
        if (currentPath.includes('/admin/analytics') && this.currentRole === 'auteur') {
            this.showAccessDenied('Analytics', 'auteur');
        }
        
        if (currentPath.includes('/admin/subscribers') && this.currentRole !== 'admin') {
            this.showAccessDenied('Subscribers', this.currentRole);
        }
        
        if (currentPath.includes('/admin/chat') && this.currentRole !== 'admin') {
            this.showAccessDenied('Chat', this.currentRole);
        }
        
        // Editors can access categories from the articles page, so no need to restrict categories page access for them
        if (currentPath.includes('/admin/categories') && this.currentRole === 'auteur') {
            this.showAccessDenied('Categories', 'auteur');
        }
        
        if (currentPath.includes('/admin/settings') && this.currentRole !== 'admin') {
            this.showAccessDenied('Settings', this.currentRole);
        }
    }

    showAccessDenied(pageName, role) {
        const mainContent = document.querySelector('main') || document.querySelector('.container') || document.body;
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                    <div class="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                        <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg class="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                            </svg>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Accès Refusé</h2>
                        <p class="text-gray-600 dark:text-gray-300 mb-4">
                            Vous n'avez pas les permissions nécessaires pour accéder à <strong>${pageName}</strong>.
                        </p>
                        <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-6">
                            <p class="text-sm text-gray-600 dark:text-gray-300">
                                <strong>Votre rôle :</strong> ${this.getRoleDisplayName(role)}<br>
                                <strong>Page demandée :</strong> ${pageName}
                            </p>
                        </div>
                        <a href="/admin/dashboard" class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                            </svg>
                            Retour au Dashboard
                        </a>
                    </div>
                </div>
            `;
        }
    }

    getRoleDisplayName(role) {
        const roleNames = {
            'admin': 'Administrateur',
            'editeur': 'Éditeur',
            'auteur': 'Auteur'
        };
        return roleNames[role] || role;
    }

    showRoleInfo() {
        // Add role indicator to the header
        const header = document.querySelector('header') || document.querySelector('.bg-white') || document.querySelector('nav');
        if (header) {
            const roleIndicator = document.createElement('div');
            roleIndicator.className = 'flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300';
            roleIndicator.innerHTML = `
                <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium">
                    ${this.getRoleDisplayName(this.currentRole)}
                </span>
                <span>Connecté en tant que <strong>${this.currentUser}</strong></span>
            `;
            
            // Insert role indicator in header
            const headerContent = header.querySelector('.flex') || header.querySelector('.container') || header;
            if (headerContent) {
                headerContent.appendChild(roleIndicator);
            }
        }
    }

    // Check if user can access a specific feature
    canAccess(feature) {
        const permissions = {
            'admin': ['all'],
            'editeur': ['articles', 'categories', 'analytics'],
            'auteur': ['articles']
        };
        
        const userPermissions = permissions[this.currentRole] || [];
        return userPermissions.includes('all') || userPermissions.includes(feature);
    }

    // Redirect to login if not authenticated
    redirectToLogin() {
        if (!window.location.pathname.includes('/admin/')) {
            return; // Already on login page
        }
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('adminUser');
        localStorage.removeItem('adminRole');
        window.location.href = '/';
    }

    // Logout function
    logout() {
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('adminUser');
        localStorage.removeItem('adminRole');
        window.location.href = '/';
    }
}

// Initialize role controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.roleController = new RoleController();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoleController;
}


