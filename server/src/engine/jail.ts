// ============================================
// Monopoly India — Jail Logic
// ============================================

import { Player } from '../../../shared/src/types';
import { JAIL_FINE, MAX_JAIL_TURNS } from '../config/board';
import { debitPlayer } from './bank';
import { DiceRoll } from './dice';

/**
 * Attempt to roll out of jail. Returns true if successful (doubles rolled).
 */
export function tryRollOutOfJail(player: Player, roll: DiceRoll): boolean {
  if (!player.inJail) return false;

  player.jailTurns++;

  if (roll.isDoubles) {
    player.inJail = false;
    player.jailTurns = 0;
    return true;
  }

  // After 3 failed attempts, must pay fine
  if (player.jailTurns >= MAX_JAIL_TURNS) {
    debitPlayer(player, JAIL_FINE);
    player.inJail = false;
    player.jailTurns = 0;
    return true; // Forced out
  }

  return false; // Stay in jail
}

/**
 * Pay the jail fine to get out.
 */
export function payJailFine(player: Player): boolean {
  if (!player.inJail) return false;
  if (player.money < JAIL_FINE) return false;

  debitPlayer(player, JAIL_FINE);
  player.inJail = false;
  player.jailTurns = 0;
  return true;
}

/**
 * Use a Get Out of Jail Free card.
 */
export function useJailCard(player: Player): boolean {
  if (!player.inJail) return false;
  if (player.getOutOfJailCards <= 0) return false;

  player.getOutOfJailCards--;
  player.inJail = false;
  player.jailTurns = 0;
  return true;
}
