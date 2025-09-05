// Analytics Dashboard Script
let trafficChart, sourcesChart;

// Generate realistic mock data
function generateMockData() {
  const today = new Date();
  const dates = [];
  const views = [];
  const visitors = [];
  
  // Generate last 30 days data
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }));
    
    // Generate realistic traffic patterns (weekends have less traffic)
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseViews = isWeekend ? 800 : 1200;
    const baseVisitors = isWeekend ? 400 : 600;
    
    // Add some randomness
    const viewVariation = Math.random() * 0.4 - 0.2; // ±20%
    const visitorVariation = Math.random() * 0.3 - 0.15; // ±15%
    
    views.push(Math.round(baseViews * (1 + viewVariation)));
    visitors.push(Math.round(baseVisitors * (1 + visitorVariation)));
  }
  
  return { dates, views, visitors };
}

// Initialize charts
function initializeCharts() {
  const { dates, views, visitors } = generateMockData();
  
  // Traffic Chart
  const trafficCtx = document.getElementById('trafficChart');
  if (trafficCtx) {
    trafficChart = new Chart(trafficCtx, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [
          {
            label: 'Vues',
            data: views,
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Visiteurs uniques',
            data: visitors,
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827'
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: document.documentElement.classList.contains('dark') ? '#9CA3AF' : '#6B7280'
            },
            grid: {
              color: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB'
            }
          },
          y: {
            ticks: {
              color: document.documentElement.classList.contains('dark') ? '#9CA3AF' : '#6B7280'
            },
            grid: {
              color: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB'
            }
          }
        }
      }
    });
  }
  
  // Sources Chart
  const sourcesCtx = document.getElementById('sourcesChart');
  if (sourcesCtx) {
    sourcesChart = new Chart(sourcesCtx, {
      type: 'doughnut',
      data: {
        labels: ['Recherche organique', 'Réseaux sociaux', 'Direct', 'Référents', 'Email'],
        datasets: [{
          data: [45, 25, 20, 7, 3],
          backgroundColor: [
            '#3B82F6',
            '#8B5CF6',
            '#10B981',
            '#F59E0B',
            '#EF4444'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827',
              padding: 20,
              usePointStyle: true
            }
          }
        }
      }
    });
  }
}

// Update stats cards
function updateStats() {
  const { views, visitors } = generateMockData();
  
  // Calculate totals
  const totalViews = views.reduce((sum, view) => sum + view, 0);
  const totalVisitors = visitors.reduce((sum, visitor) => sum + visitor, 0);
  const avgTime = Math.round(Math.random() * 3 + 2); // 2-5 minutes
  const bounceRate = (Math.random() * 20 + 30).toFixed(1); // 30-50%
  
  // Update DOM
  document.getElementById('totalViews').textContent = totalViews.toLocaleString('fr-FR');
  document.getElementById('uniqueVisitors').textContent = totalVisitors.toLocaleString('fr-FR');
  document.getElementById('avgTime').textContent = `${avgTime} min`;
  document.getElementById('bounceRate').textContent = `${bounceRate}%`;
}

// Populate top articles
function populateTopArticles() {
  const topArticles = [
    { title: 'Comment optimiser son blog en 2024', views: 15420, growth: '+15%' },
    { title: 'Les tendances du marketing digital', views: 12850, growth: '+8%' },
    { title: 'Guide complet du SEO', views: 11230, growth: '+22%' },
    { title: 'Stratégies de contenu viral', views: 9870, growth: '+12%' },
    { title: 'Monétisation de blog', views: 8450, growth: '+18%' }
  ];
  
  const container = document.getElementById('topArticlesList');
  if (container) {
    container.innerHTML = topArticles.map((article, index) => `
      <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div class="flex items-center space-x-3">
          <span class="text-lg font-semibold text-gray-400 dark:text-gray-500">${index + 1}</span>
          <div>
            <h4 class="font-medium text-gray-900 dark:text-white">${article.title}</h4>
            <p class="text-sm text-gray-500 dark:text-gray-400">${article.views.toLocaleString('fr-FR')} vues</p>
          </div>
        </div>
        <span class="text-sm font-medium text-green-600 dark:text-green-400">${article.growth}</span>
      </div>
    `).join('');
  }
}

// Populate top pages
function populateTopPages() {
  const topPages = [
    { page: '/', views: 25680, growth: '+12%' },
    { page: '/blog', views: 18950, growth: '+18%' },
    { page: '/contact', views: 12450, growth: '+5%' },
    { page: '/about', views: 9870, growth: '+8%' },
    { page: '/services', views: 7560, growth: '+15%' }
  ];
  
  const container = document.getElementById('topPagesList');
  if (container) {
    container.innerHTML = topPages.map((page, index) => `
      <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div class="flex items-center space-x-3">
          <span class="text-lg font-semibold text-gray-400 dark:text-gray-500">${index + 1}</span>
          <div>
            <h4 class="font-medium text-gray-900 dark:text-white">${page.page}</h4>
            <p class="text-sm text-gray-500 dark:text-gray-400">${page.views.toLocaleString('fr-FR')} vues</p>
          </div>
        </div>
        <span class="text-sm font-medium text-green-600 dark:text-green-400">${page.growth}</span>
      </div>
    `).join('');
  }
}

// Populate geographic data
function populateGeoData() {
  const geoData = [
    { country: 'France', visitors: 45680, percentage: 45 },
    { country: 'Canada', visitors: 23450, percentage: 23 },
    { country: 'Belgique', visitors: 15670, percentage: 15 },
    { country: 'Suisse', visitors: 12340, percentage: 12 },
    { country: 'Autres', visitors: 4860, percentage: 5 }
  ];
  
  const container = document.getElementById('geoDataList');
  if (container) {
    container.innerHTML = geoData.map(data => `
      <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 class="font-medium text-gray-900 dark:text-white mb-2">${data.country}</h4>
        <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">${data.percentage}%</p>
        <p class="text-sm text-gray-500 dark:text-gray-400">${data.visitors.toLocaleString('fr-FR')} visiteurs</p>
      </div>
    `).join('');
  }
}

// Export functions
function exportToCSV(data, filename) {
  const csvContent = data.map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportAnalyticsData() {
  const { dates, views, visitors } = generateMockData();
  const data = [
    ['Date', 'Vues', 'Visiteurs uniques'],
    ...dates.map((date, i) => [date, views[i], visitors[i]])
  ];
  exportToCSV(data, 'analytics_traffic.csv');
}

function exportTopArticles() {
  const data = [
    ['Rang', 'Titre', 'Vues', 'Croissance'],
    ['1', 'Comment optimiser son blog en 2024', '15420', '+15%'],
    ['2', 'Les tendances du marketing digital', '12850', '+8%'],
    ['3', 'Guide complet du SEO', '11230', '+22%'],
    ['4', 'Stratégies de contenu viral', '9870', '+12%'],
    ['5', 'Monétisation de blog', '8450', '+18%']
  ];
  exportToCSV(data, 'top_articles.csv');
}

function exportTopPages() {
  const data = [
    ['Rang', 'Page', 'Vues', 'Croissance'],
    ['1', '/', '25680', '+12%'],
    ['2', '/blog', '18950', '+18%'],
    ['3', '/contact', '12450', '+5%'],
    ['4', '/about', '9870', '+8%'],
    ['5', '/services', '7560', '+15%']
  ];
  exportToCSV(data, 'top_pages.csv');
}

function exportGeoData() {
  const data = [
    ['Pays', 'Visiteurs', 'Pourcentage'],
    ['France', '45680', '45%'],
    ['Canada', '23450', '23%'],
    ['Belgique', '15670', '15%'],
    ['Suisse', '12340', '12%'],
    ['Autres', '4860', '5%']
  ];
  exportToCSV(data, 'geographic_data.csv');
}

// Event listeners
function setupEventListeners() {
  // Export buttons
  const exportAnalyticsBtn = document.getElementById('exportAnalyticsBtn');
  const exportTopArticlesBtn = document.getElementById('exportTopArticlesBtn');
  const exportTopPagesBtn = document.getElementById('exportTopPagesBtn');
  const exportGeoDataBtn = document.getElementById('exportGeoDataBtn');
  const refreshDataBtn = document.getElementById('refreshDataBtn');
  
  if (exportAnalyticsBtn) {
    exportAnalyticsBtn.addEventListener('click', exportAnalyticsData);
  }
  
  if (exportTopArticlesBtn) {
    exportTopArticlesBtn.addEventListener('click', exportTopArticles);
  }
  
  if (exportTopPagesBtn) {
    exportTopPagesBtn.addEventListener('click', exportTopPages);
  }
  
  if (exportGeoDataBtn) {
    exportGeoDataBtn.addEventListener('click', exportGeoData);
  }
  
  if (refreshDataBtn) {
    refreshDataBtn.addEventListener('click', () => {
      // Regenerate data
      updateStats();
      populateTopArticles();
      populateTopPages();
      populateGeoData();
      
      // Show success message
      showNotification('Données actualisées avec succès !', 'success');
    });
  }
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full ${
    type === 'success' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
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

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing Analytics Dashboard...');
  
  // Initialize charts
  initializeCharts();
  
  // Update stats
  updateStats();
  
  // Populate data
  populateTopArticles();
  populateTopPages();
  populateGeoData();
  
  // Setup event listeners
  setupEventListeners();
  
  console.log('Analytics Dashboard initialized successfully!');
});

