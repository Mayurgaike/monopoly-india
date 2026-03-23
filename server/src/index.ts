// ============================================
// Monopoly India — Server Entry Point
// ============================================

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { RoomManager } from './rooms/RoomManager';
import { registerSocketHandlers } from './socket/handlers';
import { ServerToClientEvents, ClientToServerEvents } from '../../shared/src/types';

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const IS_PROD = process.env.NODE_ENV === 'production';

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// In production, serve the built client static files
if (IS_PROD) {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
}

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN.split(','),
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager();

// Register socket event handlers
registerSocketHandlers(io, roomManager);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// In production, serve index.html for all non-API routes (SPA fallback)
if (IS_PROD) {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Periodic cleanup of stale rooms
setInterval(() => {
  roomManager.cleanup();
}, 60 * 60 * 1000); // Every hour

httpServer.listen(PORT, HOST, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║    🎲 Monopoly India Server 🇮🇳      ║
  ║    Running on ${HOST}:${PORT}          ║
  ║    Mode: ${IS_PROD ? 'PRODUCTION' : 'DEVELOPMENT'}             ║
  ╚══════════════════════════════════════╝
  `);
});
