import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

const CARD_ICONS: Record<string, string> = {
  CHANCE: '🎲',
  COMMUNITY: '🎁',
};

export default function CardReveal() {
  const activeCard = useGameStore((s) => s.activeCard);
  const setActiveCard = useGameStore((s) => s.setActiveCard);

  if (!activeCard) return null;

  const { card, playerName } = activeCard;
  const isChance = card.type === 'CHANCE';

  return (
    <AnimatePresence>
      <motion.div
        key="card-overlay"
        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Blurred backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={() => setActiveCard(null)}
        />

        {/* Card */}
        <motion.div
          className="relative z-10 w-full max-w-sm"
          initial={{ rotateY: 180, scale: 0.5, opacity: 0 }}
          animate={{ rotateY: 0, scale: 1, opacity: 1 }}
          exit={{ rotateY: -90, scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
        >
          <div className={`rounded-2xl overflow-hidden shadow-2xl border-2 ${
            isChance ? 'border-orange-400/30' : 'border-blue-400/30'
          }`}>
            {/* Header */}
            <div className={`px-6 py-4 ${
              isChance
                ? 'bg-gradient-to-r from-orange-600 to-amber-500'
                : 'bg-gradient-to-r from-blue-600 to-cyan-500'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-bold text-white">
                  {isChance ? 'Chance' : 'Surprise'}
                </h3>
                <span className="text-3xl">{CARD_ICONS[card.type]}</span>
              </div>
              <p className="text-white/60 text-xs mt-1">{playerName}'s card</p>
            </div>

            {/* Body */}
            <div className="bg-surface p-6">
              {/* Card illustration area */}
              <div className={`w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center text-3xl ${
                isChance ? 'bg-orange-500/10' : 'bg-blue-500/10'
              }`}>
                {card.text.includes('jail') || card.text.includes('Jail') ? '🔒' :
                 card.text.includes('Collect') || card.text.includes('collect') ? '💰' :
                 card.text.includes('Pay') || card.text.includes('pay') ? '💸' :
                 card.text.includes('Go') || card.text.includes('move') || card.text.includes('Advance') ? '🚀' :
                 card.text.includes('repair') || card.text.includes('Repair') ? '🔧' :
                 isChance ? '❓' : '🎁'}
              </div>

              {/* Card text */}
              <p className="text-white/90 text-center text-base leading-relaxed font-medium">
                "{card.text}"
              </p>
            </div>

            {/* Footer */}
            <div className="bg-surface px-6 pb-5">
              <motion.button
                className="btn-primary w-full py-3"
                onClick={() => setActiveCard(null)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Continue
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
