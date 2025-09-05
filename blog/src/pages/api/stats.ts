import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const stats = {
    overview: {
      totalArticles: 18,
      totalCategories: 6,
      totalViews: 21110,
      totalLikes: 1403,
      totalComments: 0,
      publishedArticles: 18,
      draftArticles: 0,
      featuredArticles: 8
    },
    categories: {
      bdsm: {
        name: 'BDSM',
        articleCount: 3,
        totalViews: 3330,
        totalLikes: 230,
        averageViews: 1110,
        averageLikes: 77
      },
      libertinage: {
        name: 'Libertinage',
        articleCount: 3,
        totalViews: 3600,
        totalLikes: 241,
        averageViews: 1200,
        averageLikes: 80
      },
      roleplay: {
        name: 'Roleplay',
        articleCount: 3,
        totalViews: 2980,
        totalLikes: 205,
        averageViews: 993,
        averageLikes: 68
      },
      sexToys: {
        name: 'Sex Toys',
        articleCount: 3,
        totalViews: 3750,
        totalLikes: 259,
        averageViews: 1250,
        averageLikes: 86
      },
      fantasmes: {
        name: 'Fantasmes',
        articleCount: 3,
        totalViews: 3450,
        totalLikes: 238,
        averageViews: 1150,
        averageLikes: 79
      },
      communication: {
        name: 'Communication',
        articleCount: 3,
        totalViews: 4000,
        totalLikes: 271,
        averageViews: 1333,
        averageLikes: 90
      }
    },
    topArticles: [
      {
        id: 'communication-sexuelle-epanouie',
        title: 'Communication Sexuelle : Le Secret d\'une Vie Érotique Épanouie',
        views: 1450,
        likes: 98,
        category: 'Communication'
      },
      {
        id: 'toys-sexe-choix-utilisation',
        title: 'Sex Toys : Guide Complet du Choix à l\'Utilisation',
        views: 1400,
        likes: 95,
        category: 'Sex Toys'
      },
      {
        id: 'art-libertinage-moderne',
        title: "L'Art du Libertinage Moderne : Éthique et Plaisir",
        views: 1350,
        likes: 92,
        category: 'Libertinage'
      },
      {
        id: 'communication-couple-confiance',
        title: 'Communication dans le Couple : Bâtir la Confiance',
        views: 1350,
        likes: 90,
        category: 'Communication'
      },
      {
        id: 'fantasmes-tabous-exploration',
        title: 'Fantasmes et Tabous : L\'Art de l\'Exploration Consciente',
        views: 1300,
        likes: 91,
        category: 'Fantasmes'
      }
    ],
    recentActivity: [
      {
        type: 'article_published',
        title: 'Communication dans le Couple : Bâtir la Confiance',
        date: '2024-04-10',
        category: 'Communication'
      },
      {
        type: 'article_published',
        title: 'Comment Parler de ses Désirs sans Gêne',
        date: '2024-04-05',
        category: 'Communication'
      },
      {
        type: 'article_published',
        title: 'Communication Sexuelle : Le Secret d\'une Vie Érotique Épanouie',
        date: '2024-04-01',
        category: 'Communication'
      }
    ],
    performance: {
      monthlyViews: [1200, 1350, 1420, 1580, 1650, 1800, 1950, 2100, 2250, 2400, 2550, 2700],
      monthlyLikes: [80, 95, 110, 125, 140, 155, 170, 185, 200, 215, 230, 245],
      topReferrers: [
        { source: 'Direct', count: 45 },
        { source: 'Google', count: 30 },
        { source: 'Social Media', count: 15 },
        { source: 'Other', count: 10 }
      ]
    }
  };

  return new Response(JSON.stringify({
    success: true,
    data: stats,
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
};

