// ============================================
// Monopoly India — Movement Logic
// ============================================

import { Player } from '../../../shared/src/types';
import { BOARD_SIZE, GO_SALARY } from '../config/board';
import { creditPlayer } from './bank';

export interface MovementResult {
  newPosition: number;
  passedGo: boolean;
}

/**
 * Move a player forward by a number of spaces.
 * Handles wrapping around the board and passing GO.
 */
export function movePlayer(player: Player, spaces: number): MovementResult {
  const oldPosition = player.position;
  const newPosition = (oldPosition + spaces) % BOARD_SIZE;
  const passedGo = newPosition < oldPosition && spaces > 0;

  player.position = newPosition;

  if (passedGo) {
    creditPlayer(player, GO_SALARY);
  }

  return { newPosition, passedGo };
}

/**
 * Move a player to a specific position.
 * Optionally handles passing GO.
 */
export function movePlayerTo(player: Player, position: number, collectGo: boolean = true): MovementResult {
  const oldPosition = player.position;
  const passedGo = collectGo && position < oldPosition && position !== oldPosition;

  player.position = position;

  if (passedGo) {
    creditPlayer(player, GO_SALARY);
  }

  return { newPosition: position, passedGo };
}

/**
 * Send a player directly to jail (no GO collection).
 */
export function sendToJail(player: Player): void {
  player.position = 10; // Jail tile
  player.inJail = true;
  player.jailTurns = 0;
}
