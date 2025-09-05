// Test script to check if article can be found by slug
import { getArticleBySlug, initializeDatabase } from './src/utils/database.js';

async function testArticleBySlug() {
  console.log('🔍 Testing article retrieval by slug');
  console.log('='.repeat(50));
  
  try {
    // Initialize the database
    await initializeDatabase();
    console.log('✅ Database initialized');
    
    // Test the specific slug from the user's URL
    const slug = 'levolution-du-jeu-de-role-de-la-table-a-lecran-2';
    console.log(`\n🔍 Looking for article with slug: "${slug}"`);
    
    const article = await getArticleBySlug(slug);
    
    if (article) {
      console.log('✅ Article found!');
      console.log('📋 Article details:', {
        id: article.id,
        title: article.title,
        slug: article.slug,
        status: article.status,
        content_length: article.content ? article.content.length : 0,
        has_content: !!article.content,
        category_name: article.category_name,
        author_name: article.author_name
      });
      
      if (article.content) {
        console.log('✅ Article has content');
        console.log('📄 Content preview:', article.content.substring(0, 200) + '...');
      } else {
        console.log('❌ Article has no content!');
      }
      
    } else {
      console.log('❌ Article not found');
      
      // Try to find all published articles to see what's available
      const { getPublishedArticles } = await import('./src/utils/database.js');
      const allArticles = await getPublishedArticles();
      console.log(`\n📊 Found ${allArticles.length} published articles total`);
      
      if (allArticles.length > 0) {
        console.log('📋 Available article slugs:');
        allArticles.slice(0, 10).forEach((art, index) => {
          console.log(`  ${index + 1}. "${art.slug}" (${art.title})`);
        });
        
        // Check if the slug exists with a different status
        const exactSlugMatch = allArticles.find(art => art.slug === slug);
        if (exactSlugMatch) {
          console.log(`\n⚠️ Article found but with status: "${exactSlugMatch.status}"`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testArticleBySlug();

