// Admin Chat System (NO WEBSOCKET) - Real-time-like chat via HTTP polling + direct OpenAI integration
class AdminChatSystem {
  constructor() {
    // === Pas de WebSocket ===
    this.ws = null;

    // Conversation courante
    this.currentConversationId = null;
    this.currentSessionId = null;

    // Admin
    this.adminName = 'Admin'; // TODO: remplacer par le nom réel de l’admin connecté

    // États
    this.isConnected = true;     // en mode HTTP, on considère la “connexion” OK
    this.adminAvailable = false; // état dispo admin
    this.gptReady = false;       // état santé OpenAI

    // OpenAI
    this.OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
    this.OPENAI_MODELS = ['gpt-4o', 'gpt-4.1-mini', 'gpt-4o-mini', 'gpt-3.5-turbo'];

    // Timers de polling
    this.pollTimers = { conv: null, msgs: null };

    // Init
    this.initializeElements();
    this.loadInitialData();
    this.setupEventListeners();
    this.setupAutoRefresh();
  }

  /* ===================== INIT UI ===================== */
  initializeElements() {
    // En-têtes / status
    this.adminAvailabilityToggle = document.getElementById('adminAvailabilityToggle');
    this.adminStatusIndicator = document.getElementById('adminStatusIndicator');
    this.gptStatusIndicator = document.getElementById('gptStatusIndicator');

    // Listes / zones
    this.searchConversations = document.getElementById('searchConversations');
    this.conversationsContainer = document.getElementById('conversationsContainer');
    this.chatHeader = document.getElementById('chatHeader');
    this.messagesContainer = document.getElementById('messagesContainer');

    // Entrée message
    this.messageInput = document.getElementById('messageInput');
    this.sendButton = document.getElementById('sendButton');

    // IA
    this.gptResponseBtn = document.getElementById('gptResponseBtn');
    this.gptSuggestionPanel = document.getElementById('gptSuggestionPanel');
    this.gptSuggestionText = document.getElementById('gptSuggestionText');
    this.approveGptBtn = document.getElementById('approveGptBtn');
    this.editGptBtn = document.getElementById('editGptBtn');
    this.rejectGptBtn = document.getElementById('rejectGptBtn');

    // Typing & notifications
    this.typingIndicator = document.getElementById('typingIndicator');
    this.notificationToast = document.getElementById('notificationToast');

    // Extras (optionnels)
    this.emojiPickerBtn = document.getElementById('emojiPickerBtn');
    this.attachmentBtn = document.getElementById('attachmentBtn');
    this.imageBtn = document.getElementById('imageBtn');

    // On indique visuellement “HTTP/Polling”
    this.updateConnectionStatus(true);
  }

  /* ===================== DATA LOAD ===================== */
  async loadInitialData() {
    try {
      // Statut admin
      const statusResponse = await fetch('/api/admin/mongo-chat?action=status');
      const statusData = await statusResponse.json().catch(() => ({}));
      this.updateAdminStatus(!!(statusData && statusData.available));

      // Conversations
      await this.loadConversations();

      // Santé OpenAI
      await this.testGPTService();

      // Démarre le polling une fois les premiers chargements faits
      this.startPolling();
    } catch (error) {
      console.error('❌ Error loading initial data:', error);
      this.showNotification('Erreur init', 'error');
    }
  }

  startPolling() {
    // Rafraîchir la liste des conversations toutes les 5s
    if (this.pollTimers.conv) clearInterval(this.pollTimers.conv);
    this.pollTimers.conv = setInterval(() => this.loadConversations(), 5000);

    // Rafraîchir les messages de la conversation ouverte toutes les 2s
    if (this.pollTimers.msgs) clearInterval(this.pollTimers.msgs);
    this.pollTimers.msgs = setInterval(() => {
      if (this.currentConversationId) this.reloadMessagesForCurrent();
    }, 2000);

    // En cas de retour d’onglet
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.loadConversations();
        this.reloadMessagesForCurrent();
      }
    });
  }

  async loadConversations() {
    try {
      const res = await fetch('/api/admin/mongo-chat?action=conversations');
      const raw = await res.json();
      const conversations = Array.isArray(raw) ? raw : [];
      this.renderConversations(conversations.map(c => this.normalizeConversation(c)));
    } catch (error) {
      console.error('❌ Error loading conversations:', error);
      this.conversationsContainer.innerHTML =
        `<div class="p-4 text-center text-red-500">Erreur de chargement des conversations</div>`;
    }
  }

  async reloadMessagesForCurrent() {
    if (!this.currentConversationId) return;
    try {
      const res = await fetch(`/api/admin/mongo-chat?action=messages&conversation_id=${encodeURIComponent(this.currentConversationId)}`);
      const raw = await res.json();
      const messages = Array.isArray(raw) ? raw.map(m => this.normalizeMessage(m)) : [];
      this.renderMessages(messages); // ré-écrit totalement le panneau = zéro doublon
    } catch (e) {
      console.error('❌ Error loading messages:', e);
    }
  }

  /* ===================== NORMALISATION ===================== */
  normalizeConversation(conv) {
    return {
      conversation_id: conv.conversation_id ?? conv.id ?? conv.conversationId,
      session_id: conv.session_id ?? conv.sessionId ?? null,
      name: conv.name ?? conv.user_name ?? conv.display_name ?? conv.visitor_name ?? 'Anonyme',
      email: conv.email ?? conv.user_email ?? conv.visitor_email ?? 'Aucun email',
      last_message_at: conv.last_message_at ?? conv.updated_at ?? conv.created_at ?? null,
      message_count: conv.message_count ?? conv.total_messages ?? conv.messages_count ?? 0
    };
  }

  deriveSender(m) {
    const raw =
      m.sender ?? m.sender_type ?? m.role ?? m.type ?? m.author_type ?? m.source ?? m.from ?? null;
    let s = raw ? String(raw).toLowerCase() : null;

    if (!s) {
      if (m.is_admin === true || m.is_staff === true) s = 'admin';
      else if (m.is_bot === true || m.ai === true || m.sender_name === 'gpt') s = 'gpt';
      else s = 'user';
    } else {
      if (['admin', 'staff', 'operator', 'support', 'moderator'].includes(s)) s = 'admin';
      else if (['gpt', 'ai', 'bot', 'assistant', 'model'].includes(s)) s = 'gpt';
      else s = 'user';
    }
    return s;
  }

  normalizeMessage(m) {
    const text = m.message ?? m.content ?? m.text ?? '';
    const ts = m.timestamp ?? m.created_at ?? m.updated_at ?? null;
    const sender = this.deriveSender(m);
    return {
      id: m.id ?? m.message_id ?? Date.now(),
      message: String(text),
      sender,
      timestamp: ts,
      has_attachment: !!(m.attachment_url || m.attachment_type),
      attachment_type: m.attachment_type ?? null,
      attachment_url: m.attachment_url ?? null
    };
  }

  /* ===================== RENDER ===================== */
  renderConversations(conversations) {
    if (!conversations.length) {
      this.conversationsContainer.innerHTML =
        `<div class="p-4 text-center text-gray-500 dark:text-gray-400">Aucune conversation active</div>`;
      return;
    }

    this.conversationsContainer.innerHTML = conversations.map(conv => `
      <div class="conversation-item p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
           data-conversation-id="${conv.conversation_id}"
           data-session-id="${conv.session_id}">
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-medium text-gray-900 dark:text-white truncate">${this.escapeHtml(conv.name)}</h4>
            <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${this.escapeHtml(conv.email)}</p>
          </div>
          <div class="flex flex-col items-end">
            <span class="text-xs text-gray-500 dark:text-gray-400">${this.formatTimestamp(conv.last_message_at)}</span>
            <span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-black px-2 py-1 rounded-full">${conv.message_count}</span>
          </div>
        </div>
      </div>
    `).join('');

    this.conversationsContainer.querySelectorAll('.conversation-item').forEach(item => {
      item.addEventListener('click', () => {
        const conversationId = item.dataset.conversationId;
        const sessionId = item.dataset.sessionId || null;
        this.selectConversation(conversationId, sessionId, item);
      });
    });
  }

  async selectConversation(conversationId, sessionId, itemEl) {
    try {
      this.currentConversationId = conversationId;
      this.currentSessionId = sessionId;

      // UI header
      if (itemEl) {
        const userName = itemEl.querySelector('h4')?.textContent || 'Anonyme';
        const userEmail = itemEl.querySelector('p')?.textContent || 'Aucun email';
        document.getElementById('currentUserName').textContent = userName;
        document.getElementById('currentUserInfo').textContent = userEmail;

        this.conversationsContainer.querySelectorAll('.conversation-item')
          .forEach(i => i.classList.remove('bg-blue-50', 'dark:bg-blue-900/20'));
        itemEl.classList.add('bg-blue-50', 'dark:bg-blue-900/20');
      }

      this.enableChatInput();

      // Charge messages + lance un “pull” immédiat
      await this.reloadMessagesForCurrent();
    } catch (error) {
      console.error('❌ Error selecting conversation:', error);
      this.showNotification('Erreur lors de l’ouverture de la conversation', 'error');
    }
  }

  enableChatInput() {
    this.messageInput.disabled = false;
    this.sendButton.disabled = false;
    this.gptResponseBtn.disabled = false;
  }

  renderMessages(messages) {
    // On RÉÉCRIT entièrement le contenu pour éviter tout doublon visuel
    if (!messages || !messages.length) {
      this.messagesContainer.innerHTML =
        `<div class="text-center text-gray-500 dark:text-gray-400 py-8">Aucun message dans cette conversation</div>`;
      return;
    }
    this.messagesContainer.innerHTML = messages.map(msg => this.renderMessage(msg)).join('');
    this.scrollToBottom();
  }

  renderMessage(message) {
    const isUser = message.sender === 'user';
    const isAdmin = message.sender === 'admin';
    const isGPT = message.sender === 'gpt';

    // (tu peux différencier les couleurs ici si tu veux)
    const bubble = isUser
      ? 'bg-blue-100 dark:bg-blue-900/20'
      : isAdmin
        ? 'bg-blue-100 dark:bg-blue-900/20'
        : 'bg-blue-100 dark:bg-blue-900/20';

    const who = isUser ? 'Utilisateur' : isAdmin ? 'Admin' : 'GPT-5';
    const timestamp = this.formatTimestamp(message.timestamp);

    return `
      <div class="message-item ${isUser ? 'text-right' : 'text-left'}">
        <div class="inline-block max-w-xs lg:max-w-md">
          <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">${who} • ${timestamp}</div>
          <div class="px-4 py-2 rounded-lg ${bubble} text-gray-900 dark:text-white">
            ${this.escapeHtml(message.message)}
            ${message.has_attachment ? this.renderAttachment(message) : ''}
          </div>
        </div>
      </div>`;
  }

  renderAttachment(message) {
    if (message.attachment_type && message.attachment_type.startsWith('image/')) {
      return `<img src="${message.attachment_url}" alt="Image" class="mt-2 max-w-full rounded">`;
    }
    return `<div class="mt-2 text-sm text-blue-600 dark:text-blue-400">📎 Pièce jointe</div>`;
  }

  /* ===================== ENVOI & PERSISTANCE (HTTP only) ===================== */
  async sendMessage() {
    if (!this.currentConversationId || !this.messageInput.value.trim()) return;

    const text = this.messageInput.value.trim();
    this.messageInput.value = '';

    try {
      const response = await fetch('/api/admin/mongo-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          conversation_id: this.currentConversationId,
          session_id: this.currentSessionId,
          sender: 'admin',
          sender_type: 'admin',
          message: text,
          admin_name: this.adminName
        })
      });

      if (!response.ok) throw new Error('HTTP persist failed');

      const payload = await response.json().catch(() => ({}));
      const saved = payload?.message ? this.normalizeMessage(payload.message) : {
        id: Date.now(),
        message: text,
        sender: 'admin',
        timestamp: new Date().toISOString()
      };

      // On réinjecte localement pour le ressenti immédiat
      this.messagesContainer.insertAdjacentHTML('beforeend', this.renderMessage(saved));
      this.scrollToBottom();

      // Une petite sync pour s’assurer d’être aligné avec le serveur
      setTimeout(() => this.reloadMessagesForCurrent(), 300);

    } catch (error) {
      console.error('❌ sendMessage error:', error);
      // Ajout optimiste si tu veux quand même voir le message:
      const optimistic = {
        id: Date.now(),
        message: text,
        sender: 'admin',
        timestamp: new Date().toISOString()
      };
      this.messagesContainer.insertAdjacentHTML('beforeend', this.renderMessage(optimistic));
      this.scrollToBottom();
    }
  }

  addMessageToUI(message) {
    const msg = this.normalizeMessage(message);
    this.messagesContainer.insertAdjacentHTML('beforeend', this.renderMessage(msg));
    this.scrollToBottom();
  }

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  /* ===================== IA : Appel direct OpenAI ===================== */

  // Récupération de la clé API
  getOpenAIApiKey() {
    const ls = localStorage.getItem('openai_api_key');
    if (ls && ls.trim()) return ls.trim();

    const meta = document.querySelector('meta[name="openai-api-key"]');
    if (meta?.content && meta.content.trim()) return meta.content.trim();

    if (window.OPENAI_API_KEY && String(window.OPENAI_API_KEY).trim()) {
      return String(window.OPENAI_API_KEY).trim();
    }
    return null;
  }

  getOpenAIOrg() {
    return (
      localStorage.getItem('openai_org') ||
      document.querySelector('meta[name="openai-organization"]')?.content ||
      ''
    ).trim();
  }

  getOpenAIProject() {
    return (
      localStorage.getItem('openai_project') ||
      document.querySelector('meta[name="openai-project"]')?.content ||
      ''
    ).trim();
  }

  getOpenAIApiKey() {
    // Try localStorage first (user input)
    const storedKey = localStorage.getItem('openai_api_key');
    if (storedKey && storedKey.trim()) {
      return storedKey.trim();
    }
    
    // Try meta tag
    const metaKey = document.querySelector('meta[name="openai-api-key"]')?.content;
    if (metaKey && metaKey.trim()) {
      return metaKey.trim();
    }
    
    // No API key found
    return null;
  }

  getOpenAIHeaders() {
    // Get API key from environment or localStorage
    const apiKey = this.getOpenAIApiKey();
    if (!apiKey) throw new Error('Aucune clé OpenAI trouvée');

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    const org = this.getOpenAIOrg();
    if (org) headers['OpenAI-Organization'] = org;
    const project = this.getOpenAIProject();
    if (project) headers['OpenAI-Project'] = project;
    return headers;
  }

  buildConversationContext(limit = 8) {
    const items = Array.from(this.messagesContainer.querySelectorAll('.message-item'));
    const last = items.slice(-limit).map((el) => {
      const isRight = el.classList.contains('text-right'); // user
      const text = el.querySelector('.px-4.py-2')?.textContent?.trim() || '';
      return { role: isRight ? 'user' : 'assistant', content: text };
    });
    return last;
  }

  async openAIChat(messages) {
    const headers = this.getOpenAIHeaders();
    let lastErrorText = '';

    for (const model of this.OPENAI_MODELS) {
      try {
        const res = await fetch(this.OPENAI_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify({ model, messages, temperature: 0.6, max_tokens: 500 })
        });

        if (!res.ok) {
          const txt = await res.text();
          if (res.status === 404 || res.status === 403 || /model_not_found/i.test(txt)) {
            lastErrorText = `(${model}) -> ${txt}`;
            continue; // essaie le modèle suivant
          }
          throw new Error(`OpenAI error ${res.status}: ${txt}`);
        }

        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content || '';
        return content.trim();
      } catch (e) {
        lastErrorText = e?.message || String(e);
        continue;
      }
    }
    throw new Error(`Aucun modèle accessible. Détails: ${lastErrorText || 'inconnu'}`);
  }

  async testGPTService() {
    try {
      // Vérifie la clé (throw si absente)
      const key = this.getOpenAIApiKey();
      if (!key) throw new Error('Clé OpenAI manquante');

      const reply = await this.openAIChat([{ role: 'user', content: 'OK' }]);
      const ok = !!reply;
      this.gptReady = ok;
      this.gptStatusIndicator.className = `w-3 h-3 ${ok ? 'bg-green-500' : 'bg-red-500'} rounded-full`;
      this.gptStatusIndicator.nextElementSibling.textContent = ok ? 'GPT-5: Prêt' : 'GPT-5: Erreur API';
    } catch (err) {
      this.gptReady = false;
      this.gptStatusIndicator.className = 'w-3 h-3 bg-red-500 rounded-full';
      this.gptStatusIndicator.nextElementSibling.textContent = 'GPT-5: Erreur API';
      console.error('Healthcheck OpenAI:', err);
    }
  }

  async generateGPTResponse() {
    if (!this.currentConversationId) return;

    const ctx = this.buildConversationContext(8);
    const lastUser = ctx.slice().reverse().find(m => m.role === 'user')?.content || '';

    const system = `Tu es un assistant de support Mad2Moi. Réponds en français, poli, bref et utile. 
- Si la question est vague, pose 1 question de clarification.
- Si c'est une demande de status/commande, demande l'ID/Email.
- Ne promets rien, propose des étapes concrètes.`;

    try {
      const aiText = await this.openAIChat([
        { role: 'system', content: system },
        ...ctx,
        ...(lastUser ? [] : [{ role: 'user', content: 'Bonjour' }])
      ]);

      this.gptSuggestionText.value = aiText || '';
      this.gptSuggestionPanel.classList.remove('hidden');
    } catch (e) {
      console.error('❌ Error generating GPT response:', e);
      this.showNotification('Erreur IA: ' + e.message, 'error');
    }
  }

  async approveGPTResponse() {
    if (!this.currentConversationId) return;
    const text = this.gptSuggestionText.value.trim();
    if (!text) return;

    try {
      const response = await fetch('/api/admin/mongo-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          conversation_id: this.currentConversationId,
          session_id: this.currentSessionId,
          sender: 'gpt',
          sender_type: 'gpt',
          message: text,
          admin_name: this.adminName
        })
      });

      if (!response.ok) throw new Error('HTTP persist failed (gpt)');

      const payload = await response.json().catch(() => ({}));
      const saved = payload?.message ? this.normalizeMessage(payload.message) : {
        id: Date.now(),
        message: text,
        sender: 'gpt',
        timestamp: new Date().toISOString()
      };

      this.gptSuggestionPanel.classList.add('hidden');
      this.addMessageToUI(saved);

      // petite sync
      setTimeout(() => this.reloadMessagesForCurrent(), 300);
    } catch (error) {
      console.error('❌ approveGPTResponse error:', error);
      this.gptSuggestionPanel.classList.add('hidden');
      // Ajout optimiste
      this.addMessageToUI({
        id: Date.now(),
        message: text,
        sender: 'gpt',
        timestamp: new Date().toISOString()
      });
    }
  }

  editGPTResponse() { this.gptSuggestionText.focus(); }
  rejectGPTResponse() { this.gptSuggestionPanel.classList.add('hidden'); this.gptSuggestionText.value = ''; }

  /* ===================== STATUTS & UI ===================== */
  async updateAdminAvailability(available) {
    try {
      const response = await fetch('/api/admin/mongo-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'availability', available })
      });
      if (!response.ok) throw new Error('Failed to update availability');

      this.updateAdminStatus(available);
    } catch (error) {
      console.error('❌ Error updating admin availability:', error);
      this.showNotification('Erreur lors de la mise à jour de la disponibilité', 'error');
    }
  }

  updateAdminStatus(available) {
    this.adminAvailable = available;
    this.adminAvailabilityToggle.checked = available;
    if (available) {
      this.adminStatusIndicator.className = 'w-3 h-3 bg-green-500 rounded-full';
      this.adminStatusIndicator.nextElementSibling.textContent = 'Admin: En ligne';
    } else {
      this.adminStatusIndicator.className = 'w-3 h-3 bg-red-500 rounded-full';
      this.adminStatusIndicator.nextElementSibling.textContent = 'Admin: Hors ligne';
    }
  }

  updateConnectionStatus(connected) {
    // Indicateur: on l’utilise pour montrer le mode “HTTP/Polling”
    if (connected) {
      this.gptStatusIndicator.className = 'w-3 h-3 bg-green-500 rounded-full';
      this.gptStatusIndicator.nextElementSibling.textContent = 'Mode: HTTP/Polling';
    } else {
      this.gptStatusIndicator.className = 'w-3 h-3 bg-red-500 rounded-full';
      this.gptStatusIndicator.nextElementSibling.textContent = 'Mode: Hors ligne';
    }
  }

  showTypingIndicator(_sessionId, isTyping) {
    // En HTTP-only, on n’a pas d’événement “typing”; tu peux l’activer via backend si tu veux.
    this.typingIndicator?.classList.toggle('hidden', !isTyping);
  }

  showNotification(message, type = 'info') {
    const notificationText = document.getElementById('notificationText');
    if (notificationText) notificationText.textContent = message;

    this.notificationToast.className =
      `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg transform translate-x-full transition-transform duration-300 z-50 ${
        type === 'error' ? 'bg-red-600' :
        type === 'success' ? 'bg-green-600' :
        type === 'warning' ? 'bg-yellow-600' : 'bg-blue-600'
      } text-white`;

    this.notificationToast.classList.remove('translate-x-full');
    setTimeout(() => this.notificationToast.classList.add('translate-x-full'), 5000);
  }

  formatTimestamp(ts) {
    if (!ts) return '';
    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const diffH = (now - date) / 36e5;
    if (diffH < 1) return 'À l’instant';
    if (diffH < 24) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  escapeHtml(text) { const div = document.createElement('div'); div.textContent = text ?? ''; return div.innerHTML; }
  safeParse(str) { try { return JSON.parse(str); } catch { return null; } }

  /* ===================== ÉCOUTEURS ===================== */
  setupEventListeners() {
    // Envoi message
    this.sendButton.addEventListener('click', () => this.sendMessage());
    this.messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
    });

    // IA
    this.gptResponseBtn.addEventListener('click', () => this.generateGPTResponse());
    this.approveGptBtn.addEventListener('click', () => this.approveGPTResponse());
    this.editGptBtn.addEventListener('click', () => this.editGPTResponse());
    this.rejectGptBtn.addEventListener('click', () => this.rejectGPTResponse());

    // Dispo admin
    this.adminAvailabilityToggle.addEventListener('change', (e) => this.updateAdminAvailability(e.target.checked));

    // Recherche conv
    this.searchConversations.addEventListener('input', (e) => this.filterConversations(e.target.value));

    // Emoji (simple)
    if (this.emojiPickerBtn) {
      this.emojiPickerBtn.addEventListener('click', () => {
        const emojis = ['😊', '👍', '❤️', '🎉', '🔥', '💯', '✨', '🚀'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        this.messageInput.value += randomEmoji;
        this.messageInput.focus();
      });
    }
  }

  filterConversations(query) {
    const items = this.conversationsContainer.querySelectorAll('.conversation-item');
    const q = (query || '').toLowerCase();
    items.forEach(item => {
      const userName = (item.querySelector('h4')?.textContent || '').toLowerCase();
      const userEmail = (item.querySelector('p')?.textContent || '').toLowerCase();
      item.style.display = (userName.includes(q) || userEmail.includes(q)) ? 'block' : 'none';
    });
  }

  /* ===================== AUTO-REFRESH ===================== */
  setupAutoRefresh() {
    // Refresh conversations every 5 seconds
    this.pollTimers.conv = setInterval(() => {
      this.loadConversations();
    }, 5000);

    // Refresh messages for current conversation every 3 seconds
    this.pollTimers.msgs = setInterval(() => {
      if (this.currentConversationId) {
        this.reloadMessagesForCurrent();
      }
    }, 3000);

    // Pause polling when page is not visible to save resources
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page hidden - stop polling
        clearInterval(this.pollTimers.conv);
        clearInterval(this.pollTimers.msgs);
      } else {
        // Page visible - resume polling
        this.setupAutoRefresh();
      }
    });

    console.log('✅ Auto-refresh enabled: conversations (5s), messages (3s)');
  }

  // Cleanup method (optional)
  destroy() {
    if (this.pollTimers.conv) clearInterval(this.pollTimers.conv);
    if (this.pollTimers.msgs) clearInterval(this.pollTimers.msgs);
  }
}

/* ===================== BOOT ===================== */
document.addEventListener('DOMContentLoaded', () => new AdminChatSystem());
