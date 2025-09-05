// Test Articles CRUD Operations
async function testArticlesCRUD() {
  const baseUrl = 'http://localhost:4322';
  
  console.log('🧪 Testing Articles CRUD Operations...\n');
  
  try {
    // 1. Test GET /api/articles
    console.log('1️⃣ Testing GET /api/articles');
    const getResponse = await fetch(`${baseUrl}/api/articles`);
    
    if (getResponse.ok) {
      const articles = await getResponse.json();
      console.log(`✅ GET Success: Found ${articles.length} articles`);
      console.log(`📋 Sample article:`, articles[0] ? {
        id: articles[0].id,
        title: articles[0].title,
        status: articles[0].status,
        author: articles[0].author_name
      } : 'No articles found');
      
      if (articles.length > 0) {
        const testArticle = articles[0];
        console.log('\n2️⃣ Testing PUT /api/articles (Update)');
        
        // Test update
        const updateData = {
          id: testArticle.id,
          title: testArticle.title + ' (Updated)',
          content: testArticle.content || 'Test content',
          excerpt: testArticle.excerpt || 'Test excerpt',
          status: testArticle.status,
          category_id: testArticle.category_id || null,
          author_id: testArticle.author_id || 1,
          is_featured: testArticle.is_featured || false
        };
        
        const updateResponse = await fetch(`${baseUrl}/api/articles`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });
        
        if (updateResponse.ok) {
          const updatedArticle = await updateResponse.json();
          console.log('✅ PUT Success: Article updated');
          console.log(`📝 Updated title: ${updatedArticle.title}`);
        } else {
          const errorText = await updateResponse.text();
          console.log(`❌ PUT Failed: ${updateResponse.status} - ${errorText}`);
        }
        
        console.log('\n3️⃣ Testing DELETE /api/articles (Soft Delete)');
        
        // Test soft delete (archive)
        const deleteResponse = await fetch(`${baseUrl}/api/articles?id=${testArticle.id}`, {
          method: 'DELETE'
        });
        
        if (deleteResponse.ok) {
          const deleteResult = await deleteResponse.json();
          console.log('✅ DELETE Success:', deleteResult.message);
        } else {
          const errorText = await deleteResponse.text();
          console.log(`❌ DELETE Failed: ${deleteResponse.status} - ${errorText}`);
        }
      }
    } else {
      const errorText = await getResponse.text();
      console.log(`❌ GET Failed: ${getResponse.status} - ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
  
  console.log('\n🏁 CRUD Test Complete');
}

// Run the test
testArticlesCRUD();

