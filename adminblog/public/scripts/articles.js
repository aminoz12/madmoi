// Article management functionality with database API
console.log('🚀 articles.js file loaded!');

// Global variables for article management
let articles = [];
let filteredArticles = [];
let categoriesCache = [];
let currentFilter = 'all';
let currentSort = { field: 'created_at', direction: 'desc' };
let searchQuery = '';
let currentPage = 1;
let articlesPerPage = 15; // Increased for better performance
let totalPages = 1;
let isLoading = false; // Prevent multiple simultaneous loads

// Backup system for articles
let articleBackups = new Map(); // Store backups by article ID

// Load articles from database API
async function loadArticles() {
  // Prevent multiple simultaneous loads
  if (isLoading) {
    console.log('⏳ Load already in progress, skipping...');
    return;
  }
  
  isLoading = true;
  
  try {
    console.log('🔄 Loading articles from API...');
    
    // Show loading indicator
    const tbody = document.getElementById('articlesTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">⏳ Chargement des articles...</td></tr>';
    }
    
    const startTime = performance.now();
    const response = await fetch('/api/articles');
    const loadTime = performance.now() - startTime;
    
    console.log('📡 API Response status:', response.status);
    console.log('⚡ Load time:', Math.round(loadTime), 'ms');
    
    if (response.ok) {
      const data = await response.json();
      console.log('📦 Raw API response length:', data.length);
      
      // Ensure we have an array of articles
      if (Array.isArray(data)) {
        articles = data;
        console.log('✅ Articles loaded as array:', articles.length, 'articles');
        if (articles.length > 0) {
          console.log('📄 Sample article structure:', {
            id: articles[0].id,
            title: articles[0].title,
            type_id: typeof articles[0].id
          });
        }
      } else if (data && Array.isArray(data.articles)) {
        articles = data.articles;
        console.log('✅ Articles loaded from data.articles:', articles.length, 'articles');
      } else {
        console.warn('⚠️ Unexpected API response format:', data);
        console.warn('⚠️ Data type:', typeof data);
        console.warn('⚠️ Is array?', Array.isArray(data));
        articles = [];
      }
      
      // Sort articles by creation date (newest first) for better performance
      articles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      filteredArticles = [...articles];
      console.log('✅ Articles loaded from database:', articles.length);
      
      renderArticles();
      updateStats();
      
      if (loadTime > 2000) {
        console.warn('⚠️ Slow load detected:', Math.round(loadTime), 'ms');
        showNotification(`Articles chargés en ${Math.round(loadTime/1000)}s`, 'warning');
      }
    } else {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      throw new Error(`Failed to fetch articles: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('❌ Error loading articles:', error);
    articles = [];
    filteredArticles = [];
    
    // Show error in table
    const tbody = document.getElementById('articlesTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-red-500">❌ Erreur lors du chargement des articles</td></tr>';
    }
    
    showNotification('Erreur lors du chargement des articles.', 'error');
  } finally {
    isLoading = false;
  }
}

// Create new article
async function createArticle(articleData) {
  try {
    const response = await fetch('/api/articles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(articleData)
    });
    
    if (response.ok) {
      const newArticle = await response.json();
      articles.unshift(newArticle);
      filteredArticles = [...articles];
      renderArticles();
      updateStats();
      showNotification(`Article "${newArticle.title}" créé avec succès !`, 'success');
      return newArticle;
    } else {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create article');
    }
  } catch (error) {
    console.error('❌ Error creating article:', error);
    showNotification('Erreur lors de la création de l\'article.', 'error');
    throw error;
  }
}

// Update existing article
async function updateArticle(id, articleData) {
  try {
    console.log('🔄 Updating article with ID:', id);
    console.log('📤 Update payload:', articleData);
    
    const response = await fetch('/api/articles', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id, ...articleData })
    });
    
    console.log('📡 Update response status:', response.status);
    
    if (response.ok) {
      const updatedArticle = await response.json();
      console.log('✅ Update response:', updatedArticle);
      
      const index = articles.findIndex(a => a.id === id);
      if (index !== -1) {
        articles[index] = updatedArticle;
        filteredArticles = [...articles];
        renderArticles();
        updateStats();
        showNotification(`Article "${updatedArticle.title}" mis à jour avec succès !`, 'success');
      }
      return updatedArticle;
    } else {
      let error;
      try {
        const errorText = await response.text();
        console.error('❌ Update API Error Response:', errorText);
        // Try to parse as JSON, but don't fail if it's not
        try {
          error = JSON.parse(errorText);
        } catch (parseError) {
          error = { error: errorText || 'Failed to update article' };
        }
      } catch (textError) {
        error = { error: 'Failed to read error response' };
      }
      throw new Error(error.error || 'Failed to update article');
    }
  } catch (error) {
    console.error('❌ Error updating article:', error);
    showNotification('Erreur lors de la mise à jour de l\'article.', 'error');
    throw error;
  }
}

// Archive article (soft delete - goes to archive)
async function archiveArticle(id) {
  try {
    console.log('🔍 Looking for article with ID:', id, 'Type:', typeof id);
    console.log('🔍 Available articles:', articles.map(a => ({ id: a.id, title: a.title })));
    const article = articles.find(a => parseInt(a.id) === parseInt(id));
    if (!article) {
      showNotification('Article non trouvé.', 'error');
      return false;
    }

    const confirmed = await showConfirmDialog(
      `Êtes-vous sûr de vouloir archiver l'article "${article.title}" ?\n\n📁 L'article sera déplacé dans la corbeille et pourra être restauré plus tard.`,
      'Oui, archiver',
      'Archiver l\'article'
    );
    
    if (!confirmed) {
      return false;
    }

    const response = await fetch(`/api/articles?id=${id}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      let result;
      try {
        result = await response.json();
      } catch (e) {
        result = { success: true }; // Fallback if response is empty
      }
      
      const index = articles.findIndex(a => a.id === id);
      if (index !== -1) {
        const deletedArticle = articles[index];
        articles.splice(index, 1);
        filteredArticles = [...articles];
        renderArticles();
        updateStats();
        showNotification(`Article "${deletedArticle.title}" archivé avec succès !`, 'success');
      }
      return true;
    } else {
      let error;
      try {
        error = await response.json();
      } catch (e) {
        error = { error: 'Failed to parse error response' };
      }
      throw new Error(error.error || 'Failed to archive article');
    }
  } catch (error) {
    console.error('❌ Error archiving article:', error);
    showNotification('Erreur lors de l\'archivage de l\'article.', 'error');
    throw error;
  }
}

// View article function
window.viewArticle = async function(id) {
  console.log('👁️ viewArticle called with ID:', id);
  try {
    // Ensure articles are loaded
    if (!articles || articles.length === 0) {
      console.log('🔄 No articles loaded, fetching from API...');
      await loadArticles();
    }
    
    console.log('🔍 Looking for article with ID:', id, 'Type:', typeof id);
    console.log('🔍 Available articles:', articles.map(a => ({ id: a.id, title: a.title })));
    const article = articles.find(a => parseInt(a.id) === parseInt(id));
    if (!article) {
      showNotification('Article non trouvé.', 'error');
      return false;
    }

    // For now, show a notification or open in new tab
    // This could be expanded to show a modal or redirect to the blog
    showNotification(`Affichage de l'article: "${article.title}"`, 'info');
    
    // Open blog article in new tab if we have the slug
    if (article.slug) {
      const blogUrl = `http://localhost:4321/blog/${article.slug}`;
      window.open(blogUrl, '_blank');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error viewing article:', error);
    showNotification('Erreur lors de l\'affichage de l\'article.', 'error');
    return false;
  }
};

// Edit article function
window.editArticle = async function(id) {
  console.log('✏️ editArticle called with ID:', id);
  try {
    // Ensure articles are loaded
    if (!articles || articles.length === 0) {
      console.log('🔄 No articles loaded, fetching from API...');
      await loadArticles();
    }
    
    console.log('🔍 Looking for article with ID:', id, 'Type:', typeof id);
    console.log('🔍 Available articles:', articles.map(a => ({ id: a.id, title: a.title })));
    const article = articles.find(a => parseInt(a.id) === parseInt(id));
    if (!article) {
      showNotification('Article non trouvé.', 'error');
      return false;
    }

    // Redirect to the new article page with edit parameter
    window.location.href = `/admin/new-article?edit=${id}`;
    return true;
  } catch (error) {
    console.error('❌ Error editing article:', error);
    showNotification('Erreur lors de l\'édition de l\'article.', 'error');
    return false;
  }
};

// Delete article with choice between archive and permanent delete
window.deleteArticle = async function(id) {
  console.log('🗑️ deleteArticle called with ID:', id);
  try {
    // Ensure articles are loaded
    if (!articles || articles.length === 0) {
      console.log('🔄 No articles loaded, fetching from API...');
      await loadArticles();
    }
    
    console.log('🔍 Looking for article with ID:', id, 'Type:', typeof id);
    console.log('🔍 Available articles:', articles.map(a => ({ id: a.id, title: a.title })));
    const article = articles.find(a => parseInt(a.id) === parseInt(id));
    console.log('🔍 Found article:', article);
    if (!article) {
      showNotification('Article non trouvé.', 'error');
      return false;
    }

    // Show choice dialog
    const choice = await showDeleteChoiceDialog(article.title);
    
    if (choice === 'archive') {
      // Archive the article
      return await archiveArticle(id);
    } else if (choice === 'delete') {
      // Permanently delete the article
      const confirmed = await showConfirmDialog(
        `Êtes-vous sûr de vouloir SUPPRIMER DÉFINITIVEMENT l'article "${article.title}" ?\n\n⚠️ Cette action est IRREVERSIBLE et supprimera l'article de la base de données pour toujours.`,
        'Oui, supprimer définitivement',
        'Supprimer définitivement'
      );
      
      if (!confirmed) {
        return false;
      }

      const response = await fetch(`/api/articles?id=${id}&force=true`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        let result;
        try {
          result = await response.json();
        } catch (e) {
          result = { success: true }; // Fallback if response is empty
        }
        
        const index = articles.findIndex(a => a.id === id);
        if (index !== -1) {
          const deletedArticle = articles[index];
          articles.splice(index, 1);
          filteredArticles = [...articles];
          renderArticles();
          updateStats();
          showNotification(`Article "${deletedArticle.title}" supprimé définitivement !`, 'success');
        }
        return true;
      } else {
        let error;
        try {
          error = await response.json();
        } catch (e) {
          error = { error: 'Failed to parse error response' };
        }
        throw new Error(error.error || 'Failed to delete article');
      }
    }
    
    return false; // User cancelled
  } catch (error) {
    console.error('❌ Error deleting article:', error);
    showNotification('Erreur lors de la suppression de l\'article.', 'error');
    return false;
  }
};

// View archived articles
async function viewArchivedArticles() {
  try {
    const response = await fetch('/api/articles?includeDeleted=true');
    if (response.ok) {
      const allArticles = await response.json();
      const archivedArticles = allArticles.filter(a => a.status === 'deleted');
      
      if (archivedArticles.length === 0) {
        showNotification('Aucun article archivé trouvé.', 'info');
        return;
      }
      
      showArchivedArticlesModal(archivedArticles);
    } else {
      throw new Error('Failed to fetch archived articles');
    }
  } catch (error) {
    console.error('❌ Error fetching archived articles:', error);
    showNotification('Erreur lors de la récupération des articles archivés.', 'error');
  }
}

// Show archived articles modal
function showArchivedArticlesModal(archivedArticles) {
  const backdrop = document.createElement('div');
  backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
  
  const modal = document.createElement('div');
  modal.className = 'bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 shadow-xl max-h-[80vh] overflow-hidden';
  
  modal.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">📁 Articles Archivés (${archivedArticles.length})</h3>
      <button type="button" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
    <div class="overflow-y-auto max-h-[60vh]">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Titre</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Catégorie</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date d'archivage</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          ${archivedArticles.map(article => `
            <tr>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">${article.title}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${article.category_name || 'Aucune'}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${new Date(article.updated_at).toLocaleDateString('fr-FR')}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button onclick="restoreArticle(${article.id})" class="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300">
                  🔄 Restaurer
                </button>
                <button onclick="deleteArticle(${article.id})" class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                  🗑️ Supprimer définitivement
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  const closeBtn = modal.querySelector('button');
  const closeModal = () => backdrop.remove();
  
  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });
  
  document.body.appendChild(backdrop);
}

// Restore archived article
async function restoreArticle(id) {
  try {
    const response = await fetch(`/api/articles?id=${id}&action=restore`, {
      method: 'PATCH'
    });
    
    if (response.ok) {
      showNotification('Article restauré avec succès !', 'success');
      // Refresh the articles list
      await loadArticles();
    } else {
      const error = await response.json();
      throw new Error(error.error || 'Failed to restore article');
    }
  } catch (error) {
    console.error('❌ Error restoring article:', error);
    showNotification('Erreur lors de la restauration de l\'article.', 'error');
  }
}

// Show delete choice dialog (archive vs permanent delete)
function showDeleteChoiceDialog(articleTitle) {
  console.log('🎯 showDeleteChoiceDialog called with title:', articleTitle);
  return new Promise((resolve) => {
    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl';
    
    modal.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">🗑️ Supprimer l'article</h3>
        <button type="button" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="mb-6">
        <p class="text-gray-700 dark:text-gray-300 mb-4">Que souhaitez-vous faire avec l'article "<strong>${articleTitle}</strong>" ?</p>
        
        <div class="space-y-3">
          <div class="p-3 border border-orange-200 dark:border-orange-700 rounded-lg bg-orange-50 dark:bg-orange-900/20">
            <h4 class="font-medium text-orange-800 dark:text-orange-200 mb-1">📁 Archiver</h4>
            <p class="text-sm text-orange-700 dark:text-orange-300">L'article sera déplacé dans la corbeille et pourra être restauré plus tard.</p>
          </div>
          
          <div class="p-3 border border-red-200 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20">
            <h4 class="font-medium text-red-800 dark:text-red-200 mb-1">🗑️ Supprimer définitivement</h4>
            <p class="text-sm text-red-700 dark:text-red-300">L'article sera supprimé de la base de données pour toujours. Cette action est irréversible.</p>
          </div>
        </div>
      </div>
      <div class="flex justify-end space-x-3">
        <button type="button" class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
          Annuler
        </button>
        <button type="button" class="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
          📁 Archiver
        </button>
        <button type="button" class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
          🗑️ Supprimer définitivement
        </button>
      </div>
    `;
    
    // Add event listeners
    const closeBtn = modal.querySelector('button:first-child');
    const cancelBtn = modal.querySelector('button:nth-child(2)');
    const archiveBtn = modal.querySelector('button:nth-child(3)');
    const deleteBtn = modal.querySelector('button:last-child');
    
    const closeModal = () => {
      backdrop.remove();
      resolve('cancel');
    };
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    archiveBtn.addEventListener('click', () => {
      backdrop.remove();
      resolve('archive');
    });
    deleteBtn.addEventListener('click', () => {
      backdrop.remove();
      resolve('delete');
    });
    
    // Close on backdrop click
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeModal();
      }
    });
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    });
    
    document.body.appendChild(backdrop);
  });
}

// Show confirmation dialog
function showConfirmDialog(message, confirmText, title = 'Confirmation') {
  return new Promise((resolve) => {
    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl';
    
    modal.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${title}</h3>
        <button type="button" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="mb-6">
        <p class="text-gray-700 dark:text-gray-300 whitespace-pre-line">${message}</p>
      </div>
      <div class="flex justify-end space-x-3">
        <button type="button" class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
          Annuler
        </button>
        <button type="button" class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
          ${confirmText}
        </button>
      </div>
    `;
    
    // Add event listeners
    const closeBtn = modal.querySelector('button:first-child');
    const cancelBtn = modal.querySelector('button:nth-child(2)');
    const confirmBtn = modal.querySelector('button:last-child');
    
    const closeModal = () => {
      backdrop.remove();
      resolve(false);
    };
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    confirmBtn.addEventListener('click', () => {
      backdrop.remove();
      resolve(true);
    });
    
    // Close on backdrop click
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeModal();
      }
    });
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    });
    
    document.body.appendChild(backdrop);
  });
}

// Search articles function
function searchArticles(query) {
  if (!query || query.trim() === '') {
    filteredArticles = [...articles];
  } else {
    const searchTerm = query.toLowerCase().trim();
    filteredArticles = articles.filter(article => 
      (article.title && article.title.toLowerCase().includes(searchTerm)) ||
      (article.content && article.content.toLowerCase().includes(searchTerm)) ||
      (article.author_name && article.author_name.toLowerCase().includes(searchTerm)) ||
      (article.category_name && article.category_name.toLowerCase().includes(searchTerm)) ||
      (article.tags && (() => {
        try {
          const tags = JSON.parse(article.tags);
          return Array.isArray(tags) && tags.some(tag => tag.toLowerCase().includes(searchTerm));
        } catch (e) {
          return false;
        }
      })())
    );
  }
  renderArticles();
  updateStats();
}

// Render articles in the table with pagination for performance
function renderArticles() {
  console.log('🎨 Rendering articles...');
  console.log('📋 Total articles to render:', filteredArticles.length);
  
  const tbody = document.getElementById('articlesTableBody');
  if (!tbody) {
    console.error('❌ articlesTableBody not found!');
    return;
  }
  
  // Calculate pagination
  const startIndex = (currentPage - 1) * articlesPerPage;
  const endIndex = startIndex + articlesPerPage;
  const articlesToRender = filteredArticles.slice(startIndex, endIndex);
  
  console.log('📄 Rendering page:', currentPage, 'Articles:', startIndex, '-', endIndex, 'of', filteredArticles.length);
  
  // Show loading if too many articles
  if (filteredArticles.length > 50) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-500">⚡ Optimisation du rendu...</td></tr>';
    
    // Use setTimeout to prevent blocking the UI
    setTimeout(() => {
      renderArticlesBatch(articlesToRender, tbody);
    }, 50);
  } else {
    renderArticlesBatch(articlesToRender, tbody);
  }
}

// Render a batch of articles
function renderArticlesBatch(articlesToRender, tbody) {
  console.log('✅ Rendering batch of', articlesToRender.length, 'articles');
  console.log('🔍 Article IDs being rendered:', articlesToRender.map(a => ({ id: a.id, title: a.title })));

  tbody.innerHTML = articlesToRender.map(article => `
    <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
      <td class="px-6 py-4 w-80">
        <div class="flex items-center">
          <div class="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
            ${getArticleImage(article)}
          </div>
          <div>
            <div class="text-sm font-medium text-gray-900 dark:text-white">${article.title || 'Sans titre'}</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">${article.excerpt || 'Aucun extrait'}</div>
          </div>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white w-32">
        ${article.author_name || 'Auteur inconnu'}
      </td>
      <td class="px-6 py-4 whitespace-nowrap w-32">
        <span class="inline-flex px-3 py-1.5 text-xs font-semibold rounded-full bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/25">
          ${article.category_name || 'Non catégorisé'}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap w-24">
        <span class="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase ${getStatusColor(article.status)} transition-all duration-200 hover:scale-105">
          ${getStatusText(article.status)}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 w-32">
        ${formatDate(article.created_at)}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium w-40">
        <div class="flex items-center space-x-2">
          <button 
            data-article-id="${article.id}"
            class="view-article-btn text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            title="Voir l'article"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
          </button>
          <button 
            data-article-id="${article.id}"
            class="edit-article-btn text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            title="Modifier l'article"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </button>
          <button 
            data-article-id="${article.id}"
            class="delete-article-btn text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Supprimer l'article définitivement"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
  
  console.log('✅ Articles rendered successfully');
  console.log('📊 Table rows created:', tbody.children.length);
  
  // Set up event handlers for the newly rendered images
  setupArticleImageHandlers();
}

// Helper function to validate image URLs - removed duplicate, using the complete one below

// Helper function to sanitize image URLs - removed duplicate, using the complete one below

// Helper function to get article image
function getArticleImage(article) {
  console.log('🖼️ getArticleImage called for article:', {
    id: article.id,
    title: article.title,
    featured_image: article.featured_image,
    featured_image_type: typeof article.featured_image
  });
  
  if (article.featured_image) {
    try {
      let imageData;
      if (typeof article.featured_image === 'string') {
        console.log('🔍 Parsing featured_image string:', article.featured_image);
        imageData = JSON.parse(article.featured_image);
        console.log('✅ Parsed image data:', imageData);
      } else if (typeof article.featured_image === 'object') {
        console.log('🔍 Using featured_image object directly:', article.featured_image);
        imageData = article.featured_image;
      }
      
      if (imageData && imageData.url && isValidImageUrl(imageData.url)) {
        console.log('✅ Valid image data found, URL:', imageData.url);
        
        // Convert relative upload URLs to absolute URLs for cross-server access
        let displayUrl = imageData.url;
        if (displayUrl.startsWith('/uploads/')) {
          // Convert relative upload URL to absolute adminblog URL
          displayUrl = `http://localhost:4322${displayUrl}`;
          console.log('🔄 Converted relative URL to absolute:', displayUrl);
        }
        
        // Create a more robust image element with better error handling
        const sanitizedUrl = sanitizeImageUrl(displayUrl);
        
        // Check if it's a data URL (GPT-generated image)
        const isDataUrl = sanitizedUrl.startsWith('data:image/');
        
        return `
          <img 
            src="${sanitizedUrl}" 
            alt="${imageData.alt || (article.title || 'Article')}" 
            class="w-10 h-10 rounded-lg object-cover article-image" 
            data-article-id="${article.id}"
            ${isDataUrl ? 'data-gpt-generated="true"' : ''}
          />
          <div class="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0 fallback-icon" style="display: flex;">
            <svg class="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
            </svg>
          </div>
        `;
      } else {
        console.log('⚠️ Invalid image data:', {
          hasImageData: !!imageData,
          hasUrl: imageData && !!imageData.url,
          url: imageData && imageData.url,
          isValidUrl: imageData && imageData.url && isValidImageUrl(imageData.url)
        });
      }
    } catch (e) {
      console.error('❌ Error parsing featured_image JSON:', e);
      console.error('❌ Raw featured_image value:', article.featured_image);
    }
  } else {
    console.log('📭 No featured_image for article:', article.id);
  }
  
  return `<svg class="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
  </svg>`;
}

// Helper function to get status color
function getStatusColor(status) {
  switch (status) {
    case 'published':
      return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25 border-0';
    case 'draft':
      return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 border-0';
    case 'pending':
      return 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25 border-0';
    case 'deleted':
      return 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/25 border-0';
    case 'archived':
      return 'bg-gradient-to-r from-gray-500 to-slate-500 text-white shadow-lg shadow-gray-500/25 border-0';
    default:
      return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg shadow-gray-400/25 border-0';
  }
}

// Helper function to get status text
function getStatusText(status) {
  switch (status) {
    case 'published':
      return 'Publié';
    case 'draft':
      return 'Brouillon';
    case 'pending':
      return 'En attente';
    case 'archived':
      return 'Archivé';
    default:
      return status;
  }
}

// Helper function to format dates
function formatDate(dateString) {
  if (!dateString) return 'Date inconnue';
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Date invalide';
    }
    
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Date invalide';
  }
}

// Helper function to validate image URLs
function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  // Check if it's a data URL (GPT-generated image)
  if (url.startsWith('data:image/')) {
    return true;
  }
  
  // Check if it's a server-uploaded image URL (relative or absolute)
  if (url.startsWith('/uploads/') || url.includes('/uploads/')) {
    return true;
  }
  
  // Check if it's a valid HTTP/HTTPS URL
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

// Helper function to sanitize image URLs
function sanitizeImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  
  // If it's a data URL, return as is (GPT-generated image)
  if (url.startsWith('data:image/')) {
    return url;
  }
  
  // If it's a local uploads URL, return as is (relative or absolute)
  if (url.startsWith('/uploads/') || url.includes('/uploads/')) {
    return url;
  }
  
  // For regular URLs, sanitize and validate
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
      return urlObj.toString();
    }
    return '';
  } catch (e) {
    return '';
  }
}

// Helper function to format date - removed duplicate, using the complete one above

// Update statistics
function updateStats() {
  console.log('📊 Updating statistics...');
  
  const totalArticles = articles.length;
  const publishedArticles = articles.filter(a => a.status === 'published').length;
  const draftArticles = articles.filter(a => a.status === 'draft').length;
  const pendingArticles = articles.filter(a => a.status === 'pending').length;
  const deletedArticles = articles.filter(a => a.status === 'deleted').length;

  console.log('📈 Stats calculated:', {
    total: totalArticles,
    published: publishedArticles,
    draft: draftArticles,
    pending: pendingArticles,
    deleted: deletedArticles
  });

  // Update the articles count display
  const articlesCountElement = document.getElementById('articlesCount');
  if (articlesCountElement) {
    articlesCountElement.textContent = totalArticles;
    console.log('✅ Articles count updated:', totalArticles);
  } else {
    console.warn('⚠️ articlesCount element not found');
  }

  // Update stats display if elements exist (for future statistics cards)
  const totalElement = document.querySelector('[data-stat="total"]');
  const publishedElement = document.querySelector('[data-stat="published"]');
  const pendingElement = document.querySelector('[data-stat="pending"]');
  const deletedElement = document.querySelector('[data-stat="deleted"]');
  
  if (totalElement) {
    totalElement.textContent = totalArticles;
    console.log('✅ Total articles updated:', totalArticles);
  }
  
  if (publishedElement) publishedElement.textContent = publishedArticles;
  if (pendingElement) pendingElement.textContent = pendingArticles;
  if (deletedElement) deletedElement.textContent = deletedArticles;
}

// Global functions for edit/delete buttons
window.editArticle = async function(articleId) {
  console.log('🔧 Edit article called with ID:', articleId);
  console.log('🔧 Function called successfully!');
  console.log('📋 Available articles:', articles);
  
  try {
    // Ensure articles are loaded
    if (!articles || articles.length === 0) {
      console.log('🔄 No articles loaded, fetching from API...');
      await loadArticles();
    }
    
    const article = articles.find(a => a.id === articleId);
    if (!article) {
      console.error('❌ Article not found with ID:', articleId);
      console.log('🔍 Available article IDs:', articles.map(a => a.id));
      return;
    }
    
    // Create backup before editing
    console.log('💾 Creating backup of article before editing...');
    articleBackups.set(articleId, JSON.parse(JSON.stringify(article)));
    console.log('✅ Backup created for article:', articleId);
    
    console.log('📄 Article to edit:', article);

    // Load categories once for select
    if (categoriesCache.length === 0) {
      try {
        const r = await fetch('/api/categories');
        const data = await r.json();
        categoriesCache = Array.isArray(data) ? data : (data?.categories || []);
      } catch (_) {}
    }

    // Populate form
    document.getElementById('editArticleId').value = article.id;
    document.getElementById('editTitle').value = article.title || '';
    document.getElementById('editExcerpt').value = article.excerpt || '';
    document.getElementById('editContent').value = article.content || '';
    
    // Prefill image url if present and show current image preview
    console.log('🖼️ Setting up current image display for article:', article.id);
    console.log('🔍 Article featured_image data:', article.featured_image);
    
    try {
      let imgUrl = '';
      let imageData = null;
      
      if (article.featured_image) {
        if (typeof article.featured_image === 'string') {
          try {
            imageData = JSON.parse(article.featured_image);
            imgUrl = imageData && imageData.url ? imageData.url : '';
            console.log('✅ Parsed featured_image JSON:', imageData);
          } catch (e) {
            // If it's not valid JSON, treat it as a direct URL
            imgUrl = article.featured_image;
            console.log('⚠️ Treating featured_image as direct URL:', imgUrl);
          }
        } else if (typeof article.featured_image === 'object' && article.featured_image.url) {
          imageData = article.featured_image;
          imgUrl = article.featured_image.url;
          console.log('✅ Using featured_image object directly:', imageData);
        }
      }
      
      console.log('🔍 Final image URL for display:', imgUrl);
      
      // Handle current image display if it exists
      if (imgUrl && isValidImageUrl(imgUrl)) {
        console.log('✅ Valid image URL found, setting up preview');
        
        // Convert relative upload URLs to absolute URLs for cross-server access
        let displayUrl = imgUrl;
        if (displayUrl.startsWith('/uploads/')) {
          // Convert relative upload URL to absolute adminblog URL
          displayUrl = `http://localhost:4322${displayUrl}`;
          console.log('🔄 Converted relative URL to absolute for preview:', displayUrl);
        }
        
        // Show current image preview if image exists
        const currentImagePreview = document.getElementById('currentImagePreview');
        const currentImage = document.getElementById('currentImage');
        
        if (currentImagePreview && currentImage) {
          // Use sanitized URL for preview
          const sanitizedUrl = sanitizeImageUrl(displayUrl);
          console.log('🔍 Setting current image src to:', sanitizedUrl);
          
          currentImage.src = sanitizedUrl;
          currentImagePreview.classList.remove('hidden');
          
          // Add error handling for the preview image
          currentImage.onerror = function() {
            console.error('❌ Failed to load preview image:', sanitizedUrl);
            currentImagePreview.classList.add('hidden');
          };
          
          // Add success handling
          currentImage.onload = function() {
            console.log('✅ Current image loaded successfully:', sanitizedUrl);
          };
          
          console.log('✅ Current image preview setup completed');
        } else {
          console.error('❌ Current image preview elements not found');
        }
      } else {
        console.log('⚠️ No valid image URL found, hiding preview');
        const currentImagePreview = document.getElementById('currentImagePreview');
        if (currentImagePreview) {
          currentImagePreview.classList.add('hidden');
        }
      }
    } catch (error) {
      console.error('❌ Error setting up current image display:', error);
      // Hide preview on error
      const currentImagePreview = document.getElementById('currentImagePreview');
      if (currentImagePreview) {
        currentImagePreview.classList.add('hidden');
      }
    }
    
    const catSel = document.getElementById('editCategory');
    if (catSel) {
      catSel.innerHTML = '<option value="">Non catégorisé</option>' + (categoriesCache.map(c => `<option value="${c.id}">${c.name}</option>`).join(''));
      if (article.category_id) catSel.value = String(article.category_id);
    }
    const statusSel = document.getElementById('editStatus');
    if (statusSel) statusSel.value = article.status || 'draft';
    const featSel = document.getElementById('editFeatured');
    if (featSel) featSel.value = (article.is_featured ? 'true' : 'false');

    // Show modal
    document.getElementById('editArticleModal').classList.remove('hidden');
    
    // Setup close handlers after modal is shown
    setupCloseHandlers();
    setupModalBackdropHandlers();
    
    // Setup form submission handler
    setupEditFormHandler();
    
    // Also add click handler to save button as backup
    const saveButton = document.getElementById('saveEditArticleBtn');
    if (saveButton) {
      console.log('🔍 Setting up save button click handler as backup');
      saveButton.removeEventListener('click', handleSaveButtonClick);
      saveButton.addEventListener('click', handleSaveButtonClick);
    }
  
  } catch (error) {
    console.error('❌ Error in editArticle function:', error);
    showNotification('Erreur lors de l\'ouverture de l\'éditeur d\'article: ' + error.message, 'error');
  }
};

// Close modal handlers - will be set up when modal is shown
function setupCloseHandlers() {
  const cancelEditArticle = document.getElementById('cancelEditArticle');
  const cancelEditArticleBottom = document.getElementById('cancelEditArticleBottom');
  
  if (cancelEditArticle) {
    cancelEditArticle.removeEventListener('click', closeEditModal);
    cancelEditArticle.addEventListener('click', closeEditModal);
  }
  
  if (cancelEditArticleBottom) {
    cancelEditArticleBottom.removeEventListener('click', closeEditModal);
    cancelEditArticleBottom.addEventListener('click', closeEditModal);
  }
}

function closeEditModal() {
  document.getElementById('editArticleModal').classList.add('hidden');
  resetImagePreviews();
  
  // Check if we're closing after a successful edit
  const editArticleId = document.getElementById('editArticleId').value;
  if (editArticleId && articleBackups.has(parseInt(editArticleId))) {
    // This was a successful edit, clean up the backup
    articleBackups.delete(parseInt(editArticleId));
    console.log('✅ Backup cleaned up after successful edit');
  }
  
  // Don't reset form fields here - let the form submission handle it
  // document.getElementById('editArticleForm').reset();
}

// Setup form submission handler
function setupEditFormHandler() {
  const form = document.getElementById('editArticleForm');
  console.log('🔍 Looking for edit form:', form);
  if (form) {
    console.log('✅ Found edit form, setting up submit handler');
    // Remove existing listener to prevent duplicates
    form.removeEventListener('submit', handleEditFormSubmit);
    form.addEventListener('submit', handleEditFormSubmit);
    console.log('✅ Submit handler attached to form');
  } else {
    console.error('❌ Edit form not found!');
  }
}

// Handle save button click as backup
function handleSaveButtonClick(event) {
  event.preventDefault();
  console.log('🔘 Save button clicked, triggering form submission...');
  
  // Trigger form submission
  const form = document.getElementById('editArticleForm');
  if (form) {
    console.log('✅ Triggering form submit from save button');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  } else {
    console.error('❌ Edit form not found for save button');
  }
}

// Handle edit form submission
async function handleEditFormSubmit(event) {
  event.preventDefault();
  console.log('🎯 Form submission prevented, processing manually...');
  
  try {
    console.log('📝 Edit form submitted, processing...');
    
    // Get form data
    const articleId = document.getElementById('editArticleId').value;
    const title = document.getElementById('editTitle').value.trim();
    const excerpt = document.getElementById('editExcerpt').value.trim();
    const content = document.getElementById('editContent').value.trim();
    const categoryId = document.getElementById('editCategory').value;
    const status = document.getElementById('editStatus').value;
    const isFeatured = document.getElementById('editFeatured').value === 'true';
    
    console.log('📋 Form data:', { articleId, title, excerpt, content, categoryId, status, isFeatured });
    
    // Validate that we have the required data
    if (!articleId) {
      throw new Error('Article ID is missing');
    }
    if (!title) {
      throw new Error('Title is required');
    }
    if (!content) {
      throw new Error('Content is required');
    }
    
    // Validation
    if (!title || !content) {
      alert('Le titre et le contenu sont obligatoires.');
      return;
    }
    
    // Prepare payload
    const payload = {
      id: parseInt(articleId),
      title: title,
      excerpt: excerpt,
      content: content,
      category_id: categoryId ? parseInt(categoryId) : null,
      status: status,
      is_featured: isFeatured,
      author_id: 1 // Default author
    };
    
    // Handle image data - File upload only
    const imageFileUpload = document.getElementById('imageFileUpload');
    
    console.log('🖼️ Image handling - hasFile:', imageFileUpload && imageFileUpload.files.length > 0);
    
    if (imageFileUpload && imageFileUpload.files.length > 0) {
      console.log('📁 File selected for upload:', imageFileUpload.files[0].name, imageFileUpload.files[0].size, imageFileUpload.files[0].type);
    } else {
      console.log('🔄 No new image uploaded, keeping existing image');
    }
    
    console.log('📤 Sending update payload:', payload);
    console.log('🖼️ Featured image in payload:', payload.featured_image);
    
    // Send update request with retry logic
    let response = null;
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount < maxRetries) {
      try {
        console.log(`🔄 Attempt ${retryCount + 1} of ${maxRetries}`);
        
        // Check if we have a file upload
        const hasFileUpload = imageFileUpload && imageFileUpload.files.length > 0;
        
        if (hasFileUpload) {
          // Send as FormData for file uploads
          const formData = new FormData();
          formData.append('id', payload.id);
          formData.append('title', payload.title);
          formData.append('content', payload.content);
          formData.append('excerpt', payload.excerpt);
          formData.append('category_id', payload.category_id || '');
          formData.append('author_id', payload.author_id);
          formData.append('status', payload.status);
          formData.append('is_featured', payload.is_featured);
          formData.append('featured_image', imageFileUpload.files[0]);
          
          console.log('📁 Sending FormData with file:', imageFileUpload.files[0].name);
          console.log('🔍 FormData details:');
          console.log('  - File name:', imageFileUpload.files[0].name);
          console.log('  - File size:', imageFileUpload.files[0].size);
          console.log('  - File type:', imageFileUpload.files[0].type);
          console.log('  - FormData entries:');
          for (const [key, value] of formData.entries()) {
            console.log(`    - ${key}:`, value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value);
          }
          
          console.log('🔄 Making FormData request...');
          response = await fetch('/api/articles', {
            method: 'PUT',
            body: formData // No Content-Type header for FormData
          });
          console.log('✅ FormData request completed');
        } else {
          // Send as JSON for text-only updates
          console.log('📄 Sending JSON without file');
          console.log('📤 JSON payload:', JSON.stringify(payload, null, 2));
          
          console.log('🔄 Making JSON request...');
          response = await fetch('/api/articles', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
          console.log('✅ JSON request completed');
        }
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', response.headers);
        console.log('📡 Response type:', hasFileUpload ? 'FormData' : 'JSON');
        
        if (response.ok) {
          console.log('✅ Update successful, breaking out of retry loop');
          break; // Success, exit retry loop
        }
        
        // Don't read response.json() here - we'll read it once after the loop
        console.log('⚠️ Update failed, status:', response.status);
        
        if (retryCount < maxRetries - 1) {
          console.log('🔄 Retrying in 1 second...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        retryCount++;
      } catch (fetchError) {
        console.error('❌ Fetch error:', fetchError);
        if (retryCount < maxRetries - 1) {
          console.log('🔄 Retrying in 1 second...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        retryCount++;
      }
    }
    
    // Check if we have a valid response
    if (!response) {
      throw new Error('No response received after all retry attempts');
    }
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: 'Failed to parse error response' };
      }
      throw new Error(errorData?.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    // If we get here, the update was successful (HTTP 200-299)
    console.log('✅ Server responded with success status:', response.status);
    
    // Try to parse the response, but don't fail if it's malformed
    let updatedArticle;
    let responseParsed = false;
    
    // Check if this was a JSON request (no file upload)
    const wasJsonRequest = !(imageFileUpload && imageFileUpload.files.length > 0);
    console.log('🔍 Request type:', wasJsonRequest ? 'JSON' : 'FormData');
    
    try {
      // First, let's see what the response actually contains
      const responseText = await response.text();
      console.log('📄 Raw response text:', responseText);
      console.log('📄 Response length:', responseText ? responseText.length : 0);
      
      if (responseText && responseText.trim()) {
        try {
          updatedArticle = JSON.parse(responseText);
          responseParsed = true;
          console.log('✅ Successfully parsed server response as JSON');
          console.log('📋 Parsed response:', updatedArticle);
        } catch (parseError) {
          console.log('⚠️ Response is not valid JSON, but update succeeded (HTTP success status)');
          console.log('🔍 Parse error details:', parseError.message);
          console.log('✅ Creating fallback article object from payload');
          
          // Create a fallback updated article object from the payload
          updatedArticle = {
            ...payload,
            updated_at: new Date().toISOString(),
            featured_image: null // Will be preserved from existing data
          };
          
          console.log('✅ Fallback article object created:', updatedArticle);
        }
      } else {
        console.log('⚠️ Empty response body, but update succeeded (HTTP success status)');
        console.log('✅ Creating fallback article object from payload');
        
        // Create a fallback updated article object from the payload
        updatedArticle = {
          ...payload,
          updated_at: new Date().toISOString(),
          featured_image: null // Will be preserved from existing data
        };
        
        console.log('✅ Fallback article object created:', updatedArticle);
      }
    } catch (e) {
      console.log('⚠️ Could not read response body, but update succeeded (HTTP success status)');
      console.log('🔍 Read error details:', e.message);
      console.log('✅ Creating fallback article object from payload');
      
      // Create a fallback updated article object from the payload
      updatedArticle = {
        ...payload,
        updated_at: new Date().toISOString(),
        featured_image: null // Will be preserved from existing data
      };
      
      console.log('✅ Fallback article object created:', updatedArticle);
    }
    
    // For JSON requests, always ensure we have a valid updatedArticle object
    if (wasJsonRequest && !updatedArticle) {
      console.log('🔄 JSON request fallback: Creating article object from payload');
      updatedArticle = {
        ...payload,
        updated_at: new Date().toISOString(),
        featured_image: null
      };
      console.log('✅ JSON fallback article object created:', updatedArticle);
    }
    
    // Ensure we always have a valid updatedArticle object
    if (!updatedArticle) {
      console.log('🔄 Final fallback: Creating article object from payload');
      updatedArticle = {
        ...payload,
        updated_at: new Date().toISOString(),
        featured_image: null
      };
      console.log('✅ Final fallback article object created:', updatedArticle);
    }
    
    console.log('✅ Article updated successfully:', updatedArticle);
    console.log('🖼️ Featured image in response:', updatedArticle.featured_image);
    
    // Reset form after successful submission
    console.log('🔄 Resetting form...');
    document.getElementById('editArticleForm').reset();
    console.log('✅ Form reset');
    
    // Update the article in the local array immediately for instant UI feedback
    try {
      const articleIndex = articles.findIndex(a => a.id === parseInt(articleId));
      if (articleIndex !== -1) {
        // Store the original article for comparison
        const originalArticle = { ...articles[articleIndex] };
        
        // Merge the updated data with existing article data
        articles[articleIndex] = {
          ...articles[articleIndex],
          ...updatedArticle,
          // Preserve existing fields that might not be in the response
          featured_image: updatedArticle.featured_image || articles[articleIndex].featured_image,
          created_at: articles[articleIndex].created_at,
          author_id: articles[articleIndex].author_id
        };
        
        // Update filtered articles as well
        filteredArticles = [...articles];
        
        // Re-render the articles table immediately
        renderArticles();
        updateStats();
        
        console.log('✅ Article updated in local array and UI refreshed immediately');
        console.log('📊 Changes made:');
        console.log('  - Title:', originalArticle.title, '→', articles[articleIndex].title);
        console.log('  - Status:', originalArticle.status, '→', articles[articleIndex].status);
        console.log('  - Category ID:', originalArticle.category_id, '→', articles[articleIndex].category_id);
        console.log('  - Featured:', originalArticle.is_featured, '→', articles[articleIndex].is_featured);
      } else {
        console.warn('⚠️ Article not found in local array for immediate update');
      }
    } catch (updateError) {
      console.warn('⚠️ Local update error (non-critical):', updateError);
      // Continue with the flow even if local update fails
    }
    
    // Force refresh of the specific article's image display if needed
    try {
      if (updatedArticle.featured_image) {
        console.log('🔄 Calling refreshArticleImageDisplay with:', {
          articleId: parseInt(articleId),
          imageData: updatedArticle.featured_image,
          imageDataType: typeof updatedArticle.featured_image,
          hasUrl: updatedArticle.featured_image && updatedArticle.featured_image.url
        });
        refreshArticleImageDisplay(parseInt(articleId), updatedArticle.featured_image);
      }
    } catch (imageError) {
      console.warn('⚠️ Image refresh error (non-critical):', imageError);
    }
    
    // Also refresh from server in background to ensure consistency
    setTimeout(async () => {
      console.log('🔄 Refreshing articles list from server in background...');
      try {
        await loadArticles();
        console.log('✅ Background refresh completed');
      } catch (error) {
        console.warn('⚠️ Background refresh failed, but local update succeeded:', error);
      }
    }, 1000);
    
    // Show success message with details
    const successMessage = `Article "${updatedArticle.title}" mis à jour avec succès!`;
    console.log('📢 Showing success message:', successMessage);
    showNotification(successMessage, 'success');
    console.log('✅ Success notification shown');
    
    console.log('🎉 Update operation completed successfully!');
    console.log('✅ Success notification shown to user');
    console.log('✅ Local UI updated immediately');
    console.log('✅ Background server sync scheduled');
    
    // IMPORTANT: If we get here, the update was successful
    // No error should be shown to the user
    console.log('🚀 Exiting function successfully');
    
    // Close modal after a short delay so user can see success message
    setTimeout(() => {
      try {
        closeEditModal();
        console.log('✅ Modal closed successfully');
        
        // Reload the page to show updated content
        setTimeout(() => {
          console.log('🔄 Reloading page to show updated content...');
          window.location.reload();
        }, 1000);
        
      } catch (modalError) {
        console.warn('⚠️ Modal close error (non-critical):', modalError);
        // Still try to reload the page
        setTimeout(() => {
          console.log('🔄 Reloading page after modal error...');
          window.location.reload();
        }, 1000);
      }
    }, 1500); // Wait 1.5 seconds before closing modal
    
    // Additional safety: ensure we exit successfully
    console.log('🎯 Function completed successfully, exiting...');
    console.log('🎯 This should never reach the catch block below');
    return; // Exit successfully, don't go to error handling
    
  } catch (error) {
    console.error('❌ Error updating article:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error constructor:', error.constructor.name);
    
    // Provide specific error messages
    let errorMessage = 'Erreur lors de la mise à jour';
    if (error.message.includes('HTTP 400')) {
      errorMessage = 'Données invalides. Vérifiez que tous les champs requis sont remplis.';
    } else if (error.message.includes('HTTP 404')) {
      errorMessage = 'Article non trouvé. Il a peut-être été supprimé.';
    } else if (error.message.includes('HTTP 500')) {
      errorMessage = 'Erreur serveur. L\'article a peut-être été modifié malgré l\'erreur.';
    } else if (error.message.includes('No response received')) {
      errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.';
    } else {
      errorMessage = `Erreur: ${error.message}`;
    }
    
    showNotification(errorMessage, 'error');
  }
}

// Setup backdrop click and ESC key handlers
function setupModalBackdropHandlers() {
  const modal = document.getElementById('editArticleModal');
  const backdrop = modal.querySelector('.absolute.inset-0.bg-black\\/60');
  
  if (backdrop) {
    backdrop.removeEventListener('click', handleCancelEdit);
    backdrop.addEventListener('click', handleCancelEdit);
  }
  
  // ESC key handler
  document.removeEventListener('keydown', handleEscKey);
  document.addEventListener('keydown', handleEscKey);
}

function handleEscKey(event) {
  if (event.key === 'Escape') {
    const modal = document.getElementById('editArticleModal');
    if (!modal.classList.contains('hidden')) {
      handleCancelEdit();
    }
  }
}

// Image upload functionality
function setupImageHandlers() {
  const imageFileUpload = document.getElementById('imageFileUpload');
  const removeCurrentImage = document.getElementById('removeCurrentImage');
  const removeUploadedImage = document.getElementById('removeUploadedImage');

  if (imageFileUpload) {
    imageFileUpload.addEventListener('change', handleImageUpload);
  }

  if (removeCurrentImage) {
    removeCurrentImage.addEventListener('click', () => {
      document.getElementById('currentImagePreview').classList.add('hidden');
    });
  }

  if (removeUploadedImage) {
    removeUploadedImage.addEventListener('click', () => {
      document.getElementById('uploadedImagePreview').classList.add('hidden');
      imageFileUpload.value = '';
    });
  }
}

function handleImageUpload(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const uploadedImage = document.getElementById('uploadedImage');
      const uploadedImagePreview = document.getElementById('uploadedImagePreview');
      
      if (uploadedImage && uploadedImagePreview) {
        uploadedImage.src = e.target.result;
        uploadedImagePreview.classList.remove('hidden');
        
        // File uploaded successfully
      }
    };
    reader.readAsDataURL(file);
  }
}

function resetImagePreviews() {
  // Hide all image previews
  const currentImagePreview = document.getElementById('currentImagePreview');
  const uploadedImagePreview = document.getElementById('uploadedImagePreview');
  
  if (currentImagePreview) currentImagePreview.classList.add('hidden');
  if (uploadedImagePreview) uploadedImagePreview.classList.add('hidden');
  
  // Reset file input
  const imageFileUpload = document.getElementById('imageFileUpload');
  if (imageFileUpload) imageFileUpload.value = '';
}

// Edit form is now handled by handleEditFormSubmit function
// No need for duplicate event listeners

window.deleteArticleConfirm = function(articleId) {
  console.log('🗑️ Legacy deleteArticleConfirm called, redirecting to archive...');
  // Redirect to the new archive function for backward compatibility
  if (typeof archiveArticle === 'function') {
    archiveArticle(articleId);
  } else {
    console.error('❌ archiveArticle function not available');
    alert('Fonction de suppression non disponible. Veuillez recharger la page.');
  }
};

// Search functionality
function setupSearch() {
  const searchInput = document.getElementById('searchArticles');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchArticles(e.target.value);
    });
  }
}

// Refresh article image display after update
function refreshArticleImageDisplay(articleId, newImageData) {
  try {
    console.log('🔄 Refreshing image display for article:', articleId);
    console.log('🖼️ New image data:', newImageData);
    
    // Find the article row in the table
    const articleRow = document.querySelector(`tr[data-article-id="${articleId}"]`);
    if (!articleRow) {
      console.log('⚠️ Article row not found for ID:', articleId);
      console.log('🔍 Available rows:', document.querySelectorAll('tr[data-article-id]'));
      return;
    }
    
    console.log('✅ Found article row:', articleRow);
    
    // Find the image cell (first cell with image)
    const imageCell = articleRow.querySelector('td:first-child .w-10.h-10');
    if (!imageCell) {
      console.log('⚠️ Image cell not found');
      console.log('🔍 Available cells in first td:', articleRow.querySelector('td:first-child').innerHTML);
      return;
    }
    
    console.log('✅ Found image cell:', imageCell);
    console.log('🔍 Image cell HTML:', imageCell.outerHTML);
    console.log('🔍 Image cell nextElementSibling:', imageCell.nextElementSibling);
    console.log('🔍 Image cell nextElementSibling type:', typeof imageCell.nextElementSibling);
    if (imageCell.nextElementSibling) {
      console.log('🔍 nextElementSibling HTML:', imageCell.nextElementSibling.outerHTML);
      console.log('🔍 nextElementSibling has style:', typeof imageCell.nextElementSibling.style !== 'undefined');
    }
    
    // Update the image display
    console.log('🔍 Checking image data:', {
      newImageData: newImageData,
      newImageDataType: typeof newImageData,
      hasUrl: newImageData && newImageData.url,
      urlValue: newImageData && newImageData.url
    });
    
    if (newImageData && newImageData.url) {
      console.log('🖼️ Creating new image element with URL:', newImageData.url);
      
      // Convert relative upload URLs to absolute URLs for cross-server access
      let displayUrl = newImageData.url;
      if (displayUrl.startsWith('/uploads/')) {
        // Convert relative upload URL to absolute adminblog URL
        displayUrl = `http://localhost:4322${displayUrl}`;
        console.log('🔄 Converted relative URL to absolute in refresh:', displayUrl);
      }
      
      // Check if it's a data URL (GPT-generated image)
      const isDataUrl = displayUrl.startsWith('data:image/');
      
      // Create new image element
      const newImage = document.createElement('img');
      newImage.src = displayUrl;
      newImage.alt = newImageData.alt || 'Article image';
      newImage.className = 'w-10 h-10 rounded-lg object-cover';
      
      // Add data attribute for GPT-generated images
      if (isDataUrl) {
        newImage.setAttribute('data-gpt-generated', 'true');
      }
      
      newImage.onerror = function() {
        try {
          console.log('❌ Image failed to load:', this.src);
          console.log('🔍 this element:', this);
          console.log('🔍 this type:', typeof this);
          console.log('🔍 this has style:', this && typeof this.style !== 'undefined');
          
          // Check if this element still exists and has style property
          if (this && typeof this.style !== 'undefined') {
            this.style.display = 'none';
            console.log('✅ Image hidden successfully');
          } else {
            console.log('⚠️ Cannot hide image - element or style property missing');
          }
          
          // Check nextElementSibling
          console.log('🔍 nextElementSibling:', this.nextElementSibling);
          console.log('🔍 nextElementSibling type:', typeof this.nextElementSibling);
          console.log('🔍 nextElementSibling has style:', this.nextElementSibling && typeof this.nextElementSibling.style !== 'undefined');
          
          if (this.nextElementSibling && typeof this.nextElementSibling.style !== 'undefined') {
            this.nextElementSibling.style.display = 'flex';
            console.log('✅ Fallback icon shown');
          } else {
            console.log('⚠️ No fallback icon found or it has no style property');
          }
        } catch (styleError) {
          console.error('❌ Error handling image error display:', styleError);
          console.error('❌ Error details:', {
            message: styleError.message,
            stack: styleError.stack,
            element: this,
            elementType: typeof this
          });
        }
      };
      newImage.onload = function() {
        try {
          console.log('✅ Image loaded successfully:', this.src);
          console.log('🔍 this element:', this);
          console.log('🔍 this type:', typeof this);
          
          if (this.nextElementSibling && typeof this.nextElementSibling.style !== 'undefined') {
            this.nextElementSibling.style.display = 'none';
            console.log('✅ Fallback icon hidden');
          } else {
            console.log('⚠️ No fallback icon found or it has no style property');
          }
        } catch (styleError) {
          console.error('❌ Error handling image load display:', styleError);
          console.error('❌ Error details:', {
            message: styleError.message,
            stack: styleError.stack,
            element: this,
            elementType: typeof this
          });
        }
      };
      
      // Replace the existing image
      const existingImage = imageCell.querySelector('img');
      if (existingImage) {
        existingImage.replaceWith(newImage);
      } else {
        // If no existing image, insert before the fallback icon
        imageCell.insertBefore(newImage, imageCell.firstChild);
      }
      
      console.log('✅ Image display updated successfully');
      
    } else {
      console.log('⚠️ No valid image data to display');
      // Show fallback icon
      try {
        const existingImage = imageCell.querySelector('img');
        if (existingImage && typeof existingImage.style !== 'undefined') {
          existingImage.style.display = 'none';
          console.log('✅ Existing image hidden');
        }
        
        if (imageCell.nextElementSibling && typeof imageCell.nextElementSibling.style !== 'undefined') {
          imageCell.nextElementSibling.style.display = 'flex';
          console.log('✅ Fallback icon shown');
        } else {
          console.log('⚠️ No fallback icon found or it has no style property');
        }
      } catch (fallbackError) {
        console.error('❌ Error handling fallback icon display:', fallbackError);
      }
    }
    
  } catch (error) {
    console.error('❌ Error refreshing image display:', error);
  }
}

// Debug: Ensure functions are available globally
window.addEventListener('load', () => {
  console.log('🔧 Articles.js loaded. Available functions:');
  console.log('- editArticle:', typeof window.editArticle);
  console.log('- deleteArticle:', typeof window.deleteArticle);
  console.log('- updateArticle:', typeof updateArticle);
  console.log('- archiveArticle:', typeof archiveArticle);
});

// Set up event delegation for article action buttons
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🔧 Setting up article button event delegation...');
  console.log('🔧 DOM Content Loaded - articles.js is running!');
  
  // Load articles on page load
  console.log('🚀 Loading articles on page load...');
  await loadArticles();
  
  // Delegate click events for article buttons
  document.addEventListener('click', (e) => {
    // Debug: Log all clicks to see if event delegation is working
    if (e.target.closest('.edit-article-btn') || e.target.closest('.delete-article-btn') || e.target.closest('.view-article-btn')) {
      console.log('🖱️ Button click detected!', e.target);
    }
    
    // Check which button was clicked and get the ID directly from that button
    const deleteBtn = e.target.closest('.delete-article-btn');
    const editBtn = e.target.closest('.edit-article-btn');
    const viewBtn = e.target.closest('.view-article-btn');
    
    if (deleteBtn) {
      e.preventDefault();
      const articleId = deleteBtn.dataset.articleId;
      console.log('🗑️ Delete button clicked for article:', articleId, 'Type:', typeof articleId);
      console.log('🔍 Delete button element:', deleteBtn);
      console.log('🔍 All data attributes on button:', deleteBtn.dataset);
      window.deleteArticle(parseInt(articleId));
    } else if (editBtn) {
      e.preventDefault();
      const articleId = editBtn.dataset.articleId;
      console.log('✏️ Edit button clicked for article:', articleId, 'Type:', typeof articleId);
      console.log('🔍 Edit button element:', editBtn);
      console.log('🔍 All data attributes on button:', editBtn.dataset);
      window.editArticle(parseInt(articleId));
    } else if (viewBtn) {
      e.preventDefault();
      const articleId = viewBtn.dataset.articleId;
      console.log('👁️ View button clicked for article:', articleId);
      console.log('🔍 View button element:', viewBtn);
      window.viewArticle(parseInt(articleId));
    }
  });
  
  console.log('✅ Article button event delegation set up successfully');
  
  // Debug: Check if buttons exist
  setTimeout(() => {
    const editBtns = document.querySelectorAll('.edit-article-btn');
    const deleteBtns = document.querySelectorAll('.delete-article-btn');
    const viewBtns = document.querySelectorAll('.view-article-btn');
    
    console.log('🔍 Found buttons:', {
      edit: editBtns.length,
      delete: deleteBtns.length,
      view: viewBtns.length
    });
    
    if (editBtns.length > 0) {
      console.log('🔍 First edit button:', editBtns[0]);
      console.log('🔍 First edit button data-article-id:', editBtns[0].dataset.articleId);
    }
  }, 1000);
});

// Test function for debugging - you can call this from browser console
window.testButtonFunctionality = function() {
  console.log('🧪 Testing button functionality...');
  console.log('Articles loaded:', articles.length);
  console.log('Available functions:', {
    viewArticle: typeof window.viewArticle,
    editArticle: typeof window.editArticle,
    deleteArticle: typeof window.deleteArticle
  });
  
  const buttons = {
    edit: document.querySelectorAll('.edit-article-btn').length,
    delete: document.querySelectorAll('.delete-article-btn').length,
    view: document.querySelectorAll('.view-article-btn').length
  };
  console.log('Buttons found:', buttons);
  
  // Test with first article if available
  if (articles.length > 0) {
    console.log('Testing with first article ID:', articles[0].id);
    try {
      window.viewArticle(articles[0].id);
    } catch (error) {
      console.error('Error testing viewArticle:', error);
    }
  }
};

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full ${
    type === 'success' ? 'bg-green-500 text-white' :
    type === 'error' ? 'bg-red-500 text-white' :
    'bg-blue-500 text-white'
  }`;
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Show notification
  setTimeout(() => {
    notification.classList.remove('translate-x-full');
  }, 100);
  
  // Hide and remove notification
  setTimeout(() => {
    notification.classList.add('translate-x-full');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// Setup event handlers for article images
function setupArticleImageHandlers() {
  console.log('🔧 Setting up article image handlers...');
  
  // Find all article images and set up error/load handlers
  const articleImages = document.querySelectorAll('.article-image');
  console.log('🔍 Found article images:', articleImages.length);
  
  articleImages.forEach((img, index) => {
    console.log(`🔧 Setting up handlers for image ${index + 1}:`, img.src);
    
    // Set up error handler
    img.onerror = function() {
      try {
        console.log('❌ Article image failed to load:', this.src);
        console.log('🔍 this element:', this);
        console.log('🔍 this type:', typeof this);
        console.log('🔍 this has style:', this && typeof this.style !== 'undefined');
        
        // Check if this element still exists and has style property
        if (this && typeof this.style !== 'undefined') {
          this.style.display = 'none';
          console.log('✅ Article image hidden successfully');
        } else {
          console.log('⚠️ Cannot hide article image - element or style property missing');
        }
        
        // Find and show fallback icon
        const fallbackIcon = this.parentElement.querySelector('.fallback-icon');
        if (fallbackIcon && typeof fallbackIcon.style !== 'undefined') {
          fallbackIcon.style.display = 'flex';
          console.log('✅ Fallback icon shown');
        } else {
          console.log('⚠️ No fallback icon found or it has no style property');
        }
      } catch (styleError) {
        console.error('❌ Error handling article image error display:', styleError);
        console.error('❌ Error details:', {
          message: styleError.message,
          stack: styleError.stack,
          element: this,
          elementType: typeof this
        });
      }
    };
    
    // Set up load handler
    img.onload = function() {
      try {
        console.log('✅ Article image loaded successfully:', this.src);
        
        // Find and hide fallback icon
        const fallbackIcon = this.parentElement.querySelector('.fallback-icon');
        if (fallbackIcon && typeof fallbackIcon.style !== 'undefined') {
          fallbackIcon.style.display = 'none';
          console.log('✅ Fallback icon hidden');
        } else {
          console.log('⚠️ No fallback icon found or it has no style property');
        }
      } catch (styleError) {
        console.error('❌ Error handling article image load display:', styleError);
        console.error('❌ Error details:', {
          message: styleError.message,
          stack: styleError.stack,
          element: this,
          elementType: typeof this
        });
      }
    };
    
    console.log(`✅ Handlers set up for image ${index + 1}`);
  });
  
  console.log('✅ Article image handlers setup completed');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 DOM loaded, initializing articles...');
  console.log('🔍 Looking for articlesCount element...');
  const articlesCountElement = document.getElementById('articlesCount');
  if (articlesCountElement) {
    console.log('✅ Found articlesCount element:', articlesCountElement);
    console.log('📊 Current articles count text:', articlesCountElement.textContent);
  } else {
    console.error('❌ articlesCount element not found!');
  }
  
  // Also set up the edit form handler immediately
  console.log('🔧 Setting up edit form handler...');
  setupEditFormHandler();
  console.log('✅ Edit form handler set up');
  
  // Also set up save button handler
  const saveButton = document.getElementById('saveEditArticleBtn');
  if (saveButton) {
    console.log('🔍 Setting up save button click handler...');
    saveButton.removeEventListener('click', handleSaveButtonClick);
    saveButton.addEventListener('click', handleSaveButtonClick);
    console.log('✅ Save button handler set up');
  } else {
    console.log('⚠️ Save button not found during initial setup');
  }
  
  loadArticles();
  setupSearch();
  setupImageHandlers();
  setupArticleImageHandlers();
  
  // Expose functions to global scope for HTML onclick handlers
  console.log('🌐 Exposing functions to global scope...');
  
  // Make sure functions exist before exposing
  if (typeof archiveArticle === 'function') {
    window.archiveArticle = archiveArticle;
    console.log('✅ archiveArticle exposed');
  } else {
    console.error('❌ archiveArticle function not found');
  }
  
  if (typeof deleteArticle === 'function') {
    window.deleteArticle = deleteArticle;
    console.log('✅ deleteArticle exposed');
  } else {
    console.error('❌ deleteArticle function not found');
  }
  
  if (typeof viewArchivedArticles === 'function') {
    window.viewArchivedArticles = viewArchivedArticles;
    console.log('✅ viewArchivedArticles exposed');
  } else {
    console.error('❌ viewArchivedArticles function not found');
  }
  
  if (typeof restoreArticle === 'function') {
    window.restoreArticle = restoreArticle;
    console.log('✅ restoreArticle exposed');
  } else {
    console.error('❌ restoreArticle function not found');
  }
  
  console.log('✅ Functions exposed to global scope');
  
  // Test function availability
  console.log('🔍 Testing global functions:');
  console.log('  - window.archiveArticle:', typeof window.archiveArticle);
  console.log('  - window.deleteArticle:', typeof window.deleteArticle);
  console.log('  - window.viewArchivedArticles:', typeof window.viewArchivedArticles);
  console.log('  - window.restoreArticle:', typeof window.restoreArticle);
});

// Test function to verify everything is working
window.testDeleteFunctions = function() {
  console.log('🧪 Testing delete functions...');
  console.log('🔍 archiveArticle:', typeof window.archiveArticle);
  console.log('🔍 deleteArticle:', typeof window.deleteArticle);
  console.log('🔍 viewArchivedArticles:', typeof window.viewArchivedArticles);
  console.log('🔍 restoreArticle:', typeof window.restoreArticle);
  
  if (typeof window.archiveArticle === 'function') {
    console.log('✅ archiveArticle is available');
  } else {
    console.error('❌ archiveArticle is not available');
  }
  
  if (typeof window.deleteArticle === 'function') {
    console.log('✅ deleteArticle is available');
  } else {
    console.error('❌ deleteArticle is not available');
  }
  
  return 'Test completed - check console for results';
};

// Simple test function for delete button
window.testDeleteButton = function(articleId = 1) {
  console.log('🧪 Testing delete button with article ID:', articleId);
  
  if (typeof window.deleteArticle === 'function') {
    console.log('✅ deleteArticle function found, calling it...');
    try {
      window.deleteArticle(articleId);
      return 'deleteArticle called successfully';
    } catch (error) {
      console.error('❌ Error calling deleteArticle:', error);
      return 'Error: ' + error.message;
    }
  } else {
    console.error('❌ deleteArticle function not found!');
    return 'deleteArticle function not available';
  }
};