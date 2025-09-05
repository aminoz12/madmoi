// Common CSV Export functionality for all admin pages

// Utility function to export data to CSV
function exportToCSV(data, filename) {
  // Handle special characters and commas in data
  const escapeCSV = (text) => {
    if (text === null || text === undefined) return '';
    const string = String(text);
    if (string.includes(',') || string.includes('"') || string.includes('\n')) {
      return `"${string.replace(/"/g, '""')}"`;
    }
    return string;
  };

  const csvContent = data.map(row => 
    row.map(cell => escapeCSV(cell)).join(',')
  ).join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Show success notification
  showExportNotification(filename);
}

// Show export success notification
function showExportNotification(filename) {
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full';
  notification.innerHTML = `
    <div class="flex items-center space-x-3">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <div>
        <h4 class="font-semibold">Export réussi !</h4>
        <p class="text-sm opacity-90">${filename} a été téléchargé</p>
      </div>
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

// Dashboard export functionality
function setupDashboardExport() {
  const exportBtn = document.getElementById('exportDashboardBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const dashboardData = [
        ['Métrique', 'Valeur', 'Statut'],
        ['Visiteurs Totaux', '24,567', '+12.5%'],
        ['Vues Articles', '45,890', 'En hausse'],
        ['Articles Publiés', '12', 'Actif'],
        ['Commentaires', '234', '+8.2%'],
        ['Temps moyen sur page', '3.2 min', 'Stable'],
        ['Taux de rebond', '42%', '-5.3%']
      ];
      exportToCSV(dashboardData, 'dashboard_statistiques.csv');
    });
  }
}

// Articles export functionality
function setupArticlesExport() {
  const exportBtn = document.getElementById('exportArticlesBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      // Get articles from localStorage or generate sample data
      let articles = [];
      try {
        const userArticles = JSON.parse(localStorage.getItem('userArticles') || '[]');
        if (userArticles.length > 0) {
          articles = userArticles;
        } else {
          // Generate sample data if no articles exist
          articles = [
            {
              title: 'Comment optimiser son blog en 2024',
              status: 'published',
              category: 'Marketing',
              publishDate: '2024-01-15',
              views: 15420,
              author: 'Admin'
            },
            {
              title: 'Les tendances du marketing digital',
              status: 'published',
              category: 'Business',
              publishDate: '2024-01-10',
              views: 12850,
              author: 'Admin'
            }
          ];
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des articles:', error);
        articles = [];
      }

      const articlesData = [
        ['Titre', 'Statut', 'Catégorie', 'Date de publication', 'Vues', 'Auteur']
      ];

      articles.forEach(article => {
        articlesData.push([
          article.title || 'Sans titre',
          article.status || 'Brouillon',
          article.category || 'Non catégorisé',
          article.publishDate || 'Non publié',
          article.views || 0,
          article.author || 'Admin'
        ]);
      });

      exportToCSV(articlesData, 'articles_blog.csv');
    });
  }
}

// Analytics export functionality
function setupAnalyticsExport() {
  const exportBtn = document.getElementById('exportAnalyticsBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      // Generate sample analytics data
      const analyticsData = [
        ['Métrique', 'Valeur', 'Variation'],
        ['Vues totales', '156,780', '+12.5%'],
        ['Visiteurs uniques', '89,450', '+8.2%'],
        ['Temps moyen', '3.2 min', '-2.1%'],
        ['Taux de rebond', '42.3%', '-5.3%'],
        ['Pages vues', '234,560', '+15.2%'],
        ['Sessions', '67,890', '+9.8%']
      ];
      exportToCSV(analyticsData, 'analytics_complet.csv');
    });
  }
}

// Initialize exports based on current page
function initializeExports() {
  const currentPath = window.location.pathname;
  
  if (currentPath === '/admin/dashboard' || currentPath === '/admin/dashboard/') {
    setupDashboardExport();
  } else if (currentPath === '/admin/articles' || currentPath === '/admin/articles/') {
    setupArticlesExport();
  } else if (currentPath === '/admin/analytics' || currentPath === '/admin/analytics/') {
    setupAnalyticsExport();
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeExports);






