// ============================================
// Monopoly India — Zustand Game Store
// ============================================

import { create } from 'zustand';
import type {
  Room, GameState, Player, AuctionState, TradeProposal, GameLog, Card,
} from '../../../shared/src/types';

interface ChatMessage {
  playerId: string;
  playerName: string;
  text: string;
  timestamp: number;
}

interface MoneyEvent {
  id: string;
  playerId: string;
  amount: number;   // positive = gain, negative = loss
  label: string;
}

interface GameStore {
  // Connection
  playerId: string | null;
  playerName: string | null;
  roomCode: string | null;

  // Room state
  room: Room | null;

  // Game state
  gameState: GameState | null;
  auctionState: AuctionState | null;
  pendingTrade: TradeProposal | null;

  // Animation state
  previousPositions: Record<string, number>;  // playerId -> last known position
  activeCard: { card: Card; playerName: string } | null;
  floatingMoney: MoneyEvent[];
  diceResult: { values: [number, number]; playerId: string } | null;
  isRolling: boolean;

  // UI state
  selectedTileIndex: number | null;
  showTradeModal: boolean;
  showAuctionModal: boolean;
  chatMessages: ChatMessage[];
  logs: GameLog[];

  // Actions
  setPlayerId: (id: string) => void;
  setPlayerName: (name: string) => void;
  setRoomCode: (code: string) => void;
  setRoom: (room: Room | null) => void;
  setGameState: (state: GameState) => void;
  setAuctionState: (state: AuctionState | null) => void;
  setPendingTrade: (trade: TradeProposal | null) => void;
  setSelectedTileIndex: (index: number | null) => void;
  setShowTradeModal: (show: boolean) => void;
  setShowAuctionModal: (show: boolean) => void;
  addChatMessage: (msg: ChatMessage) => void;
  addLog: (log: GameLog) => void;
  setActiveCard: (card: { card: Card; playerName: string } | null) => void;
  addFloatingMoney: (event: MoneyEvent) => void;
  removeFloatingMoney: (id: string) => void;
  setDiceResult: (result: { values: [number, number]; playerId: string } | null) => void;
  setIsRolling: (rolling: boolean) => void;
  reset: () => void;

  // Derived
  getCurrentPlayer: () => Player | null;
  getMyPlayer: () => Player | null;
  isMyTurn: () => boolean;
}

const initialState = {
  playerId: null as string | null,
  playerName: null as string | null,
  roomCode: null as string | null,
  room: null as Room | null,
  gameState: null as GameState | null,
  auctionState: null as AuctionState | null,
  pendingTrade: null as TradeProposal | null,
  previousPositions: {} as Record<string, number>,
  activeCard: null as { card: Card; playerName: string } | null,
  floatingMoney: [] as MoneyEvent[],
  diceResult: null as { values: [number, number]; playerId: string } | null,
  isRolling: false,
  selectedTileIndex: null as number | null,
  showTradeModal: false,
  showAuctionModal: false,
  chatMessages: [] as ChatMessage[],
  logs: [] as GameLog[],
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  setPlayerId: (id) => set({ playerId: id }),
  setPlayerName: (name) => set({ playerName: name }),
  setRoomCode: (code) => set({ roomCode: code }),
  setRoom: (room) => set({ room }),

  setGameState: (state) => {
    const prev = get().gameState;
    // Capture previous positions for movement animation
    const prevPositions: Record<string, number> = { ...get().previousPositions };
    if (prev) {
      prev.players.forEach(p => {
        prevPositions[p.id] = p.position;
      });
    }
    set({ gameState: state, logs: state.logs, previousPositions: prevPositions });
  },

  setAuctionState: (state) => set({ auctionState: state }),
  setPendingTrade: (trade) => set({ pendingTrade: trade }),
  setSelectedTileIndex: (index) => set({ selectedTileIndex: index }),
  setShowTradeModal: (show) => set({ showTradeModal: show }),
  setShowAuctionModal: (show) => set({ showAuctionModal: show }),
  addChatMessage: (msg) => set((s) => ({
    chatMessages: [...s.chatMessages.slice(-99), msg],
  })),
  addLog: (log) => set((s) => ({
    logs: [...s.logs.slice(-99), log],
  })),
  setActiveCard: (card) => set({ activeCard: card }),
  addFloatingMoney: (event) => set((s) => ({
    floatingMoney: [...s.floatingMoney, event],
  })),
  removeFloatingMoney: (id) => set((s) => ({
    floatingMoney: s.floatingMoney.filter(e => e.id !== id),
  })),
  setDiceResult: (result) => set({ diceResult: result }),
  setIsRolling: (rolling) => set({ isRolling: rolling }),
  reset: () => set(initialState),

  getCurrentPlayer: () => {
    const { gameState } = get();
    if (!gameState) return null;
    return gameState.players[gameState.currentPlayerIndex] || null;
  },

  getMyPlayer: () => {
    const { gameState, playerId } = get();
    if (!gameState || !playerId) return null;
    return gameState.players.find(p => p.id === playerId) || null;
  },

  isMyTurn: () => {
    const { gameState, playerId } = get();
    if (!gameState || !playerId) return false;
    return gameState.players[gameState.currentPlayerIndex]?.id === playerId;
  },
}));
