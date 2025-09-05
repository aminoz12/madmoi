// Test categories collection
import { getCategories } from './src/utils/database.js';

async function testCategories() {
  try {
    console.log('🧪 Testing Categories Collection...');
    
    const categories = await getCategories();
    console.log(`✅ Categories fetched: ${categories.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCategories();

