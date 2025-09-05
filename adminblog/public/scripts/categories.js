// Gestion des catégories avec base de données
console.log('🚀 Categories script loading...');

// Global categories variable for client-side use
let categories = [];

document.addEventListener('DOMContentLoaded', function() {
  loadCategories();
});

// Modal functionality
const categoryModal = document.getElementById('categoryModal');
const addCategoryBtn = document.getElementById('addCategoryBtn');
const closeCategoryModal = document.getElementById('closeCategoryModal');
const cancelCategory = document.getElementById('cancelCategory');
const categoryForm = document.getElementById('categoryForm');
const modalTitle = document.getElementById('modalTitle');

let editingCategoryId = null;

// Color helpers
function hexToRgb(hex) {
  const clean = (hex || '').toString().trim().replace('#', '');
  if (clean.length === 3) {
    const r = clean[0];
    const g = clean[1];
    const b = clean[2];
    return [parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16)];
  }
  if (clean.length === 6) {
    return [
      parseInt(clean.substring(0, 2), 16),
      parseInt(clean.substring(2, 4), 16),
      parseInt(clean.substring(4, 6), 16)
    ];
  }
  // Fallback to primary color (Tailwind blue-500)
  return [59, 130, 246];
}

function buildGradient(colorHex) {
  const [r, g, b] = hexToRgb(colorHex);
  const isDark = document.documentElement.classList.contains('dark');
  // Light translucent color to subtle tint
  const start = `rgba(${r}, ${g}, ${b}, ${isDark ? 0.18 : 0.22})`;
  const mid = `rgba(${r}, ${g}, ${b}, ${isDark ? 0.10 : 0.12})`;
  const end = isDark ? 'rgba(17, 24, 39, 0.85)' /* gray-900 */ : 'rgba(255, 255, 255, 0.95)';
  return `linear-gradient(135deg, ${start} 0%, ${mid} 45%, ${end} 100%)`;
}

function setCardStyles(card, colorHex) {
  const [r, g, b] = hexToRgb(colorHex);
  card.style.background = buildGradient(colorHex);
  card.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.35)`;
}

// Event listeners
if (addCategoryBtn) {
  addCategoryBtn.addEventListener('click', () => {
    editingCategoryId = null;
    modalTitle.textContent = 'Nouvelle Catégorie';
    categoryForm.reset();
    document.getElementById('categoryColor').value = '#3B82F6';
    document.getElementById('categoryIcon').value = '📁';
    categoryModal.classList.remove('hidden');
    
    // Clear any previous validation messages
    clearValidationMessages();
  });
}

// Add real-time validation for category name
const categoryNameInput = document.getElementById('categoryName');
if (categoryNameInput) {
  categoryNameInput.addEventListener('input', function() {
    validateCategoryName(this.value.trim());
  });
}

function validateCategoryName(name) {
  const validationDiv = document.getElementById('categoryNameValidation') || createValidationDiv();
  
  if (!name) {
    validationDiv.textContent = '';
    validationDiv.className = 'text-sm mt-1';
    return;
  }
  
  // Check for duplicates
  if (categories && categories.length > 0) {
    const duplicate = categories.find(cat => 
      cat.name.toLowerCase() === name.toLowerCase() && 
      (!editingCategoryId || cat.id !== editingCategoryId)
    );
    
    if (duplicate) {
      validationDiv.textContent = `⚠️ Une catégorie "${name}" existe déjà`;
      validationDiv.className = 'text-sm mt-1 text-red-600 dark:text-red-400';
    } else {
      validationDiv.textContent = `✅ Nom disponible`;
      validationDiv.className = 'text-sm mt-1 text-green-600 dark:text-green-400';
    }
  }
}

function createValidationDiv() {
  const nameInput = document.getElementById('categoryName');
  const validationDiv = document.createElement('div');
  validationDiv.id = 'categoryNameValidation';
  validationDiv.className = 'text-sm mt-1';
  nameInput.parentNode.appendChild(validationDiv);
  return validationDiv;
}

function clearValidationMessages() {
  const validationDiv = document.getElementById('categoryNameValidation');
  if (validationDiv) {
    validationDiv.textContent = '';
  }
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
  categoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const categoryData = {
      name: document.getElementById('categoryName').value.trim(),
      description: document.getElementById('categoryDesc').value.trim(),
      color: document.getElementById('categoryColor').value,
      icon: document.getElementById('categoryIcon').value.trim() || '📁',
      featured: document.getElementById('categoryFeatured').checked,
      sortOrder: 0
    };
    
    if (!categoryData.name) {
      alert('Veuillez saisir un nom pour la catégorie.');
      return;
    }
    
    // Check for duplicate names in existing categories (client-side validation)
    if (categories && categories.length > 0) {
      const duplicateName = categories.find(cat => 
        cat.name.toLowerCase() === categoryData.name.toLowerCase()
      );
      
      if (duplicateName && (!editingCategoryId || duplicateName.id !== editingCategoryId)) {
        alert(`Une catégorie avec le nom "${categoryData.name}" existe déjà. Veuillez choisir un autre nom.`);
        return;
      }
    }
    
    try {
      if (editingCategoryId) {
        // Update existing category
        await updateCategory(editingCategoryId, categoryData);
        showNotification(`Catégorie "${categoryData.name}" mise à jour avec succès !`, 'success');
      } else {
        // Create new category
        await createCategory(categoryData);
        showNotification(`Catégorie "${categoryData.name}" créée avec succès !`, 'success');
      }
      
      // Close modal and reload
      categoryModal.classList.add('hidden');
      categoryForm.reset();
      editingCategoryId = null;
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      let errorMessage = 'Erreur lors de la sauvegarde de la catégorie.';
      
      if (error.message) {
        // Handle specific error cases
        if (error.message.includes('409') || error.message.includes('existe déjà')) {
          errorMessage = `Une catégorie avec le nom "${categoryData.name}" existe déjà. Veuillez choisir un nom différent.`;
        } else if (error.message.includes('400')) {
          errorMessage = 'Données invalides. Veuillez vérifier que tous les champs requis sont remplis.';
        } else if (error.message.includes('503')) {
          errorMessage = 'Service temporairement indisponible. Veuillez réessayer plus tard.';
        } else {
          errorMessage += ' Détails: ' + error.message;
        }
      }
      
      showNotification(errorMessage, 'error');
    }
  });
}

// Global functions for edit/delete buttons
window.editCategory = function(categoryId) {
  try {
    // Find category in the current display
    const categoryElement = document.querySelector(`[data-category-id="${categoryId}"]`);
    if (categoryElement) {
      const category = {
        id: categoryId,
        name: categoryElement.querySelector('[data-category-name]').textContent,
        description: categoryElement.querySelector('[data-category-description]')?.textContent || '',
        color: categoryElement.querySelector('[data-category-color]')?.style.backgroundColor || '#3B82F6',
        icon: categoryElement.querySelector('[data-category-icon]')?.textContent || '📁',
        featured: categoryElement.querySelector('[data-category-featured]')?.classList.contains('featured') || false
      };
      
      editingCategoryId = categoryId;
      modalTitle.textContent = 'Modifier la Catégorie';
      
      document.getElementById('categoryName').value = category.name;
      document.getElementById('categoryDesc').value = category.description;
      document.getElementById('categoryColor').value = category.color;
      document.getElementById('categoryIcon').value = category.icon;
      document.getElementById('categoryFeatured').checked = category.featured;
      
      categoryModal.classList.remove('hidden');
    } else {
      showNotification('Catégorie non trouvée.', 'error');
    }
  } catch (error) {
    console.error('Erreur lors du chargement de la catégorie:', error);
    showNotification('Erreur lors du chargement de la catégorie.', 'error');
  }
};

window.deleteCategory = async function(categoryId) {
  if (confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ? Cette action est irréversible.')) {
    try {
      await deleteCategoryFromDB(categoryId);
      showNotification('Catégorie supprimée avec succès !', 'success');
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      showNotification('Erreur lors de la suppression de la catégorie.', 'error');
    }
  }
};

// Database API functions
async function loadCategories() {
  try {
    console.log('🔄 Loading categories from API...');
    
    // Show loading state
    const categoriesGrid = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.gap-6');
    if (categoriesGrid) {
      categoriesGrid.innerHTML = `
        <div class="col-span-full text-center py-12">
          <div class="text-6xl mb-4 opacity-60 animate-pulse">📁</div>
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Chargement des catégories...</h3>
          <p class="text-gray-500 dark:text-gray-400">Veuillez patienter pendant le chargement.</p>
        </div>
      `;
    }
    
    const response = await fetch('/api/categories');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    console.log('📁 Raw API response:', data);
    console.log('📁 Response structure:', {
      success: data.success,
      hasCategories: !!data.categories,
      categoriesType: Array.isArray(data.categories) ? 'array' : typeof data.categories,
      categoriesLength: Array.isArray(data.categories) ? data.categories.length : 'not array'
    });
    
    const list = Array.isArray(data) ? data : (data?.categories || []);
    console.log('📋 Parsed categories list:', list);
    
    categories = Array.isArray(list) ? list : []; // Set the global categories variable
    console.log('✅ Global categories set:', categories);

    if (categories.length > 0) {
      displayCategories(categories);
      updateCategoryStats(categories);
    } else {
      showEmptyState();
    }
  } catch (error) {
    console.error('❌ Erreur lors du chargement des catégories:', error);
    showNotification('Erreur lors du chargement des catégories.', 'error');
    categories = []; // Ensure categories is always an array
    
    // Show error state
    const categoriesGrid = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.gap-6');
    if (categoriesGrid) {
      categoriesGrid.innerHTML = `
        <div class="col-span-full text-center py-12">
          <div class="text-6xl mb-4 opacity-60">❌</div>
          <h3 class="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Erreur de chargement</h3>
          <p class="text-gray-500 dark:text-gray-400 mb-4">Impossible de charger les catégories depuis la base de données.</p>
          <button 
            onclick="loadCategories()"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Réessayer
          </button>
        </div>
      `;
    }
  }
}

async function createCategory(categoryData) {
  console.log('🚀 Creating category with data:', categoryData);
  
  try {
  const response = await fetch('/api/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(categoryData)
  });
    
    console.log('📡 API Response status:', response.status);
  
  if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error response:', errorText);
      
      try {
        const error = JSON.parse(errorText);
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
      } catch (parseError) {
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }
    }
    
    const result = await response.json();
    console.log('✅ Category created successfully:', result);
    return result;
  } catch (fetchError) {
    console.error('❌ Network or fetch error:', fetchError);
    throw new Error(`Erreur de connexion: ${fetchError.message}`);
  }
}

async function updateCategory(id, categoryData) {
  const response = await fetch('/api/categories', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ id, ...categoryData })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update category');
  }
  
  return await response.json();
}

async function deleteCategoryFromDB(id) {
  const response = await fetch(`/api/categories?id=${id}`, {
    method: 'DELETE'
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete category');
  }
  
  return await response.json();
}

function displayCategories(categories) {
  const categoriesGrid = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.gap-6');
  if (!categoriesGrid) return;
  
  // Clear existing content
  categoriesGrid.innerHTML = '';
  
  categories.forEach(category => {
    const categoryCard = createCategoryCard(category);
    categoriesGrid.appendChild(categoryCard);
  });
}

function createCategoryCard(category) {
  const card = document.createElement('div');
  card.className = 'group rounded-xl p-6 border hover:shadow-lg transition-all duration-300 hover:scale-105';
  card.setAttribute('data-category-id', category.id);
  setCardStyles(card, category.color || '#3B82F6');
  
  card.innerHTML = `
    <div class="flex items-start justify-between mb-4">
      <div class="flex items-center space-x-3">
        <div 
          class="w-12 h-12 rounded-lg flex items-center justify-center text-white text-lg font-bold shadow-lg"
          style="background: ${category.color || '#3B82F6'}"
          data-category-color
        >
          <span data-category-icon>${category.icon || '📁'}</span>
        </div>
        <div>
          <h4 class="text-lg font-semibold text-gray-900 dark:text-white" data-category-name>${category.name}</h4>
          <p class="text-sm text-gray-500 dark:text-gray-400" data-category-description>${category.description || 'Aucune description'}</p>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <button 
          onclick="editCategory(${category.id})"
          class="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Modifier"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
        </button>
        <button 
          onclick="deleteCategory(${category.id})"
          class="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Supprimer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
    </div>
    
    <div class="space-y-3">
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500 dark:text-gray-400">Créée le:</span>
        <span class="text-gray-700 dark:text-gray-300">${new Date(category.created_at).toLocaleDateString('fr-FR')}</span>
      </div>
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500 dark:text-gray-400">Modifiée le:</span>
        <span class="text-gray-700 dark:text-gray-300">${new Date(category.updated_at).toLocaleDateString('fr-FR')}</span>
      </div>
    </div>
    
    <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
      <div class="flex items-center justify-between">
        <span class="text-sm text-gray-500 dark:text-gray-400">Statut:</span>
        <span class="px-2 py-1 text-xs rounded-full ${category.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'}">
          ${category.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
  `;
  
  return card;
}

function updateCategoryStats(categoriesArray) {
  const total = categoriesArray.length;
  const active = categoriesArray.filter(c => c.is_active).length;
  const totalArticles = 0; // TODO: Implement article count
  
  // Update stats display
  const totalElement = document.querySelector('[data-stat="total"]');
  const featuredElement = document.querySelector('[data-stat="featured"]');
  const articlesElement = document.querySelector('[data-stat="totalArticles"]');
  
  if (totalElement) totalElement.textContent = total;
  if (featuredElement) featuredElement.textContent = active;
  if (articlesElement) articlesElement.textContent = totalArticles;
}

function showEmptyState() {
  const categoriesGrid = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.gap-6');
  if (!categoriesGrid) return;
  
  categoriesGrid.innerHTML = `
    <div class="col-span-full text-center py-12">
      <div class="text-6xl mb-4 opacity-60">📁</div>
      <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Aucune catégorie trouvée</h3>
      <p class="text-gray-500 dark:text-gray-400 mb-6">Commencez par créer votre première catégorie pour organiser vos articles.</p>
      <button 
        onclick="document.getElementById('addCategoryBtn').click()"
        class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
      >
        Créer une catégorie
      </button>
    </div>
  `;
}

function showNotification(message, type = 'info') {
  // Create notification element
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

