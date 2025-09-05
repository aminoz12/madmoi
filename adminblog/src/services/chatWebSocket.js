import { WebSocketServer } from 'ws';
import { getChatDatabase, saveMessage, getAdminStatus } from '../utils/chatDatabase.js';

class ChatWebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map to store client connections
    this.adminClients = new Set(); // Set to store admin connections
  }

  initialize(server) {
    this.wss = new WebSocketServer({ server });
    
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    console.log('✅ Chat WebSocket server initialized');
  }

  handleConnection(ws, req) {
    console.log('🔌 New WebSocket connection established');

    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connection_established',
      timestamp: new Date().toISOString()
    }));

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleMessage(ws, message);
      } catch (error) {
        console.error('❌ Error handling WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: new Date().toISOString()
        }));
      }
    });

    ws.on('close', () => {
      this.handleDisconnection(ws);
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      this.handleDisconnection(ws);
    });
  }

  async handleMessage(ws, message) {
    const { type, data } = message;

    switch (type) {
      case 'register_client':
        await this.registerClient(ws, data);
        break;
      
      case 'register_admin':
        await this.registerAdmin(ws, data);
        break;
      
      case 'send_message':
        await this.handleSendMessage(ws, data);
        break;
      
      case 'typing':
        await this.handleTyping(ws, data);
        break;
      
      case 'admin_availability':
        await this.handleAdminAvailability(ws, data);
        break;
      
      case 'approve_gpt_response':
        await this.handleApproveGPTResponse(ws, data);
        break;
      
      default:
        console.warn('⚠️ Unknown message type:', type);
    }
  }

  async registerClient(ws, data) {
    const { sessionId, userId, name } = data;
    
    this.clients.set(sessionId, {
      ws,
      userId,
      name,
      type: 'user'
    });

    console.log(`👤 User registered: ${name} (${sessionId})`);

    // Send confirmation
    ws.send(JSON.stringify({
      type: 'client_registered',
      sessionId,
      userId,
      timestamp: new Date().toISOString()
    }));

    // Notify admins about new user
    this.broadcastToAdmins({
      type: 'user_connected',
      sessionId,
      userId,
      name,
      timestamp: new Date().toISOString()
    });
  }

  async registerAdmin(ws, data) {
    const { adminId, name } = data;
    
    this.adminClients.add(ws);
    
    // Store admin info in the client map for easy access
    this.clients.set(`admin_${adminId}`, {
      ws,
      userId: adminId,
      name,
      type: 'admin'
    });

    console.log(`👨‍💼 Admin registered: ${name} (${adminId})`);

    // Send confirmation
    ws.send(JSON.stringify({
      type: 'admin_registered',
      adminId,
      timestamp: new Date().toISOString()
    }));

    // Send current admin status
    const isAvailable = await getAdminStatus();
    ws.send(JSON.stringify({
      type: 'admin_status_update',
      available: isAvailable,
      timestamp: new Date().toISOString()
    }));
  }

  async handleSendMessage(ws, data) {
    const { userId, message, sessionId, attachment } = data;
    
    try {
      // Save message to database
      const messageId = await saveMessage(
        userId,
        message,
        'user',
        0,
        attachment ? 1 : 0,
        attachment?.url || null,
        attachment?.type || null
      );

      const messageData = {
        id: messageId,
        userId,
        message,
        sender: 'user',
        timestamp: new Date().toISOString(),
        attachment
      };

      // Send confirmation to sender
      ws.send(JSON.stringify({
        type: 'message_sent',
        messageId,
        timestamp: new Date().toISOString()
      }));

      // Check if admin is available
      const adminAvailable = await getAdminStatus();

      if (adminAvailable) {
        // Notify admins about new message
        this.broadcastToAdmins({
          type: 'new_user_message',
          ...messageData,
          sessionId
        });

        // Generate GPT-5 suggestion (this will be handled by the admin panel)
        // The admin will see the suggestion and can approve/edit it
      } else {
        // Admin not available, generate automatic GPT-5 response
        await this.generateAutoGPTResponse(userId, message, sessionId);
      }

    } catch (error) {
      console.error('❌ Error handling send message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to send message',
        timestamp: new Date().toISOString()
      }));
    }
  }

  async handleTyping(ws, data) {
    const { sessionId, userId, isTyping } = data;
    
    // Broadcast typing indicator to relevant parties
    if (isTyping) {
      this.broadcastToAdmins({
        type: 'user_typing',
        sessionId,
        userId,
        timestamp: new Date().toISOString()
      });
    } else {
      this.broadcastToAdmins({
        type: 'user_stopped_typing',
        sessionId,
        userId,
        timestamp: new Date().toISOString()
      });
    }
  }

  async handleAdminAvailability(ws, data) {
    const { available } = data;
    
    try {
      // Update database
      const { setAdminStatus } = await import('../utils/chatDatabase.js');
      await setAdminStatus(available);
      
      // Broadcast to all admins
      this.broadcastToAdmins({
        type: 'admin_status_update',
        available,
        timestamp: new Date().toISOString()
      });

      // Notify all users about admin availability change
      this.broadcastToUsers({
        type: 'admin_availability_changed',
        available,
        timestamp: new Date().toISOString()
      });

      console.log(`👨‍💼 Admin availability changed: ${available ? 'Available' : 'Not Available'}`);
    } catch (error) {
      console.error('❌ Error updating admin availability:', error);
    }
  }

  async handleApproveGPTResponse(ws, data) {
    const { userId, message, sessionId, originalMessage } = data;
    
    try {
      // Save approved GPT response
      const messageId = await saveMessage(
        userId,
        message,
        'gpt',
        1, // intercepted
        0,
        null,
        null
      );

      const messageData = {
        id: messageId,
        userId,
        message,
        sender: 'gpt',
        timestamp: new Date().toISOString(),
        intercepted: true
      };

      // Send to user
      this.sendToUser(sessionId, {
        type: 'new_message',
        ...messageData
      });

      // Notify admins
      this.broadcastToAdmins({
        type: 'gpt_response_sent',
        ...messageData,
        sessionId
      });

    } catch (error) {
      console.error('❌ Error handling GPT response approval:', error);
    }
  }

  async generateAutoGPTResponse(userId, userMessage, sessionId) {
    try {
      // This would integrate with your GPT-5 service
      // For now, we'll send a placeholder response
      const gptResponse = "Merci pour votre message ! Un administrateur vous répondra dès que possible.";
      
      // Save GPT response
      const messageId = await saveMessage(
        userId,
        gptResponse,
        'gpt',
        0, // not intercepted
        0,
        null,
        null
      );

      const messageData = {
        id: messageId,
        userId,
        message: gptResponse,
        sender: 'gpt',
        timestamp: new Date().toISOString(),
        intercepted: false
      };

      // Send to user
      this.sendToUser(sessionId, {
        type: 'new_message',
        ...messageData
      });

      // Notify admins about the auto-response
      this.broadcastToAdmins({
        type: 'gpt_auto_response',
        ...messageData,
        sessionId
      });

    } catch (error) {
      console.error('❌ Error generating auto GPT response:', error);
    }
  }

  // Utility methods
  sendToUser(sessionId, data) {
    const client = this.clients.get(sessionId);
    if (client && client.ws.readyState === 1) {
      client.ws.send(JSON.stringify(data));
    }
  }

  broadcastToAdmins(data) {
    this.adminClients.forEach(adminWs => {
      if (adminWs.readyState === 1) {
        adminWs.send(JSON.stringify(data));
      }
    });
  }

  broadcastToUsers(data) {
    this.clients.forEach((client, sessionId) => {
      if (client.type === 'user' && client.ws.readyState === 1) {
        client.ws.send(JSON.stringify(data));
      }
    });
  }

  handleDisconnection(ws) {
    // Remove from clients map
    for (const [key, client] of this.clients.entries()) {
      if (client.ws === ws) {
        this.clients.delete(key);
        
        if (client.type === 'admin') {
          this.adminClients.delete(ws);
          console.log(`👨‍💼 Admin disconnected: ${client.name}`);
        } else {
          console.log(`👤 User disconnected: ${client.name} (${key})`);
          
          // Notify admins about user disconnection
          this.broadcastToAdmins({
            type: 'user_disconnected',
            sessionId: key,
            userId: client.userId,
            name: client.name,
            timestamp: new Date().toISOString()
          });
        }
        break;
      }
    }
  }

  // Method to send admin message to user
  async sendAdminMessage(userId, message, sessionId, adminName) {
    try {
      // Save admin message
      const messageId = await saveMessage(
        userId,
        message,
        'admin',
        1, // intercepted
        0,
        null,
        null
      );

      const messageData = {
        id: messageId,
        userId,
        message,
        sender: 'admin',
        adminName,
        timestamp: new Date().toISOString(),
        intercepted: true
      };

      // Send to user
      this.sendToUser(sessionId, {
        type: 'new_message',
        ...messageData
      });

      // Notify all admins
      this.broadcastToAdmins({
        type: 'admin_message_sent',
        ...messageData,
        sessionId
      });

      return messageId;
    } catch (error) {
      console.error('❌ Error sending admin message:', error);
      throw error;
    }
  }

  // Get connected clients info
  getConnectedClients() {
    const clients = [];
    this.clients.forEach((client, sessionId) => {
      clients.push({
        sessionId,
        userId: client.userId,
        name: client.name,
        type: client.type,
        connected: client.ws.readyState === 1
      });
    });
    return clients;
  }
}

// Export singleton instance
export const chatWebSocketService = new ChatWebSocketService();


