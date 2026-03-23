// ============================================
// Monopoly India — Auction Logic
// ============================================

import { Player, AuctionState } from '../../../shared/src/types';
import { debitPlayer } from './bank';

export const AUCTION_TIME_SECONDS = 15;

/**
 * Create a new auction state.
 */
export function createAuction(tileIndex: number, players: Player[]): AuctionState {
  return {
    tileIndex,
    currentBid: 0,
    currentBidderId: null,
    participants: players.filter(p => !p.bankrupt).map(p => p.id),
    timeRemaining: AUCTION_TIME_SECONDS,
    active: true,
  };
}

/**
 * Place a bid in the auction.
 */
export function placeBid(
  auction: AuctionState,
  playerId: string,
  amount: number,
  playerMoney: number
): { success: boolean; error?: string } {
  if (!auction.active) return { success: false, error: 'Auction is not active' };
  if (!auction.participants.includes(playerId)) return { success: false, error: 'You are not in this auction' };
  if (amount <= auction.currentBid) return { success: false, error: 'Bid must be higher than current bid' };
  if (amount > playerMoney) return { success: false, error: 'Not enough money' };

  auction.currentBid = amount;
  auction.currentBidderId = playerId;
  auction.timeRemaining = Math.min(auction.timeRemaining + 5, AUCTION_TIME_SECONDS); // Reset timer a bit
  return { success: true };
}

/**
 * Remove a player from the auction (they pass).
 */
export function passAuction(auction: AuctionState, playerId: string): void {
  auction.participants = auction.participants.filter(id => id !== playerId);
  if (auction.participants.length <= 1 && auction.currentBidderId) {
    auction.active = false;
  }
}

/**
 * Resolve the auction — returns the winner ID or null if no bids.
 */
export function resolveAuction(
  auction: AuctionState,
  players: Player[],
  board: any[]
): { winnerId: string | null; amount: number } {
  auction.active = false;

  if (!auction.currentBidderId || auction.currentBid === 0) {
    return { winnerId: null, amount: 0 };
  }

  const winner = players.find(p => p.id === auction.currentBidderId);
  if (!winner) return { winnerId: null, amount: 0 };

  debitPlayer(winner, auction.currentBid);
  const tile = board[auction.tileIndex] as any;
  tile.ownerId = winner.id;
  winner.properties.push(auction.tileIndex);

  return { winnerId: winner.id, amount: auction.currentBid };
}
