import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { socket } from '../../socket/client';
import type { PropertyTile, RailroadTile, UtilityTile } from '../../../../shared/src/types';

interface PropertyCardProps {
  tileIndex: number;
  onClose: () => void;
}

const COLOR_MAP: Record<string, string> = {
  brown: '#8B4513', lightblue: '#87CEEB', pink: '#DB7093', orange: '#FF8C00',
  red: '#DC143C', yellow: '#FFD700', green: '#228B22', darkblue: '#191970',
};

export default function PropertyCard({ tileIndex, onClose }: PropertyCardProps) {
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useGameStore((s) => s.playerId);
  const isMyTurn = useGameStore((s) => s.isMyTurn());

  if (!gameState) return null;

  const tile = gameState.board[tileIndex];
  if (tile.type !== 'PROPERTY' && tile.type !== 'RAILROAD' && tile.type !== 'UTILITY') return null;

  const ownable = tile as PropertyTile | RailroadTile | UtilityTile;
  const owner = ownable.ownerId ? gameState.players.find(p => p.id === ownable.ownerId) : null;
  const isOwner = ownable.ownerId === playerId;
  const isProperty = tile.type === 'PROPERTY';
  const prop = isProperty ? tile as PropertyTile : null;
  const headerColor = isProperty && prop ? (COLOR_MAP[prop.colorGroup] || '#888') : '#3a4662';

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-end z-50"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-sm h-full max-h-screen overflow-y-auto bg-surface border-l border-white/10 shadow-2xl"
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Color Header */}
        <div className="h-20 flex items-end justify-center pb-3 px-4 relative" style={{ backgroundColor: headerColor }}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <h3 className="font-display text-2xl font-bold text-white drop-shadow-lg relative z-10">
            {tile.type === 'RAILROAD' ? '✈️ ' : tile.type === 'UTILITY' ? '⚡ ' : ''}{tile.name}
          </h3>
        </div>

        <div className="p-5 space-y-4">
          {/* Price */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-white/50">Purchase Price</span>
            <span className="font-bold text-amber-400 text-lg">₹{ownable.price}</span>
          </div>

          {/* Rent table */}
          {isProperty && prop && (
            <div className="bg-white/5 rounded-xl p-4 space-y-2">
              <h4 className="text-xs text-white/40 uppercase font-bold mb-2">Rent Schedule</h4>
              {[
                ['Base Rent', prop.rent[0]],
                ['With 1 House', prop.rent[1]],
                ['With 2 Houses', prop.rent[2]],
                ['With 3 Houses', prop.rent[3]],
                ['With 4 Houses', prop.rent[4]],
                ['With Hotel', prop.rent[5]],
              ].map(([label, value], i) => (
                <div key={i} className={`flex justify-between text-xs ${i === 5 ? 'text-amber-400 font-bold' : 'text-white/70'}`}>
                  <span>{label}</span><span>₹{value}</span>
                </div>
              ))}
              <div className="border-t border-white/10 mt-3 pt-3 flex justify-between text-xs">
                <span className="text-white/50">House Cost</span><span>₹{prop.houseCost}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/50">Built</span>
                <span>{prop.houses === 5 ? '🏨 Hotel' : `🏠 × ${prop.houses}`}</span>
              </div>
            </div>
          )}

          {/* Mortgage */}
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Mortgage Value</span>
            <span>₹{ownable.mortgageValue}</span>
          </div>

          {/* Owner */}
          <div className="flex justify-between text-sm items-center">
            <span className="text-white/50">Owner</span>
            {owner ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: owner.color }} />
                <span className="font-medium">{owner.name}</span>
              </div>
            ) : (
              <span className="text-white/30 italic">Unowned</span>
            )}
          </div>

          {ownable.mortgaged && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center text-red-400 text-sm font-bold">
              🚫 MORTGAGED
            </div>
          )}

          {/* Owner Actions */}
          {isOwner && isMyTurn && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <h4 className="text-xs text-white/40 uppercase font-bold">Actions</h4>
              <div className="flex flex-wrap gap-2">
                {isProperty && prop && prop.houses < 5 && (
                  <motion.button whileTap={{ scale: 0.95 }}
                    onClick={() => socket.emit('game:build', { tileIndex })}
                    className="btn-primary text-xs flex-1">🏠 Build (₹{prop.houseCost})</motion.button>
                )}
                {isProperty && prop && prop.houses > 0 && (
                  <motion.button whileTap={{ scale: 0.95 }}
                    onClick={() => socket.emit('game:sell-house', { tileIndex })}
                    className="btn-secondary text-xs flex-1">Sell House</motion.button>
                )}
                {!ownable.mortgaged && (!isProperty || (prop && prop.houses === 0)) && (
                  <motion.button whileTap={{ scale: 0.95 }}
                    onClick={() => socket.emit('game:mortgage', { tileIndex })}
                    className="btn-secondary text-xs flex-1">Mortgage</motion.button>
                )}
                {ownable.mortgaged && (
                  <motion.button whileTap={{ scale: 0.95 }}
                    onClick={() => socket.emit('game:unmortgage', { tileIndex })}
                    className="btn-primary text-xs flex-1">Unmortgage (₹{Math.floor(ownable.mortgageValue * 1.1)})</motion.button>
                )}
              </div>
            </div>
          )}

          {/* Close */}
          <motion.button whileTap={{ scale: 0.95 }} onClick={onClose}
            className="btn-secondary w-full text-sm mt-4">Close</motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
