// Comprehensive CRUD test for categories
class CategoryCRUDTester {
  constructor() {
    this.baseUrl = 'http://localhost:4322';
    this.testCategory = null;
    this.createdCategories = [];
  }

  async runAllTests() {
    console.log('🧪 Starting comprehensive CRUD tests for categories...');
    console.log('=' .repeat(60));

    try {
      // Test 1: READ - Get all categories
      await this.testGetCategories();
      
      // Test 2: CREATE - Add new category
      await this.testCreateCategory();
      
      // Test 3: READ - Verify category was created
      await this.testGetCategoriesAfterCreate();
      
      // Test 4: UPDATE - Modify category
      await this.testUpdateCategory();
      
      // Test 5: READ - Verify category was updated
      await this.testGetCategoryAfterUpdate();
      
      // Test 6: DELETE - Remove category
      await this.testDeleteCategory();
      
      // Test 7: READ - Verify category was deleted
      await this.testGetCategoriesAfterDelete();
      
      // Test 8: Test duplicate prevention
      await this.testDuplicatePrevention();
      
      // Test 9: Test validation
      await this.testValidation();
      
      console.log('\n' + '=' .repeat(60));
      console.log('🎉 All CRUD tests completed successfully!');
      
    } catch (error) {
      console.error('❌ CRUD test failed:', error);
    }
  }

  async testGetCategories() {
    console.log('\n1️⃣ Testing GET /api/categories (READ)');
    console.log('-' .repeat(40));
    
    const response = await fetch(`${this.baseUrl}/api/categories`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const categories = await response.json();
      console.log(`✅ GET successful - Found ${categories.length} categories`);
      
      if (categories.length > 0) {
        console.log('Sample category:', {
          id: categories[0].id,
          name: categories[0].name,
          slug: categories[0].slug
        });
      }
      
      return categories;
    } else {
      throw new Error(`GET failed: ${response.status}`);
    }
  }

  async testCreateCategory() {
    console.log('\n2️⃣ Testing POST /api/categories (CREATE)');
    console.log('-' .repeat(40));
    
    const uniqueName = `TestCRUD_${Date.now()}`;
    this.testCategory = {
      name: uniqueName,
      description: "Test category for CRUD operations",
      color: "#10B981",
      icon: "🧪",
      featured: false,
      sortOrder: 0
    };
    
    console.log('Creating category:', this.testCategory.name);
    
    const response = await fetch(`${this.baseUrl}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(this.testCategory)
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ CREATE successful');
      console.log('Response:', result);
      
      this.testCategory.id = result.categoryId;
      this.createdCategories.push(this.testCategory.id);
      
      return result;
    } else {
      const error = await response.text();
      throw new Error(`CREATE failed: ${response.status} - ${error}`);
    }
  }

  async testGetCategoriesAfterCreate() {
    console.log('\n3️⃣ Testing GET after CREATE (verify creation)');
    console.log('-' .repeat(40));
    
    const categories = await this.testGetCategories();
    
    const createdCategory = categories.find(cat => cat.id === this.testCategory.id);
    if (createdCategory) {
      console.log('✅ Category found after creation');
      console.log('Found category:', {
        id: createdCategory.id,
        name: createdCategory.name,
        description: createdCategory.description
      });
    } else {
      throw new Error('❌ Created category not found in GET response');
    }
  }

  async testUpdateCategory() {
    console.log('\n4️⃣ Testing PUT /api/categories (UPDATE)');
    console.log('-' .repeat(40));
    
    const updatedData = {
      id: this.testCategory.id,
      name: this.testCategory.name + '_Updated',
      description: 'Updated description for CRUD test',
      color: '#EF4444',
      icon: '🔄',
      featured: true,
      sort_order: 1
    };
    
    console.log('Updating category ID:', this.testCategory.id);
    console.log('New name:', updatedData.name);
    
    const response = await fetch(`${this.baseUrl}/api/categories`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedData)
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ UPDATE successful');
      console.log('Updated category:', result);
      
      // Update our test category reference
      this.testCategory = { ...this.testCategory, ...updatedData };
      
      return result;
    } else {
      const error = await response.text();
      throw new Error(`UPDATE failed: ${response.status} - ${error}`);
    }
  }

  async testGetCategoryAfterUpdate() {
    console.log('\n5️⃣ Testing GET after UPDATE (verify update)');
    console.log('-' .repeat(40));
    
    const categories = await this.testGetCategories();
    
    const updatedCategory = categories.find(cat => cat.id === this.testCategory.id);
    if (updatedCategory && updatedCategory.name.includes('_Updated')) {
      console.log('✅ Category successfully updated');
      console.log('Updated category:', {
        id: updatedCategory.id,
        name: updatedCategory.name,
        description: updatedCategory.description,
        color: updatedCategory.color
      });
    } else {
      throw new Error('❌ Category update not reflected in GET response');
    }
  }

  async testDeleteCategory() {
    console.log('\n6️⃣ Testing DELETE /api/categories (DELETE)');
    console.log('-' .repeat(40));
    
    console.log('Deleting category ID:', this.testCategory.id);
    
    const response = await fetch(`${this.baseUrl}/api/categories?id=${this.testCategory.id}`, {
      method: 'DELETE'
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ DELETE successful');
      console.log('Delete response:', result);
      
      return result;
    } else {
      const error = await response.text();
      throw new Error(`DELETE failed: ${response.status} - ${error}`);
    }
  }

  async testGetCategoriesAfterDelete() {
    console.log('\n7️⃣ Testing GET after DELETE (verify deletion)');
    console.log('-' .repeat(40));
    
    const categories = await this.testGetCategories();
    
    const deletedCategory = categories.find(cat => cat.id === this.testCategory.id);
    if (!deletedCategory) {
      console.log('✅ Category successfully deleted');
    } else {
      throw new Error('❌ Deleted category still appears in GET response');
    }
  }

  async testDuplicatePrevention() {
    console.log('\n8️⃣ Testing duplicate prevention');
    console.log('-' .repeat(40));
    
    // First, create a category
    const uniqueName = `DupTest_${Date.now()}`;
    const testCat = {
      name: uniqueName,
      description: "Test duplicate prevention",
      color: "#8B5CF6",
      icon: "🔒",
      featured: false,
      sortOrder: 0
    };
    
    // Create first instance
    const response1 = await fetch(`${this.baseUrl}/api/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCat)
    });
    
    if (response1.ok) {
      const result1 = await response1.json();
      this.createdCategories.push(result1.categoryId);
      console.log('✅ First category created');
      
      // Try to create duplicate
      const response2 = await fetch(`${this.baseUrl}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCat)
      });
      
      if (response2.status === 409) {
        console.log('✅ Duplicate prevention working - got 409 Conflict');
        const error = await response2.json();
        console.log('Conflict error:', error.error);
      } else {
        throw new Error('❌ Duplicate prevention failed - should have gotten 409');
      }
    } else {
      throw new Error('Failed to create first category for duplicate test');
    }
  }

  async testValidation() {
    console.log('\n9️⃣ Testing validation');
    console.log('-' .repeat(40));
    
    // Test empty name
    const response = await fetch(`${this.baseUrl}/api/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '',
        description: 'Empty name test'
      })
    });
    
    if (response.status === 400) {
      console.log('✅ Validation working - empty name rejected');
      const error = await response.json();
      console.log('Validation error:', error.error);
    } else {
      throw new Error('❌ Validation failed - empty name should be rejected');
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test categories...');
    
    for (const categoryId of this.createdCategories) {
      try {
        const response = await fetch(`${this.baseUrl}/api/categories?id=${categoryId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          console.log(`✅ Cleaned up category ${categoryId}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup category ${categoryId}:`, error.message);
      }
    }
  }
}

// Run the tests
async function runCRUDTests() {
  const tester = new CategoryCRUDTester();
  
  try {
    await tester.runAllTests();
  } finally {
    await tester.cleanup();
  }
}

runCRUDTests();

