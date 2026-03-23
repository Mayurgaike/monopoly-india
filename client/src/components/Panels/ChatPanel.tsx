import { useState, useRef, useEffect } from 'react';
import { socket } from '../../socket/client';
import { useGameStore } from '../../store/gameStore';

export default function ChatPanel() {
  const chatMessages = useGameStore((s) => s.chatMessages);
  const logs = useGameStore((s) => s.logs);
  const [text, setText] = useState('');
  const [tab, setTab] = useState<'chat' | 'log'>('log');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, logs, tab]);

  const handleSend = () => {
    if (!text.trim()) return;
    socket.emit('chat:message', { text: text.trim() });
    setText('');
  };

  const logColors: Record<string, string> = {
    info: 'text-white/50',
    purchase: 'text-green-400',
    rent: 'text-amber-400',
    card: 'text-purple-400',
    jail: 'text-red-400',
    trade: 'text-blue-400',
    auction: 'text-cyan-400',
    bankruptcy: 'text-red-500 font-semibold',
    system: 'text-amber-300 font-medium',
  };

  const logIcons: Record<string, string> = {
    purchase: '🏠',
    rent: '💰',
    card: '🃏',
    jail: '🔒',
    trade: '🤝',
    auction: '🔨',
    bankruptcy: '💸',
    system: '⚡',
    info: '•',
  };

  return (
    <div className="flex flex-col h-full" id="chat-panel">
      {/* Tabs */}
      <div className="flex border-b border-white/5">
        {(['log', 'chat'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 relative
              ${tab === t ? 'text-amber-400' : 'text-white/30 hover:text-white/50'}`}
          >
            {t === 'log' ? '📜 Game Log' : '💬 Chat'}
            {tab === t && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-amber-400 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0">
        {tab === 'log' && logs.map((log) => (
          <div key={log.id} className={`text-[11px] leading-relaxed ${logColors[log.type] || 'text-white/50'} animate-fade-in`}>
            <span className="text-white/15 mr-1.5 tabular-nums text-[10px]">
              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="mr-1">{logIcons[log.type] || '•'}</span>
            {log.message}
          </div>
        ))}

        {tab === 'chat' && chatMessages.map((msg, i) => (
          <div key={i} className="text-[11px] leading-relaxed animate-fade-in">
            <span className="text-amber-400 font-semibold">{msg.playerName}</span>
            <span className="text-white/15 mx-1">·</span>
            <span className="text-white/60">{msg.text}</span>
          </div>
        ))}

        {tab === 'log' && logs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-white/20">
            <span className="text-2xl mb-2">📜</span>
            <p className="text-xs">Game events will appear here</p>
          </div>
        )}
        {tab === 'chat' && chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-white/20">
            <span className="text-2xl mb-2">💬</span>
            <p className="text-xs">Start a conversation</p>
          </div>
        )}
      </div>

      {/* Chat input */}
      {tab === 'chat' && (
        <div className="p-2 border-t border-white/5 safe-bottom">
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="input-field text-xs py-2.5"
              id="chat-input"
              maxLength={200}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim()}
              className="btn-primary px-4 py-2 text-xs"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
