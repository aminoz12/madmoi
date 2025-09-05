// Real-time Chat System for Admin Panel
class RealTimeChat {
  constructor() {
    this.currentConversation = null;
    this.chatStream = null;
    this.conversations = [];
    this.messages = {};
    
    this.init();
  }
  
  async init() {
    console.log('🚀 Initializing Real-time Chat System...');
    
    // Initialize UI elements
    this.initUI();
    
    // Load conversations
    await this.loadConversations();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Start real-time updates
    this.startRealTimeUpdates();
    
    console.log('✅ Real-time Chat System initialized');
  }
  
  initUI() {
    this.elements = {
      conversationsContainer: document.getElementById('conversationsContainer'),
      chatHeader: document.getElementById('chatHeader'),
      messagesContainer: document.getElementById('messagesContainer'),
      messageInput: document.getElementById('messageInput'),
      sendButton: document.getElementById('sendButton'),
      aiResponseBtn: document.getElementById('aiResponseBtn'),
      searchConversations: document.getElementById('searchConversations'),
      simulateMessageBtn: document.getElementById('simulateMessageBtn')
    };
  }
  
  setupEventListeners() {
    // Send message
    this.elements.sendButton.addEventListener('click', () => this.sendMessage());
    this.elements.messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
    
    // AI response button
    const aiResponseBtn = document.getElementById('aiResponseBtn');
    if (aiResponseBtn) {
      aiResponseBtn.addEventListener('click', () => this.generateAIResponse());
    }
    
    // Search conversations
    this.elements.searchConversations.addEventListener('input', (e) => {
      this.filterConversations(e.target.value);
    });
    
    // Simulate message button
    if (this.elements.simulateMessageBtn) {
      this.elements.simulateMessageBtn.addEventListener('click', () => this.simulateMessage());
    }
  }
  
  async loadConversations() {
    try {
      const response = await fetch('/api/admin/chat?action=conversations');
      if (response.ok) {
        this.conversations = await response.json();
        this.renderConversations();
      }
    } catch (error) {
      console.error('❌ Error loading conversations:', error);
    }
  }
  
  renderConversations() {
    if (!this.elements.conversationsContainer) return;
    
    this.elements.conversationsContainer.innerHTML = this.conversations.map(conv => `
      <div class="conversation-item p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors border-b border-gray-200 dark:border-gray-600 ${
        this.currentConversation?.id === conv.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : ''
      }" data-conversation-id="${conv.id}">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 rounded-full ${
              conv.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
            }"></div>
            <span class="text-sm font-medium text-gray-900 dark:text-white">
              ${conv.visitor_name || 'Visiteur anonyme'}
            </span>
          </div>
          <span class="text-xs text-gray-500 dark:text-gray-400">
            ${this.formatTime(conv.message)}
          </span>
        </div>
        <div class="text-xs text-gray-600 dark:text-gray-400 truncate">
          ${conv.message_count} message${conv.message_count > 1 ? 's' : ''}
        </div>
      </div>
    `).join('');
    
    // Add click listeners
    this.elements.conversationsContainer.querySelectorAll('.conversation-item').forEach(item => {
      item.addEventListener('click', () => {
        const conversationId = item.dataset.conversationId;
        this.selectConversation(conversationId);
      });
    });
  }
  
  async selectConversation(conversationId) {
    try {
      // Update UI
      this.currentConversation = this.conversations.find(c => c.id == conversationId);
      this.updateChatHeader();
      
      // Load messages
      await this.loadMessages(conversationId);
      
      // Start real-time stream for this conversation
      this.startConversationStream(conversationId);
      
      // Mark conversation as active
      this.updateConversationStatus(conversationId, 'active');
      
      // Update UI selection
      this.elements.conversationsContainer.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('bg-blue-50', 'dark:bg-blue-900/20', 'border-l-4', 'border-l-blue-500');
        if (item.dataset.conversationId == conversationId) {
          item.classList.add('bg-blue-50', 'dark:bg-blue-900/20', 'border-l-4', 'border-l-blue-500');
        }
      });
      
    } catch (error) {
      console.error('❌ Error selecting conversation:', error);
    }
  }
  
  updateChatHeader() {
    if (!this.elements.chatHeader || !this.currentConversation) return;
    
    this.elements.chatHeader.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span class="text-white font-semibold">${(this.currentConversation.visitor_name || 'V').charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              ${this.currentConversation.visitor_name || 'Visiteur anonyme'}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Session: ${this.currentConversation.session_id}
            </p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            this.currentConversation.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
          }">
            ${this.currentConversation.status}
          </span>
          <button id="closeConversationBtn" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
    
    // Add close conversation listener
    const closeBtn = this.elements.chatHeader.querySelector('#closeConversationBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeConversation());
    }
  }
  
  async loadMessages(conversationId) {
    try {
      const response = await fetch(`/api/admin/chat?action=messages&conversation_id=${conversationId}`);
      if (response.ok) {
        this.messages[conversationId] = await response.json();
        this.renderMessages(conversationId);
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error);
    }
  }
  
  renderMessages(conversationId) {
    if (!this.elements.messagesContainer) return;
    
    const messages = this.messages[conversationId] || [];
    
    this.elements.messagesContainer.innerHTML = messages.map(msg => `
      <div class="flex items-start space-x-3 ${msg.sender_type === 'visitor' ? 'justify-start' : 'justify-end'}">
        ${msg.sender_type === 'visitor' ? `
          <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span class="text-white text-sm font-semibold">V</span>
          </div>
        ` : ''}
        <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          msg.sender_type === 'visitor' 
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' 
            : msg.sender_type === 'admin'
            ? 'bg-blue-500 text-white'
            : 'bg-green-500 text-white'
        }">
          <p class="text-sm">${msg.message}</p>
          <p class="text-xs mt-1 opacity-75">${this.formatTime(msg.created_at)}</p>
        </div>
        ${msg.sender_type !== 'visitor' ? `
          <div class="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
            <span class="text-white text-sm font-semibold">${msg.sender_type === 'admin' ? 'A' : 'AI'}</span>
          </div>
        ` : ''}
      </div>
    `).join('');
    
    // Scroll to bottom
    this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
  }
  
  startConversationStream(conversationId) {
    // Stop previous stream
    if (this.chatStream) {
      this.chatStream.close();
    }
    
    // Start new stream
    const url = `/api/admin/chat-stream?conversation_id=${conversationId}`;
    this.chatStream = new EventSource(url);
    
    this.chatStream.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'new_message') {
          // Add new message to current conversation
          if (this.currentConversation && this.currentConversation.id == conversationId) {
            this.addNewMessage(data);
          }
          
          // Update conversations list
          this.loadConversations();
        }
      } catch (error) {
        console.error('❌ Error parsing chat stream:', error);
      }
    };
    
    this.chatStream.onerror = (error) => {
      console.error('❌ Chat stream error:', error);
      this.chatStream = null;
    };
  }
  
  addNewMessage(data) {
    if (!this.currentConversation) return;
    
    const conversationId = this.currentConversation.id;
    if (!this.messages[conversationId]) {
      this.messages[conversationId] = [];
    }
    
    // Add message to array
    this.messages[conversationId].push({
      id: Date.now(),
      sender_type: data.sender_type,
      message: data.message,
      created_at: data.timestamp || new Date().toISOString()
    });
    
    // Re-render messages
    this.renderMessages(conversationId);
  }
  
  async sendMessage() {
    if (!this.currentConversation || !this.elements.messageInput) return;
    
    const message = this.elements.messageInput.value.trim();
    if (!message) return;
    
    try {
      // Send message via API
      const response = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          conversation_id: this.currentConversation.id,
          message: message,
          sender_type: 'admin'
        })
      });
      
      if (response.ok) {
        // Clear input
        this.elements.messageInput.value = '';
        
        // Add message to UI immediately
        this.addNewMessage({
          sender_type: 'admin',
          message: message,
          timestamp: new Date().toISOString()
        });
        
        // Update conversation last message time
        this.currentConversation.last_message_at = new Date().toISOString();
        this.loadConversations();
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
    }
  }
  
  async generateAIResponse() {
    if (!this.currentConversation) return;
    
    try {
      // Get last few messages for context
      const conversationId = this.currentConversation.id;
      const messages = this.messages[conversationId] || [];
      const recentMessages = messages.slice(-5); // Last 5 messages
      
      // Create context for GPT-5
      const context = recentMessages.map(msg => 
        `${msg.sender_type === 'visitor' ? 'Visiteur' : 'Admin'}: ${msg.message}`
      ).join('\n');
      
      // Call GPT-5 service
      if (typeof GPT5Service !== 'undefined') {
        const aiResponse = await GPT5Service.generateResponse(
          `Contexte de la conversation:\n${context}\n\nRéponds de manière naturelle et utile comme Sarah, l'assistante de support.`,
          'gpt-5'
        );
        
        // Send AI response
        const response = await fetch('/api/admin/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_message',
            conversation_id: conversationId,
            message: aiResponse,
            sender_type: 'ai'
          })
        });
        
        if (response.ok) {
          // Add AI response to UI
          this.addNewMessage({
            sender_type: 'ai',
            message: aiResponse,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('❌ Error generating AI response:', error);
    }
  }
  
  async updateConversationStatus(conversationId, status) {
    try {
      await fetch('/api/admin/chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          conversation_id: conversationId,
          status: status
        })
      });
    } catch (error) {
      console.error('❌ Error updating conversation status:', error);
    }
  }
  
  async closeConversation() {
    if (!this.currentConversation) return;
    
    await this.updateConversationStatus(this.currentConversation.id, 'closed');
    
    // Clear current conversation
    this.currentConversation = null;
    this.elements.chatHeader.innerHTML = `
      <div class="text-center text-gray-500 dark:text-gray-400 py-8">
        <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
        </svg>
        <p class="text-lg font-medium">Sélectionnez une conversation</p>
        <p class="text-sm">Choisissez une conversation dans la liste pour commencer à chatter</p>
      </div>
    `;
    
    this.elements.messagesContainer.innerHTML = '';
    
    // Stop chat stream
    if (this.chatStream) {
      this.chatStream.close();
      this.chatStream = null;
    }
    
    // Reload conversations
    await this.loadConversations();
  }
  
  filterConversations(searchTerm) {
    const items = this.elements.conversationsContainer.querySelectorAll('.conversation-item');
    
    items.forEach(item => {
      const visitorName = item.querySelector('span').textContent.toLowerCase();
      const matches = visitorName.includes(searchTerm.toLowerCase());
      item.style.display = matches ? 'block' : 'none';
    });
  }
  
  simulateMessage() {
    if (!this.currentConversation) {
      alert('Veuillez d\'abord sélectionner une conversation');
      return;
    }
    
    // Simulate a visitor message
    const simulatedMessage = "Ceci est un message simulé pour tester le système de chat.";
    
    fetch('/api/admin/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_message',
        conversation_id: this.currentConversation.id,
        message: simulatedMessage,
        sender_type: 'visitor'
      })
    }).then(() => {
      console.log('✅ Simulated message sent');
    }).catch(error => {
      console.error('❌ Error sending simulated message:', error);
    });
  }
  
  startRealTimeUpdates() {
    // Refresh conversations every 10 seconds
    setInterval(() => {
      if (!this.currentConversation) {
        this.loadConversations();
      }
    }, 10000);
  }
  
  formatTime(timestamp) {
    if (!timestamp) return 'Maintenant';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Maintenant';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString();
  }
}

// Initialize chat system when page loads
document.addEventListener('DOMContentLoaded', () => {
  new RealTimeChat();
});
