// ============================================
// Monopoly India — Server Entry Point
// ============================================

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './rooms/RoomManager';
import { registerSocketHandlers } from './socket/handlers';
import { ServerToClientEvents, ClientToServerEvents } from '../../shared/src/types';

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager();

// Register socket event handlers
registerSocketHandlers(io, roomManager);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Periodic cleanup of stale rooms
setInterval(() => {
  roomManager.cleanup();
}, 60 * 60 * 1000); // Every hour

httpServer.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║    🎲 Monopoly India Server 🇮🇳      ║
  ║    Running on port ${PORT}             ║
  ╚══════════════════════════════════════╝
  `);
});
