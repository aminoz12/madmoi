// Test script to verify fixes
console.log('🧪 Testing fixes...');

// Test 1: Check if GPT5Service is available
if (window.GPT5Service) {
  console.log('✅ GPT5Service is available');
  
  // Test 2: Test generateArticleIdeas
  const gptService = new window.GPT5Service();
  gptService.generateArticleIdeas('test', 3).then(result => {
    console.log('✅ generateArticleIdeas result:', result);
  }).catch(error => {
    console.error('❌ generateArticleIdeas error:', error);
  });
} else {
  console.log('❌ GPT5Service not available');
}

// Test 3: Check if new-article.js functions are available
if (typeof handleSubmit === 'function') {
  console.log('✅ handleSubmit function is available');
} else {
  console.log('❌ handleSubmit function not available');
}

// Test 4: Check if cleanLocalStorage is available
if (typeof cleanLocalStorage === 'function') {
  console.log('✅ cleanLocalStorage function is available');
} else {
  console.log('❌ cleanLocalStorage function not available');
}

// Test 5: Check if subscribers export is working
if (window.subscribersManager) {
  console.log('✅ SubscribersManager is available');
  if (typeof window.subscribersManager.exportSubscribers === 'function') {
    console.log('✅ exportSubscribers function is available');
  } else {
    console.log('❌ exportSubscribers function not available');
  }
} else {
  console.log('❌ SubscribersManager not available');
}

console.log('🧪 Test completed!');
