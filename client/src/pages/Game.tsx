import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket, connectSocket } from '../socket/client';
import { useGameStore } from '../store/gameStore';
import Board from '../components/Board/Board';
import PlayerPanel from '../components/Panels/PlayerPanel';
import ActionPanel from '../components/Panels/ActionPanel';
import ChatPanel from '../components/Panels/ChatPanel';
import PropertyCard from '../components/Panels/PropertyCard';
import TradeModal from '../components/Modals/TradeModal';
import AuctionModal from '../components/Modals/AuctionModal';
import CardReveal from '../components/Modals/CardReveal';
import WinnerOverlay from '../components/Modals/WinnerOverlay';
import FloatingMoney from '../components/Effects/FloatingMoney';
import toast from 'react-hot-toast';

let moneyEventCounter = 0;

export default function Game() {
  const navigate = useNavigate();
  const store = useGameStore();
  const [showMobilePanel, setShowMobilePanel] = useState<'players' | 'chat' | null>(null);
  const [winner, setWinner] = useState<{ playerId: string; playerName: string } | null>(null);

  const room = store.room;
  const gameState = store.gameState;
  const isLobby = !gameState || gameState.phase === 'LOBBY';

  const getPlayerName = useCallback((playerId: string) => {
    const state = useGameStore.getState().gameState;
    return state?.players.find(p => p.id === playerId)?.name || 'Unknown';
  }, []);

  // Track whether dice is currently rolling
  const rollingRef = useRef(false);

  useEffect(() => {
    connectSocket();
    if (!store.playerId) { navigate('/'); return; }

    socket.on('room:state', (room) => { useGameStore.getState().setRoom(room); });

    socket.on('game:state', (state: any) => {
      const store = useGameStore.getState();
      const prevState = store.gameState;

      // Detect money changes for floating feedback
      if (prevState) {
        state.players.forEach((player: any) => {
          const prev = prevState.players.find((p: any) => p.id === player.id);
          if (prev && prev.money !== player.money) {
            const diff = player.money - prev.money;
            store.addFloatingMoney({
              id: `money-${moneyEventCounter++}`,
              playerId: player.id,
              amount: diff,
              label: diff > 0 ? `+₹${diff}` : `-₹${Math.abs(diff)}`,
            });
          }
        });
      }
      // Always apply state immediately — Board handles movement deferral
      store.setGameState(state);
    });

    socket.on('game:rolled', (data: { dice: [number, number]; playerId: string }) => {
      const s = useGameStore.getState();
      rollingRef.current = true;
      s.setIsRolling(true);
      s.setDiceResult({ values: data.dice, playerId: data.playerId });

      // Stop rolling animation after dice settles
      setTimeout(() => {
        rollingRef.current = false;
        useGameStore.getState().setIsRolling(false);
      }, 1600);
    });

    socket.on('game:log', (log) => {
      const s = useGameStore.getState();
      s.addLog(log);

      // Detect card events and create card reveal
      if (log.type === 'card' && log.message.includes('drew')) {
        const match = log.message.match(/drew (Chance|Surprise): "(.+)"/);
        if (match) {
          const type = match[1] === 'Chance' ? 'CHANCE' : 'COMMUNITY';
          s.setActiveCard({
            card: { id: log.id, type, text: match[2], action: { type: 'COLLECT', amount: 0 } },
            playerName: log.message.split(' drew')[0],
          });
        }
      }

      switch (log.type) {
        case 'purchase': toast.success(log.message, { icon: '🏠', duration: 3000 }); break;
        case 'rent': toast(log.message, { icon: '💰', duration: 3000 }); break;
        case 'jail': toast(log.message, { icon: '🔒', duration: 3000 }); break;
        case 'bankruptcy': toast.error(log.message, { icon: '💸', duration: 5000 }); break;
        case 'card': break; // handled by CardReveal
        case 'trade': toast(log.message, { icon: '🤝', duration: 3000 }); break;
        case 'auction': toast(log.message, { icon: '🔨', duration: 3000 }); break;
      }
    });

    socket.on('game:error', (data) => { toast.error(data.message, { duration: 3000 }); });

    socket.on('game:trade-proposed', (proposal) => {
      const s = useGameStore.getState();
      s.setPendingTrade(proposal);
      if (proposal.toPlayerId === s.playerId) {
        s.setShowTradeModal(true);
        toast('📨 Trade proposal received!', { icon: '🤝', duration: 4000 });
      }
    });
    socket.on('game:trade-resolved', (data) => {
      const s = useGameStore.getState();
      s.setPendingTrade(null);
      s.setShowTradeModal(false);
      toast(data.accepted ? '✅ Trade completed!' : '❌ Trade rejected', { duration: 3000 });
    });

    socket.on('game:auction-update', (auction) => {
      const s = useGameStore.getState();
      s.setAuctionState(auction);
      s.setShowAuctionModal(true);
    });
    socket.on('game:auction-end', () => {
      const s = useGameStore.getState();
      s.setAuctionState(null);
      s.setShowAuctionModal(false);
    });

    socket.on('game:winner', (data) => { setWinner(data); });
    socket.on('player:disconnected', (data) => { toast(`${getPlayerName(data.playerId)} disconnected`, { icon: '⚠️' }); });
    socket.on('player:reconnected', (data) => { toast.success(`${getPlayerName(data.playerId)} reconnected!`); });
    socket.on('chat:message', (data) => { useGameStore.getState().addChatMessage(data); });

    return () => {
      ['room:state','game:state','game:rolled','game:log','game:error','game:trade-proposed',
       'game:trade-resolved','game:auction-update','game:auction-end','game:winner',
       'player:disconnected','player:reconnected','chat:message'].forEach(e => socket.off(e));
    };
  }, []);

  const handleStartGame = () => socket.emit('game:start');

  // --- Loading ---
  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-8 text-center animate-fade-in">
          <div className="text-5xl mb-4 animate-spin-slow">🎲</div>
          <p className="text-white/70 mb-4">Connecting to room...</p>
          <button onClick={() => navigate('/')} className="btn-secondary">Back to Home</button>
        </div>
      </div>
    );
  }

  // ====== LOBBY VIEW ======
  if (isLobby) {
    const isHost = room.hostId === store.playerId;
    const myPlayer = room.players.find(p => p.id === store.playerId);
    const takenColors = room.players.map(p => p.color);
    const ALL_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'] as const;
    const COLOR_NAMES: Record<string, string> = {
      '#EF4444': 'Red', '#3B82F6': 'Blue', '#10B981': 'Green', '#F59E0B': 'Gold',
      '#8B5CF6': 'Purple', '#EC4899': 'Pink', '#14B8A6': 'Teal', '#F97316': 'Orange',
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/8 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/8 rounded-full blur-3xl" />
        </div>
        <div className="card p-8 w-full max-w-lg animate-bounce-in relative z-10">
          <h2 className="font-display text-3xl font-bold text-center mb-2 bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">🎲 Game Lobby</h2>

          {/* Room code */}
          <div className="text-center mb-5">
            <p className="text-white/50 text-sm mb-2">Share this code with friends</p>
            <div className="inline-flex items-center gap-3 bg-white/5 px-8 py-4 rounded-2xl border border-amber-500/20 hover:border-amber-500/40 transition-colors cursor-pointer group"
              onClick={() => { navigator.clipboard.writeText(room.code); toast.success('Code copied!'); }}>
              <span className="font-mono text-4xl font-bold text-amber-400 tracking-[0.4em]">{room.code}</span>
              <span className="text-white/30 group-hover:text-white/60 transition-colors text-xl">📋</span>
            </div>
          </div>

          {/* ====== TOKEN COLOR PICKER ====== */}
          <div className="mb-5">
            <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">🎨 Choose Your Token Color</h3>
            <div className="grid grid-cols-8 gap-2">
              {ALL_COLORS.map(color => {
                const isMyColor = myPlayer?.color === color;
                const isTaken = takenColors.includes(color) && !isMyColor;
                return (
                  <button
                    key={color}
                    onClick={() => { if (!isTaken) socket.emit('room:select-color', { color: color as any }); }}
                    className={`aspect-square rounded-xl transition-all duration-200 relative group ${
                      isMyColor ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1e2536] scale-110' :
                      isTaken ? 'opacity-25 cursor-not-allowed' :
                      'hover:scale-110 cursor-pointer'
                    }`}
                    style={{ backgroundColor: color }}
                    title={`${COLOR_NAMES[color]}${isTaken ? ' (taken)' : ''}`}
                    disabled={isTaken}
                  >
                    {/* Glow effect on selected */}
                    {isMyColor && (
                      <div className="absolute inset-0 rounded-xl animate-pulse" style={{ boxShadow: `0 0 15px ${color}60` }} />
                    )}
                    {/* Checkmark on selected */}
                    {isMyColor && <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs drop-shadow">✓</span>}
                    {/* X on taken */}
                    {isTaken && <span className="absolute inset-0 flex items-center justify-center text-white/60 text-xs">✕</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Player list */}
          <div className="space-y-2 mb-5">
            <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Players ({room.players.length}/8)
            </h3>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {room.players.map((player, i) => (
                <div key={player.id} className="flex items-center gap-3 bg-white/5 px-4 py-3 rounded-xl border border-white/5 animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                  {/* Attractive token: gradient circle with inner ring and glow */}
                  <div className="relative w-8 h-8 flex-shrink-0">
                    <div className="w-full h-full rounded-full border-2 border-white/30"
                      style={{
                        background: `radial-gradient(circle at 35% 35%, ${player.color}cc, ${player.color})`,
                        boxShadow: `0 0 12px ${player.color}50, inset 0 -2px 4px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.2)`,
                      }} />
                    <div className="absolute inset-[3px] rounded-full border border-white/15" />
                  </div>
                  <span className="font-medium flex-1">{player.name}</span>
                  {player.id === room.hostId && <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full font-semibold">HOST</span>}
                  {player.id === store.playerId && player.id !== room.hostId && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">YOU</span>}
                  {!player.connected && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">OFFLINE</span>}
                </div>
              ))}
            </div>
          </div>

          {isHost ? (
            <button onClick={handleStartGame} disabled={room.players.length < 2} className="btn-primary w-full text-lg py-4">
              {room.players.length < 2 ? '⏳ Waiting for players...' : `🚀 Start Game (${room.players.length} players)`}
            </button>
          ) : (
            <div className="text-center text-white/50 py-4 bg-white/5 rounded-xl">
              <div className="inline-flex items-center gap-2"><div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" /> Waiting for host to start...</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ====== GAME VIEW — Board-centric layout ======
  return (
    <div className="h-screen flex flex-col overflow-hidden" id="game-view">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-2 bg-surface/90 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <span className="font-display text-sm font-bold text-amber-400">🎲 Monopoly India</span>
        <div className="flex gap-1">
          {(['players', 'chat'] as const).map(panel => (
            <button key={panel} onClick={() => setShowMobilePanel(showMobilePanel === panel ? null : panel)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${showMobilePanel === panel ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
              {panel === 'players' ? '👥' : '💬'}
            </button>
          ))}
        </div>
      </div>

      {/* Main game area */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel — Chat (desktop) */}
        <div className="hidden lg:flex w-64 xl:w-72 flex-col bg-surface/50 backdrop-blur-sm border-r border-white/5 flex-shrink-0">
          <ChatPanel />
        </div>

        {/* Center — Board (takes most space) */}
        <div className="flex-1 flex items-center justify-center p-2 lg:p-3 relative overflow-auto min-h-0 min-w-0">
          <Board />
          <FloatingMoney />
        </div>

        {/* Right Panel — Players + Actions (desktop) */}
        <div className="hidden lg:flex w-72 xl:w-80 flex-col bg-surface/50 backdrop-blur-sm border-l border-white/5 flex-shrink-0 overflow-y-auto">
          <PlayerPanel />
          <div className="border-t border-white/5">
            <ActionPanel />
          </div>
        </div>
      </div>

      {/* Mobile Bottom: Action Panel always visible */}
      <div className="lg:hidden border-t border-white/10 bg-surface/95 backdrop-blur-xl safe-bottom">
        <ActionPanel />
      </div>

      {/* Mobile Drawer */}
      {showMobilePanel && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setShowMobilePanel(null)} />
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 animate-slide-up">
            <div className="bg-surface/95 backdrop-blur-xl border-t border-white/10 rounded-t-2xl overflow-auto" style={{ maxHeight: '65vh' }}>
              <div className="flex justify-center pt-3 pb-2 sticky top-0 bg-surface/95 z-10">
                <div className="w-10 h-1 bg-white/20 rounded-full cursor-pointer hover:bg-white/40 transition-colors" onClick={() => setShowMobilePanel(null)} />
              </div>
              {showMobilePanel === 'players' && <PlayerPanel />}
              {showMobilePanel === 'chat' && <ChatPanel />}
            </div>
          </div>
        </>
      )}

      {/* Overlays */}
      {store.selectedTileIndex !== null && <PropertyCard tileIndex={store.selectedTileIndex} onClose={() => store.setSelectedTileIndex(null)} />}
      {store.showTradeModal && <TradeModal />}
      {store.showAuctionModal && store.auctionState && <AuctionModal />}
      {store.activeCard && <CardReveal />}
      {winner && <WinnerOverlay winner={winner} onClose={() => { setWinner(null); navigate('/'); }} />}
    </div>
  );
}
