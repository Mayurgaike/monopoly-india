// ============================================
// Monopoly India — Bankruptcy Logic
// ============================================

import { Player, Tile, OwnableTile, PropertyTile } from '../../../shared/src/types';
import { creditPlayer } from './bank';

/**
 * Check if a player is bankrupt (cannot pay a required amount even by liquidating).
 */
export function isBankrupt(player: Player, amountOwed: number, board: Tile[]): boolean {
  let totalLiquidatable = player.money;

  for (const tileIdx of player.properties) {
    const tile = board[tileIdx];
    if (tile.type === 'PROPERTY') {
      const prop = tile as PropertyTile;
      // Can sell houses
      totalLiquidatable += Math.floor(prop.houses * prop.houseCost / 2);
      // Can mortgage
      if (!prop.mortgaged) {
        totalLiquidatable += prop.mortgageValue;
      }
    } else if ((tile.type === 'RAILROAD' || tile.type === 'UTILITY') && !(tile as OwnableTile).mortgaged) {
      totalLiquidatable += (tile as OwnableTile).mortgageValue;
    }
  }

  return totalLiquidatable < amountOwed;
}

/**
 * Eliminate a bankrupt player and transfer assets to creditor.
 * If creditor is 'BANK', properties go back to unowned.
 */
export function eliminatePlayer(
  player: Player,
  creditorId: string | 'BANK',
  players: Player[],
  board: Tile[]
): void {
  player.bankrupt = true;

  if (creditorId === 'BANK') {
    // Return all properties to unowned
    for (const tileIdx of player.properties) {
      const tile = board[tileIdx] as OwnableTile;
      tile.ownerId = null;
      if (tile.type === 'PROPERTY') {
        (tile as PropertyTile).houses = 0;
      }
      tile.mortgaged = false;
    }
  } else {
    // Transfer everything to creditor
    const creditor = players.find(p => p.id === creditorId);
    if (creditor) {
      // Transfer money
      creditPlayer(creditor, Math.max(0, player.money));

      // Transfer properties
      for (const tileIdx of player.properties) {
        const tile = board[tileIdx] as OwnableTile;
        tile.ownerId = creditor.id;
        creditor.properties.push(tileIdx);
      }
    }
  }

  player.money = 0;
  player.properties = [];
}

/**
 * Check if the game has a winner (only one non-bankrupt player remains).
 */
export function checkWinner(players: Player[]): Player | null {
  const activePlayers = players.filter(p => !p.bankrupt);
  if (activePlayers.length === 1) {
    return activePlayers[0];
  }
  return null;
}
