// ============================================
// Monopoly India — Shared Types
// ============================================

// --- Board Tile Types ---

export interface PropertyTile {
  index: number;
  type: 'PROPERTY';
  name: string;
  colorGroup: ColorGroup;
  price: number;
  rent: number[];        // [base, 1house, 2houses, 3houses, 4houses, hotel]
  houseCost: number;
  mortgageValue: number;
  ownerId: string | null;
  mortgaged: boolean;
  houses: number;        // 0-4 = houses, 5 = hotel
}

export interface RailroadTile {
  index: number;
  type: 'RAILROAD';
  name: string;
  price: number;
  mortgageValue: number;
  ownerId: string | null;
  mortgaged: boolean;
}

export interface UtilityTile {
  index: number;
  type: 'UTILITY';
  name: string;
  price: number;
  mortgageValue: number;
  ownerId: string | null;
  mortgaged: boolean;
}

export interface TaxTile {
  index: number;
  type: 'TAX';
  name: string;
  amount: number;
}

export interface ChanceTile {
  index: number;
  type: 'CHANCE';
  name: string;
}

export interface CommunityTile {
  index: number;
  type: 'COMMUNITY';
  name: string;
}

export interface SpecialTile {
  index: number;
  type: 'GO' | 'JAIL' | 'FREE_PARKING' | 'GO_TO_JAIL';
  name: string;
}

export type Tile = PropertyTile | RailroadTile | UtilityTile | TaxTile | ChanceTile | CommunityTile | SpecialTile;

export type OwnableTile = PropertyTile | RailroadTile | UtilityTile;

export type ColorGroup =
  | 'brown' | 'lightblue' | 'pink' | 'orange'
  | 'red' | 'yellow' | 'green' | 'darkblue';

// --- Card Types ---

export interface Card {
  id: string;
  type: 'CHANCE' | 'COMMUNITY';
  text: string;
  action: CardAction;
}

export type CardAction =
  | { type: 'COLLECT'; amount: number }
  | { type: 'PAY'; amount: number }
  | { type: 'MOVE_TO'; position: number }
  | { type: 'MOVE_BACK'; spaces: number }
  | { type: 'GO_TO_JAIL' }
  | { type: 'GET_OUT_OF_JAIL' }
  | { type: 'PAY_EACH_PLAYER'; amount: number }
  | { type: 'COLLECT_FROM_EACH_PLAYER'; amount: number }
  | { type: 'REPAIRS'; housePrice: number; hotelPrice: number }
  | { type: 'MOVE_TO_NEAREST'; tileType: 'RAILROAD' | 'UTILITY' };

// --- Player ---

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  position: number;
  money: number;
  properties: number[];        // indices of owned tiles
  inJail: boolean;
  jailTurns: number;
  getOutOfJailCards: number;
  bankrupt: boolean;
  connected: boolean;
  socketId: string;
}

export type PlayerColor =
  | '#EF4444' | '#3B82F6' | '#10B981' | '#F59E0B'
  | '#8B5CF6' | '#EC4899' | '#14B8A6' | '#F97316';

export const PLAYER_COLORS: PlayerColor[] = [
  '#EF4444', '#3B82F6', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
];

// --- Turn State ---

export type TurnPhase = 'ROLL' | 'MOVED' | 'ACTION' | 'END_TURN';

export interface TurnState {
  phase: TurnPhase;
  doublesCount: number;
  hasRolled: boolean;
  diceValues: [number, number];
  pendingAction: PendingAction | null;
}

export type PendingAction =
  | { type: 'BUY_OR_AUCTION'; tileIndex: number }
  | { type: 'PAY_RENT'; to: string; amount: number; tileIndex: number }
  | { type: 'PAY_TAX'; amount: number }
  | { type: 'CARD_EFFECT'; card: Card }
  | { type: 'AUCTION'; tileIndex: number }
  | { type: 'TRADE'; proposal: TradeProposal }
  | { type: 'BANKRUPTCY'; creditorId: string | 'BANK'; amount: number };

// --- Game State ---

export type GamePhase = 'LOBBY' | 'PLAYING' | 'FINISHED';

export interface GameState {
  roomId: string;
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  board: Tile[];
  turnState: TurnState;
  winner: string | null;
  logs: GameLog[];
}

// --- Trade ---

export interface TradeProposal {
  fromPlayerId: string;
  toPlayerId: string;
  offeredMoney: number;
  requestedMoney: number;
  offeredProperties: number[];
  requestedProperties: number[];
}

// --- Auction ---

export interface AuctionState {
  tileIndex: number;
  currentBid: number;
  currentBidderId: string | null;
  participants: string[];     // player IDs still in
  timeRemaining: number;
  active: boolean;
}

// --- Room ---

export interface Room {
  id: string;
  code: string;
  hostId: string;
  players: Player[];
  gameState: GameState | null;
  auctionState: AuctionState | null;
  createdAt: number;
}

// --- Game Log ---

export interface GameLog {
  id: string;
  message: string;
  timestamp: number;
  type: 'info' | 'purchase' | 'rent' | 'card' | 'jail' | 'trade' | 'auction' | 'bankruptcy' | 'system';
}

// --- Socket Events ---

export interface ServerToClientEvents {
  'room:state': (room: Room) => void;
  'game:state': (state: GameState) => void;
  'game:rolled': (data: { dice: [number, number]; playerId: string }) => void;
  'game:auction-start': (state: AuctionState) => void;
  'game:auction-update': (state: AuctionState) => void;
  'game:auction-end': (data: { winnerId: string | null; amount: number; tileIndex: number }) => void;
  'game:trade-proposed': (proposal: TradeProposal) => void;
  'game:trade-resolved': (data: { accepted: boolean; proposal: TradeProposal }) => void;
  'game:bankrupt': (data: { playerId: string }) => void;
  'game:winner': (data: { playerId: string; playerName: string }) => void;
  'game:log': (log: GameLog) => void;
  'game:error': (data: { message: string }) => void;
  'chat:message': (data: { playerId: string; playerName: string; text: string; timestamp: number }) => void;
  'player:reconnected': (data: { playerId: string }) => void;
  'player:disconnected': (data: { playerId: string }) => void;
  'room:color-selected': (data: { playerId: string; color: PlayerColor }) => void;
}

export interface ClientToServerEvents {
  'room:create': (data: { playerName: string }, callback: (response: { success: boolean; room?: Room; playerId?: string; error?: string }) => void) => void;
  'room:join': (data: { roomCode: string; playerName: string }, callback: (response: { success: boolean; room?: Room; playerId?: string; error?: string }) => void) => void;
  'game:start': () => void;
  'game:roll': () => void;
  'game:buy': () => void;
  'game:auction-pass': () => void;
  'game:auction-bid': (data: { amount: number }) => void;
  'game:build': (data: { tileIndex: number }) => void;
  'game:sell-house': (data: { tileIndex: number }) => void;
  'game:mortgage': (data: { tileIndex: number }) => void;
  'game:unmortgage': (data: { tileIndex: number }) => void;
  'game:trade-propose': (proposal: TradeProposal) => void;
  'game:trade-respond': (data: { accept: boolean }) => void;
  'game:end-turn': () => void;
  'game:pay-jail-fine': () => void;
  'game:use-jail-card': () => void;
  'game:declare-bankruptcy': () => void;
  'chat:message': (data: { text: string }) => void;
  'player:reconnect': (data: { playerId: string; roomCode: string }, callback: (response: { success: boolean; room?: Room; error?: string }) => void) => void;
  'room:select-color': (data: { color: PlayerColor }) => void;
}
