// ============================================
// Monopoly India — Room Manager
// ============================================

import { v4 as uuidv4 } from 'uuid';
import { Room, Player, PLAYER_COLORS, GameLog, GameState, AuctionState } from '../../../shared/src/types';
import { GameEngine } from '../engine/GameEngine';
import { STARTING_MONEY } from '../config/board';

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private engines: Map<string, GameEngine> = new Map();
  private playerToRoom: Map<string, string> = new Map(); // playerId -> roomId

  /**
   * Create a new room.
   */
  createRoom(playerName: string, socketId: string): { room: Room; playerId: string } {
    const roomId = uuidv4();
    const code = generateRoomCode();
    const playerId = uuidv4();

    const player: Player = {
      id: playerId,
      name: playerName,
      color: PLAYER_COLORS[0],
      position: 0,
      money: STARTING_MONEY,
      properties: [],
      inJail: false,
      jailTurns: 0,
      getOutOfJailCards: 0,
      bankrupt: false,
      connected: true,
      socketId,
    };

    const room: Room = {
      id: roomId,
      code,
      hostId: playerId,
      players: [player],
      gameState: null,
      auctionState: null,
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    this.playerToRoom.set(playerId, roomId);

    return { room, playerId };
  }

  /**
   * Join an existing room.
   */
  joinRoom(roomCode: string, playerName: string, socketId: string): { room: Room; playerId: string } | { error: string } {
    const room = this.findRoomByCode(roomCode);
    if (!room) return { error: 'Room not found' };
    if (room.gameState?.phase === 'PLAYING') return { error: 'Game already in progress' };
    if (room.players.length >= 8) return { error: 'Room is full' };

    const playerId = uuidv4();
    const player: Player = {
      id: playerId,
      name: playerName,
      color: PLAYER_COLORS[room.players.length % PLAYER_COLORS.length],
      position: 0,
      money: STARTING_MONEY,
      properties: [],
      inJail: false,
      jailTurns: 0,
      getOutOfJailCards: 0,
      bankrupt: false,
      connected: true,
      socketId,
    };

    room.players.push(player);
    this.playerToRoom.set(playerId, room.id);

    return { room, playerId };
  }

  /**
   * Start a game in a room.
   */
  startGame(
    roomId: string,
    playerId: string,
    callbacks: {
      onStateChange: (state: GameState) => void;
      onLog: (log: GameLog) => void;
      onAuctionUpdate: (auction: AuctionState) => void;
      onAuctionEnd: (data: { winnerId: string | null; amount: number; tileIndex: number }) => void;
      onWinner?: (data: { playerId: string; playerName: string }) => void;
    }
  ): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.hostId !== playerId) return { success: false, error: 'Only the host can start the game' };
    if (room.players.length < 2) return { success: false, error: 'Need at least 2 players' };
    if (room.gameState?.phase === 'PLAYING') return { success: false, error: 'Game already started' };

    const engine = new GameEngine(roomId, room.players, callbacks);
    this.engines.set(roomId, engine);
    room.gameState = engine.getState();

    return { success: true };
  }

  /**
   * Get the GameEngine for a room.
   */
  getEngine(roomId: string): GameEngine | undefined {
    return this.engines.get(roomId);
  }

  /**
   * Get a room by ID.
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Find a room by its code.
   */
  findRoomByCode(code: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.code === code.toUpperCase()) return room;
    }
    return undefined;
  }

  /**
   * Get the room a player is in.
   */
  getRoomForPlayer(playerId: string): Room | undefined {
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }

  /**
   * Handle player disconnect.
   */
  handleDisconnect(socketId: string): { room?: Room; playerId?: string } {
    for (const room of this.rooms.values()) {
      const player = room.players.find(p => p.socketId === socketId);
      if (player) {
        player.connected = false;
        return { room, playerId: player.id };
      }
    }
    return {};
  }

  /**
   * Handle player reconnect.
   */
  reconnectPlayer(playerId: string, roomCode: string, socketId: string): { room?: Room; error?: string } {
    const room = this.findRoomByCode(roomCode);
    if (!room) return { error: 'Room not found' };

    const player = room.players.find(p => p.id === playerId);
    if (!player) return { error: 'Player not found in this room' };

    player.connected = true;
    player.socketId = socketId;

    // Update engine state if game is running
    const engine = this.engines.get(room.id);
    if (engine) {
      const enginePlayer = engine.state.players.find(p => p.id === playerId);
      if (enginePlayer) {
        enginePlayer.connected = true;
        enginePlayer.socketId = socketId;
      }
      room.gameState = engine.getState();
    }

    return { room };
  }

  /**
   * Remove empty/stale rooms (cleanup).
   */
  cleanup(): void {
    const now = Date.now();
    for (const [id, room] of this.rooms) {
      const allDisconnected = room.players.every(p => !p.connected);
      const isOld = now - room.createdAt > 24 * 60 * 60 * 1000; // 24 hours
      if (allDisconnected || isOld) {
        const engine = this.engines.get(id);
        if (engine) engine.destroy();
        this.engines.delete(id);
        room.players.forEach(p => this.playerToRoom.delete(p.id));
        this.rooms.delete(id);
      }
    }
  }
}
