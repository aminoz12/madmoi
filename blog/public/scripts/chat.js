class LiveChatSystem {
    constructor() {
      // État
      this._reloadTimer = null;
      this._sendLock = false; // 🔒 anti double trigger
  
      // === Session persistante ===
      this.sessionId = this.getOrCreateSessionId();
      this.userName  = this.getUserName();
      this.userEmail = this.getUserEmail();
  
      // État conversation & pièces jointes
      this.conversationId = null;
      this.currentAttachment = null;
  
      // IA côté client (désactivée par défaut en prod)
      this.alwaysAi = true;
      this.OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
      this.OPENAI_CANDIDATES = ['gpt-4o-mini','gpt-4o','gpt-4.1-mini','gpt-3.5-turbo'];
  
      // Dédoublonnage & pending
      this.STORE_KEY_PREFIX = 'mad2moi_chat_store_v1::';
      this.storeKey = this.STORE_KEY_PREFIX + this.sessionId;
      this.persistCap = 300;
      this.persistedIds = new Set();      // pour dédoublonnage UI (mid)
      this.adminFeed = { lastTs: 0 };     // curseur temps
      this.pendingOutgoing = new Map();   // tempId -> {text, ts, domId, sender}
  
      // UI refs
      this.initializeElements();
  
      // Boot
      this.restoreFromLocalStore();
      this.setupEventListeners();
      this.startConversation();
  
      // util reset tests
      window.clearChatHistory = () => {
        localStorage.removeItem(this.storeKey);
        this.showNotification('Historique local effacé');
      };
    }
  
    /* ============ UI refs ============ */
    initializeElements() {
      this.chatToggleBtn = document.getElementById('chatToggleBtn');
      this.chatWindow = document.getElementById('chatWindow');
      this.closeChatBtn = document.getElementById('closeChatBtn');
      this.chatMessages = document.getElementById('chatMessages');
      this.chatInput = document.getElementById('chatInput');
      this.sendChatBtn = document.getElementById('sendChatBtn');
      this.typingIndicator = document.getElementById('typingIndicator');
      this.emojiToggleBtn = document.getElementById('emojiToggleBtn');
      this.emojiPicker = document.getElementById('emojiPicker');
      this.attachmentBtn = document.getElementById('attachmentBtn');
      this.imageBtn = document.getElementById('imageBtn');
      this.fileInput = document.getElementById('fileInput');
      this.onlineDot = document.getElementById('onlineDot');
      this.statusText = document.getElementById('statusText');
    }
  
    /* ============ Utils ============ */
    getOrCreateSessionId() {
      const k = 'chat_session_id';
      const existing = localStorage.getItem(k);
      if (existing && existing.trim()) return existing;
      const sid = 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2,11);
      localStorage.setItem(k, sid);
      return sid;
    }
    getUserName()  { return localStorage.getItem('chatUserName')  || `Visiteur_${Math.floor(Math.random()*1000)}`; }
    getUserEmail() { return localStorage.getItem('chatUserEmail') || null; }
    escapeHtml(text) { const d=document.createElement('div'); d.textContent=text??''; return d.innerHTML; }
    scrollToBottom() { if (this.chatMessages) this.chatMessages.scrollTop = this.chatMessages.scrollHeight; }
    formatTimestamp(ts) {
      if (!ts) return '';
      const d = new Date(ts), now = new Date(), diffH = (now - d)/36e5;
      if (diffH < 1) return "À l'instant";
      if (diffH < 24) return d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
      return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'});
    }
    showTyping(isTyping) { this.typingIndicator?.classList.toggle('hidden', !isTyping); }
    showNotification(msg, type='info') { console[type==='error'?'error':'log'](msg); }
    safeParse(s) { try { return JSON.parse(s); } catch { return null; } }
    uuid() {
      if (window.crypto?.randomUUID) return crypto.randomUUID();
      return ('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx').replace(/[xy]/g, c=>{
        const r=Math.random()*16|0, v=c==='x'?r:(r&0x3|0x8); return v.toString(16);
      });
    }
    normalizeText(t){ return (t||'').trim().replace(/\s+/g,' '); }
    cssSafe(s){ return (s||'').replace(/[^\w\-:.]/g,'_'); }
  
    /* ============ Persistance locale ============ */
    readStore() {
      const raw = localStorage.getItem(this.storeKey);
      if (!raw) return { conversationId: null, messages: [] };
      try {
        const data = JSON.parse(raw);
        if (!data || typeof data !== 'object') throw 0;
        data.messages = Array.isArray(data.messages) ? data.messages : [];
        return { conversationId: data.conversationId || null, messages: data.messages };
      } catch {
        return { conversationId: null, messages: [] };
      }
    }
    writeStore(next) {
      try { localStorage.setItem(this.storeKey, JSON.stringify(next)); } catch {}
    }
    persistMessage(m) {
      const store = this.readStore();
      const mid = this._makeMsgKey(m);
      if (this.persistedIds.has(mid)) return;
      store.messages.push({
        id: m.id || Date.now(),
        sender: m.sender,
        message: m.message,
        timestamp: m.timestamp,
        attachment: m.attachment || null
      });
      if (store.messages.length > this.persistCap) {
        store.messages = store.messages.slice(-this.persistCap);
      }
      store.conversationId = this.conversationId || store.conversationId || null;
      this.writeStore(store);
      this.persistedIds.add(mid);
    }
    persistConversationId(cid) {
      const store = this.readStore();
      store.conversationId = cid || store.conversationId || null;
      this.writeStore(store);
    }
    restoreFromLocalStore() {
      const store = this.readStore();
      if (store.conversationId) this.conversationId = store.conversationId;
      if (store.messages.length) {
        store.messages.forEach(m => {
          const mid = this._makeMsgKey(m);
          this.persistedIds.add(mid);
          this._appendMessageHTML(m); // ajout direct (skip persist)
          const ts = new Date(m.timestamp).getTime();
          if (ts > this.adminFeed.lastTs) this.adminFeed.lastTs = ts;
        });
        this.scrollToBottom();
      }
    }
  
    /**
     * Clé de dédoublonnage :
     * - Message serveur (id réel et pas "temp-") : clé forte sur id
     * - Bulle optimiste : clé souple (texte normalisé + minute)
     */
    _makeMsgKey(m) {
      const idStr = String(m.id || '');
      const isTemp = idStr.startsWith('temp-');
      if (!isTemp && m.id != null) {
        return `srv::${m.sender||''}::${m.id}`;
      }
      const t = new Date(m.timestamp||Date.now());
      const minuteBucket = new Date(t.getFullYear(),t.getMonth(),t.getDate(),t.getHours(),t.getMinutes()).toISOString();
      const norm = this.normalizeText(m.message);
      return `tmp::${m.sender||''}::${norm}::${minuteBucket}`;
    }
  
    /* ============ Conversation ============ */
    async startConversation() {
      try {
        if (this.conversationId) {
          this.setupAutoReload();
          return;
        }
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'start_conversation',
            session_id: this.sessionId,
            visitor_name: this.userName,
            visitor_email: this.userEmail
          })
        });
        if (!response.ok) throw new Error('start_conversation failed');
        const result = await response.json();
        this.conversationId = result.conversation_id;
        this.persistConversationId(this.conversationId);
  
        this.setupAutoReload();
      } catch (e) {
        console.error(e);
        this.showNotification('Erreur lors du démarrage du chat', 'error');
      }
    }
  
    /* ============ Reload simple (polling) ============ */
    setupAutoReload() {
      if (this.onlineDot) { this.onlineDot.classList.add('bg-green-400'); this.onlineDot.classList.remove('bg-red-400'); }
      if (this.statusText) this.statusText.textContent = 'Connecté';
  
      const onVisible = () => { if (document.visibilityState === 'visible') this.reloadChat?.(); };
      document.addEventListener('visibilitychange', onVisible);
      // Tu peux ajouter un setInterval(() => this.reloadChat(), 2000) ici si tu as un endpoint messages.
    }
  
    async reloadChat() {
      if (!this.conversationId) return;
      try {
        const res = await fetch(`/api/chat?action=messages&conversation_id=${this.conversationId}`);
        if (!res.ok) return;
        const messages = await res.json();
        messages
          .sort((a,b)=> new Date(a.created_at) - new Date(b.created_at))
          .forEach(msg => this._ingestServerMessage(msg));
      } catch (e) {
        console.error('reloadChat', e);
      }
    }
  
    /* ======= Ingestion côté client des messages serveur avec anti-doublon ======= */
    _ingestServerMessage(msg) {
      const m = {
        id: msg.id,
        message: msg.message,
        sender: (msg.sender_type === 'visitor') ? 'user' : (msg.sender_type || 'user'),
        timestamp: msg.created_at,
        attachment: null
      };
  
      // 1) si on a une bulle optimiste correspondante, on la remplace (fenêtre élargie 30s)
      const norm = this.normalizeText(m.message);
      for (const [tempId, meta] of this.pendingOutgoing) {
        const isSameSender = (meta.sender === m.sender);
        const isSameText = this.normalizeText(meta.text) === norm;
        const dt = Math.abs(new Date(m.timestamp) - meta.ts);
        if (isSameSender && isSameText && dt <= 30000) {
          const tempEl = document.querySelector(`[data-temp-id="${tempId}"]`);
          const mid = this._makeMsgKey(m);
          if (tempEl) {
            tempEl.outerHTML = this._messageHTML(m, /*withDataAttrs*/ false, null);
          } else {
            this.addMessageToUI(m);
          }
          this.pendingOutgoing.delete(tempId);
          this.persistedIds.add(mid);
          this.persistMessage(m);
          return;
        }
      }
  
      // 2) filet de sécurité : supprimer toute bulle optimiste jumelle (même côté + même texte)
      this._removeOptimisticDuplicateIfAny(m);
  
      // 3) ajout normal (protégé par anti-doublon DOM + mémoire)
      this.addMessageToUI(m);
    }
  
    _removeOptimisticDuplicateIfAny(m) {
      const norm = this.normalizeText(m.message);
      const nodes = Array.from(this.chatMessages.querySelectorAll('.flex[data-temp-id]'));
      for (const el of nodes) {
        const isUserSide = el.classList.contains('justify-end');
        const sameSide = (m.sender === 'user') === isUserSide;
        if (!sameSide) continue;
        const txt = el.querySelector('div > div:last-child')?.textContent?.trim().replace(/\s+/g,' ') || '';
        if (txt === norm) { el.remove(); }
      }
    }
  
    /* ============ Envoi + IA directe optionnelle ============ */
    async sendMessage() {
      const text = this.chatInput.value.trim();
      if (!text) return;
  
      // 🔒 anti double envoi (double clic / double Enter)
      if (this._sendLock) return;
      this._sendLock = true;
      setTimeout(()=> (this._sendLock = false), 600);
  
      const nowIso = new Date().toISOString();
      const tempId = 'temp-' + this.uuid();
  
      // UI optimiste (avec data-temp-id pour remplacement)
      const optimistic = {
        id: tempId,
        message: text,
        sender: 'user',
        timestamp: nowIso,
        attachment: this.currentAttachment
      };
      this.chatInput.value = '';
      this.addMessageToUI(optimistic, /*skipPersist*/ true, /*tempId*/ tempId);
      this.pendingOutgoing.set(tempId, { text, ts: new Date(nowIso), domId: tempId, sender: 'user' });
  
      try {
        if (!this.conversationId) {
          await this.startConversation();
          if (!this.conversationId) throw new Error('Impossible de créer la conversation');
        }
  
        // Persistance serveur (visitor)
        fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_message',
            conversation_id: this.conversationId,
            message: text,
            sender_type: 'visitor',
            attachment: this.currentAttachment
          })
        }).catch(()=>{});
  
        // IA côté client (optionnelle)
        if (this.alwaysAi) {
          this.showTyping(true);
          const aiText = await this.generateAIReply(text).catch(()=> '');
          this.showTyping(false);
  
          if (aiText) {
            const aiTempId = 'temp-' + this.uuid();
            const aiMsg = { id: aiTempId, message: aiText, sender: 'gpt', timestamp: new Date().toISOString() };
            this.addMessageToUI(aiMsg, /*skipPersist*/ true, aiTempId);
            this.pendingOutgoing.set(aiTempId, { text: aiText, ts: new Date(), domId: aiTempId, sender: 'gpt' });
  
            // Retour serveur (historique global)
            fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'send_message',
                conversation_id: this.conversationId,
                message: aiText,
                sender_type: 'gpt'
              })
            }).catch(()=>{});
          }
        }
  
        this.currentAttachment = null;
        // (Option) setTimeout(() => this.reloadChat(), 800);
      } catch (e) {
        console.error('sendMessage', e);
        this.showNotification("Erreur lors de l'envoi du message", 'error');
      }
    }
  
    /* ============ IA DIRECTE (sans proxy) ============ */
    getOrgHeader() {
      const org = (localStorage.getItem('openai_org') || document.querySelector('meta[name="openai-organization"]')?.content || '').trim();
      return org ? { 'OpenAI-Organization': org } : {};
    }
    getProjectHeader() {
      const proj = (localStorage.getItem('openai_project') || document.querySelector('meta[name="openai-project"]')?.content || '').trim();
      return proj ? { 'OpenAI-Project': proj } : {};
    }
    getApiKey() {
      // Try localStorage first (user input)
      const storedKey = localStorage.getItem('openai_api_key');
      if (storedKey && storedKey.trim()) {
        return storedKey.trim();
      }
      
      // Try meta tag (for environment variable injection)
      const metaKey = document.querySelector('meta[name="openai-api-key"]')?.content;
      if (metaKey && metaKey.trim() && metaKey !== 'your-openai-api-key-here') {
        return metaKey.trim();
      }
      
      // No API key found
      return null;
    }
    async openAIChat(messages) {
      // Get API key from environment or localStorage
      const API_KEY = this.getApiKey();
      if (!API_KEY) {
        throw new Error('OpenAI API key not configured');
      }
      const forcedModel = (localStorage.getItem('openai_model') || '').trim();
      const candidates = forcedModel ? [forcedModel] : this.OPENAI_CANDIDATES;
  
      let lastErr = '';
      for (const model of candidates) {
        try {
          const res = await fetch(this.OPENAI_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${API_KEY}`,
              ...this.getOrgHeader(),
              ...this.getProjectHeader()
            },
            body: JSON.stringify({ model, messages, temperature: 0.6, max_tokens: 400 })
          });
  
          const txt = await res.text();
          if (!res.ok) {
            console.warn('OpenAI error', res.status, txt);
            if (res.status === 403 || res.status === 404 || /model_not_found/i.test(txt)) { lastErr = `(${model}) ${txt}`; continue; }
            throw new Error(`OpenAI ${res.status}: ${txt}`);
          }
          const data = JSON.parse(txt);
          const content = (data?.choices?.[0]?.message?.content || '').trim();
          if (content) return content;
          lastErr = `(${model}) empty content`;
        } catch (e) { lastErr = e.message; continue; }
      }
      throw new Error('Aucun modèle accessible: ' + lastErr);
    }
    buildMiniContext(limit = 12) {
      const rows = Array.from(this.chatMessages.querySelectorAll('.flex'));
      const last = rows.slice(-limit).map(el => {
        const isUser = el.classList.contains('justify-end');
        const text = el.querySelector('div > div:last-child')?.textContent?.trim() || '';
        return { role: isUser ? 'user' : 'assistant', content: text };
      });
      return last;
    }
    async generateAIReply(lastUserText) {
      try {
        const ctx = this.buildMiniContext(12);
        const system = `Tu es un assistant de support. Réponds en français, bref, utile et poli.
  - Si la demande est vague, pose UNE question de clarification.
  - Ne promets rien, propose des étapes concrètes.`;
        const messages = [{ role: 'system', content: system }, ...ctx];
        if (!lastUserText && !ctx.some(m => m.role === 'user')) messages.push({ role: 'user', content: 'Bonjour' });
        return await this.openAIChat(messages);
      } catch (e) {
        console.error('generateAIReply error', e);
        this.showNotification('Réponse IA impossible: ' + e.message, 'error');
        return '';
      }
    }
  
    /* ============ Rendu ============ */
    addMessageToUI(message, skipPersist = false, tempId = null) {
      const mid = this._makeMsgKey(message);
  
      // Anti-doublon DOM fort : si déjà affiché, on sort
      if (!tempId) {
        if (this.persistedIds.has(mid) && !skipPersist) return;
        const exists = this.chatMessages.querySelector(`[data-mid="${this.cssSafe(mid)}"]`);
        if (exists) return;
      }
  
      const html = this._messageHTML(message, /*withDataAttrs*/ !!tempId, tempId);
      this.chatMessages.insertAdjacentHTML('beforeend', html);
      this.scrollToBottom();
  
      // maj curseur temps pour polling
      const ts = new Date(message.timestamp).getTime();
      if (ts > this.adminFeed.lastTs) this.adminFeed.lastTs = ts;
  
      // persistance locale
      if (!skipPersist) {
        this.persistMessage(message);
      } else if (!tempId) {
        // si skipPersist sans tempId, empêcher doublons visuels
        this.persistedIds.add(mid);
      }
    }
  
    _messageHTML(message, withDataAttrs = false, tempId = null) {
      const mid = this._makeMsgKey(message);
      const isUser = message.sender === 'user';
      const who = isUser ? 'Vous' : message.sender === 'admin' ? 'Support' : 'Assistant';
      const bubbleClasses = isUser
        ? 'bg-blue-600 text-white'
        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white';
  
      const dataTemp = withDataAttrs && tempId ? ` data-temp-id="${tempId}"` : '';
      return `
        <div class="flex ${isUser ? 'justify-end' : 'justify-start'}" data-mid="${this.cssSafe(mid)}"${dataTemp}>
          <div class="${bubbleClasses} px-3 py-2 rounded-lg max-w-xs">
            <div class="text-xs opacity-75 mb-1">${who} • ${this.formatTimestamp(message.timestamp)}</div>
            <div>${this.escapeHtml(message.message)}</div>
            ${message.attachment ? this.renderAttachment(message.attachment) : ''}
          </div>
        </div>
      `;
    }
  
    _appendMessageHTML(message) {
      const html = this._messageHTML(message);
      this.chatMessages.insertAdjacentHTML('beforeend', html);
    }
  
    renderAttachment(att) {
      if (att?.type?.startsWith('image/')) return `<img src="${att.url}" alt="Image" class="mt-2 max-w-full rounded">`;
      return `<div class="mt-2 text-sm opacity-75">📎 Pièce jointe</div>`;
    }
  
    /* ============ Événements UI ============ */
    setupEventListeners() {
      this.chatToggleBtn?.addEventListener('click', () => {
        this.chatWindow.classList.toggle('hidden');
        if (!this.chatWindow.classList.contains('hidden')) this.chatInput.focus();
      });
      this.closeChatBtn?.addEventListener('click', () => this.chatWindow.classList.add('hidden'));
  
      this.sendChatBtn?.addEventListener('click', () => this.sendMessage());
      this.chatInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
      });
  
      this.emojiToggleBtn?.addEventListener('click', () => this.emojiPicker?.classList.toggle('hidden'));
      this.emojiPicker?.addEventListener('click', (e) => {
        if (e.target.classList.contains('emoji-btn')) {
          this.chatInput.value += e.target.dataset.emoji;
          this.emojiPicker.classList.add('hidden');
          this.chatInput.focus();
        }
      });
  
      this.attachmentBtn?.addEventListener('click', () => { this.fileInput.accept = '.pdf,.doc,.docx,.txt'; this.fileInput.click(); });
      this.imageBtn?.addEventListener('click', () => { this.fileInput.accept = 'image/*'; this.fileInput.click(); });
      this.fileInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) this.handleFileUpload(file);
      });
    }
  }
  
  // Boot
  document.addEventListener('DOMContentLoaded', () => new LiveChatSystem());
  