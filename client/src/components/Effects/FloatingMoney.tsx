import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

export default function FloatingMoney() {
  const floatingMoney = useGameStore((s) => s.floatingMoney);
  const removeFloatingMoney = useGameStore((s) => s.removeFloatingMoney);

  return (
    <div className="fixed inset-0 pointer-events-none z-[60]">
      <AnimatePresence>
        {floatingMoney.map((event, index) => (
          <FloatingMoneyItem
            key={event.id}
            event={event}
            index={index}
            onComplete={() => removeFloatingMoney(event.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function FloatingMoneyItem({ event, index, onComplete }: {
  event: { id: string; amount: number; label: string; playerId: string };
  index: number;
  onComplete: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const isGain = event.amount > 0;

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 pointer-events-none"
      initial={{ opacity: 0, y: 0, x: index * 30 - 15, scale: 0.5 }}
      animate={{ opacity: 1, y: -80, scale: 1 }}
      exit={{ opacity: 0, y: -120, scale: 0.8 }}
      transition={{ duration: 1.5, ease: 'easeOut' }}
    >
      <span className={`text-2xl font-extrabold tabular-nums drop-shadow-2xl whitespace-nowrap ${
        isGain ? 'text-green-400' : 'text-red-400'
      }`}>
        {event.label}
      </span>
    </motion.div>
  );
}
