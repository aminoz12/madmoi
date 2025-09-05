// Blog articles data - This connects your blog to your admin panel
export const articles = [];

// Helper functions
export function getArticleById(id) {
    return articles.find(article => article.id === id);
}

export function getArticlesByStatus(status) {
    return articles.filter(article => article.status === status);
}

export function getArticlesByCategory(category) {
    return articles.filter(article => article.category === category);
}

export function getPublishedArticles() {
    return articles.filter(article => article.status === 'published');
}

export function getDraftArticles() {
    return articles.filter(article => article.status === 'draft');
}

export function searchArticles(query) {
    const lowercaseQuery = query.toLowerCase();
    return articles.filter(article => 
        article.title.toLowerCase().includes(lowercaseQuery) ||
        article.excerpt.toLowerCase().includes(lowercaseQuery) ||
        article.content.toLowerCase().includes(lowercaseQuery) ||
        (article.tags && article.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)))
    );
}

export function getArticleStats() {
    const total = articles.length;
    const published = articles.filter(a => a.status === 'published').length;
    const drafts = articles.filter(a => a.status === 'draft').length;
    const archived = articles.filter(a => a.status === 'archived').length;
    const totalViews = articles.reduce((sum, a) => sum + (a.views || 0), 0);
    const totalLikes = articles.reduce((sum, a) => sum + (a.likes || 0), 0);
    const totalComments = articles.reduce((sum, a) => sum + (a.comments || 0), 0);

    return {
        total,
        published,
        drafts,
        archived,
        totalViews,
        totalLikes,
        totalComments
    };
}

// Add new article function
export function addArticle(articleData) {
    const newArticle = {
        id: Math.max(...articles.map(a => a.id), 0) + 1,
        slug: generateSlug(articleData.title),
        views: 0,
        likes: 0,
        comments: 0,
        lastModified: new Date().toISOString().split('T')[0],
        readTime: calculateReadTime(articleData.content || ''),
        ...articleData
    };
    
    // If no publish date and status is published, use current date
    if (newArticle.status === 'published' && !newArticle.publishDate) {
        newArticle.publishDate = new Date().toISOString().split('T')[0];
    }
    
    articles.push(newArticle);
    return newArticle;
}

// Update article function
export function updateArticle(id, updateData) {
    const articleIndex = articles.findIndex(article => article.id === id);
    if (articleIndex !== -1) {
        articles[articleIndex] = {
            ...articles[articleIndex],
            ...updateData,
            lastModified: new Date().toISOString().split('T')[0]
        };
        return articles[articleIndex];
    }
    return null;
}

// Delete article function
export function deleteArticle(id) {
    const articleIndex = articles.findIndex(article => article.id === id);
    if (articleIndex !== -1) {
        const deletedArticle = articles.splice(articleIndex, 1)[0];
        return deletedArticle;
    }
    return null;
}

// Utility functions
function generateSlug(title) {
    return title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
}

function calculateReadTime(content) {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} min`;
}
