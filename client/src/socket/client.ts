// ============================================
// Monopoly India — Socket.IO Client
// ============================================

import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '../../../shared/src/types';

const SOCKET_URL = 'http://localhost:3001';

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
