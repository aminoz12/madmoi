// MongoDB Chat Database - Blog side (same as admin for consistency)
export { 
  initializeChatDatabase,
  createConversation,
  addMessage,
  getConversations,
  getMessages,
  updateConversationStatus,
  markMessagesAsRead,
  getChatStats,
  closeChatDatabase
} from '../../../adminblog/src/utils/mongoChatDatabase.js';

