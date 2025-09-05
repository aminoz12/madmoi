import { createServer } from 'http';
import { chatWebSocketService } from './services/chatWebSocket.js';

// Create HTTP server
const server = createServer();

// Initialize WebSocket service
chatWebSocketService.initialize(server);

// Export the server for Astro to use
export default server;


