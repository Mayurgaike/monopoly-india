import { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface DiceProps {
  values: [number, number];
  rolling: boolean;
}

/**
 * Dot positions for each face value. Coordinates as percentage.
 */
const DOT_LAYOUTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 22], [72, 22], [28, 50], [72, 50], [28, 78], [72, 78]],
};

/** Render dots for a given face value */
function DiceDots({ value }: { value: number }) {
  const dots = DOT_LAYOUTS[value] || DOT_LAYOUTS[1];
  return (
    <>
      {dots.map(([x, y], i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${x}%`, top: `${y}%`,
            transform: 'translate(-50%, -50%)',
            width: '20%', height: '20%',
            background: 'radial-gradient(circle at 35% 35%, #555, #111)',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)',
          }}
        />
      ))}
    </>
  );
}

/** CSS face styling */
const FACE_BG = 'linear-gradient(145deg, #fafafa, #e8e4de)';
const FACE_STYLE: React.CSSProperties = {
  position: 'absolute',
  width: '100%',
  height: '100%',
  backfaceVisibility: 'hidden',
  borderRadius: '6px',
  background: FACE_BG,
  border: '1px solid rgba(0,0,0,0.1)',
  boxShadow: 'inset 0 0 6px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.1)',
};

/** Maps dice value to the CSS rotation that brings that face forward */
function getFaceRotation(value: number): string {
  switch (value) {
    case 1: return 'rotateY(0deg)';       // front
    case 2: return 'rotateX(-90deg)';     // top
    case 3: return 'rotateY(-90deg)';     // right → shows face 3
    case 4: return 'rotateY(90deg)';      // left → shows face 4
    case 5: return 'rotateX(90deg)';      // bottom
    case 6: return 'rotateY(180deg)';     // back
    default: return 'rotateY(0deg)';
  }
}

/** A single 3D die rendered with pure CSS transforms */
function Die3D({ value, rolling }: { value: number; rolling: boolean }) {
  const [displayValue, setDisplayValue] = useState(value);
  const cycleRef = useRef(0);
  const cubeRef = useRef<HTMLDivElement>(null);

  // Deterministic cycling during roll, snap to server value on stop
  useEffect(() => {
    if (rolling) {
      cycleRef.current = 0;
      const interval = setInterval(() => {
        cycleRef.current = (cycleRef.current % 6) + 1;
        setDisplayValue(cycleRef.current);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setDisplayValue(value);
    }
  }, [rolling, value]);

  // Apply rotation via CSS transition instead of Framer Motion for preserve-3d
  useEffect(() => {
    if (!cubeRef.current) return;
    const rotation = getFaceRotation(displayValue);
    if (rolling) {
      // Tumble with extra spins
      cubeRef.current.style.transition = 'transform 0.15s linear';
      cubeRef.current.style.transform = rotation;
    } else {
      // Settle with spring-like easing
      cubeRef.current.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
      cubeRef.current.style.transform = getFaceRotation(value);
    }
  }, [displayValue, rolling, value]);

  const size = 60;
  const half = size / 2;

  return (
    <div style={{ perspective: '400px', width: size, height: size }}>
      <div
        ref={cubeRef}
        style={{
          width: size, height: size,
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: getFaceRotation(value),
          transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Face 1 - Front */}
        <div style={{ ...FACE_STYLE, transform: `translateZ(${half}px)` }}>
          <DiceDots value={1} />
        </div>
        {/* Face 6 - Back */}
        <div style={{ ...FACE_STYLE, transform: `rotateY(180deg) translateZ(${half}px)` }}>
          <DiceDots value={6} />
        </div>
        {/* Face 2 - Top */}
        <div style={{ ...FACE_STYLE, transform: `rotateX(90deg) translateZ(${half}px)` }}>
          <DiceDots value={2} />
        </div>
        {/* Face 5 - Bottom */}
        <div style={{ ...FACE_STYLE, transform: `rotateX(-90deg) translateZ(${half}px)` }}>
          <DiceDots value={5} />
        </div>
        {/* Face 3 - Right */}
        <div style={{ ...FACE_STYLE, transform: `rotateY(90deg) translateZ(${half}px)` }}>
          <DiceDots value={3} />
        </div>
        {/* Face 4 - Left */}
        <div style={{ ...FACE_STYLE, transform: `rotateY(-90deg) translateZ(${half}px)` }}>
          <DiceDots value={4} />
        </div>
      </div>
    </div>
  );
}

export default function Dice({ values, rolling }: DiceProps) {
  const bothZero = values[0] === 0 && values[1] === 0;
  const total = values[0] + values[1];
  const isDoubles = values[0] === values[1] && !bothZero;

  return (
    <div className="flex items-center gap-5" id="dice-container">
      <Die3D value={bothZero ? 1 : values[0]} rolling={rolling} />
      <Die3D value={bothZero ? 1 : values[1]} rolling={rolling} />
      <AnimatePresence>
        {!bothZero && !rolling && (
          <motion.div
            initial={{ opacity: 0, x: -10, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="flex flex-col items-start"
          >
            <span className="text-white/80 text-xl font-bold tabular-nums drop-shadow-lg">= {total}</span>
            {isDoubles && (
              <motion.span
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, delay: 0.15 }}
                className="text-amber-400 text-[10px] font-bold uppercase tracking-wider"
              >
                🎯 Doubles!
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
