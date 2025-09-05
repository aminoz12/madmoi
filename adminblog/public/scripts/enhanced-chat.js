// Enhanced Chat System with GPT-5 Integration
class EnhancedChat {
  constructor() {
    this.conversations = new Map();
    this.currentConversationId = null;
    this.gptService = null;
    this.isTyping = false;
    
    this.init();
  }

  init() {
    this.loadConversations();
    this.setupEventListeners();
    this.initializeGPTService();
    this.renderConversations();
  }

  initializeGPTService() {
    // Initialize GPT-5 service if available
    if (window.GPT5Service) {
      this.gptService = new window.GPT5Service();
      console.log('✅ GPT-5 service initialized for chat');
      this.updateGPTStatus(true);
    } else {
      console.warn('⚠️ GPT-5 service not available');
      this.updateGPTStatus(false);
    }
  }

  updateGPTStatus(status) {
    const gptStatus = document.getElementById('gptStatus');
    const gptStatusText = document.querySelector('#gptStatus + span');
    
    if (gptStatus && gptStatusText) {
      if (status === true) {
        gptStatus.className = 'w-3 h-3 bg-green-500 rounded-full';
        gptStatusText.textContent = 'GPT-5: Disponible';
      } else if (status === 'typing') {
        gptStatus.className = 'w-3 h-3 bg-blue-500 rounded-full animate-pulse';
        gptStatusText.textContent = 'GPT-5: Génération...';
      } else {
        gptStatus.className = 'w-3 h-3 bg-red-500 rounded-full';
        gptStatusText.textContent = 'GPT-5: Indisponible';
      }
    }
  }

  setupEventListeners() {
    // Message input
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    
    if (messageInput && sendButton) {
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      sendButton.addEventListener('click', () => {
        this.sendMessage();
      });
    }

    // Search functionality
    const searchInput = document.getElementById('searchConversations');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchConversations(e.target.value);
      });
    }

    // Simulate new message button (for demonstration)
    const simulateMessageBtn = document.getElementById('simulateMessageBtn');
    if (simulateMessageBtn) {
      simulateMessageBtn.addEventListener('click', () => {
        this.simulateNewCustomerMessage();
      });
    }
  }



  sendMessage() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput || !messageInput.value.trim() || !this.currentConversationId) {
      return;
    }

    const messageText = messageInput.value.trim();
    const conversation = this.conversations.get(this.currentConversationId);
    
    if (!conversation) return;

    // Add admin/human response message
    const adminMessage = {
      id: 'msg_' + Date.now(),
      type: 'admin',
      content: messageText,
      timestamp: new Date(),
      sender: 'Mad2Moi Support',
      isGPT: false // This is a human response
    };

    conversation.messages.push(adminMessage);
    conversation.lastActivity = new Date();
    
    // Clear input
    messageInput.value = '';
    
    // Render messages
    this.renderMessages();
    
    // Save conversation
    this.saveConversations();
    
    console.log('✅ Admin response sent:', messageText);
  }

  async generateGPTResponse(customerMessage, conversation) {
    if (!this.gptService) {
      // Fallback response if GPT-5 is not available
      this.addAdminMessage('Merci pour votre message ! Un membre de notre équipe vous répondra bientôt.', conversation);
      return;
    }

    try {
      // Create context-aware prompt for customer support
      const systemPrompt = `Tu es un assistant clientèle professionnel et sympathique pour Mad2Moi Blog.
      
      Règles importantes:
      - Sois toujours poli, professionnel et serviable
      - Réponds en français
      - Sois concis mais complet (max 150 mots)
      - Si tu ne sais pas quelque chose, propose de transférer à un humain
      - Utilise un ton amical et rassurant
      
      Contexte de la conversation:
      - Client: ${conversation.customer.name}
      - Messages précédents: ${conversation.messages.slice(-3).map(m => `${m.sender}: ${m.content}`).join(' | ')}
      
      Question du client: ${customerMessage}`;

      const response = await this.gptService.generateArticle(systemPrompt, {
        tone: 'friendly',
        length: 'short',
        language: 'French'
      });

      if (response.success && response.data) {
        let gptResponse = response.data.content || response.data;
        
        // Clean up the response if it's too long
        if (gptResponse.length > 200) {
          gptResponse = gptResponse.substring(0, 200) + '...';
        }

        // Add a small delay to simulate typing
        setTimeout(() => {
          this.hideTypingIndicator();
          this.addAdminMessage(gptResponse, conversation);
        }, 1000 + Math.random() * 2000);

      } else {
        throw new Error('GPT response failed');
      }

    } catch (error) {
      console.error('Error generating GPT response:', error);
      this.hideTypingIndicator();
      this.addAdminMessage('Désolé, je rencontre des difficultés techniques. Un membre de notre équipe vous répondra bientôt.', conversation);
    }
  }

  addAdminMessage(content, conversation) {
    const adminMessage = {
      id: 'msg_' + Date.now(),
      type: 'admin',
      content: content,
      timestamp: new Date(),
      sender: 'Mad2Moi Support',
      isGPT: true
    };

    conversation.messages.push(adminMessage);
    conversation.lastActivity = new Date();
    
    this.renderMessages();
    this.saveConversations();
  }

  showTypingIndicator() {
    this.isTyping = true;
    this.renderTypingIndicator();
    this.updateGPTStatus('typing');
  }

  hideTypingIndicator() {
    this.isTyping = false;
    this.renderTypingIndicator();
    this.updateGPTStatus(true);
  }

  renderTypingIndicator() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;

    let typingIndicator = messagesContainer.querySelector('.typing-indicator');
    
    if (this.isTyping && !typingIndicator) {
      typingIndicator = document.createElement('div');
      typingIndicator.className = 'typing-indicator flex justify-end';
      typingIndicator.innerHTML = `
        <div class="flex items-end space-x-2">
          <div class="max-w-xs lg:max-w-md">
            <div class="bg-gray-200 dark:bg-gray-600 rounded-lg px-4 py-2">
              <div class="flex space-x-1">
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
              </div>
            </div>
          </div>
          <div class="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center">
            <span class="text-white font-semibold text-xs">AI</span>
          </div>
        </div>
      `;
      messagesContainer.appendChild(typingIndicator);
    } else if (!this.isTyping && typingIndicator) {
      typingIndicator.remove();
    }
  }

  renderMessages() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer || !this.currentConversationId) return;

    const conversation = this.conversations.get(this.currentConversationId);
    if (!conversation) return;

    messagesContainer.innerHTML = '';

    conversation.messages.forEach(message => {
      const messageElement = this.createMessageElement(message);
      messagesContainer.appendChild(messageElement);
    });

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `flex ${message.type === 'customer' ? 'justify-start' : 'justify-end'} mb-4`;
    
    const timeString = message.timestamp.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    if (message.type === 'customer') {
      const conversation = this.conversations.get(this.currentConversationId);
      messageDiv.innerHTML = `
        <div class="flex items-end space-x-2">
          <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <span class="text-white font-semibold text-xs">${conversation.customer.initials}</span>
          </div>
          <div class="max-w-xs lg:max-w-md">
            <div class="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2">
              <p class="text-sm text-gray-900 dark:text-white">${this.escapeHtml(message.content)}</p>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${timeString}</p>
          </div>
        </div>
      `;
    } else {
      const aiBadge = message.isGPT ? '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full ml-2">AI</span>' : '';
      messageDiv.innerHTML = `
        <div class="flex items-end space-x-2">
          <div class="max-w-xs lg:max-w-md">
            <div class="bg-blue-600 text-white rounded-lg px-4 py-2">
              <p class="text-sm">${this.escapeHtml(message.content)}</p>
            </div>
            <div class="flex items-center justify-end mt-1">
              <p class="text-xs text-gray-500 dark:text-black">${timeString}</p>
              ${aiBadge}
            </div>
          </div>
          <div class="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center">
            <span class="text-white font-semibold text-xs">A</span>
          </div>
        </div>
      `;
    }

    return messageDiv;
  }

  renderConversations() {
    const conversationsContainer = document.getElementById('conversationsContainer');
    if (!conversationsContainer) return;

    conversationsContainer.innerHTML = '';

    this.conversations.forEach((conversation, id) => {
      const conversationElement = this.createConversationElement(conversation, id);
      conversationsContainer.appendChild(conversationElement);
    });
  }

  createConversationElement(conversation, id) {
    const conversationDiv = document.createElement('div');
    conversationDiv.className = `p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${id === this.currentConversationId ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`;
    
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const lastMessageText = lastMessage ? lastMessage.content.substring(0, 50) + '...' : 'Aucun message';
    const timeString = conversation.lastActivity.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    // Status indicator
    let statusIndicator = '';
    if (conversation.status === 'waiting') {
      statusIndicator = '<div class="w-2 h-2 bg-red-500 rounded-full" title="En attente de réponse"></div>';
    } else if (conversation.status === 'active') {
      statusIndicator = '<div class="w-2 h-2 bg-green-500 rounded-full" title="Conversation active"></div>';
    }

    // Unread count badge
    let unreadBadge = '';
    if (conversation.unreadCount > 0) {
      unreadBadge = `<div class="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">${conversation.unreadCount}</div>`;
    }

    conversationDiv.innerHTML = `
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 ${conversation.customer.avatar} rounded-full flex items-center justify-center">
          <span class="text-white font-semibold text-sm">${conversation.customer.initials}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-gray-900 dark:text-white">${conversation.customer.name}</p>
            <span class="text-xs text-gray-500 dark:text-gray-400">${timeString}</span>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-300 truncate">${lastMessageText}</p>
        </div>
        <div class="flex items-center space-x-2">
          ${statusIndicator}
          ${unreadBadge}
        </div>
      </div>
    `;

    conversationDiv.addEventListener('click', () => {
      this.selectConversation(id);
      // Mark as read when selected
      if (conversation.unreadCount > 0) {
        conversation.unreadCount = 0;
        this.saveConversations();
        this.renderConversations();
      }
    });

    return conversationDiv;
  }

  selectConversation(conversationId) {
    this.currentConversationId = conversationId;
    this.renderConversations();
    this.renderChat();
    this.renderMessages();
  }

  renderChat() {
    const chatHeader = document.getElementById('chatHeader');
    if (!chatHeader || !this.currentConversationId) return;

    const conversation = this.conversations.get(this.currentConversationId);
    if (!conversation) return;

    chatHeader.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 ${conversation.customer.avatar} rounded-full flex items-center justify-center">
            <span class="text-white font-semibold text-sm">${conversation.customer.initials}</span>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${conversation.customer.name}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">En ligne • Dernière activité: ${this.getTimeAgo(conversation.lastActivity)}</p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <button class="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Appeler">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
            </svg>
          </button>
          <button class="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Vidéo">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
          </button>
          <button class="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Plus d'options">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  searchConversations(query) {
    const conversationsContainer = document.getElementById('conversationsContainer');
    if (!conversationsContainer) return;

    const conversations = Array.from(this.conversations.values());
    const filteredConversations = conversations.filter(conversation => {
      const searchText = `${conversation.customer.name} ${conversation.messages.map(m => m.content).join(' ')}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    });

    conversationsContainer.innerHTML = '';
    filteredConversations.forEach(conversation => {
      const conversationElement = this.createConversationElement(conversation, conversation.id);
      conversationsContainer.appendChild(conversationElement);
    });
  }

  generateAvatar(initials) {
    const colors = [
      'bg-gradient-to-br from-blue-500 to-purple-500',
      'bg-gradient-to-br from-green-500 to-teal-500',
      'bg-gradient-to-br from-yellow-500 to-orange-500',
      'bg-gradient-to-br from-red-500 to-pink-500',
      'bg-gradient-to-br from-indigo-500 to-purple-500',
      'bg-gradient-to-br from-emerald-500 to-teal-500'
    ];
    
    const colorIndex = initials.charCodeAt(0) % colors.length;
    return colors[colorIndex];
  }

  getTimeAgo(date) {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    if (diffInMinutes < 1440) return `Il y a ${Math.floor(diffInMinutes / 60)}h`;
    return `Il y a ${Math.floor(diffInMinutes / 1440)}j`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  saveConversations() {
    try {
      const conversationsData = Array.from(this.conversations.entries());
      localStorage.setItem('chatConversations', JSON.stringify(conversationsData));
    } catch (error) {
      console.error('Error saving conversations:', error);
    }
  }

  loadConversations() {
    try {
      const savedData = localStorage.getItem('chatConversations');
      if (savedData) {
        const conversationsData = JSON.parse(savedData);
        this.conversations = new Map(conversationsData);
        
        // Convert date strings back to Date objects
        this.conversations.forEach(conversation => {
          conversation.lastActivity = new Date(conversation.lastActivity);
          conversation.messages.forEach(message => {
            message.timestamp = new Date(message.timestamp);
          });
        });
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }

    // Create sample conversations if none exist
    if (this.conversations.size === 0) {
      this.createSampleConversations();
    } else {
      // Set first conversation as current
      this.currentConversationId = Array.from(this.conversations.keys())[0];
    }
  }

  createSampleConversations() {
    // Sample conversation 1 - Client avec question en attente
    const conv1 = {
      id: 'conv_1',
      customer: {
        name: 'Jean Dupont',
        initials: 'JD',
        avatar: this.generateAvatar('JD')
      },
      messages: [
        {
          id: 'msg_1',
          type: 'customer',
          content: 'Bonjour ! J\'ai une question concernant votre service. Pouvez-vous m\'aider ?',
          timestamp: new Date(Date.now() - 300000), // 5 minutes ago
          sender: 'Jean Dupont'
        }
      ],
      status: 'waiting', // En attente de réponse
      lastActivity: new Date(Date.now() - 300000),
      unreadCount: 1
    };

    // Sample conversation 2 - Client avec problème technique
    const conv2 = {
      id: 'conv_2',
      customer: {
        name: 'Marie Laurent',
        initials: 'ML',
        avatar: this.generateAvatar('ML')
      },
      messages: [
        {
          id: 'msg_4',
          type: 'customer',
          content: 'Bonjour, j\'ai un problème avec la connexion à mon compte.',
          timestamp: new Date(Date.now() - 600000), // 10 minutes ago
          sender: 'Marie Laurent'
        }
      ],
      status: 'waiting', // En attente de réponse
      lastActivity: new Date(Date.now() - 600000),
      unreadCount: 1
    };

    // Sample conversation 3 - Conversation en cours
    const conv3 = {
      id: 'conv_3',
      customer: {
        name: 'Pierre Martin',
        initials: 'PM',
        avatar: this.generateAvatar('PM')
      },
      messages: [
        {
          id: 'msg_6',
          type: 'customer',
          content: 'Comment puis-je modifier mes informations de profil ?',
          timestamp: new Date(Date.now() - 120000), // 2 minutes ago
          sender: 'Pierre Martin'
        },
        {
          id: 'msg_7',
          type: 'admin',
          content: 'Bonjour Pierre ! Pour modifier votre profil, allez dans "Paramètres" puis "Profil". Vous pourrez y changer vos informations personnelles.',
          timestamp: new Date(Date.now() - 60000), // 1 minute ago
          sender: 'Mad2Moi Support',
          isGPT: false
        }
      ],
      status: 'active',
      lastActivity: new Date(Date.now() - 60000),
      unreadCount: 0
    };

    this.conversations.set(conv1.id, conv1);
    this.conversations.set(conv2.id, conv2);
    this.conversations.set(conv3.id, conv3);
    this.currentConversationId = conv1.id;
    
    this.saveConversations();
    console.log('✅ Sample conversations created');
  }

  // Simulate receiving new customer messages (for demonstration)
  simulateNewCustomerMessage() {
    const conversations = Array.from(this.conversations.values());
    if (conversations.length === 0) return;

    // Randomly select a conversation
    const randomConversation = conversations[Math.floor(Math.random() * conversations.length)];
    
    // Sample customer messages
    const sampleMessages = [
      'Bonjour, j\'ai une question sur vos services.',
      'Pouvez-vous m\'aider avec mon compte ?',
      'J\'ai un problème technique, pouvez-vous m\'assister ?',
      'Comment puis-je contacter le support ?',
      'J\'ai besoin d\'aide pour configurer mon profil.'
    ];

    const randomMessage = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
    
    // Add new customer message
    const newCustomerMessage = {
      id: 'msg_' + Date.now(),
      type: 'customer',
      content: randomMessage,
      timestamp: new Date(),
      sender: randomConversation.customer.name
    };

    randomConversation.messages.push(newCustomerMessage);
    randomConversation.lastActivity = new Date();
    randomConversation.status = 'waiting';
    randomConversation.unreadCount = (randomConversation.unreadCount || 0) + 1;
    
    this.saveConversations();
    this.renderConversations();
    
    // If this is the current conversation, also render messages
    if (this.currentConversationId === randomConversation.id) {
      this.renderMessages();
    }
    
    console.log('📨 New customer message received:', randomMessage);
  }
}

// Initialize enhanced chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.enhancedChat = new EnhancedChat();
});



  // Export for global use
  window.EnhancedChat = EnhancedChat;
