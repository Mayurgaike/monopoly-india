// ============================================
// Monopoly India — Card Effects
// ============================================

import { Player, Card, Tile, PropertyTile } from '../../../shared/src/types';
import { RAILROAD_INDICES, UTILITY_INDICES, BOARD_SIZE } from '../config/board';
import { creditPlayer, debitPlayer } from './bank';
import { movePlayerTo, sendToJail } from './movement';

export interface CardEffectResult {
  moneyChanged: boolean;
  moved: boolean;
  jailed: boolean;
  gotJailCard: boolean;
  payEachPlayer?: number;
  collectFromEach?: number;
  repairs?: { total: number };
}

/**
 * Apply a card's effect to a player.
 * Returns information about what happened.
 */
export function applyCardEffect(
  card: Card,
  player: Player,
  allPlayers: Player[],
  board: Tile[]
): CardEffectResult {
  const result: CardEffectResult = {
    moneyChanged: false,
    moved: false,
    jailed: false,
    gotJailCard: false,
  };

  const action = card.action;

  switch (action.type) {
    case 'COLLECT':
      creditPlayer(player, action.amount);
      result.moneyChanged = true;
      break;

    case 'PAY':
      debitPlayer(player, action.amount);
      result.moneyChanged = true;
      break;

    case 'MOVE_TO':
      movePlayerTo(player, action.position, true);
      result.moved = true;
      break;

    case 'MOVE_BACK':
      const newPos = (player.position - action.spaces + BOARD_SIZE) % BOARD_SIZE;
      movePlayerTo(player, newPos, false);
      result.moved = true;
      break;

    case 'GO_TO_JAIL':
      sendToJail(player);
      result.jailed = true;
      break;

    case 'GET_OUT_OF_JAIL':
      player.getOutOfJailCards++;
      result.gotJailCard = true;
      break;

    case 'PAY_EACH_PLAYER':
      const activePlayers = allPlayers.filter(p => !p.bankrupt && p.id !== player.id);
      const totalPay = action.amount * activePlayers.length;
      debitPlayer(player, totalPay);
      activePlayers.forEach(p => creditPlayer(p, action.amount));
      result.moneyChanged = true;
      result.payEachPlayer = action.amount;
      break;

    case 'COLLECT_FROM_EACH_PLAYER':
      const otherPlayers = allPlayers.filter(p => !p.bankrupt && p.id !== player.id);
      otherPlayers.forEach(p => debitPlayer(p, action.amount));
      creditPlayer(player, action.amount * otherPlayers.length);
      result.moneyChanged = true;
      result.collectFromEach = action.amount;
      break;

    case 'REPAIRS': {
      let total = 0;
      for (const tileIdx of player.properties) {
        const tile = board[tileIdx];
        if (tile.type === 'PROPERTY') {
          const houses = (tile as PropertyTile).houses;
          if (houses === 5) {
            total += action.hotelPrice;
          } else {
            total += houses * action.housePrice;
          }
        }
      }
      debitPlayer(player, total);
      result.moneyChanged = true;
      result.repairs = { total };
      break;
    }

    case 'MOVE_TO_NEAREST': {
      const indices = action.tileType === 'RAILROAD' ? RAILROAD_INDICES : UTILITY_INDICES;
      let nearest = indices[0];
      for (const idx of indices) {
        if (idx > player.position) {
          nearest = idx;
          break;
        }
      }
      // If none found after current position, wrap to first
      if (nearest <= player.position) nearest = indices[0];
      movePlayerTo(player, nearest, true);
      result.moved = true;
      break;
    }
  }

  return result;
}
