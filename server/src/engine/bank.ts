// ============================================
// Monopoly India — Bank Operations
// ============================================

import { Player } from '../../../shared/src/types';

export function creditPlayer(player: Player, amount: number): void {
  player.money += amount;
}

export function debitPlayer(player: Player, amount: number): boolean {
  player.money -= amount;
  return player.money >= 0;
}

export function transferMoney(from: Player, to: Player, amount: number): boolean {
  from.money -= amount;
  to.money += amount;
  return from.money >= 0;
}

export function canAfford(player: Player, amount: number): boolean {
  return player.money >= amount;
}

/**
 * Calculate total assets of a player (money + property mortgage values + house values)
 */
export function calculateTotalAssets(player: Player, board: any[]): number {
  let total = player.money;

  for (const tileIndex of player.properties) {
    const tile = board[tileIndex];
    if (tile.type === 'PROPERTY') {
      if (!tile.mortgaged) {
        total += tile.mortgageValue;
      }
      total += (tile.houses || 0) * tile.houseCost;
    } else if (tile.type === 'RAILROAD' || tile.type === 'UTILITY') {
      if (!tile.mortgaged) {
        total += tile.mortgageValue;
      }
    }
  }

  return total;
}
