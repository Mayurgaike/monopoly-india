import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useState } from 'react';

export default function PlayerPanel() {
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useGameStore((s) => s.playerId);
  const setSelectedTileIndex = useGameStore((s) => s.setSelectedTileIndex);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  if (!gameState) return null;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  return (
    <div className="flex flex-col flex-1 min-h-0" id="player-panel">
      <div className="px-4 py-3 border-b border-white/5 flex-shrink-0">
        <h3 className="font-display text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
          👥 Players
          <span className="text-white/20 text-xs font-normal">({gameState.players.filter(p => !p.bankrupt).length} active)</span>
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {gameState.players.map((player) => {
          const isTurn = player.id === currentPlayer?.id;
          const isMe = player.id === playerId;
          const isExpanded = expandedPlayer === player.id;
          const ownedProps = player.properties.map(i => gameState.board[i]).filter(Boolean);
          // Net worth estimate: money + property values + house values
          const netWorth = player.money + ownedProps.reduce((sum, t) => {
            const price = (t as any).price || 0;
            const houses = (t as any).houses || 0;
            const houseCost = (t as any).houseCost || 0;
            return sum + price + houses * houseCost;
          }, 0);

          return (
            <motion.div
              key={player.id}
              layout
              className={`relative rounded-xl overflow-hidden transition-colors duration-300 ${
                isTurn && !player.bankrupt
                  ? 'bg-amber-500/10 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.08)]'
                  : 'bg-white/[0.03] border border-white/5 hover:bg-white/[0.06]'
              } ${player.bankrupt ? 'opacity-30 grayscale' : ''}`}
            >
              {/* Turn indicator bar */}
              {isTurn && !player.bankrupt && (
                <motion.div layoutId="turn-bar" className="absolute left-0 top-2 bottom-2 w-[3px] bg-amber-400 rounded-r-full" />
              )}

              {/* Player header — clickable to expand */}
              <button className="w-full p-3 text-left" onClick={() => setExpandedPlayer(isExpanded ? null : player.id)}>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className={`w-6 h-6 rounded-full border-2 ${isTurn ? 'border-amber-400' : 'border-white/20'}`}
                      style={{ backgroundColor: player.color, boxShadow: isTurn ? `0 0 10px ${player.color}60` : 'none' }} />
                    {isTurn && !player.bankrupt && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full animate-ping" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-semibold text-sm truncate ${isMe ? 'text-amber-300' : ''}`}>{player.name}</span>
                      {isMe && <span className="text-[8px] bg-amber-500/15 text-amber-400/70 px-1 py-0.5 rounded font-medium">YOU</span>}
                      {isTurn && !player.bankrupt && <span className="text-[8px] bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded font-bold animate-pulse">TURN</span>}
                      {!player.connected && !player.bankrupt && <span className="text-[8px] bg-red-500/15 text-red-400 px-1 py-0.5 rounded">OFFLINE</span>}
                      {player.bankrupt && <span className="text-[8px] bg-gray-500/15 text-gray-500 px-1 py-0.5 rounded">OUT</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-amber-400 font-bold text-xs tabular-nums">₹{player.money.toLocaleString()}</div>
                    <div className="text-white/25 text-[9px]">{ownedProps.length} props</div>
                  </div>
                  <span className="text-white/20 text-[10px] ml-1">{isExpanded ? '▾' : '▸'}</span>
                </div>
              </button>

              {/* Expanded: net worth + property cards */}
              <AnimatePresence>
                {isExpanded && !player.bankrupt && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-2">
                      {/* Stats */}
                      <div className="flex justify-between text-[10px] text-white/40 bg-black/20 rounded-lg px-3 py-1.5">
                        <span>Net Worth</span>
                        <span className="text-amber-400 font-bold">₹{netWorth.toLocaleString()}</span>
                      </div>
                      {player.inJail && (
                        <div className="text-[10px] text-red-400 bg-red-500/10 rounded-lg px-3 py-1.5 text-center font-medium">
                          🔒 In Jail (Turn {player.jailTurns}/3)
                        </div>
                      )}
                      {/* Property deeds */}
                      {ownedProps.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {ownedProps.map(t => {
                            const colorGroup = (t as any).colorGroup;
                            const color = colorGroup ? ({
                              brown: '#8B4513', lightblue: '#87CEEB', pink: '#DB7093', orange: '#FF8C00',
                              red: '#DC143C', yellow: '#FFD700', green: '#228B22', darkblue: '#191970',
                            } as Record<string, string>)[colorGroup] || '#666' : '#666';
                            const houses = (t as any).houses || 0;
                            const mortgaged = (t as any).mortgaged;
                            return (
                              <button key={t.index}
                                onClick={(e) => { e.stopPropagation(); setSelectedTileIndex(t.index); }}
                                className={`text-[9px] px-2 py-1 rounded-md border transition-colors hover:brightness-110 ${mortgaged ? 'opacity-50 line-through' : ''}`}
                                style={{ borderColor: color, backgroundColor: `${color}20`, color: '#fff' }}
                                title={`${t.name}${houses > 0 ? ` (${houses === 5 ? 'Hotel' : `${houses}H`})` : ''}${mortgaged ? ' (M)' : ''}`}
                              >
                                {t.name.length > 8 ? t.name.slice(0, 8) + '…' : t.name}
                                {houses > 0 && <span className="ml-0.5 text-green-400">{houses === 5 ? '🏨' : `${houses}H`}</span>}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[10px] text-white/20 text-center">No properties yet</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
