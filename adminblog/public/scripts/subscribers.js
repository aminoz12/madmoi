// Subscribers management functionality
class SubscribersManager {
  constructor() {
    this.subscribers = [];
    this.filteredSubscribers = [];
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.editingSubscriber = null;
    this.initializeEventListeners();
    this.loadSubscribers();
  }

  initializeEventListeners() {
    // Search input
    const searchInput = document.getElementById('subscriberSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    }

    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => this.applyFilters());
    }

    // Source filter
    const sourceFilter = document.getElementById('sourceFilter');
    if (sourceFilter) {
      sourceFilter.addEventListener('change', () => this.applyFilters());
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshData());
    }

    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportSubscribers());
    }

    // Select all checkbox
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
      selectAll.addEventListener('change', (e) => this.toggleSelectAll(e.target.checked));
    }

    // Add subscriber button
    const addSubscriberBtn = document.getElementById('addSubscriberBtn');
    if (addSubscriberBtn) {
      addSubscriberBtn.addEventListener('click', () => this.showAddModal());
    }

    // Import button
    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
      importBtn.addEventListener('click', () => this.showImportModal());
    }

    // Modal close buttons
    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
      closeModal.addEventListener('click', () => this.hideModal());
    }

    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hideModal());
    }

    // Import modal close
    const closeImportModal = document.getElementById('closeImportModal');
    if (closeImportModal) {
      closeImportModal.addEventListener('click', () => this.hideImportModal());
    }

    // Form submission
    const subscriberForm = document.getElementById('subscriberForm');
    if (subscriberForm) {
      subscriberForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    // Process import
    const processImport = document.getElementById('processImport');
    if (processImport) {
      processImport.addEventListener('click', () => this.processImport());
    }

    // Download template
    const downloadTemplate = document.getElementById('downloadTemplate');
    if (downloadTemplate) {
      downloadTemplate.addEventListener('click', (e) => this.downloadTemplate(e));
    }

    // Bulk actions
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    if (bulkDeleteBtn) {
      bulkDeleteBtn.addEventListener('click', () => this.bulkDelete());
    }

    const bulkExportBtn = document.getElementById('bulkExportBtn');
    if (bulkExportBtn) {
      bulkExportBtn.addEventListener('click', () => this.bulkExport());
    }

    const clearSelectionBtn = document.getElementById('clearSelectionBtn');
    if (clearSelectionBtn) {
      clearSelectionBtn.addEventListener('click', () => this.clearSelection());
    }

    // Close modal on outside click
    document.addEventListener('click', (e) => {
      if (e.target.id === 'subscriberModal') {
        this.hideModal();
      }
      if (e.target.id === 'importModal') {
        this.hideImportModal();
      }
    });
  }

  // Load subscribers from localStorage or create sample data
  loadSubscribers() {
    try {
      const stored = localStorage.getItem('userSubscribers');
      if (stored) {
        this.subscribers = JSON.parse(stored);
      } else {
        // Create sample data if none exists
        this.subscribers = this.createSampleSubscribers();
        this.saveSubscribers();
      }
      
      this.filteredSubscribers = [...this.subscribers];
      this.renderSubscribers();
      this.updateStats();
      this.updatePagination();
    } catch (error) {
      console.error('Error loading subscribers:', error);
      this.subscribers = [];
      this.filteredSubscribers = [];
    }
  }

  // Create sample subscribers data
  createSampleSubscribers() {
    const currentDate = new Date();
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    
    return [
      {
        id: 1,
        name: 'Jean Dupont',
        email: 'jean.dupont@email.com',
        location: 'Paris, France',
        source: 'site web',
        status: 'actif',
        registrationDate: '2024-01-15',
        lastActivity: '2024-01-20',
        engagement: 85
      },
      {
        id: 2,
        name: 'Marie Laurent',
        email: 'marie.laurent@email.com',
        location: 'Lyon, France',
        source: 'réseaux sociaux',
        status: 'actif',
        registrationDate: '2024-01-12',
        lastActivity: '2024-01-19',
        engagement: 92
      },
      {
        id: 3,
        name: 'Pierre Martin',
        email: 'pierre.martin@email.com',
        location: 'Marseille, France',
        source: 'newsletter',
        status: 'inactif',
        registrationDate: '2024-01-10',
        lastActivity: '2024-01-15',
        engagement: 45
      },
      {
        id: 4,
        name: 'Sophie Bernard',
        email: 'sophie.bernard@email.com',
        location: 'Toulouse, France',
        source: 'référencement',
        status: 'actif',
        registrationDate: '2024-01-08',
        lastActivity: '2024-01-21',
        engagement: 78
      },
      {
        id: 5,
        name: 'Lucas Moreau',
        email: 'lucas.moreau@email.com',
        location: 'Nantes, France',
        source: 'site web',
        status: 'désabonné',
        registrationDate: '2024-01-05',
        lastActivity: '2024-01-18',
        engagement: 0
      }
    ];
  }

  // Save subscribers to localStorage
  saveSubscribers() {
    try {
      localStorage.setItem('userSubscribers', JSON.stringify(this.subscribers));
    } catch (error) {
      console.error('Error saving subscribers:', error);
    }
  }

  // Handle search input
  handleSearch(query) {
    this.currentPage = 1;
    this.applyFilters();
  }

  // Apply all filters (search, status, source)
  applyFilters() {
    const searchQuery = document.getElementById('subscriberSearch')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const sourceFilter = document.getElementById('sourceFilter')?.value || '';

    console.log('Applying filters:', { searchQuery, statusFilter, sourceFilter });

    this.filteredSubscribers = this.subscribers.filter(subscriber => {
      // Search filter
      const matchesSearch = !searchQuery || 
        subscriber.name.toLowerCase().includes(searchQuery) ||
        subscriber.email.toLowerCase().includes(searchQuery) ||
        subscriber.location.toLowerCase().includes(searchQuery);

      // Status filter
      const matchesStatus = !statusFilter || subscriber.status === statusFilter;

      // Source filter
      const matchesSource = !sourceFilter || subscriber.source === sourceFilter;

      return matchesSearch && matchesStatus && matchesSource;
    });

    console.log('Filtered subscribers:', this.filteredSubscribers.length);
    this.renderSubscribers();
    this.updateStats();
    this.updatePagination();
  }

  // Render subscribers in the table
  renderSubscribers() {
    const tbody = document.getElementById('subscribersTableBody');
    if (!tbody) return;

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const pageSubscribers = this.filteredSubscribers.slice(startIndex, endIndex);

    tbody.innerHTML = pageSubscribers.map(subscriber => `
      <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
        <td class="px-6 py-4 whitespace-nowrap">
          <input type="checkbox" class="subscriber-checkbox rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" value="${subscriber.id}" onchange="subscribersManager.updateBulkActions()">
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-3">
              <span class="text-white font-semibold text-sm">${this.getInitials(subscriber.name)}</span>
            </div>
            <div>
              <div class="text-sm font-medium text-gray-900 dark:text-white">${subscriber.name}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">${subscriber.location}</div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${subscriber.email}</td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${this.getSourceBadgeClass(subscriber.source)}">
            ${subscriber.source}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${this.getStatusBadgeClass(subscriber.status)}">
            ${this.getStatusLabel(subscriber.status)}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
          ${this.formatDate(subscriber.registrationDate)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <div class="flex items-center space-x-2">
            <button onclick="subscribersManager.editSubscriber(${subscriber.id})" class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
              Modifier
            </button>
            <button onclick="subscribersManager.deleteSubscriber(${subscriber.id})" class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
              Supprimer
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    // Update pagination info
    this.updatePaginationInfo(startIndex, endIndex);
  }

  // Get initials from name
  getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  // Get source badge class
  getSourceBadgeClass(source) {
    const classes = {
      'site web': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
      'réseaux sociaux': 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200',
      'newsletter': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
      'référencement': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
    };
    return classes[source] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  }

  // Get status badge class
  getStatusBadgeClass(status) {
    const classes = {
      'actif': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
      'inactif': 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
      'désabonné': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
    };
    return classes[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  }

  // Get status label
  getStatusLabel(status) {
    const labels = {
      'actif': 'Actif',
      'inactif': 'Inactif',
      'désabonné': 'Désabonné'
    };
    return labels[status] || status;
  }

  // Format date
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  }

  // Update statistics with real-time data
  updateStats() {
    const totalSubscribers = this.subscribers.length;
    const activeSubscribers = this.subscribers.filter(s => s.status === 'actif').length;
    const inactiveSubscribers = this.subscribers.filter(s => s.status === 'inactif').length;
    const unsubscribedSubscribers = this.subscribers.filter(s => s.status === 'désabonné').length;
    const filteredCount = this.filteredSubscribers.length;

    // Calculate growth (this month vs last month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonthSubscribers = this.subscribers.filter(s => {
      const regDate = new Date(s.registrationDate);
      return regDate.getMonth() === currentMonth && regDate.getFullYear() === currentYear;
    }).length;

    const lastMonthSubscribers = this.subscribers.filter(s => {
      const regDate = new Date(s.registrationDate);
      return regDate.getMonth() === (currentMonth - 1) && regDate.getFullYear() === currentYear;
    }).length;

    const growth = thisMonthSubscribers - lastMonthSubscribers;
    const growthPercentage = lastMonthSubscribers > 0 ? ((growth / lastMonthSubscribers) * 100).toFixed(1) : 0;

    // Update count display
    const countElement = document.getElementById('subscribersCount');
    if (countElement) {
      countElement.textContent = filteredCount;
    }

    // Update total results
    const totalResultsElement = document.getElementById('totalResults');
    if (totalResultsElement) {
      totalResultsElement.textContent = filteredCount;
    }

    // Update stats cards
    const totalSubscribersElement = document.getElementById('totalSubscribers');
    if (totalSubscribersElement) {
      totalSubscribersElement.textContent = totalSubscribers.toLocaleString();
    }

    const totalGrowthElement = document.getElementById('totalGrowth');
    if (totalGrowthElement) {
      const growthText = growth >= 0 ? `+${growth} ce mois` : `${growth} ce mois`;
      totalGrowthElement.textContent = growthText;
      totalGrowthElement.className = `text-sm ${growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`;
    }

    const activeSubscribersElement = document.getElementById('activeSubscribers');
    if (activeSubscribersElement) {
      activeSubscribersElement.textContent = activeSubscribers.toLocaleString();
    }

    const activePercentageElement = document.getElementById('activePercentage');
    if (activePercentageElement) {
      const percentage = totalSubscribers > 0 ? ((activeSubscribers / totalSubscribers) * 100).toFixed(1) : 0;
      activePercentageElement.textContent = `${percentage}% du total`;
    }

    const newThisMonthElement = document.getElementById('newThisMonth');
    if (newThisMonthElement) {
      newThisMonthElement.textContent = thisMonthSubscribers;
    }

    const newGrowthElement = document.getElementById('newGrowth');
    if (newGrowthElement) {
      const growthText = growthPercentage >= 0 ? `+${growthPercentage}% vs mois dernier` : `${growthPercentage}% vs mois dernier`;
      newGrowthElement.textContent = growthText;
      newGrowthElement.className = `text-sm ${growthPercentage >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`;
    }

    const unsubscribedCountElement = document.getElementById('unsubscribedCount');
    if (unsubscribedCountElement) {
      unsubscribedCountElement.textContent = unsubscribedSubscribers;
    }

    const unsubscribedGrowthElement = document.getElementById('unsubscribedGrowth');
    if (unsubscribedGrowthElement) {
      // Calculate unsubscribed growth (simplified)
      const unsubGrowth = -2; // Placeholder for actual calculation
      const unsubGrowthText = unsubGrowth >= 0 ? `+${unsubGrowth}% ce mois` : `${unsubGrowth}% ce mois`;
      unsubscribedGrowthElement.textContent = unsubGrowthText;
      unsubscribedGrowthElement.className = `text-sm ${unsubGrowth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`;
    }
  }

  // Update pagination
  updatePagination() {
    const totalPages = Math.ceil(this.filteredSubscribers.length / this.itemsPerPage);
    const paginationContainer = document.getElementById('pagination');
    
    if (!paginationContainer) return;

    let paginationHTML = '';

    // Previous button
    paginationHTML += `
      <button 
        onclick="subscribersManager.goToPage(${this.currentPage - 1})" 
        class="px-3 py-2 text-sm font-medium text-gray-500 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50" 
        ${this.currentPage <= 1 ? 'disabled' : ''}
      >
        Précédent
      </button>
    `;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
        paginationHTML += `
          <button 
            onclick="subscribersManager.goToPage(${i})" 
            class="px-3 py-2 text-sm font-medium ${i === this.currentPage ? 'text-white bg-blue-600 border border-transparent' : 'text-gray-500 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600'} rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            ${i}
          </button>
        `;
      } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
        paginationHTML += '<span class="px-3 py-2 text-gray-500">...</span>';
      }
    }

    // Next button
    paginationHTML += `
      <button 
        onclick="subscribersManager.goToPage(${this.currentPage + 1})" 
        class="px-3 py-2 text-sm font-medium text-gray-500 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50" 
        ${this.currentPage >= totalPages ? 'disabled' : ''}
      >
        Suivant
      </button>
    `;

    paginationContainer.innerHTML = paginationHTML;
  }

  // Update pagination info
  updatePaginationInfo(startIndex, endIndex) {
    const startElement = document.getElementById('startIndex');
    const endElement = document.getElementById('endIndex');
    
    if (startElement) startElement.textContent = startIndex + 1;
    if (endElement) endElement.textContent = Math.min(endIndex, this.filteredSubscribers.length);
  }

  // Go to specific page
  goToPage(page) {
    const totalPages = Math.ceil(this.filteredSubscribers.length / this.itemsPerPage);
    if (page >= 1 && page <= totalPages) {
      this.currentPage = page;
      this.renderSubscribers();
      this.updatePagination();
    }
  }

  // Toggle select all
  toggleSelectAll(checked) {
    const checkboxes = document.querySelectorAll('.subscriber-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = checked;
    });
    this.updateBulkActions();
  }

  // Update bulk actions visibility
  updateBulkActions() {
    const selectedCheckboxes = document.querySelectorAll('.subscriber-checkbox:checked');
    const bulkActions = document.getElementById('bulkActions');
    const selectedCount = document.getElementById('selectedCount');
    
    if (bulkActions && selectedCount) {
      if (selectedCheckboxes.length > 0) {
        bulkActions.classList.remove('hidden');
        selectedCount.textContent = selectedCheckboxes.length;
      } else {
        bulkActions.classList.add('hidden');
      }
    }
  }

  // Clear selection
  clearSelection() {
    const checkboxes = document.querySelectorAll('.subscriber-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
      selectAll.checked = false;
    }
    this.updateBulkActions();
  }

  // Bulk delete
  bulkDelete() {
    const selectedIds = Array.from(document.querySelectorAll('.subscriber-checkbox:checked'))
      .map(cb => parseInt(cb.value));
    
    if (selectedIds.length === 0) return;
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${selectedIds.length} abonnés ?`)) {
      this.subscribers = this.subscribers.filter(s => !selectedIds.includes(s.id));
      this.saveSubscribers();
      this.applyFilters();
      this.clearSelection();
      this.showNotification(`${selectedIds.length} abonnés supprimés`, 'success');
    }
  }

  // Bulk export
  bulkExport() {
    const selectedIds = Array.from(document.querySelectorAll('.subscriber-checkbox:checked'))
      .map(cb => parseInt(cb.value));
    
    const subscribersToExport = this.subscribers.filter(s => selectedIds.includes(s.id));
    
    if (subscribersToExport.length === 0) return;
    
    this.exportSubscribersData(subscribersToExport);
    this.showNotification(`${subscribersToExport.length} abonnés exportés`, 'success');
  }

  // Refresh data
  refreshData() {
    this.loadSubscribers();
    this.showNotification('Données actualisées', 'success');
  }

  // Export subscribers
  exportSubscribers() {
    const selectedIds = Array.from(document.querySelectorAll('.subscriber-checkbox:checked'))
      .map(cb => parseInt(cb.value));
    
    const subscribersToExport = selectedIds.length > 0 
      ? this.subscribers.filter(s => selectedIds.includes(s.id))
      : this.filteredSubscribers;

    if (subscribersToExport.length === 0) {
      this.showNotification('Aucun abonné à exporter', 'warning');
      return;
    }

    this.exportSubscribersData(subscribersToExport);
    this.showNotification(`${subscribersToExport.length} abonnés exportés`, 'success');
  }

  // Export subscribers data
  exportSubscribersData(subscribers) {
    // Create CSV content
    const csvContent = this.createCSV(subscribers);
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `abonnes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Create CSV content
  createCSV(subscribers) {
    const headers = ['Nom', 'Email', 'Localisation', 'Source', 'Statut', 'Date d\'inscription', 'Dernière activité', 'Engagement'];
    const rows = subscribers.map(s => [
      s.name,
      s.email,
      s.location,
      s.source,
      s.status,
      s.registrationDate,
      s.lastActivity,
      s.engagement
    ]);

    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  }

  // Show add modal
  showAddModal() {
    this.editingSubscriber = null;
    this.resetForm();
    document.getElementById('modalTitle').textContent = 'Nouvel Abonné';
    document.getElementById('submitBtnText').textContent = 'Ajouter';
    document.getElementById('subscriberModal').classList.remove('hidden');
  }

  // Show edit modal
  editSubscriber(id) {
    const subscriber = this.subscribers.find(s => s.id === id);
    if (subscriber) {
      this.editingSubscriber = subscriber;
      this.populateForm(subscriber);
      document.getElementById('modalTitle').textContent = 'Modifier Abonné';
      document.getElementById('submitBtnText').textContent = 'Modifier';
      document.getElementById('subscriberModal').classList.remove('hidden');
    }
  }

  // Hide modal
  hideModal() {
    document.getElementById('subscriberModal').classList.add('hidden');
    this.editingSubscriber = null;
    this.resetForm();
  }

  // Show import modal
  showImportModal() {
    document.getElementById('importModal').classList.remove('hidden');
  }

  // Hide import modal
  hideImportModal() {
    document.getElementById('importModal').classList.add('hidden');
    document.getElementById('csvFile').value = '';
  }

  // Reset form
  resetForm() {
    document.getElementById('subscriberForm').reset();
    document.getElementById('subscriberId').value = '';
  }

  // Populate form with subscriber data
  populateForm(subscriber) {
    document.getElementById('subscriberId').value = subscriber.id;
    document.getElementById('subscriberName').value = subscriber.name;
    document.getElementById('subscriberEmail').value = subscriber.email;
    document.getElementById('subscriberLocation').value = subscriber.location;
    document.getElementById('subscriberSource').value = subscriber.source;
    document.getElementById('subscriberStatus').value = subscriber.status;
    document.getElementById('subscriberEngagement').value = subscriber.engagement;
  }

  // Handle form submission
  handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = {
      name: document.getElementById('subscriberName').value,
      email: document.getElementById('subscriberEmail').value,
      location: document.getElementById('subscriberLocation').value,
      source: document.getElementById('subscriberSource').value,
      status: document.getElementById('subscriberStatus').value,
      engagement: parseInt(document.getElementById('subscriberEngagement').value) || 0
    };

    if (this.editingSubscriber) {
      // Update existing subscriber
      Object.assign(this.editingSubscriber, formData);
      this.showNotification(`Abonné "${formData.name}" modifié`, 'success');
    } else {
      // Add new subscriber
      const newSubscriber = {
        ...formData,
        id: Date.now(),
        registrationDate: new Date().toISOString().split('T')[0],
        lastActivity: new Date().toISOString().split('T')[0]
      };
      this.subscribers.unshift(newSubscriber);
      this.showNotification(`Abonné "${formData.name}" ajouté`, 'success');
    }

    this.saveSubscribers();
    this.applyFilters();
    this.hideModal();
  }

  // Process import
  processImport() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    
    if (!file) {
      this.showNotification('Veuillez sélectionner un fichier CSV', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        let importedCount = 0;
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            if (values.length >= 5) {
              const newSubscriber = {
                id: Date.now() + i,
                name: values[0],
                email: values[1],
                location: values[2],
                source: values[3],
                status: values[4],
                registrationDate: new Date().toISOString().split('T')[0],
                lastActivity: new Date().toISOString().split('T')[0],
                engagement: 50
              };
              this.subscribers.push(newSubscriber);
              importedCount++;
            }
          }
        }
        
        this.saveSubscribers();
        this.applyFilters();
        this.hideImportModal();
        this.showNotification(`${importedCount} abonnés importés avec succès`, 'success');
      } catch (error) {
        console.error('Error processing CSV:', error);
        this.showNotification('Erreur lors du traitement du fichier CSV', 'error');
      }
    };
    
    reader.readAsText(file);
  }

  // Download template
  downloadTemplate(e) {
    e.preventDefault();
    const template = 'Nom,Email,Localisation,Source,Statut\nJean Dupont,jean@example.com,Paris France,site web,actif\nMarie Martin,marie@example.com,Lyon France,réseaux sociaux,actif';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'modele_abonnes.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Delete subscriber
  deleteSubscriber(id) {
    const subscriber = this.subscribers.find(s => s.id === id);
    if (subscriber && confirm(`Êtes-vous sûr de vouloir supprimer l'abonné "${subscriber.name}" ?`)) {
      this.subscribers = this.subscribers.filter(s => s.id !== id);
      this.saveSubscribers();
      this.applyFilters();
      this.showNotification(`Abonné "${subscriber.name}" supprimé`, 'success');
    }
  }

  // Show notification
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      type === 'warning' ? 'bg-yellow-500 text-white' :
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
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  window.subscribersManager = new SubscribersManager();
});
