// ============================================
// Monopoly India — Property Logic
// ============================================

import {
  Player, Tile, PropertyTile, RailroadTile, UtilityTile, OwnableTile,
} from '../../../shared/src/types';
import { COLOR_GROUPS, RAILROAD_INDICES, UTILITY_INDICES, MAX_HOUSES, HOTEL } from '../config/board';
import { debitPlayer, creditPlayer, transferMoney } from './bank';

/**
 * Check if a tile is ownable (property, railroad, or utility).
 */
export function isOwnableTile(tile: Tile): tile is OwnableTile {
  return tile.type === 'PROPERTY' || tile.type === 'RAILROAD' || tile.type === 'UTILITY';
}

/**
 * Buy a property for a player.
 */
export function buyProperty(player: Player, tile: OwnableTile): boolean {
  if (tile.ownerId !== null) return false;
  if (player.money < tile.price) return false;

  debitPlayer(player, tile.price);
  tile.ownerId = player.id;
  player.properties.push(tile.index);
  return true;
}

/**
 * Check if a player owns all properties in a color group.
 */
export function hasMonopoly(playerId: string, colorGroup: string, board: Tile[]): boolean {
  const groupIndices = COLOR_GROUPS[colorGroup];
  if (!groupIndices) return false;
  return groupIndices.every(idx => {
    const tile = board[idx];
    return tile.type === 'PROPERTY' && tile.ownerId === playerId;
  });
}

/**
 * Calculate rent for a property tile.
 */
export function calculatePropertyRent(tile: PropertyTile, board: Tile[]): number {
  if (tile.mortgaged || !tile.ownerId) return 0;

  if (tile.houses > 0) {
    return tile.rent[tile.houses]; // 1-5 index for houses/hotel
  }

  // Base rent, doubled with monopoly
  const baseRent = tile.rent[0];
  if (hasMonopoly(tile.ownerId, tile.colorGroup, board)) {
    return baseRent * 2;
  }
  return baseRent;
}

/**
 * Calculate rent for a railroad.
 */
export function calculateRailroadRent(tile: RailroadTile, board: Tile[]): number {
  if (tile.mortgaged || !tile.ownerId) return 0;

  const ownedCount = RAILROAD_INDICES.filter(idx => {
    const t = board[idx] as RailroadTile;
    return t.ownerId === tile.ownerId && !t.mortgaged;
  }).length;

  // 25, 50, 100, 200
  return 25 * Math.pow(2, ownedCount - 1);
}

/**
 * Calculate rent for a utility.
 */
export function calculateUtilityRent(tile: UtilityTile, diceTotal: number, board: Tile[]): number {
  if (tile.mortgaged || !tile.ownerId) return 0;

  const ownedCount = UTILITY_INDICES.filter(idx => {
    const t = board[idx] as UtilityTile;
    return t.ownerId === tile.ownerId && !t.mortgaged;
  }).length;

  if (ownedCount === 2) {
    return diceTotal * 10;
  }
  return diceTotal * 4;
}

/**
 * Calculate rent for any ownable tile.
 */
export function calculateRent(tile: OwnableTile, board: Tile[], diceTotal: number = 0): number {
  switch (tile.type) {
    case 'PROPERTY': return calculatePropertyRent(tile, board);
    case 'RAILROAD': return calculateRailroadRent(tile, board);
    case 'UTILITY': return calculateUtilityRent(tile, diceTotal, board);
  }
}

/**
 * Build a house on a property.
 */
export function buildHouse(player: Player, tile: PropertyTile, board: Tile[]): { success: boolean; error?: string } {
  if (tile.ownerId !== player.id) return { success: false, error: 'You do not own this property' };
  if (tile.mortgaged) return { success: false, error: 'Property is mortgaged' };
  if (!hasMonopoly(player.id, tile.colorGroup, board)) return { success: false, error: 'You need a monopoly to build' };
  if (tile.houses >= HOTEL) return { success: false, error: 'Maximum buildings reached' };
  if (player.money < tile.houseCost) return { success: false, error: 'Not enough money' };

  // Even building rule: can't build if any property in group has fewer houses
  const groupIndices = COLOR_GROUPS[tile.colorGroup];
  const minHouses = Math.min(...groupIndices.map(idx => {
    const t = board[idx] as PropertyTile;
    return t.houses;
  }));
  if (tile.houses > minHouses) {
    return { success: false, error: 'Must build evenly across color group' };
  }

  debitPlayer(player, tile.houseCost);
  tile.houses++;
  return { success: true };
}

/**
 * Sell a house from a property.
 */
export function sellHouse(player: Player, tile: PropertyTile, board: Tile[]): { success: boolean; error?: string } {
  if (tile.ownerId !== player.id) return { success: false, error: 'You do not own this property' };
  if (tile.houses <= 0) return { success: false, error: 'No houses to sell' };

  // Even selling rule: can't sell if any property in group has more houses
  const groupIndices = COLOR_GROUPS[tile.colorGroup];
  const maxHouses = Math.max(...groupIndices.map(idx => {
    const t = board[idx] as PropertyTile;
    return t.houses;
  }));
  if (tile.houses < maxHouses) {
    return { success: false, error: 'Must sell houses evenly across color group' };
  }

  creditPlayer(player, Math.floor(tile.houseCost / 2));
  tile.houses--;
  return { success: true };
}

/**
 * Mortgage a property.
 */
export function mortgageProperty(player: Player, tile: OwnableTile, board: Tile[]): { success: boolean; error?: string } {
  if (tile.ownerId !== player.id) return { success: false, error: 'You do not own this property' };
  if (tile.mortgaged) return { success: false, error: 'Already mortgaged' };

  // Can't mortgage if any property in the color group has houses
  if (tile.type === 'PROPERTY') {
    const groupIndices = COLOR_GROUPS[tile.colorGroup];
    const hasBuildings = groupIndices.some(idx => {
      const t = board[idx] as PropertyTile;
      return t.houses > 0;
    });
    if (hasBuildings) {
      return { success: false, error: 'Sell all houses in color group before mortgaging' };
    }
  }

  tile.mortgaged = true;
  creditPlayer(player, tile.mortgageValue);
  return { success: true };
}

/**
 * Unmortgage a property.
 */
export function unmortgageProperty(player: Player, tile: OwnableTile): { success: boolean; error?: string } {
  if (tile.ownerId !== player.id) return { success: false, error: 'You do not own this property' };
  if (!tile.mortgaged) return { success: false, error: 'Not mortgaged' };

  const unmortgageCost = Math.floor(tile.mortgageValue * 1.1); // 10% interest
  if (player.money < unmortgageCost) return { success: false, error: 'Not enough money' };

  debitPlayer(player, unmortgageCost);
  tile.mortgaged = false;
  return { success: true };
}

/**
 * Pay rent from one player to another.
 */
export function payRent(from: Player, to: Player, amount: number): boolean {
  return transferMoney(from, to, amount);
}
