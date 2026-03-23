import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket, connectSocket } from '../socket/client';
import { useGameStore } from '../store/gameStore';
import toast from 'react-hot-toast';

export default function Home() {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const navigate = useNavigate();
  const store = useGameStore();

  useEffect(() => {
    connectSocket();
  }, []);

  const handleCreate = () => {
    if (!playerName.trim()) {
      toast.error('Enter your name!');
      return;
    }
    socket.emit('room:create', { playerName: playerName.trim() }, (res) => {
      if (res.success && res.room && res.playerId) {
        store.setPlayerId(res.playerId);
        store.setPlayerName(playerName.trim());
        store.setRoomCode(res.room.code);
        store.setRoom(res.room);
        navigate('/game');
      } else {
        toast.error(res.error || 'Failed to create room');
      }
    });
  };

  const handleJoin = () => {
    if (!playerName.trim() || !roomCode.trim()) {
      toast.error('Enter your name and room code!');
      return;
    }
    socket.emit('room:join', { roomCode: roomCode.trim().toUpperCase(), playerName: playerName.trim() }, (res) => {
      if (res.success && res.room && res.playerId) {
        store.setPlayerId(res.playerId);
        store.setPlayerName(playerName.trim());
        store.setRoomCode(res.room.code);
        store.setRoom(res.room);
        navigate('/game');
      } else {
        toast.error(res.error || 'Failed to join room');
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="card p-8 w-full max-w-md animate-fade-in relative z-10" id="home-card">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-extrabold bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 bg-clip-text text-transparent mb-2">
            🎲 Monopoly India
          </h1>
          <p className="text-white/50 text-sm font-medium tracking-wide">
            Multiplayer Board Game • Indian Edition
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="w-12 h-px bg-gradient-to-r from-transparent to-amber-500/50" />
            <span className="text-amber-500 text-xs">🇮🇳</span>
            <span className="w-12 h-px bg-gradient-to-l from-transparent to-amber-500/50" />
          </div>
        </div>

        {mode === 'menu' && (
          <div className="space-y-4 animate-fade-in">
            <input
              id="player-name-input"
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="input-field text-center text-lg"
              maxLength={20}
              autoFocus
            />
            <button
              id="create-room-btn"
              onClick={() => { if (playerName.trim()) setMode('create'); else toast.error('Enter your name!'); }}
              className="btn-primary w-full text-lg"
            >
              🏠 Create Room
            </button>
            <button
              id="join-room-btn"
              onClick={() => { if (playerName.trim()) setMode('join'); else toast.error('Enter your name!'); }}
              className="btn-secondary w-full text-lg"
            >
              🚪 Join Room
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-4 animate-slide-up">
            <p className="text-white/70 text-center">
              Welcome, <span className="text-amber-400 font-semibold">{playerName}</span>!
            </p>
            <button
              id="confirm-create-btn"
              onClick={handleCreate}
              className="btn-primary w-full text-lg"
            >
              ✨ Create New Game
            </button>
            <button
              onClick={() => setMode('menu')}
              className="btn-secondary w-full"
            >
              ← Back
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-4 animate-slide-up">
            <p className="text-white/70 text-center">
              Welcome, <span className="text-amber-400 font-semibold">{playerName}</span>!
            </p>
            <input
              id="room-code-input"
              type="text"
              placeholder="Enter Room Code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="input-field text-center text-2xl tracking-[0.3em] font-mono uppercase"
              maxLength={6}
              autoFocus
            />
            <button
              id="confirm-join-btn"
              onClick={handleJoin}
              className="btn-primary w-full text-lg"
            >
              🎮 Join Game
            </button>
            <button
              onClick={() => setMode('menu')}
              className="btn-secondary w-full"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-white/30 text-xs">
          2–8 Players • Real-time Multiplayer
        </div>
      </div>
    </div>
  );
}
