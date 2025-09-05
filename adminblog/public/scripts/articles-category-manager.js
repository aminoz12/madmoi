// Category Management for Articles Page
// This script handles category management functionality for editors and admins

document.addEventListener('DOMContentLoaded', function() {
  // Check user role and show/hide category management section
  const userRole = localStorage.getItem('adminRole');
  const categorySection = document.getElementById('categoryManagementSection');
  
  // Display role-specific welcome message
  displayRoleWelcomeMessage(userRole);
  
  if (categorySection && (userRole === 'admin' || userRole === 'editeur')) {
    categorySection.classList.remove('hidden');
    loadUserCategories();
    setupCategoryEventListeners();
  }
});

// Display role-specific welcome message
function displayRoleWelcomeMessage(userRole) {
  const welcomeMessage = document.getElementById('roleWelcomeMessage');
  if (!welcomeMessage) return;
  
  const messages = {
    'admin': '👑 Administrateur - Accès complet à toutes les fonctionnalités',
    'editeur': '✏️ Éditeur - Gérez les articles et les catégories',
    'auteur': '📝 Auteur - Créez et gérez vos articles'
  };
  
  if (messages[userRole]) {
    welcomeMessage.innerHTML = messages[userRole];
  }
}

// Load and display user categories
function loadUserCategories() {
  try {
    const userCategories = JSON.parse(localStorage.getItem('userCategories') || '[]');
    
    if (userCategories.length > 0) {
      displayUserCategories(userCategories);
    } else {
      showEmptyCategoriesState();
    }
  } catch (error) {
    console.error('Erreur lors du chargement des catégories:', error);
  }
}

function displayUserCategories(userCategories) {
  const categoriesGrid = document.getElementById('categoriesGrid');
  if (!categoriesGrid) return;
  
  // Clear existing content
  categoriesGrid.innerHTML = '';
  
  userCategories.forEach(category => {
    const categoryCard = createCategoryCard(category);
    categoriesGrid.appendChild(categoryCard);
  });
}

function createCategoryCard(category) {
  const div = document.createElement('div');
  div.className = 'bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-600 hover:shadow-lg transition-all duration-300';
  
  div.innerHTML = `
    <div class="flex items-start justify-between mb-3">
      <div class="flex items-center space-x-3">
        <div 
          class="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-lg"
          style="background: ${category.color}"
        >
          ${category.icon}
        </div>
        <div>
          <h4 class="font-semibold text-gray-900 dark:text-white text-sm">${category.name}</h4>
          <p class="text-xs text-gray-500 dark:text-gray-400">${category.articleCount || 0} articles</p>
        </div>
      </div>
      
      <div class="flex items-center space-x-1">
        ${category.featured ? `
          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
            <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18l-6-6h4V4h4v8h4l-6 6z" clip-rule="evenodd" />
            </svg>
            À la une
          </span>
        ` : ''}
        
        <div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
          <button 
            class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded"
            title="Modifier"
            onclick="editCategoryFromArticles(${category.id})"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </button>
          <button 
            class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 rounded"
            title="Supprimer"
            onclick="deleteCategoryFromArticles(${category.id})"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <p class="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
      ${category.description || 'Aucune description'}
    </p>
    
    <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
      <span>Créée le ${new Date(category.createdDate).toLocaleDateString('fr-FR')}</span>
      <span class="px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded-full">
        ${category.slug}
      </span>
    </div>
  `;
  
  return div;
}

function showEmptyCategoriesState() {
  const categoriesGrid = document.getElementById('categoriesGrid');
  if (!categoriesGrid) return;
  
  const emptyState = document.createElement('div');
  emptyState.className = 'col-span-full text-center py-8';
  emptyState.innerHTML = `
    <div class="text-gray-400 dark:text-gray-500">
      <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
      </svg>
      <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Aucune catégorie</h4>
      <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">Commencez par créer votre première catégorie</p>
      <button 
        onclick="document.getElementById('addCategoryBtn').click()"
        class="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors text-sm"
      >
        Créer ma première catégorie
      </button>
    </div>
  `;
  
  categoriesGrid.appendChild(emptyState);
}

// Setup category event listeners
function setupCategoryEventListeners() {
  const categoryModal = document.getElementById('categoryModal');
  const addCategoryBtn = document.getElementById('addCategoryBtn');
  const closeCategoryModal = document.getElementById('closeCategoryModal');
  const cancelCategory = document.getElementById('cancelCategory');
  const categoryForm = document.getElementById('categoryForm');
  const modalTitle = document.getElementById('modalTitle');

  let editingCategoryId = null;

  // Event listeners
  if (addCategoryBtn) {
    addCategoryBtn.addEventListener('click', () => {
      editingCategoryId = null;
      modalTitle.textContent = 'Nouvelle Catégorie';
      categoryForm.reset();
      document.getElementById('categoryColor').value = '#3B82F6';
      document.getElementById('categoryIcon').value = '📁';
      categoryModal.classList.remove('hidden');
    });
  }

  [closeCategoryModal, cancelCategory].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        categoryModal.classList.add('hidden');
        categoryForm.reset();
        editingCategoryId = null;
      });
    }
  });

  if (categoryForm) {
    categoryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const categoryData = {
        id: editingCategoryId || Date.now(),
        name: document.getElementById('categoryName').value.trim(),
        description: document.getElementById('categoryDesc').value.trim(),
        color: document.getElementById('categoryColor').value,
        icon: document.getElementById('categoryIcon').value.trim() || '📁',
        featured: document.getElementById('categoryFeatured').checked,
        slug: generateSlug(document.getElementById('categoryName').value.trim()),
        articleCount: 0,
        createdDate: new Date().toISOString().split('T')[0],
        lastModified: new Date().toISOString().split('T')[0]
      };
      
      if (!categoryData.name) {
        alert('Veuillez saisir un nom pour la catégorie.');
        return;
      }
      
      try {
        let userCategories = JSON.parse(localStorage.getItem('userCategories') || '[]');
        
        if (editingCategoryId) {
          // Update existing category
          const categoryIndex = userCategories.findIndex(c => c.id == editingCategoryId);
          if (categoryIndex !== -1) {
            userCategories[categoryIndex] = { ...userCategories[categoryIndex], ...categoryData };
            console.log('Updating category:', categoryData);
            showNotification(`Catégorie "${categoryData.name}" mise à jour avec succès !`, 'success');
          }
        } else {
          // Create new category
          userCategories.push(categoryData);
          console.log('Creating new category:', categoryData);
          showNotification(`Catégorie "${categoryData.name}" créée avec succès !`, 'success');
        }
        
        localStorage.setItem('userCategories', JSON.stringify(userCategories));
        
        // Close modal and reload categories
        categoryModal.classList.add('hidden');
        categoryForm.reset();
        editingCategoryId = null;
        
        // Reload categories display
        loadUserCategories();
        
      } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        showNotification('Erreur lors de la sauvegarde de la catégorie.', 'error');
      }
    });
  }
}

// Global functions for edit/delete buttons
window.editCategoryFromArticles = function(categoryId) {
  try {
    const userCategories = JSON.parse(localStorage.getItem('userCategories') || '[]');
    const category = userCategories.find(c => c.id == categoryId);
    
    if (category) {
      const modalTitle = document.getElementById('modalTitle');
      const categoryModal = document.getElementById('categoryModal');
      
      modalTitle.textContent = 'Modifier la Catégorie';
      
      document.getElementById('categoryName').value = category.name;
      document.getElementById('categoryDesc').value = category.description || '';
      document.getElementById('categoryColor').value = category.color;
      document.getElementById('categoryIcon').value = category.icon;
      document.getElementById('categoryFeatured').checked = category.featured;
      
      // Store editing state
      window.editingCategoryId = categoryId;
      
      categoryModal.classList.remove('hidden');
    } else {
      showNotification('Catégorie non trouvée.', 'error');
    }
  } catch (error) {
    console.error('Erreur lors du chargement de la catégorie:', error);
    showNotification('Erreur lors du chargement de la catégorie.', 'error');
  }
};

window.deleteCategoryFromArticles = function(categoryId) {
  if (confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ? Cette action est irréversible.')) {
    try {
      let userCategories = JSON.parse(localStorage.getItem('userCategories') || '[]');
      const categoryIndex = userCategories.findIndex(c => c.id == categoryId);
      
      if (categoryIndex !== -1) {
        const categoryName = userCategories[categoryIndex].name;
        userCategories.splice(categoryIndex, 1);
        localStorage.setItem('userCategories', JSON.stringify(userCategories));
        
        console.log('Deleting category:', categoryId);
        showNotification(`Catégorie "${categoryName}" supprimée avec succès !`, 'success');
        
        // Reload categories display
        loadUserCategories();
      } else {
        showNotification('Catégorie non trouvée.', 'error');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      showNotification('Erreur lors de la suppression de la catégorie.', 'error');
    }
  }
};

// Utility functions
function generateSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
}

function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 ${
    type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
  }`;
  
  notification.innerHTML = `
    <div class="flex items-center space-x-3">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        ${type === 'success' 
          ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>'
          : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>'
        }
      </svg>
      <div>
        <p class="font-medium">${message}</p>
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}
