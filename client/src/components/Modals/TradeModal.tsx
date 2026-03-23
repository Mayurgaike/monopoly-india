import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '../../socket/client';
import { useGameStore } from '../../store/gameStore';

const COLOR_MAP: Record<string, string> = {
  brown: '#8B4513', lightblue: '#87CEEB', pink: '#DB7093', orange: '#FF8C00',
  red: '#DC143C', yellow: '#FFD700', green: '#228B22', darkblue: '#191970',
};

export default function TradeModal() {
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useGameStore((s) => s.playerId);
  const pendingTrade = useGameStore((s) => s.pendingTrade);
  const setShowTradeModal = useGameStore((s) => s.setShowTradeModal);

  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [offeredMoney, setOfferedMoney] = useState(0);
  const [requestedMoney, setRequestedMoney] = useState(0);
  const [offeredProps, setOfferedProps] = useState<number[]>([]);
  const [requestedProps, setRequestedProps] = useState<number[]>([]);

  if (!gameState || !playerId) return null;

  const myPlayer = gameState.players.find(p => p.id === playerId);
  const otherPlayers = gameState.players.filter(p => p.id !== playerId && !p.bankrupt);

  // ====== INCOMING TRADE ======
  if (pendingTrade && pendingTrade.toPlayerId === playerId) {
    const fromPlayer = gameState.players.find(p => p.id === pendingTrade.fromPlayerId);
    return (
      <motion.div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div className="card w-full max-w-md p-6" initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}>
          <h3 className="font-display text-xl font-bold text-amber-400 mb-4 text-center">🤝 Trade Proposal</h3>
          <p className="text-white/70 text-sm mb-4 text-center">
            <span className="text-amber-400 font-semibold">{fromPlayer?.name}</span> wants to trade:
          </p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3">
              <h4 className="text-[10px] text-green-400 uppercase font-bold mb-2">They Offer</h4>
              {pendingTrade.offeredMoney > 0 && <p className="text-sm text-green-400 font-bold">₹{pendingTrade.offeredMoney}</p>}
              {pendingTrade.offeredProperties.map(idx => (
                <p key={idx} className="text-xs text-white/70 mt-1">📜 {gameState.board[idx]?.name}</p>
              ))}
              {pendingTrade.offeredMoney === 0 && pendingTrade.offeredProperties.length === 0 && (
                <p className="text-xs text-white/30">Nothing</p>
              )}
            </div>
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
              <h4 className="text-[10px] text-red-400 uppercase font-bold mb-2">They Want</h4>
              {pendingTrade.requestedMoney > 0 && <p className="text-sm text-red-400 font-bold">₹{pendingTrade.requestedMoney}</p>}
              {pendingTrade.requestedProperties.map(idx => (
                <p key={idx} className="text-xs text-white/70 mt-1">📜 {gameState.board[idx]?.name}</p>
              ))}
              {pendingTrade.requestedMoney === 0 && pendingTrade.requestedProperties.length === 0 && (
                <p className="text-xs text-white/30">Nothing</p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <motion.button whileTap={{ scale: 0.95 }}
              onClick={() => { socket.emit('game:trade-respond', { accept: true }); setShowTradeModal(false); }}
              className="btn-primary flex-1">✅ Accept</motion.button>
            <motion.button whileTap={{ scale: 0.95 }}
              onClick={() => { socket.emit('game:trade-respond', { accept: false }); setShowTradeModal(false); }}
              className="btn-danger flex-1">❌ Reject</motion.button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // ====== PROPOSE TRADE ======
  const selectedPlayer = otherPlayers.find(p => p.id === selectedPlayerId);
  const toggleProp = (list: number[], setList: (v: number[]) => void, idx: number) => {
    setList(list.includes(idx) ? list.filter(i => i !== idx) : [...list, idx]);
  };
  const handlePropose = () => {
    if (!selectedPlayerId) return;
    socket.emit('game:trade-propose', {
      fromPlayerId: playerId, toPlayerId: selectedPlayerId,
      offeredMoney, requestedMoney, offeredProperties: offeredProps, requestedProperties: requestedProps,
    });
    setShowTradeModal(false);
  };

  const hasOffer = offeredMoney > 0 || offeredProps.length > 0 || requestedMoney > 0 || requestedProps.length > 0;

  return (
    <motion.div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowTradeModal(false)}>
      <motion.div className="card w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}>

        <h3 className="font-display text-2xl font-bold text-amber-400 mb-5 text-center">🤝 Propose Trade</h3>

        {/* Player selection — avatar cards */}
        <div className="mb-5">
          <label className="text-xs text-white/40 uppercase font-semibold mb-2 block">Trade With</label>
          <div className="flex gap-2 flex-wrap">
            {otherPlayers.map(p => (
              <motion.button key={p.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedPlayerId(p.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                  selectedPlayerId === p.id
                    ? 'border-amber-500/50 bg-amber-500/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}>
                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-sm font-medium">{p.name}</span>
                <span className="text-[10px] text-white/30">₹{p.money}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {selectedPlayer && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            {/* Your offer */}
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
              <h4 className="text-xs text-green-400 uppercase font-bold mb-3">💚 You Offer</h4>
              {/* Money slider */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-white/40">Money</span>
                  <span className="text-xs text-green-400 font-bold tabular-nums">₹{offeredMoney}</span>
                </div>
                <input type="range" min={0} max={myPlayer?.money || 0} step={10} value={offeredMoney}
                  onChange={e => setOfferedMoney(Number(e.target.value))}
                  className="w-full accent-green-500 h-1.5" />
              </div>
              {/* Property cards */}
              <div className="space-y-1">
                {myPlayer?.properties.map(idx => {
                  const t = gameState.board[idx];
                  const color = (t as any).colorGroup ? COLOR_MAP[(t as any).colorGroup] || '#666' : '#666';
                  const selected = offeredProps.includes(idx);
                  return (
                    <motion.button key={idx} whileTap={{ scale: 0.97 }}
                      onClick={() => toggleProp(offeredProps, setOfferedProps, idx)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                        selected ? 'bg-green-500/20 border border-green-500/40' : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}>
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                      <span className="flex-1 text-left">{t.name}</span>
                      {selected && <span className="text-green-400">✓</span>}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* You request */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
              <h4 className="text-xs text-red-400 uppercase font-bold mb-3">❤️ You Want</h4>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-white/40">Money</span>
                  <span className="text-xs text-red-400 font-bold tabular-nums">₹{requestedMoney}</span>
                </div>
                <input type="range" min={0} max={selectedPlayer.money} step={10} value={requestedMoney}
                  onChange={e => setRequestedMoney(Number(e.target.value))}
                  className="w-full accent-red-500 h-1.5" />
              </div>
              <div className="space-y-1">
                {selectedPlayer.properties.map(idx => {
                  const t = gameState.board[idx];
                  const color = (t as any).colorGroup ? COLOR_MAP[(t as any).colorGroup] || '#666' : '#666';
                  const selected = requestedProps.includes(idx);
                  return (
                    <motion.button key={idx} whileTap={{ scale: 0.97 }}
                      onClick={() => toggleProp(requestedProps, setRequestedProps, idx)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                        selected ? 'bg-red-500/20 border border-red-500/40' : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}>
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                      <span className="flex-1 text-left">{t.name}</span>
                      {selected && <span className="text-red-400">✓</span>}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Trade summary */}
        {hasOffer && selectedPlayer && (
          <motion.div initial={{ y: 5, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4 text-center text-xs text-white/60">
            You give: {offeredMoney > 0 ? `₹${offeredMoney}` : ''} {offeredProps.map(i => gameState.board[i]?.name).join(', ')}
            {' → '} You get: {requestedMoney > 0 ? `₹${requestedMoney}` : ''} {requestedProps.map(i => gameState.board[i]?.name).join(', ')}
          </motion.div>
        )}

        <div className="flex gap-3">
          <motion.button whileTap={{ scale: 0.95 }} onClick={handlePropose}
            className="btn-primary flex-1" disabled={!selectedPlayerId || !hasOffer}>
            📤 Send Trade
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowTradeModal(false)}
            className="btn-secondary flex-1">
            Cancel
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
