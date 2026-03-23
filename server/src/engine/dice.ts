// ============================================
// Monopoly India — Dice Logic
// ============================================

export interface DiceRoll {
  values: [number, number];
  total: number;
  isDoubles: boolean;
}

export function rollDice(): DiceRoll {
  const die1 = Math.floor(Math.random() * 6) + 1;
  const die2 = Math.floor(Math.random() * 6) + 1;
  return {
    values: [die1, die2],
    total: die1 + die2,
    isDoubles: die1 === die2,
  };
}
