// Test script for categories functionality
console.log('🧪 Testing categories functionality...');

// Test 1: Check if categories.js is loaded
if (typeof generateSlug === 'function') {
  console.log('✅ generateSlug function is available');
} else {
  console.log('❌ generateSlug function not available');
}

// Test 2: Check if loadUserCategories is available
if (typeof loadUserCategories === 'function') {
  console.log('✅ loadUserCategories function is available');
} else {
  console.log('❌ loadUserCategories function not available');
}

// Test 3: Check if modal elements exist
const categoryModal = document.getElementById('categoryModal');
const addCategoryBtn = document.getElementById('addCategoryBtn');
const categoryForm = document.getElementById('categoryForm');

if (categoryModal) {
  console.log('✅ categoryModal element found');
} else {
  console.log('❌ categoryModal element not found');
}

if (addCategoryBtn) {
  console.log('✅ addCategoryBtn element found');
} else {
  console.log('❌ addCategoryBtn element not found');
}

if (categoryForm) {
  console.log('✅ categoryForm element found');
} else {
  console.log('❌ categoryForm element not found');
}

// Test 4: Test generateSlug function
if (typeof generateSlug === 'function') {
  const testSlug = generateSlug('Test Catégorie avec Accents éèà');
  console.log('✅ generateSlug test:', testSlug);
} else {
  console.log('❌ generateSlug function not available');
}

// Test 5: Check localStorage for categories
try {
  const userCategories = JSON.parse(localStorage.getItem('userCategories') || '[]');
  console.log('✅ userCategories in localStorage:', userCategories.length, 'categories');
} catch (error) {
  console.error('❌ Error reading userCategories from localStorage:', error);
}

// Test 6: Simulate category creation
function testCategoryCreation() {
  console.log('🧪 Testing category creation...');
  
  const testCategory = {
    id: Date.now(),
    name: 'Test Catégorie',
    description: 'Description de test',
    color: '#3B82F6',
    icon: '🧪',
    featured: false,
    slug: 'test-categorie',
    articleCount: 0,
    createdDate: new Date().toISOString().split('T')[0],
    lastModified: new Date().toISOString().split('T')[0]
  };
  
  try {
    let userCategories = JSON.parse(localStorage.getItem('userCategories') || '[]');
    userCategories.push(testCategory);
    localStorage.setItem('userCategories', JSON.stringify(userCategories));
    console.log('✅ Test category created successfully');
    
    // Clean up test category
    userCategories = userCategories.filter(c => c.id !== testCategory.id);
    localStorage.setItem('userCategories', JSON.stringify(userCategories));
    console.log('✅ Test category cleaned up');
    
  } catch (error) {
    console.error('❌ Error creating test category:', error);
  }
}

// Run test if all elements are available
if (categoryModal && addCategoryBtn && categoryForm) {
  testCategoryCreation();
} else {
  console.log('⚠️ Skipping category creation test - missing elements');
}

console.log('🧪 Categories test completed!');




