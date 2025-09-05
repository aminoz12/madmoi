// Comprehensive test for article creation with images and content
class ArticleCreationTester {
  constructor() {
    this.baseUrl = 'http://localhost:4322';
    this.createdArticles = [];
  }

  async runAllTests() {
    console.log('🧪 Starting comprehensive article creation tests...');
    console.log('=' .repeat(60));

    try {
      // Test 1: Basic article creation (JSON)
      await this.testBasicArticleCreation();
      
      // Test 2: Article with category
      await this.testArticleWithCategory();
      
      // Test 3: Article with image URL
      await this.testArticleWithImageUrl();
      
      // Test 4: Get articles
      await this.testGetArticles();
      
      // Test 5: Validate required fields
      await this.testValidation();
      
      console.log('\n' + '=' .repeat(60));
      console.log('🎉 All article creation tests completed!');
      
    } catch (error) {
      console.error('❌ Article test failed:', error);
    } finally {
      await this.cleanup();
    }
  }

  async testBasicArticleCreation() {
    console.log('\n1️⃣ Testing Basic Article Creation');
    console.log('-' .repeat(40));
    
    const testArticle = {
      title: `Test Article ${Date.now()}`,
      content: `# Test Article Content\n\nThis is a test article created by the automated test script.\n\n## Features\n\n- Automated testing\n- Article creation\n- Database integration\n\n**Created at:** ${new Date().toISOString()}`,
      excerpt: 'A test article created by automated testing to verify article creation functionality.',
      category: 'BDSM', // Use existing category
      status: 'draft',
      featured: false,
      authorId: 1
    };
    
    console.log('Creating article:', testArticle.title);
    
    const response = await fetch(`${this.baseUrl}/api/articles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testArticle)
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Basic article creation successful');
      console.log('Created article:', {
        id: result.id,
        title: result.title,
        slug: result.slug,
        status: result.status
      });
      
      this.createdArticles.push(result.id);
      return result;
    } else {
      const error = await response.text();
      console.error('❌ Basic article creation failed:', error);
      throw new Error(`Basic article creation failed: ${response.status} - ${error}`);
    }
  }

  async testArticleWithCategory() {
    console.log('\n2️⃣ Testing Article with Category');
    console.log('-' .repeat(40));
    
    // First, get available categories
    const categoriesResponse = await fetch(`${this.baseUrl}/api/categories`);
    const categories = await categoriesResponse.json();
    
    if (categories.length === 0) {
      console.log('⚠️ No categories available, skipping category test');
      return;
    }
    
    const testCategory = categories[0];
    console.log('Using category:', testCategory.name);
    
    const testArticle = {
      title: `Article with Category ${Date.now()}`,
      content: `# Article with Category\n\nThis article is assigned to the **${testCategory.name}** category.\n\n## Category Details\n\n- Name: ${testCategory.name}\n- Description: ${testCategory.description || 'No description'}\n- Icon: ${testCategory.icon || '📁'}`,
      excerpt: `Test article assigned to ${testCategory.name} category.`,
      category: testCategory.name,
      status: 'published',
      featured: true,
      authorId: 1
    };
    
    const response = await fetch(`${this.baseUrl}/api/articles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testArticle)
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Article with category creation successful');
      console.log('Created article:', {
        id: result.id,
        title: result.title,
        category: testCategory.name,
        status: result.status,
        featured: result.is_featured
      });
      
      this.createdArticles.push(result.id);
      return result;
    } else {
      const error = await response.text();
      console.error('❌ Article with category creation failed:', error);
    }
  }

  async testArticleWithImageUrl() {
    console.log('\n3️⃣ Testing Article with Image URL');
    console.log('-' .repeat(40));
    
    const testArticle = {
      title: `Article with Image ${Date.now()}`,
      content: `# Article with Featured Image\n\nThis article includes a featured image to test image handling.\n\n![Featured Image](https://via.placeholder.com/800x400/0066cc/ffffff?text=Test+Image)\n\n## Image Features\n\n- External URL support\n- Responsive display\n- Alt text for accessibility`,
      excerpt: 'Test article with a featured image to verify image handling functionality.',
      category: 'ROLEPLAY',
      status: 'draft',
      featured: false,
      featured_image: {
        url: 'https://via.placeholder.com/800x400/0066cc/ffffff?text=Test+Featured+Image',
        filename: 'test-featured-image.png',
        alt: 'Test featured image for article creation testing',
        caption: 'Generated test image for automated testing',
        size: 25600,
        type: 'image/png'
      },
      authorId: 1
    };
    
    console.log('Creating article with image:', testArticle.featured_image.url);
    
    const response = await fetch(`${this.baseUrl}/api/articles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testArticle)
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Article with image creation successful');
      console.log('Created article:', {
        id: result.id,
        title: result.title,
        has_image: !!result.featured_image,
        status: result.status
      });
      
      this.createdArticles.push(result.id);
      return result;
    } else {
      const error = await response.text();
      console.error('❌ Article with image creation failed:', error);
    }
  }

  async testGetArticles() {
    console.log('\n4️⃣ Testing Get Articles');
    console.log('-' .repeat(40));
    
    const response = await fetch(`${this.baseUrl}/api/articles`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const articles = await response.json();
      console.log(`✅ GET successful - Found ${articles.length} articles`);
      
      // Check if our created articles are in the list
      const ourArticles = articles.filter(a => this.createdArticles.includes(a.id));
      console.log(`📝 Found ${ourArticles.length} of our created articles in the list`);
      
      if (articles.length > 0) {
        console.log('Sample article:', {
          id: articles[0].id,
          title: articles[0].title,
          status: articles[0].status,
          created_at: articles[0].created_at
        });
      }
      
      return articles;
    } else {
      throw new Error(`GET articles failed: ${response.status}`);
    }
  }

  async testValidation() {
    console.log('\n5️⃣ Testing Validation');
    console.log('-' .repeat(40));
    
    // Test missing title
    console.log('Testing missing title...');
    const noTitleResponse = await fetch(`${this.baseUrl}/api/articles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Content without title',
        excerpt: 'Test excerpt'
      })
    });
    
    if (noTitleResponse.status === 400) {
      console.log('✅ Missing title validation working');
    } else {
      console.log('⚠️ Missing title validation may not be working');
    }
    
    // Test missing content
    console.log('Testing missing content...');
    const noContentResponse = await fetch(`${this.baseUrl}/api/articles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Title without content',
        excerpt: 'Test excerpt'
      })
    });
    
    if (noContentResponse.status === 400) {
      console.log('✅ Missing content validation working');
    } else {
      console.log('⚠️ Missing content validation may not be working');
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test articles...');
    
    // Note: DELETE endpoint would need to be implemented for full cleanup
    // For now, just log what would be cleaned up
    console.log(`📝 Created ${this.createdArticles.length} test articles:`, this.createdArticles);
    console.log('💡 Manual cleanup may be required via admin panel');
  }

  // Helper method to test file upload (would need actual file handling)
  async testFileUpload() {
    console.log('\n📁 Testing File Upload (Simulated)');
    console.log('-' .repeat(40));
    
    // This would be used with FormData in a real scenario
    const formData = new FormData();
    formData.append('title', `File Upload Test ${Date.now()}`);
    formData.append('content', 'Article created with file upload test');
    formData.append('excerpt', 'Testing file upload functionality');
    formData.append('status', 'draft');
    
    // In a real test, you would append an actual file:
    // formData.append('featured_image', fileBlob, 'test-image.jpg');
    
    console.log('💡 File upload test requires actual file - skipping for automated test');
    console.log('🔧 To test file upload:');
    console.log('   1. Use the admin panel at http://localhost:4322/admin/new-article');
    console.log('   2. Upload an image file');
    console.log('   3. Fill out the form and submit');
  }
}

// Run the tests
async function runArticleTests() {
  const tester = new ArticleCreationTester();
  await tester.runAllTests();
  
  // Also show file upload instructions
  await tester.testFileUpload();
}

runArticleTests();

