import { motion } from 'framer-motion';
import { socket } from '../../socket/client';
import { useGameStore } from '../../store/gameStore';

export default function ActionPanel() {
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useGameStore((s) => s.playerId);
  const setShowTradeModal = useGameStore((s) => s.setShowTradeModal);

  if (!gameState || !playerId) return null;

  const myPlayer = gameState.players.find(p => p.id === playerId);
  if (!myPlayer || myPlayer.bankrupt) return null;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === playerId;
  const turnState = gameState.turnState;
  const pending = turnState.pendingAction;
  const inJail = myPlayer.inJail;

  const canBuy = isMyTurn && pending?.type === 'BUY_OR_AUCTION';
  const canEndTurn = isMyTurn && turnState.hasRolled && !pending && turnState.phase !== 'ROLL';
  const canPayFine = isMyTurn && inJail && !turnState.hasRolled;
  const canUseJailCard = isMyTurn && inJail && myPlayer.getOutOfJailCards > 0 && !turnState.hasRolled;
  const isBankruptcy = isMyTurn && pending?.type === 'BANKRUPTCY';
  const canManageProperties = isMyTurn && myPlayer.properties.length > 0 && !pending;

  return (
    <div className="p-3" id="action-panel">
      {/* Turn indicator */}
      <div className="flex items-center justify-between mb-2">
        {isMyTurn ? (
          <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" /> Your Turn
          </span>
        ) : (
          <span className="text-xs text-white/40 flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: currentPlayer?.color }} />
            {currentPlayer?.name}'s turn
          </span>
        )}
        {isMyTurn && <span className="text-[9px] uppercase text-white/15 tracking-wider">{turnState.phase}</span>}
      </div>

      {/* Contextual banners */}
      {canBuy && pending?.type === 'BUY_OR_AUCTION' && (
        <motion.div initial={{ y: 5, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/25 rounded-xl p-3 mb-2">
          <p className="text-amber-400 font-bold text-xs">🏠 {gameState.board[pending.tileIndex]?.name} — ₹{(gameState.board[pending.tileIndex] as any)?.price}</p>
        </motion.div>
      )}

      {isBankruptcy && (
        <motion.div initial={{ y: 5, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="bg-red-500/10 border border-red-500/25 rounded-xl p-3 mb-2">
          <p className="text-red-400 font-bold text-xs">⚠️ Cannot pay your debt! Sell houses, mortgage, or declare bankruptcy.</p>
        </motion.div>
      )}

      {inJail && isMyTurn && !turnState.hasRolled && (
        <motion.div initial={{ y: 5, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="bg-gray-500/10 border border-gray-500/25 rounded-xl p-2 mb-2 text-center">
          <p className="text-gray-300 font-bold text-[10px]">🔒 Jail — Turn {myPlayer.jailTurns}/3</p>
        </motion.div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-1.5">
        {canPayFine && (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => socket.emit('game:pay-jail-fine')} className="btn-secondary text-xs flex-1 min-w-[100px] py-2.5">
            💰 Pay ₹50
          </motion.button>
        )}
        {canUseJailCard && (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => socket.emit('game:use-jail-card')} className="btn-secondary text-xs flex-1 min-w-[100px] py-2.5">
            🃏 Jail Card
          </motion.button>
        )}
        {canBuy && (
          <>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => socket.emit('game:buy')} className="btn-primary text-xs flex-1 min-w-[90px] py-2.5"
              disabled={myPlayer.money < (gameState.board[pending!.tileIndex] as any)?.price}>
              🏠 Buy
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => socket.emit('game:auction-pass')} className="btn-secondary text-xs flex-1 min-w-[90px] py-2.5">
              🔨 Auction
            </motion.button>
          </>
        )}
        {canEndTurn && (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => socket.emit('game:end-turn')} className="btn-primary text-sm flex-1 min-w-[100px] py-2.5">
            ✅ End Turn
          </motion.button>
        )}
        {canManageProperties && (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowTradeModal(true)} className="btn-secondary text-xs py-2.5 px-3">
            🤝 Trade
          </motion.button>
        )}
        {isBankruptcy && (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => socket.emit('game:declare-bankruptcy')} className="btn-danger text-xs flex-1 py-2.5">
            💸 Bankruptcy
          </motion.button>
        )}
      </div>

      {!isMyTurn && <p className="text-center text-white/15 text-[9px] mt-1.5">Wait for your turn</p>}
    </div>
  );
}
