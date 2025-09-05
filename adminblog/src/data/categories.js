// Blog categories data - Now using database API

export let categories = [];

// Load categories from database API
export async function loadCategories(baseUrl) {
    try {
        const endpoint = baseUrl ? `${baseUrl}/api/categories` : '/api/categories';
        const response = await fetch(endpoint);
        if (response.ok) {
            categories = await response.json();
            console.log('✅ Categories loaded from database:', categories.length);
            return categories;
        } else {
            throw new Error('Failed to fetch categories');
        }
    } catch (error) {
        console.error('Error loading categories from database:', error);
        categories = [];
        return [];
    }
}

// Helper functions
export function getCategoryById(id) {
    return categories.find(category => category.id === id);
}

export function getCategoryByName(name) {
    return categories.find(category => category.name === name);
}

export function getCategoryBySlug(slug) {
    return categories.find(category => category.slug === slug);
}

export function getFeaturedCategories() {
    return categories.filter(category => category.featured);
}

export function getAllCategoryNames() {
    return categories.map(category => category.name);
}

// Database operations
export async function addCategory(categoryData) {
    try {
        const response = await fetch('/api/categories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(categoryData)
        });
        
        if (response.ok) {
            const newCategory = await response.json();
            categories.push(newCategory);
            return newCategory;
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create category');
        }
    } catch (error) {
        console.error('Error creating category:', error);
        throw error;
    }
}

export async function updateCategory(id, categoryData) {
    try {
        const response = await fetch('/api/categories', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id, ...categoryData })
        });
        
        if (response.ok) {
            const updatedCategory = await response.json();
            const index = categories.findIndex(c => c.id === id);
            if (index !== -1) {
                categories[index] = updatedCategory;
            }
            return updatedCategory;
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update category');
        }
    } catch (error) {
        console.error('Error updating category:', error);
        throw error;
    }
}

export async function deleteCategory(id) {
    try {
        const response = await fetch(`/api/categories?id=${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            const index = categories.findIndex(c => c.id === id);
            if (index !== -1) {
                categories.splice(index, 1);
            }
            return true;
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete category');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        throw error;
    }
}

export function updateCategoryArticleCount() {
    // This will be implemented when we have article-category relationships
    return categories;
}

export function getCategoryStats() {
    const total = categories.length;
    const active = categories.filter(c => c.is_active).length;
    const totalArticles = 0; // TODO: Implement article count
    
    return {
        total,
        featured: active, // Using active count for now
        totalArticles
    };
}
