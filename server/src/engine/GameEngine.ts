// ============================================
// Monopoly India — Core Game Engine
// ============================================

import { v4 as uuidv4 } from 'uuid';
import {
  GameState, Player, Tile, TurnState, Card, GameLog,
  PropertyTile, TradeProposal, AuctionState, OwnableTile,
} from '../../../shared/src/types';
import { createBoard, createChanceCards, createCommunityCards, shuffle, STARTING_MONEY, BOARD_SIZE } from '../config/board';
import { rollDice, DiceRoll } from './dice';
import { movePlayer, sendToJail } from './movement';
import { isOwnableTile, buyProperty, calculateRent, buildHouse, sellHouse, mortgageProperty, unmortgageProperty } from './property';
import { tryRollOutOfJail, payJailFine, useJailCard } from './jail';
import { applyCardEffect } from './cards';
import { validateTrade, executeTrade } from './trade';
import { createAuction, placeBid, passAuction, resolveAuction } from './auction';
import { isBankrupt, eliminatePlayer, checkWinner } from './bankruptcy';
import { creditPlayer } from './bank';

export class GameEngine {
  state: GameState;
  chanceCards: Card[];
  communityCards: Card[];
  chanceIndex: number = 0;
  communityIndex: number = 0;
  auctionState: AuctionState | null = null;
  pendingTrade: TradeProposal | null = null;
  auctionTimer: ReturnType<typeof setInterval> | null = null;

  // Callbacks for emitting events
  private onStateChange: (state: GameState) => void;
  private onLog: (log: GameLog) => void;
  private onAuctionUpdate: (auction: AuctionState) => void;
  private onAuctionEnd: (data: { winnerId: string | null; amount: number; tileIndex: number }) => void;
  private onWinner: (data: { playerId: string; playerName: string }) => void;

  constructor(
    roomId: string,
    players: Player[],
    callbacks: {
      onStateChange: (state: GameState) => void;
      onLog: (log: GameLog) => void;
      onAuctionUpdate: (auction: AuctionState) => void;
      onAuctionEnd: (data: { winnerId: string | null; amount: number; tileIndex: number }) => void;
      onWinner?: (data: { playerId: string; playerName: string }) => void;
    }
  ) {
    this.chanceCards = shuffle(createChanceCards());
    this.communityCards = shuffle(createCommunityCards());
    this.onStateChange = callbacks.onStateChange;
    this.onLog = callbacks.onLog;
    this.onAuctionUpdate = callbacks.onAuctionUpdate;
    this.onAuctionEnd = callbacks.onAuctionEnd;
    this.onWinner = callbacks.onWinner || (() => {});

    this.state = {
      roomId,
      phase: 'PLAYING',
      players,
      currentPlayerIndex: 0,
      board: createBoard(),
      turnState: this.freshTurnState(),
      winner: null,
      logs: [],
    };

    this.addLog('system', `Game started! ${players[0].name}'s turn.`);
  }

  // === HELPERS ===

  private freshTurnState(): TurnState {
    return {
      phase: 'ROLL',
      doublesCount: 0,
      hasRolled: false,
      diceValues: [0, 0],
      pendingAction: null,
    };
  }

  private get currentPlayer(): Player {
    return this.state.players[this.state.currentPlayerIndex];
  }

  private isCurrentPlayer(playerId: string): boolean {
    return this.currentPlayer.id === playerId;
  }

  private getPlayer(playerId: string): Player | undefined {
    return this.state.players.find(p => p.id === playerId);
  }

  private addLog(type: GameLog['type'], message: string): void {
    const log: GameLog = {
      id: uuidv4(),
      message,
      timestamp: Date.now(),
      type,
    };
    this.state.logs.push(log);
    // Keep only last 100 logs
    if (this.state.logs.length > 100) {
      this.state.logs = this.state.logs.slice(-100);
    }
    this.onLog(log);
  }

  private emitState(): void {
    this.onStateChange({ ...this.state });
  }

  private drawChanceCard(): Card {
    const card = this.chanceCards[this.chanceIndex];
    this.chanceIndex = (this.chanceIndex + 1) % this.chanceCards.length;
    return card;
  }

  private drawCommunityCard(): Card {
    const card = this.communityCards[this.communityIndex];
    this.communityIndex = (this.communityIndex + 1) % this.communityCards.length;
    return card;
  }

  // === ACTIONS ===

  /**
   * Roll the dice for the current player.
   */
  roll(playerId: string): { success: boolean; dice?: [number, number]; error?: string } {
    if (!this.isCurrentPlayer(playerId)) return { success: false, error: 'Not your turn' };
    if (this.state.turnState.hasRolled) return { success: false, error: 'Already rolled' };
    if (this.state.phase !== 'PLAYING') return { success: false, error: 'Game not in progress' };

    const player = this.currentPlayer;
    const roll = rollDice();
    this.state.turnState.diceValues = roll.values;
    this.state.turnState.hasRolled = true;

    this.addLog('info', `${player.name} rolled ${roll.values[0]} + ${roll.values[1]} = ${roll.total}`);

    // Handle jail
    if (player.inJail) {
      const escaped = tryRollOutOfJail(player, roll);
      if (!escaped) {
        this.addLog('jail', `${player.name} is still in jail.`);
        this.state.turnState.phase = 'END_TURN';
        this.emitState();
        return { success: true, dice: roll.values };
      }
      this.addLog('jail', `${player.name} escaped jail!`);
    }

    // Handle doubles
    if (roll.isDoubles) {
      this.state.turnState.doublesCount++;
      if (this.state.turnState.doublesCount >= 3) {
        sendToJail(player);
        this.addLog('jail', `${player.name} rolled doubles 3 times — go to jail!`);
        this.state.turnState.phase = 'END_TURN';
        this.emitState();
        return { success: true, dice: roll.values };
      }
    }

    // Move player
    const moveResult = movePlayer(player, roll.total);

    if (moveResult.passedGo) {
      this.addLog('info', `${player.name} passed Start and collected ₹200!`);
    }

    // Process the tile landed on
    this.processLanding(player, roll.total);

    this.emitState();
    return { success: true, dice: roll.values };
  }

  /**
   * Process landing on a tile after movement.
   */
  private processLanding(player: Player, diceTotal: number): void {
    const tile = this.state.board[player.position];

    switch (tile.type) {
      case 'PROPERTY':
      case 'RAILROAD':
      case 'UTILITY': {
        const ownableTile = tile as OwnableTile;
        if (ownableTile.ownerId === null) {
          // Unowned — buy or auction
          this.state.turnState.pendingAction = { type: 'BUY_OR_AUCTION', tileIndex: tile.index };
          this.state.turnState.phase = 'ACTION';
          this.addLog('info', `${player.name} landed on ${tile.name} (unowned, ₹${ownableTile.price})`);
        } else if (ownableTile.ownerId !== player.id && !ownableTile.mortgaged) {
          // Owned by someone else — pay rent
          const rent = calculateRent(ownableTile, this.state.board, diceTotal);
          const owner = this.getPlayer(ownableTile.ownerId);
          if (owner && !owner.bankrupt && rent > 0) {
            if (isBankrupt(player, rent, this.state.board)) {
              this.state.turnState.pendingAction = { type: 'BANKRUPTCY', creditorId: owner.id, amount: rent };
              this.state.turnState.phase = 'ACTION';
              this.addLog('rent', `${player.name} owes ₹${rent} rent to ${owner.name} but cannot pay!`);
            } else {
              player.money -= rent;
              owner.money += rent;
              this.addLog('rent', `${player.name} paid ₹${rent} rent to ${owner.name} for ${tile.name}`);
              this.state.turnState.phase = 'ACTION';
            }
          } else {
            this.state.turnState.phase = 'ACTION';
          }
        } else {
          this.state.turnState.phase = 'ACTION';
          this.addLog('info', `${player.name} landed on ${tile.name} (own property)`);
        }
        break;
      }

      case 'TAX': {
        const amount = tile.amount;
        if (isBankrupt(player, amount, this.state.board)) {
          this.state.turnState.pendingAction = { type: 'BANKRUPTCY', creditorId: 'BANK', amount };
          this.state.turnState.phase = 'ACTION';
        } else {
          player.money -= amount;
          this.addLog('info', `${player.name} paid ₹${amount} in ${tile.name}`);
          this.state.turnState.phase = 'ACTION';
        }
        break;
      }

      case 'CHANCE': {
        const card = this.drawChanceCard();
        this.addLog('card', `${player.name} drew Chance: "${card.text}"`);
        const effect = applyCardEffect(card, player, this.state.players, this.state.board);
        if (effect.jailed) {
          this.state.turnState.phase = 'END_TURN';
        } else if (effect.moved) {
          // Need to process new landing
          this.processLanding(player, diceTotal);
          return;
        } else {
          this.state.turnState.phase = 'ACTION';
        }
        break;
      }

      case 'COMMUNITY': {
        const card = this.drawCommunityCard();
        this.addLog('card', `${player.name} drew Surprise: "${card.text}"`);
        const effect = applyCardEffect(card, player, this.state.players, this.state.board);
        if (effect.jailed) {
          this.state.turnState.phase = 'END_TURN';
        } else if (effect.moved) {
          this.processLanding(player, diceTotal);
          return;
        } else {
          this.state.turnState.phase = 'ACTION';
        }
        break;
      }

      case 'GO_TO_JAIL': {
        sendToJail(player);
        this.addLog('jail', `${player.name} landed on Go to Jail!`);
        this.state.turnState.phase = 'END_TURN';
        break;
      }

      case 'JAIL': {
        this.addLog('info', `${player.name} is just visiting jail.`);
        this.state.turnState.phase = 'ACTION';
        break;
      }

      case 'GO': {
        this.addLog('info', `${player.name} landed on Start!`);
        this.state.turnState.phase = 'ACTION';
        break;
      }

      case 'FREE_PARKING': {
        this.addLog('info', `${player.name} is on Vacation!`);
        this.state.turnState.phase = 'ACTION';
        break;
      }
    }
  }

  /**
   * Current player buys the property they landed on.
   */
  buy(playerId: string): { success: boolean; error?: string } {
    if (!this.isCurrentPlayer(playerId)) return { success: false, error: 'Not your turn' };
    const pending = this.state.turnState.pendingAction;
    if (!pending || pending.type !== 'BUY_OR_AUCTION') return { success: false, error: 'No property to buy' };

    const player = this.currentPlayer;
    const tile = this.state.board[pending.tileIndex] as OwnableTile;

    if (buyProperty(player, tile)) {
      this.addLog('purchase', `${player.name} bought ${tile.name} for ₹${tile.price}`);
      this.state.turnState.pendingAction = null;
      this.state.turnState.phase = 'ACTION';
      this.emitState();
      return { success: true };
    }

    return { success: false, error: 'Cannot afford this property' };
  }

  /**
   * Current player passes on buying — triggers auction.
   */
  startAuction(playerId: string): { success: boolean; error?: string } {
    if (!this.isCurrentPlayer(playerId)) return { success: false, error: 'Not your turn' };
    const pending = this.state.turnState.pendingAction;
    if (!pending || pending.type !== 'BUY_OR_AUCTION') return { success: false, error: 'No property to auction' };

    const tile = this.state.board[pending.tileIndex];
    this.auctionState = createAuction(pending.tileIndex, this.state.players);
    this.state.turnState.pendingAction = { type: 'AUCTION', tileIndex: pending.tileIndex };
    this.addLog('auction', `Auction started for ${tile.name}!`);

    // Start auction timer
    this.startAuctionTimer();

    this.onAuctionUpdate(this.auctionState);
    this.emitState();
    return { success: true };
  }

  private startAuctionTimer(): void {
    if (this.auctionTimer) clearInterval(this.auctionTimer);
    this.auctionTimer = setInterval(() => {
      if (!this.auctionState || !this.auctionState.active) {
        if (this.auctionTimer) clearInterval(this.auctionTimer);
        return;
      }
      this.auctionState.timeRemaining--;
      if (this.auctionState.timeRemaining <= 0) {
        this.endAuction();
      } else {
        this.onAuctionUpdate(this.auctionState);
      }
    }, 1000);
  }

  bidAuction(playerId: string, amount: number): { success: boolean; error?: string } {
    if (!this.auctionState || !this.auctionState.active) return { success: false, error: 'No active auction' };
    const player = this.getPlayer(playerId);
    if (!player) return { success: false, error: 'Player not found' };

    const result = placeBid(this.auctionState, playerId, amount, player.money);
    if (result.success) {
      this.addLog('auction', `${player.name} bid ₹${amount}`);
      this.onAuctionUpdate(this.auctionState);
    }
    return result;
  }

  passOnAuction(playerId: string): { success: boolean; error?: string } {
    if (!this.auctionState || !this.auctionState.active) return { success: false, error: 'No active auction' };
    const player = this.getPlayer(playerId);
    if (!player) return { success: false, error: 'Player not found' };

    passAuction(this.auctionState, playerId);
    this.addLog('auction', `${player.name} passed on the auction`);

    if (!this.auctionState.active || this.auctionState.participants.length === 0) {
      this.endAuction();
    } else {
      this.onAuctionUpdate(this.auctionState);
    }
    return { success: true };
  }

  private endAuction(): void {
    if (this.auctionTimer) clearInterval(this.auctionTimer);
    if (!this.auctionState) return;

    const result = resolveAuction(this.auctionState, this.state.players, this.state.board);
    const tile = this.state.board[this.auctionState.tileIndex];

    if (result.winnerId) {
      const winner = this.getPlayer(result.winnerId);
      this.addLog('auction', `${winner?.name} won the auction for ${tile.name} at ₹${result.amount}`);
    } else {
      this.addLog('auction', `No one bid on ${tile.name}. Property remains unowned.`);
    }

    this.onAuctionEnd({ ...result, tileIndex: this.auctionState.tileIndex });
    this.state.turnState.pendingAction = null;
    this.state.turnState.phase = 'ACTION';
    this.auctionState = null;
    this.emitState();
  }

  /**
   * Build a house on a property.
   */
  build(playerId: string, tileIndex: number): { success: boolean; error?: string } {
    const player = this.getPlayer(playerId);
    if (!player) return { success: false, error: 'Player not found' };
    if (!this.isCurrentPlayer(playerId)) return { success: false, error: 'Not your turn' };

    const tile = this.state.board[tileIndex];
    if (tile.type !== 'PROPERTY') return { success: false, error: 'Cannot build on this tile' };

    const result = buildHouse(player, tile as PropertyTile, this.state.board);
    if (result.success) {
      const prop = tile as PropertyTile;
      const buildingType = prop.houses === 5 ? 'hotel' : 'house';
      this.addLog('purchase', `${player.name} built a ${buildingType} on ${tile.name}`);
      this.emitState();
    }
    return result;
  }

  /**
   * Sell a house from a property.
   */
  sellHouseAction(playerId: string, tileIndex: number): { success: boolean; error?: string } {
    const player = this.getPlayer(playerId);
    if (!player) return { success: false, error: 'Player not found' };

    const tile = this.state.board[tileIndex];
    if (tile.type !== 'PROPERTY') return { success: false, error: 'Cannot sell houses on this tile' };

    const result = sellHouse(player, tile as PropertyTile, this.state.board);
    if (result.success) {
      this.addLog('info', `${player.name} sold a house on ${tile.name}`);
      this.emitState();
    }
    return result;
  }

  /**
   * Mortgage a property.
   */
  mortgage(playerId: string, tileIndex: number): { success: boolean; error?: string } {
    const player = this.getPlayer(playerId);
    if (!player) return { success: false, error: 'Player not found' };

    const tile = this.state.board[tileIndex] as OwnableTile;
    if (!isOwnableTile(tile)) return { success: false, error: 'Cannot mortgage this tile' };

    const result = mortgageProperty(player, tile, this.state.board);
    if (result.success) {
      this.addLog('info', `${player.name} mortgaged ${tile.name} for ₹${tile.mortgageValue}`);
      this.emitState();
    }
    return result;
  }

  /**
   * Unmortgage a property.
   */
  unmortgage(playerId: string, tileIndex: number): { success: boolean; error?: string } {
    const player = this.getPlayer(playerId);
    if (!player) return { success: false, error: 'Player not found' };

    const tile = this.state.board[tileIndex] as OwnableTile;
    if (!isOwnableTile(tile)) return { success: false, error: 'Cannot unmortgage this tile' };

    const result = unmortgageProperty(player, tile);
    if (result.success) {
      this.addLog('info', `${player.name} unmortgaged ${tile.name}`);
      this.emitState();
    }
    return result;
  }

  /**
   * Pay jail fine.
   */
  payFine(playerId: string): { success: boolean; error?: string } {
    if (!this.isCurrentPlayer(playerId)) return { success: false, error: 'Not your turn' };
    const player = this.currentPlayer;

    if (payJailFine(player)) {
      this.addLog('jail', `${player.name} paid ₹50 to get out of jail`);
      this.state.turnState.hasRolled = false; // Can roll again after paying
      this.emitState();
      return { success: true };
    }
    return { success: false, error: 'Cannot pay jail fine' };
  }

  /**
   * Use get out of jail card.
   */
  useJailCardAction(playerId: string): { success: boolean; error?: string } {
    if (!this.isCurrentPlayer(playerId)) return { success: false, error: 'Not your turn' };
    const player = this.currentPlayer;

    if (useJailCard(player)) {
      this.addLog('jail', `${player.name} used a Get Out of Jail Free card`);
      this.state.turnState.hasRolled = false;
      this.emitState();
      return { success: true };
    }
    return { success: false, error: 'No jail card available' };
  }

  /**
   * Propose a trade.
   */
  proposeTrade(proposal: TradeProposal): { success: boolean; error?: string } {
    const from = this.getPlayer(proposal.fromPlayerId);
    const to = this.getPlayer(proposal.toPlayerId);
    if (!from || !to) return { success: false, error: 'Player not found' };

    const validation = validateTrade(proposal, from, to, this.state.board);
    if (!validation.valid) return { success: false, error: validation.error };

    this.pendingTrade = proposal;
    this.addLog('trade', `${from.name} proposed a trade to ${to.name}`);
    return { success: true };
  }

  /**
   * Respond to a trade.
   */
  respondToTrade(playerId: string, accept: boolean): { success: boolean; error?: string } {
    if (!this.pendingTrade) return { success: false, error: 'No pending trade' };
    if (this.pendingTrade.toPlayerId !== playerId) return { success: false, error: 'Not your trade to respond to' };

    const from = this.getPlayer(this.pendingTrade.fromPlayerId)!;
    const to = this.getPlayer(this.pendingTrade.toPlayerId)!;

    if (accept) {
      executeTrade(this.pendingTrade, from, to, this.state.board);
      this.addLog('trade', `${to.name} accepted the trade with ${from.name}!`);
    } else {
      this.addLog('trade', `${to.name} rejected the trade from ${from.name}.`);
    }

    this.pendingTrade = null;
    this.emitState();
    return { success: true };
  }

  /**
   * Declare bankruptcy (give up).
   */
  declareBankruptcy(playerId: string): { success: boolean; error?: string } {
    const player = this.getPlayer(playerId);
    if (!player) return { success: false, error: 'Player not found' };

    const pending = this.state.turnState.pendingAction;
    const creditorId = (pending && pending.type === 'BANKRUPTCY') ? pending.creditorId : 'BANK';

    eliminatePlayer(player, creditorId, this.state.players, this.state.board);
    this.addLog('bankruptcy', `${player.name} went bankrupt!`);

    this.state.turnState.pendingAction = null;

    // Check for winner
    const winner = checkWinner(this.state.players);
    if (winner) {
      this.state.phase = 'FINISHED';
      this.state.winner = winner.id;
      this.addLog('system', `🎉 ${winner.name} wins the game!`);
      this.onWinner({ playerId: winner.id, playerName: winner.name });
    } else if (this.isCurrentPlayer(playerId)) {
      // If the bankrupt player was the current player, advance turn
      this.advanceTurn();
    }

    this.emitState();
    return { success: true };
  }

  /**
   * End the current player's turn.
   */
  endTurn(playerId: string): { success: boolean; error?: string } {
    if (!this.isCurrentPlayer(playerId)) return { success: false, error: 'Not your turn' };
    if (this.state.turnState.pendingAction?.type === 'BUY_OR_AUCTION') {
      return { success: false, error: 'Must buy or start auction first' };
    }
    if (this.state.turnState.pendingAction?.type === 'AUCTION') {
      return { success: false, error: 'Auction in progress' };
    }
    if (!this.state.turnState.hasRolled) {
      return { success: false, error: 'Must roll dice first' };
    }

    // Check for doubles — roll again
    const roll = this.state.turnState;
    if (roll.diceValues[0] === roll.diceValues[1] && roll.doublesCount < 3 && !this.currentPlayer.inJail) {
      this.state.turnState.hasRolled = false;
      this.state.turnState.phase = 'ROLL';
      this.state.turnState.pendingAction = null;
      this.addLog('info', `${this.currentPlayer.name} rolled doubles — roll again!`);
      this.emitState();
      return { success: true };
    }

    this.advanceTurn();
    this.emitState();
    return { success: true };
  }

  private advanceTurn(): void {
    let nextIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;

    // Skip bankrupt players
    let safetyCounter = 0;
    while (this.state.players[nextIndex].bankrupt && safetyCounter < this.state.players.length) {
      nextIndex = (nextIndex + 1) % this.state.players.length;
      safetyCounter++;
    }

    this.state.currentPlayerIndex = nextIndex;
    this.state.turnState = this.freshTurnState();
    this.addLog('system', `It's ${this.state.players[nextIndex].name}'s turn.`);
  }

  /**
   * Get sanitized state for sending to clients.
   */
  getState(): GameState {
    return { ...this.state };
  }

  /**
   * Cleanup timers.
   */
  destroy(): void {
    if (this.auctionTimer) clearInterval(this.auctionTimer);
  }
}
