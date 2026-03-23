import { motion } from 'framer-motion';

interface PlayerTokenProps {
  color: string;
  name: string;
  isCurrent: boolean;
  size?: 'sm' | 'md';
}

/**
 * Attractive player token with gradient, inner ring, 3D shadow, and glow.
 */
export default function PlayerToken({ color, name, isCurrent, size = 'sm' }: PlayerTokenProps) {
  const px = size === 'md' ? 20 : isCurrent ? 16 : 12;

  return (
    <motion.div
      className="relative"
      style={{ width: px, height: px }}
      animate={{ scale: isCurrent ? 1.2 : 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      title={name}
    >
      {/* Main token body — gradient sphere */}
      <div
        className="w-full h-full rounded-full border border-white/40"
        style={{
          background: `radial-gradient(circle at 35% 30%, ${color}dd, ${color}, ${darken(color, 0.3)})`,
          boxShadow: isCurrent
            ? `0 0 10px ${color}80, 0 0 20px ${color}40, inset 0 -2px 3px rgba(0,0,0,0.4), inset 0 2px 3px rgba(255,255,255,0.25), 0 2px 4px rgba(0,0,0,0.5)`
            : `0 0 6px ${color}50, inset 0 -2px 3px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.2), 0 1px 3px rgba(0,0,0,0.4)`,
        }}
      />
      {/* Inner highlight ring */}
      <div
        className="absolute rounded-full border border-white/15"
        style={{
          top: '15%', left: '15%',
          width: '70%', height: '70%',
        }}
      />
      {/* Pulse ring for current player */}
      {isCurrent && (
        <div
          className="absolute rounded-full animate-ping"
          style={{
            inset: '-3px',
            backgroundColor: `${color}20`,
            border: `1px solid ${color}30`,
          }}
        />
      )}
    </motion.div>
  );
}

/** Darken a hex color by a factor (0-1) */
function darken(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * (1 - factor))}, ${Math.round(g * (1 - factor))}, ${Math.round(b * (1 - factor))})`;
}
