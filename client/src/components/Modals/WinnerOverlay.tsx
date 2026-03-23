interface WinnerOverlayProps {
  winner: { playerId: string; playerName: string };
  onClose: () => void;
}

export default function WinnerOverlay({ winner, onClose }: WinnerOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      <div className="animate-bounce-in text-center max-w-md w-full">
        {/* Confetti-like decorations */}
        <div className="relative">
          <div className="absolute -top-8 left-1/4 text-4xl animate-bounce" style={{ animationDelay: '0s' }}>🎊</div>
          <div className="absolute -top-6 right-1/4 text-4xl animate-bounce" style={{ animationDelay: '0.3s' }}>🎉</div>
          <div className="absolute -top-10 left-1/2 text-5xl animate-bounce" style={{ animationDelay: '0.1s' }}>👑</div>
        </div>

        <div className="card p-8 mt-8 bg-gradient-to-b from-amber-900/40 to-surface/90 border-amber-500/30">
          <div className="text-7xl mb-4">🏆</div>
          <h2 className="font-display text-3xl font-extrabold bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent mb-2">
            Winner!
          </h2>
          <p className="text-2xl font-bold text-white mb-2">{winner.playerName}</p>
          <p className="text-white/50 text-sm mb-6">has won the game of Monopoly India!</p>

          <div className="flex gap-3 justify-center">
            <button onClick={onClose} className="btn-primary text-lg px-8">
              🏠 Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
