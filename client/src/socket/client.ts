// ============================================
// Monopoly India — Socket.IO Client
// ============================================

import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '../../../shared/src/types';

// Use the current origin dynamically.
// In dev: Points to Vite directly (e.g. http://192.168.x.x:5173), which proxies /socket.io to the Node server.
// In prod: Points to the Node server (e.g. http://production-url.com) serving the client.
const SOCKET_URL = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

export function connectSocket(): void {
  if (!socket.connected) {
    socket.connect();
  }
}

export function disconnectSocket(): void {
  if (socket.connected) {
    socket.disconnect();
  }
}
