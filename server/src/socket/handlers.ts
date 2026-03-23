// ============================================
// Monopoly India — Socket Event Handlers
// ============================================

import { Server, Socket } from 'socket.io';
import { RoomManager } from '../rooms/RoomManager';
import { ServerToClientEvents, ClientToServerEvents, GameState, GameLog, AuctionState, PLAYER_COLORS } from '../../../shared/src/types';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerSocketHandlers(io: GameServer, roomManager: RoomManager): void {
  io.on('connection', (socket: GameSocket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // --- ROOM EVENTS ---

    socket.on('room:create', (data, callback) => {
      const { playerName } = data;
      if (!playerName || playerName.trim().length === 0) {
        callback({ success: false, error: 'Player name is required' });
        return;
      }

      const result = roomManager.createRoom(playerName.trim(), socket.id);
      socket.join(result.room.id);
      callback({ success: true, room: result.room, playerId: result.playerId });
      console.log(`[Room] Created: ${result.room.code} by ${playerName}`);
    });

    socket.on('room:join', (data, callback) => {
      const { roomCode, playerName } = data;
      if (!roomCode || !playerName || playerName.trim().length === 0) {
        callback({ success: false, error: 'Room code and player name are required' });
        return;
      }

      const result = roomManager.joinRoom(roomCode.trim(), playerName.trim(), socket.id);
      if ('error' in result) {
        callback({ success: false, error: result.error });
        return;
      }

      socket.join(result.room.id);
      callback({ success: true, room: result.room, playerId: result.playerId });

      // Broadcast updated room state to all players
      io.to(result.room.id).emit('room:state', result.room);
      console.log(`[Room] ${playerName} joined ${result.room.code}`);
    });

    // --- COLOR SELECTION ---

    socket.on('room:select-color', (data) => {
      const room = findRoomForSocket(socket.id, roomManager);
      if (!room) return;
      const player = room.players.find((p: any) => p.socketId === socket.id);
      if (!player) return;
      // Don't allow changes once game started
      if (room.gameState?.phase === 'PLAYING') return;

      const { color } = data;
      // Validate color is from allowed list
      if (!PLAYER_COLORS.includes(color)) return;
      // Check color not taken by another player
      const taken = room.players.some((p: any) => p.id !== player.id && p.color === color);
      if (taken) {
        socket.emit('game:error', { message: 'Color already taken!' });
        return;
      }
      player.color = color;
      // Broadcast updated room state to all
      io.to(room.id).emit('room:state', room);
      io.to(room.id).emit('room:color-selected', { playerId: player.id, color });
      console.log(`[Room] ${player.name} selected color ${color}`);
    });

    socket.on('game:start', () => {
      const room = findRoomForSocket(socket.id, roomManager);
      if (!room) return;

      const player = room.players.find((p: any) => p.socketId === socket.id);
      if (!player) return;

      const result = roomManager.startGame(room.id, player.id, {
        onStateChange: (state: GameState) => {
          room.gameState = state;
          io.to(room.id).emit('game:state', state);
        },
        onLog: (log: GameLog) => {
          io.to(room.id).emit('game:log', log);
        },
        onAuctionUpdate: (auction: AuctionState) => {
          room.auctionState = auction;
          io.to(room.id).emit('game:auction-update', auction);
        },
        onAuctionEnd: (data) => {
          room.auctionState = null;
          io.to(room.id).emit('game:auction-end', data);
        },
        onWinner: (data) => {
          io.to(room.id).emit('game:winner', data);
        },
      });

      if (result.success) {
        const engine = roomManager.getEngine(room.id);
        if (engine) {
          io.to(room.id).emit('game:state', engine.getState());
        }
        console.log(`[Game] Started in room ${room.code}`);
      } else {
        socket.emit('game:error', { message: result.error || 'Failed to start game' });
      }
    });

    socket.on('game:roll', () => {
      const { engine, player } = getEngineAndPlayer(socket.id, roomManager);
      if (!engine || !player) return;

      const result = engine.roll(player.id);
      if (!result.success) {
        socket.emit('game:error', { message: result.error || 'Cannot roll' });
      } else {
        const room = findRoomForSocket(socket.id, roomManager);
        if (room) {
          io.to(room.id).emit('game:rolled', { dice: result.dice!, playerId: player.id });
        }
      }
    });

    socket.on('game:buy', () => {
      const { engine, player } = getEngineAndPlayer(socket.id, roomManager);
      if (!engine || !player) return;

      const result = engine.buy(player.id);
      if (!result.success) {
        socket.emit('game:error', { message: result.error || 'Cannot buy' });
      }
    });

    socket.on('game:auction-pass', () => {
      const { engine, player } = getEngineAndPlayer(socket.id, roomManager);
      if (!engine || !player) return;

      // If it's the current player passing on buying, start auction
      const pending = engine.state.turnState.pendingAction;
      if (pending?.type === 'BUY_OR_AUCTION') {
        engine.startAuction(player.id);
      } else {
        engine.passOnAuction(player.id);
      }
    });

    socket.on('game:auction-bid', (data) => {
      const { engine, player } = getEngineAndPlayer(socket.id, roomManager);
      if (!engine || !player) return;

      const result = engine.bidAuction(player.id, data.amount);
      if (!result.success) {
        socket.emit('game:error', { message: result.error || 'Cannot bid' });
      }
    });

    socket.on('game:build', (data) => {
      const { engine, player } = getEngineAndPlayer(socket.id, roomManager);
      if (!engine || !player) return;

      const result = engine.build(player.id, data.tileIndex);
      if (!result.success) {
        socket.emit('game:error', { message: result.error || 'Cannot build' });
      }
    });

    socket.on('game:sell-house', (data) => {
      const { engine, player } = getEngineAndPlayer(socket.id, roomManager);
      if (!engine || !player) return;

      const result = engine.sellHouseAction(player.id, data.tileIndex);
      if (!result.success) {
        socket.emit('game:error', { message: result.error || 'Cannot sell house' });
      }
    });

    socket.on('game:mortgage', (data) => {
      const { engine, player } = getEngineAndPlayer(socket.id, roomManager);
      if (!engine || !player) return;

      const result = engine.mortgage(player.id, data.tileIndex);
      if (!result.success) {
        socket.emit('game:error', { message: result.error || 'Cannot mortgage' });
      }
    });

    socket.on('game:unmortgage', (data) => {
      const { engine, player } = getEngineAndPlayer(socket.id, roomManager);
      if (!engine || !player) return;

      const result = engine.unmortgage(player.id, data.tileIndex);
      if (!result.success) {
        socket.emit('game:error', { message: result.error || 'Cannot unmortgage' });
      }
    });

    socket.on('game:end-turn', () => {
      const { engine, player } = getEngineAndPlayer(socket.id, roomManager);
      if (!engine || !player) return;

      const result = engine.endTurn(player.id);
      if (!result.success) {
        socket.emit('game:error', { message: result.error || 'Cannot end turn' });
      }
    });

    socket.on('game:pay-jail-fine', () => {
      const { engine, player } = getEngineAndPlayer(socket.id, roomManager);
      if (!engine || !player) return;

      const result = engine.payFine(player.id);
      if (!result.success) {
        socket.emit('game:error', { message: result.error || 'Cannot pay fine' });
      }
    });

    socket.on('game:use-jail-card', () => {
      const { engine, player } = getEngineAndPlayer(socket.id, roomManager);
      if (!engine || !player) return;

      const result = engine.useJailCardAction(player.id);
      if (!result.success) {
        socket.emit('game:error', { message: result.error || 'Cannot use jail card' });
      }
    });

    socket.on('game:trade-propose', (proposal) => {
      const { engine, player } = getEngineAndPlayer(socket.id, roomManager);
      if (!engine || !player) return;

      const result = engine.proposeTrade({ ...proposal, fromPlayerId: player.id });
      if (result.success) {
        const room = findRoomForSocket(socket.id, roomManager);
        if (room) {
          io.to(room.id).emit('game:trade-proposed', { ...proposal, fromPlayerId: player.id });
        }
      } else {
        socket.emit('game:error', { message: result.error || 'Cannot propose trade' });
      }
    });

    socket.on('game:trade-respond', (data) => {
      const { engine, player } = getEngineAndPlayer(socket.id, roomManager);
      if (!engine || !player) return;

      const result = engine.respondToTrade(player.id, data.accept);
      if (result.success) {
        const room = findRoomForSocket(socket.id, roomManager);
        if (room) {
          io.to(room.id).emit('game:trade-resolved', {
            accepted: data.accept,
            proposal: engine.pendingTrade || ({} as any),
          });
        }
      } else {
        socket.emit('game:error', { message: result.error || 'Cannot respond to trade' });
      }
    });

    socket.on('game:declare-bankruptcy', () => {
      const { engine, player } = getEngineAndPlayer(socket.id, roomManager);
      if (!engine || !player) return;

      const result = engine.declareBankruptcy(player.id);
      if (!result.success) {
        socket.emit('game:error', { message: result.error || 'Cannot declare bankruptcy' });
      }
    });

    // --- CHAT ---

    socket.on('chat:message', (data) => {
      const room = findRoomForSocket(socket.id, roomManager);
      if (!room) return;
      const player = room.players.find((p: any) => p.socketId === socket.id);
      if (!player) return;

      io.to(room.id).emit('chat:message', {
        playerId: player.id,
        playerName: player.name,
        text: data.text,
        timestamp: Date.now(),
      });
    });

    // --- RECONNECT ---

    socket.on('player:reconnect', (data, callback) => {
      const result = roomManager.reconnectPlayer(data.playerId, data.roomCode, socket.id);
      if (result.error) {
        callback({ success: false, error: result.error });
        return;
      }

      if (result.room) {
        socket.join(result.room.id);
        callback({ success: true, room: result.room });

        const engine = roomManager.getEngine(result.room.id);
        if (engine) {
          socket.emit('game:state', engine.getState());
        }

        io.to(result.room.id).emit('player:reconnected', { playerId: data.playerId });
        console.log(`[Socket] Reconnected: ${data.playerId}`);
      }
    });

    // --- DISCONNECT ---

    socket.on('disconnect', () => {
      const result = roomManager.handleDisconnect(socket.id);
      if (result.room && result.playerId) {
        io.to(result.room.id).emit('player:disconnected', { playerId: result.playerId });
        io.to(result.room.id).emit('room:state', result.room);
        console.log(`[Socket] Disconnected: ${result.playerId}`);
      }
    });
  });
}

// --- HELPERS ---

function findRoomForSocket(socketId: string, roomManager: RoomManager) {
  // Search through rooms for the player with this socket
  // This is a linear scan — fine for reasonable room counts
  const rooms = (roomManager as any).rooms as Map<string, any>;
  for (const room of rooms.values()) {
    if (room.players.some((p: any) => p.socketId === socketId)) {
      return room;
    }
  }
  return null;
}

function getEngineAndPlayer(socketId: string, roomManager: RoomManager) {
  const room = findRoomForSocket(socketId, roomManager);
  if (!room) return { engine: null, player: null };

  const engine = roomManager.getEngine(room.id);
  const player = room.players.find((p: any) => p.socketId === socketId);

  return { engine: engine || null, player: player || null };
}
