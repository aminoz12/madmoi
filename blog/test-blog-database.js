// Test blog database connectivity and article retrieval
async function testBlogDatabase() {
  console.log('🔍 Testing Blog Database Connection');
  console.log('='.repeat(60));
  
  try {
    // Test 1: Import database functions
    console.log('\n1️⃣ Testing database imports...');
    const { initializeDatabase, getArticleBySlug, getPublishedArticles } = await import('./src/utils/database.js');
    console.log('✅ Database functions imported successfully');
    
    // Test 2: Initialize database
    console.log('\n2️⃣ Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized');
    
    // Test 3: Test getting all published articles first
    console.log('\n3️⃣ Testing getPublishedArticles...');
    const allArticles = await getPublishedArticles();
    console.log(`📊 Found ${allArticles.length} published articles`);
    
    if (allArticles.length > 0) {
      console.log('📋 Sample article structure:', {
        id: allArticles[0].id,
        title: allArticles[0].title,
        slug: allArticles[0].slug,
        status: allArticles[0].status,
        content_length: allArticles[0].content ? allArticles[0].content.length : 0,
        has_content: !!allArticles[0].content,
        category_name: allArticles[0].category_name,
        author_name: allArticles[0].author_name
      });
      
      console.log('\n📋 All article slugs:');
      allArticles.forEach((article, index) => {
        console.log(`  ${index + 1}. "${article.slug}" - ${article.title} (${article.status})`);
      });
    }
    
    // Test 4: Test specific slug
    console.log('\n4️⃣ Testing specific article by slug...');
    const targetSlug = 'levolution-du-jeu-de-role-de-la-table-a-lecran-2';
    console.log(`🔍 Looking for slug: "${targetSlug}"`);
    
    const article = await getArticleBySlug(targetSlug);
    
    if (article) {
      console.log('✅ Article found by slug!');
      console.log('📋 Article details:', {
        id: article.id,
        title: article.title,
        slug: article.slug,
        status: article.status,
        content_preview: article.content ? article.content.substring(0, 100) + '...' : 'NO CONTENT',
        content_length: article.content ? article.content.length : 0,
        excerpt: article.excerpt,
        category_name: article.category_name,
        author_name: article.author_name,
        featured_image: !!article.featured_image,
        view_count: article.view_count
      });
      
      if (!article.content) {
        console.log('❌ WARNING: Article found but has no content!');
      }
      
    } else {
      console.log('❌ Article NOT found by slug');
      
      // Check if there's a similar slug
      const similarSlugs = allArticles.filter(art => 
        art.slug.includes('evolution') || art.slug.includes('jeu') || art.slug.includes('role')
      );
      
      if (similarSlugs.length > 0) {
        console.log('🔍 Similar slugs found:');
        similarSlugs.forEach(art => {
          console.log(`  - "${art.slug}" (${art.title})`);
        });
      }
    }
    
    // Test 5: Test direct database factory
    console.log('\n5️⃣ Testing database factory directly...');
    const { executeQueryFactory } = await import('./src/utils/databaseFactory.js');
    
    const directQuery = `
      SELECT 
        a.*,
        c.name as category_name,
        c.color as category_color,
        c.slug as category_slug,
        u.username as author_name
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.slug = ? AND a.status = 'published'
    `;
    
    const directResult = await executeQueryFactory(directQuery, [targetSlug]);
    console.log(`📊 Direct query result: ${directResult.length} articles`);
    
    if (directResult.length > 0) {
      console.log('✅ Direct query found the article!');
      console.log('📋 Direct result structure:', Object.keys(directResult[0]));
    } else {
      console.log('❌ Direct query also found nothing');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('❌ Stack:', error.stack);
  }
}

testBlogDatabase();

