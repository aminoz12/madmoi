// Settings Page Script - User Management and API Configuration

// Users data - will be loaded from database
let users = [];

// API Configuration
let apiConfig = {
  gpt: {
    apiKey: '',
    model: 'gpt-5'
  },
  googleAnalytics: {
    clientId: '',
    clientSecret: '',
    propertyId: ''
  }
};

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing Settings page...');
  
  // Setup event listeners
  setupEventListeners();
  
  // Load saved data
  await loadUsers(); // This will also populate the table
  loadApiConfig();
  
  console.log('Settings page initialized successfully!');
});

// Load users from API
async function loadUsers() {
  try {
    console.log('🔄 Loading users from API...');
    const response = await fetch('/api/users');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    users = data.map(user => ({
      ...user,
      status: user.is_active ? 'active' : 'inactive',
      lastLogin: user.last_login || null,
      permissions: getPermissionsForRole(user.role)
    }));
    
    console.log(`✅ Loaded ${users.length} users from database`);
    populateUsersTable();
  } catch (error) {
    console.error('❌ Error loading users:', error);
    showNotification('Erreur lors du chargement des utilisateurs', 'error');
  }
}

// Get permissions for a role
function getPermissionsForRole(role) {
  console.log('🔍 Getting permissions for role:', role);
  switch (role) {
    case 'admin': return ['all'];
    case 'editor': return ['articles', 'categories'];
    case 'author': return ['articles'];
    default: 
      console.warn('⚠️ Unknown role:', role);
      return [];
  }
}

// Save users to database (not needed anymore as we use API)
function saveUsers() {
  console.log('📝 Users are now managed through the API - no local saving needed');
}

// Load API configuration from localStorage
function loadApiConfig() {
  const savedConfig = localStorage.getItem('apiConfiguration');
  if (savedConfig) {
    try {
      apiConfig = JSON.parse(savedConfig);
      updateApiFormFields();
    } catch (error) {
      console.error('Error loading API config:', error);
    }
  }
}

// Save API configuration to localStorage
function saveApiConfig() {
  localStorage.setItem('apiConfiguration', JSON.stringify(apiConfig));
}

// Update API form fields with saved values
function updateApiFormFields() {
  const gptApiKey = document.getElementById('gptApiKey');
  const gptModel = document.getElementById('gptModel');
  const gaClientId = document.getElementById('gaClientId');
  const gaClientSecret = document.getElementById('gaClientSecret');
  const gaPropertyId = document.getElementById('gaPropertyId');
  
  if (gptApiKey) gptApiKey.value = apiConfig.gpt.apiKey;
  if (gptModel) gptModel.value = apiConfig.gpt.model;
  if (gaClientId) gaClientId.value = apiConfig.googleAnalytics.clientId;
  if (gaClientSecret) gaClientSecret.value = apiConfig.googleAnalytics.clientSecret;
  if (gaPropertyId) gaPropertyId.value = apiConfig.googleAnalytics.propertyId;
}

// Populate users table
function populateUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) {
    console.error('Users table body not found');
    return;
  }

  console.log('Populating users table with:', users);

  tbody.innerHTML = users.map(user => `
    <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td class="px-6 py-5 whitespace-nowrap">
          <div class="flex items-center space-x-4">
          <div class="flex-shrink-0 h-12 w-12">
            <div class="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <span class="text-base font-semibold text-white">${user.username.charAt(0).toUpperCase()}</span>
            </div>
          </div>
          <div>
            <div class="text-sm font-medium text-gray-900 dark:text-white">${user.username}</div>
          </div>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          user.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
          user.role === 'editeur' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        }">
          ${getRoleDisplayName(user.role)}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          user.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
        }">
          ${user.status === 'active' ? 'Actif' : 'Inactif'}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        ${formatLastLogin(user.lastLogin)}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div class="flex space-x-2">
          <button 
            onclick="editUser(${user.id})"
            class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Modifier
          </button>
          ${user.role !== 'admin' ? `
            <button 
              onclick="deleteUser(${user.id})"
              class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
            >
              Supprimer
            </button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

// Get role display name
function getRoleDisplayName(role) {
  switch (role) {
    case 'admin': return 'Administrateur';
    case 'editeur': return 'Éditeur';
    case 'auteur': return 'Auteur';
    default: return role;
  }
}

// Format last login date
function formatLastLogin(lastLogin) {
  if (!lastLogin) return 'Jamais';
  
  const date = new Date(lastLogin);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Setup event listeners
function setupEventListeners() {
  console.log('Setting up event listeners...');
  
  // Add user modal
  const addUserBtn = document.getElementById('addUserBtn');
  const addUserModal = document.getElementById('addUserModal');
  const closeAddUserModal = document.getElementById('closeAddUserModal');
  const cancelAddUser = document.getElementById('cancelAddUser');
  const addUserForm = document.getElementById('addUserForm');

  if (addUserBtn) {
    addUserBtn.addEventListener('click', () => {
      addUserModal.classList.remove('hidden');
    });
  }

  if (closeAddUserModal) {
    closeAddUserModal.addEventListener('click', () => {
      addUserModal.classList.add('hidden');
    });
  }

  if (cancelAddUser) {
    cancelAddUser.addEventListener('click', () => {
      addUserModal.classList.add('hidden');
    });
  }

  if (addUserForm) {
    addUserForm.addEventListener('submit', handleAddUser);
  }

  // Edit user modal
  const editUserModal = document.getElementById('editUserModal');
  const closeEditUserModal = document.getElementById('closeEditUserModal');
  const cancelEditUser = document.getElementById('cancelEditUser');
  const editUserForm = document.getElementById('editUserForm');

  if (closeEditUserModal) {
    closeEditUserModal.addEventListener('click', () => {
      editUserModal.classList.add('hidden');
    });
  }

  if (cancelEditUser) {
    cancelEditUser.addEventListener('click', () => {
      editUserModal.classList.add('hidden');
    });
  }

  if (editUserForm) {
    editUserForm.addEventListener('submit', handleEditUser);
  }

  // API save buttons
  const saveGptApi = document.getElementById('saveGptApi');
  const saveGaApi = document.getElementById('saveGaApi');

  if (saveGptApi) {
    console.log('GPT API save button found, adding event listener');
    saveGptApi.addEventListener('click', saveGptApiConfig);
  } else {
    console.error('GPT API save button not found');
  }

  if (saveGaApi) {
    console.log('GA API save button found, adding event listener');
    saveGaApi.addEventListener('click', saveGaApiConfig);
  } else {
    console.error('GA API save button not found');
  }

  // Toggle password visibility
  const toggleGptKey = document.getElementById('toggleGptKey');
  const toggleGaSecret = document.getElementById('toggleGaSecret');

  if (toggleGptKey) {
    toggleGptKey.addEventListener('click', () => togglePasswordVisibility('gptApiKey', toggleGptKey));
  }

  if (toggleGaSecret) {
    toggleGaSecret.addEventListener('click', () => togglePasswordVisibility('gaClientSecret', toggleGaSecret));
  }
}

// Handle add user form submission
async function handleAddUser(e) {
  e.preventDefault();
  
  const username = document.getElementById('newUsername').value.trim();
  const password = document.getElementById('newPassword').value;
  const role = document.getElementById('newRole').value;
  const email = document.getElementById('newEmail').value.trim();
  const firstName = document.getElementById('newFirstName').value.trim();
  const lastName = document.getElementById('newLastName').value.trim();

  if (!username || !password || !role || !email) {
    showNotification('Veuillez remplir tous les champs obligatoires', 'error');
    return;
  }

      try {
      console.log('🔄 Creating new user via API...');
      console.log('📤 Sending user data:', { username, password: '***', role, email, first_name: firstName, last_name: lastName });
      
      const response = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
        role,
        email,
        first_name: firstName || null,
        last_name: lastName || null
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create user');
    }

    const newUser = await response.json();
    
    // Add to local users array for immediate display
    users.unshift({
      ...newUser,
      status: newUser.is_active ? 'active' : 'inactive',
      lastLogin: newUser.last_login || null,
      permissions: getPermissionsForRole(newUser.role)
    });
    
    populateUsersTable();

    // Close modal and reset form
    document.getElementById('addUserModal').classList.add('hidden');
    document.getElementById('addUserForm').reset();

    showNotification(`Utilisateur ${username} ajouté avec succès`, 'success');
    
  } catch (error) {
    console.error('❌ Error creating user:', error);
    showNotification(`Erreur lors de la création: ${error.message}`, 'error');
  }
}

// Handle edit user form submission
async function handleEditUser(e) {
  e.preventDefault();
  
  const userId = parseInt(document.getElementById('editUserId').value);
  const username = document.getElementById('editUsername').value.trim();
  const password = document.getElementById('editPassword').value;
  const role = document.getElementById('editRole').value;
  const email = document.getElementById('editEmail').value.trim();
  const firstName = document.getElementById('editFirstName').value.trim();
  const lastName = document.getElementById('editLastName').value.trim();

  if (!username || !role || !email) {
    showNotification('Veuillez remplir tous les champs obligatoires', 'error');
    return;
  }

  try {
    console.log(`🔄 Updating user ${userId} via API...`);
    
    const response = await fetch('/api/users', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: userId,
        username,
        password: password || null,
        role,
        email,
        first_name: firstName || null,
        last_name: lastName || null,
        is_active: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update user');
    }

    const updatedUser = await response.json();
    
    // Update local users array
    const userIndex = users.findIndex(user => user.id === userId);
    if (userIndex !== -1) {
      users[userIndex] = {
        ...updatedUser,
        status: updatedUser.is_active ? 'active' : 'inactive',
        lastLogin: updatedUser.last_login || null,
        permissions: getPermissionsForRole(updatedUser.role)
      };
    }
    
    populateUsersTable();

    // Close modal
    document.getElementById('editUserModal').classList.add('hidden');

    showNotification(`Utilisateur ${username} modifié avec succès`, 'success');
    
  } catch (error) {
    console.error('❌ Error updating user:', error);
    showNotification(`Erreur lors de la modification: ${error.message}`, 'error');
  }
}

// Get permissions for a role
function getPermissionsForRole(role) {
  switch (role) {
    case 'admin':
      return ['all'];
    case 'editeur':
      return ['articles', 'categories'];
    case 'auteur':
      return ['articles'];
    default:
      return [];
  }
}

// Edit user
function editUser(userId) {
  const user = users.find(u => u.id === userId);
  if (!user) return;

  document.getElementById('editUserId').value = user.id;
  document.getElementById('editUsername').value = user.username;
  document.getElementById('editPassword').value = '';
  document.getElementById('editEmail').value = user.email || '';
  document.getElementById('editFirstName').value = user.first_name || '';
  document.getElementById('editLastName').value = user.last_name || '';
  document.getElementById('editRole').value = user.role;

  document.getElementById('editUserModal').classList.remove('hidden');
}

// Delete user
async function deleteUser(userId) {
  const user = users.find(u => u.id === userId);
  if (!user) return;

  if (confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${user.username} ?`)) {
    try {
      console.log(`🔄 Deleting user ${userId} via API...`);
      
      const response = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      // Remove from local users array
      users = users.filter(u => u.id !== userId);
      populateUsersTable();
      
      showNotification(`Utilisateur ${user.username} supprimé avec succès`, 'success');
      
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      showNotification(`Erreur lors de la suppression: ${error.message}`, 'error');
    }
  }
}

// Save GPT API configuration
function saveGptApiConfig() {
  console.log('Saving GPT API config...');
  
  const apiKey = document.getElementById('gptApiKey').value.trim();
  const model = document.getElementById('gptModel').value;

  if (!apiKey) {
    showNotification('Veuillez saisir une clé API', 'error');
    return;
  }

  apiConfig.gpt.apiKey = apiKey;
  apiConfig.gpt.model = model;
  saveApiConfig();

  console.log('GPT API config saved:', apiConfig.gpt);
  showNotification('Configuration GPT API sauvegardée avec succès', 'success');
}

// Save Google Analytics API configuration
function saveGaApiConfig() {
  console.log('Saving GA API config...');
  
  const clientId = document.getElementById('gaClientId').value.trim();
  const clientSecret = document.getElementById('gaClientSecret').value.trim();
  const propertyId = document.getElementById('gaPropertyId').value.trim();

  if (!clientId || !clientSecret || !propertyId) {
    showNotification('Veuillez remplir tous les champs GA', 'error');
    return;
  }

  apiConfig.googleAnalytics.clientId = clientId;
  apiConfig.googleAnalytics.clientSecret = clientSecret;
  apiConfig.googleAnalytics.propertyId = propertyId;
  saveApiConfig();

  console.log('GA API config saved:', apiConfig.googleAnalytics);
  showNotification('Configuration Google Analytics API sauvegardée avec succès', 'success');
}

// Toggle password visibility
function togglePasswordVisibility(inputId, button) {
  const input = document.getElementById(inputId);
  const isPassword = input.type === 'password';
  
  input.type = isPassword ? 'text' : 'password';
  
  // Update button icon
  button.innerHTML = isPassword ? `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
    </svg>
  ` : `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
    </svg>
  `;
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full ${
    type === 'success' ? 'bg-green-500 text-white' : 
    type === 'error' ? 'bg-red-500 text-white' : 
    'bg-blue-500 text-white'
  }`;
  
  notification.innerHTML = `
    <div class="flex items-center space-x-3">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.classList.remove('translate-x-full');
  }, 100);
  
  // Animate out and remove
  setTimeout(() => {
    notification.classList.add('translate-x-full');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}
