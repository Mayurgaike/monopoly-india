import { useState } from 'react';
import { socket } from '../../socket/client';
import { useGameStore } from '../../store/gameStore';

export default function AuctionModal() {
  const auctionState = useGameStore((s) => s.auctionState);
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useGameStore((s) => s.playerId);
  const [bidAmount, setBidAmount] = useState(0);

  if (!auctionState || !gameState || !playerId) return null;

  const tile = gameState.board[auctionState.tileIndex];
  const currentBidder = auctionState.currentBidderId
    ? gameState.players.find(p => p.id === auctionState.currentBidderId)
    : null;
  const isParticipant = auctionState.participants.includes(playerId);
  const myPlayer = gameState.players.find(p => p.id === playerId);
  const minBid = auctionState.currentBid + 1;

  const handleBid = () => {
    if (bidAmount >= minBid) {
      socket.emit('game:auction-bid', { amount: bidAmount });
    }
  };

  const handlePass = () => {
    socket.emit('game:auction-pass');
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-sm animate-bounce-in p-6">
        <h3 className="font-display text-xl font-bold text-amber-400 mb-1 text-center">🔨 Auction</h3>
        <p className="text-center text-white/70 text-sm mb-4">{tile?.name}</p>

        {/* Timer */}
        <div className="flex justify-center mb-4">
          <div className={`
            w-16 h-16 rounded-full border-4 flex items-center justify-center font-bold text-2xl
            ${auctionState.timeRemaining <= 5 ? 'border-red-500 text-red-400 animate-pulse' : 'border-amber-500 text-amber-400'}
          `}>
            {auctionState.timeRemaining}
          </div>
        </div>

        {/* Current bid */}
        <div className="bg-white/5 rounded-xl p-3 mb-4 text-center">
          <p className="text-xs text-white/40 uppercase">Current Bid</p>
          <p className="text-2xl font-bold text-amber-400">
            {auctionState.currentBid > 0 ? `₹${auctionState.currentBid}` : 'No bids'}
          </p>
          {currentBidder && (
            <p className="text-xs text-white/50 mt-1">
              by <span className="text-white/80 font-medium">{currentBidder.name}</span>
            </p>
          )}
        </div>

        {/* Bid controls */}
        {isParticipant && auctionState.active && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="number"
                value={bidAmount || ''}
                onChange={(e) => setBidAmount(Number(e.target.value) || 0)}
                min={minBid}
                max={myPlayer?.money}
                placeholder={`Min ₹${minBid}`}
                className="input-field text-sm flex-1"
              />
              <button onClick={handleBid} className="btn-primary text-sm" disabled={bidAmount < minBid}>
                Bid
              </button>
            </div>

            {/* Quick bid buttons */}
            <div className="flex gap-2">
              {[10, 25, 50, 100].map(inc => (
                <button
                  key={inc}
                  onClick={() => setBidAmount(auctionState.currentBid + inc)}
                  className="btn-secondary text-xs flex-1"
                >
                  +₹{inc}
                </button>
              ))}
            </div>

            <button onClick={handlePass} className="btn-danger w-full text-sm">
              Pass
            </button>
          </div>
        )}

        {!isParticipant && (
          <p className="text-center text-white/40 text-sm">You have passed on this auction</p>
        )}

        <p className="text-center text-white/30 text-xs mt-3">
          {auctionState.participants.length} participant(s) remaining
        </p>
      </div>
    </div>
  );
}
