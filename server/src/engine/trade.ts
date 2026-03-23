// ============================================
// Monopoly India — Trade Logic
// ============================================

import { Player, Tile, TradeProposal, OwnableTile } from '../../../shared/src/types';
import { transferMoney, creditPlayer, debitPlayer } from './bank';

/**
 * Validate a trade proposal.
 */
export function validateTrade(
  proposal: TradeProposal,
  from: Player,
  to: Player,
  board: Tile[]
): { valid: boolean; error?: string } {
  // Check that from owns offered properties
  for (const tileIdx of proposal.offeredProperties) {
    if (!from.properties.includes(tileIdx)) {
      return { valid: false, error: `Player does not own tile ${tileIdx}` };
    }
    const tile = board[tileIdx];
    if (tile.type === 'PROPERTY' && (tile as any).houses > 0) {
      return { valid: false, error: 'Cannot trade properties with houses. Sell houses first.' };
    }
  }

  // Check that to owns requested properties
  for (const tileIdx of proposal.requestedProperties) {
    if (!to.properties.includes(tileIdx)) {
      return { valid: false, error: `Other player does not own tile ${tileIdx}` };
    }
    const tile = board[tileIdx];
    if (tile.type === 'PROPERTY' && (tile as any).houses > 0) {
      return { valid: false, error: 'Cannot trade properties with houses. Sell houses first.' };
    }
  }

  // Check money
  if (proposal.offeredMoney > 0 && from.money < proposal.offeredMoney) {
    return { valid: false, error: 'Not enough money to offer' };
  }
  if (proposal.requestedMoney > 0 && to.money < proposal.requestedMoney) {
    return { valid: false, error: 'Other player does not have enough money' };
  }

  return { valid: true };
}

/**
 * Execute an accepted trade.
 */
export function executeTrade(
  proposal: TradeProposal,
  from: Player,
  to: Player,
  board: Tile[]
): void {
  // Transfer offered properties to 'to'
  for (const tileIdx of proposal.offeredProperties) {
    from.properties = from.properties.filter(p => p !== tileIdx);
    to.properties.push(tileIdx);
    const tile = board[tileIdx] as OwnableTile;
    tile.ownerId = to.id;
  }

  // Transfer requested properties to 'from'
  for (const tileIdx of proposal.requestedProperties) {
    to.properties = to.properties.filter(p => p !== tileIdx);
    from.properties.push(tileIdx);
    const tile = board[tileIdx] as OwnableTile;
    tile.ownerId = from.id;
  }

  // Transfer money
  if (proposal.offeredMoney > 0) {
    transferMoney(from, to, proposal.offeredMoney);
  }
  if (proposal.requestedMoney > 0) {
    transferMoney(to, from, proposal.requestedMoney);
  }
}
