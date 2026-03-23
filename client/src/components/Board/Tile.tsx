import { motion } from 'framer-motion';
import type { Tile as TileType, PropertyTile } from '../../../../shared/src/types';
import { useGameStore } from '../../store/gameStore';

interface TileProps {
  tile: TileType;
  side: 'top' | 'bottom' | 'left' | 'right' | 'corner';
}

const COLOR_MAP: Record<string, string> = {
  brown: '#8B4513', lightblue: '#87CEEB', pink: '#DB7093', orange: '#FF8C00',
  red: '#DC143C', yellow: '#FFD700', green: '#228B22', darkblue: '#191970',
};

const TILE_ICONS: Record<string, string> = {
  GO: '🚀', JAIL: '🔒', FREE_PARKING: '🏖️', GO_TO_JAIL: '👮',
  CHANCE: '❓', COMMUNITY: '🎁', TAX: '💸', RAILROAD: '✈️', UTILITY: '⚡',
};

export default function Tile({ tile, side }: TileProps) {
  const setSelectedTileIndex = useGameStore((s) => s.setSelectedTileIndex);
  const gameState = useGameStore((s) => s.gameState);

  const isProperty = tile.type === 'PROPERTY';
  const isOwnable = tile.type === 'PROPERTY' || tile.type === 'RAILROAD' || tile.type === 'UTILITY';
  const ownerId = isOwnable ? (tile as any).ownerId : null;
  const owner = ownerId ? gameState?.players.find(p => p.id === ownerId) : null;
  const isCorner = side === 'corner';

  const handleClick = () => { if (isOwnable) setSelectedTileIndex(tile.index); };

  const icon = isCorner
    ? ({ 0: '🚀', 10: '🔒', 20: '🏖️', 30: '👮' }[tile.index] || '')
    : !isProperty ? (tile.type === 'UTILITY' && tile.name.includes('Water') ? '💧' : TILE_ICONS[tile.type] || '') : '';

  // Color strip: property group color, or PLAYER color when owned
  const groupColor = isProperty ? COLOR_MAP[(tile as PropertyTile).colorGroup] || '#888' : null;
  // When owned, blend player color into the strip
  const stripColor = owner ? owner.color : groupColor;

  const stripClass = groupColor ? (
    side === 'bottom' ? 'top-0 left-0 right-0 h-[8px]' :
    side === 'top' ? 'bottom-0 left-0 right-0 h-[8px]' :
    side === 'left' ? 'top-0 bottom-0 right-0 w-[8px]' :
    side === 'right' ? 'top-0 bottom-0 left-0 w-[8px]' : 'top-0 left-0 right-0 h-[8px]'
  ) : null;

  const padClass = groupColor ? (
    side === 'bottom' ? 'pt-[10px]' : side === 'top' ? 'pb-[10px]' :
    side === 'left' ? 'pr-[10px]' : side === 'right' ? 'pl-[10px]' : ''
  ) : '';

  // Houses data
  const houses = isProperty ? (tile as PropertyTile).houses : 0;

  return (
    <motion.button
      onClick={handleClick}
      whileHover={isOwnable ? { scale: 1.06, zIndex: 30 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`w-full h-full flex flex-col items-center justify-center relative overflow-hidden
        text-gray-800 text-[5px] sm:text-[6px] md:text-[8px] leading-tight cursor-pointer
        ${isCorner ? 'p-1' : 'p-[2px]'}
      `}
      style={{
        background: owner
          ? `linear-gradient(135deg, ${owner.color}18, #f5f0e1, #e8e0c8)`
          : 'linear-gradient(135deg, #f5f0e1, #e8e0c8)',
        // Owned glow border
        boxShadow: owner ? `inset 0 0 6px ${owner.color}30` : 'none',
      }}
      title={`${tile.name}${owner ? ` (${owner.name})` : ''}`}
    >
      {/* Color strip — changes to player color when owned */}
      {stripClass && (
        <div className={`absolute ${stripClass}`}
          style={{
            backgroundColor: stripColor || '#888',
            boxShadow: owner ? `0 0 6px ${owner.color}50` : 'none',
          }}
        />
      )}

      {/* Content */}
      <div className={`flex flex-col items-center justify-center gap-[1px] ${padClass} z-[1]`}>
        {icon && <span className="text-[9px] md:text-[12px] leading-none">{icon}</span>}
        <span className="font-bold text-center leading-[1.1] truncate w-full px-[1px]">{tile.name}</span>
        {isOwnable && !ownerId && (
          <span className="text-[4px] md:text-[6px] text-gray-500/80 font-semibold">₹{(tile as any).price}</span>
        )}
        {/* Houses/Hotel visual */}
        {houses > 0 && (
          <div className="flex gap-[1px] mt-[1px]">
            {houses === 5 ? (
              <div className="w-[6px] h-[6px] md:w-[8px] md:h-[8px] bg-red-600 rounded-[2px] shadow-sm" title="Hotel" />
            ) : (
              Array.from({ length: houses }).map((_, i) => (
                <div key={i} className="w-[4px] h-[4px] md:w-[5px] md:h-[5px] bg-green-600 rounded-[1px] shadow-sm" title="House" />
              ))
            )}
          </div>
        )}
      </div>

      {/* Owner dot */}
      {owner && (
        <div className="absolute bottom-[2px] right-[2px] w-[7px] h-[7px] md:w-[9px] md:h-[9px] rounded-full border-[1.5px] border-white shadow-sm z-[2]"
          style={{ backgroundColor: owner.color, boxShadow: `0 0 4px ${owner.color}60` }} />
      )}

      {/* Mortgaged overlay */}
      {isOwnable && (tile as any).mortgaged && (
        <div className="absolute inset-0 bg-gray-500/60 flex items-center justify-center z-[3]">
          <span className="text-[7px] md:text-[10px] font-black text-red-700 -rotate-12 drop-shadow">M</span>
        </div>
      )}
    </motion.button>
  );
}
