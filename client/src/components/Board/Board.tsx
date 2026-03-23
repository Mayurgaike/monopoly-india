import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import Tile from './Tile';
import PlayerToken from './PlayerToken';
import Dice from '../Dice/Dice';
import { socket } from '../../socket/client';

function getTileGrid(index: number): { row: number; col: number } {
  if (index >= 0 && index <= 10) return { row: 11, col: 11 - index };
  if (index >= 11 && index <= 19) return { row: 10 - (index - 11), col: 1 };
  if (index >= 20 && index <= 30) return { row: 1, col: 1 + (index - 20) };
  return { row: 2 + (index - 31), col: 11 };
}

const TOKEN_OFFSETS = [
  { x: 22, y: 28 }, { x: 58, y: 28 }, { x: 22, y: 62 }, { x: 58, y: 62 },
  { x: 15, y: 45 }, { x: 65, y: 45 }, { x: 40, y: 18 }, { x: 40, y: 68 },
];

/**
 * Compute the tile-by-tile path from `from` to `to` on a 40-tile board.
 * E.g. from=38, to=3 → [39, 0, 1, 2, 3]
 */
function computePath(from: number, to: number): number[] {
  if (from === to) return [to];
  const path: number[] = [];
  let pos = from;
  // Walk forward up to 40 steps
  for (let i = 0; i < 40; i++) {
    pos = (pos + 1) % 40;
    path.push(pos);
    if (pos === to) break;
  }
  return path;
}

export default function Board() {
  const gameState = useGameStore((s) => s.gameState);
  const previousPositions = useGameStore((s) => s.previousPositions);
  const diceResult = useGameStore((s) => s.diceResult);
  const isRolling = useGameStore((s) => s.isRolling);
  const isMyTurn = useGameStore((s) => s.isMyTurn());

  // Track animated positions for step-by-step movement
  const [animatedPositions, setAnimatedPositions] = useState<Record<string, number>>({});
  const animatingRef = useRef<Set<string>>(new Set());

  if (!gameState) return null;

  const { board, players, currentPlayerIndex, turnState } = gameState;
  const currentPlayerId = players[currentPlayerIndex]?.id;
  const diceValues: [number, number] = diceResult?.values || [0, 0];
  const showDice = isRolling || (diceResult && diceValues[0] > 0);
  const canRoll = isMyTurn && !turnState.hasRolled && turnState.phase === 'ROLL';

  // Pending moves: stored while dice is rolling, flushed when rolling stops
  const pendingMovesRef = useRef<{ playerId: string; from: number; to: number }[]>([]);
  const prevRollingRef = useRef(false);

  // Detect position changes and queue them
  useEffect(() => {
    players.forEach(player => {
      const prevPos = previousPositions[player.id];
      const newPos = player.position;
      if (prevPos === undefined || prevPos === newPos || animatingRef.current.has(player.id)) return;

      if (isRolling) {
        // Queue the move — we'll start it when rolling stops
        const existing = pendingMovesRef.current.find(m => m.playerId === player.id);
        if (existing) {
          existing.to = newPos; // update target
        } else {
          pendingMovesRef.current.push({ playerId: player.id, from: prevPos, to: newPos });
        }
      } else {
        // Not rolling — animate immediately
        startStepAnimation(player.id, prevPos, newPos);
      }
    });
  }, [gameState, previousPositions]);

  // When rolling stops, flush pending moves
  useEffect(() => {
    if (prevRollingRef.current && !isRolling) {
      // Dice just stopped — start all pending moves
      const moves = [...pendingMovesRef.current];
      pendingMovesRef.current = [];
      moves.forEach(m => {
        if (!animatingRef.current.has(m.playerId)) {
          startStepAnimation(m.playerId, m.from, m.to);
        }
      });
    }
    prevRollingRef.current = isRolling;
  }, [isRolling]);

  function startStepAnimation(playerId: string, from: number, to: number) {
    animatingRef.current.add(playerId);
    const path = computePath(from, to);
    let step = 0;
    const interval = setInterval(() => {
      if (step < path.length) {
        setAnimatedPositions(prev => ({ ...prev, [playerId]: path[step] }));
        step++;
      } else {
        clearInterval(interval);
        animatingRef.current.delete(playerId);
        setAnimatedPositions(prev => {
          const next = { ...prev };
          delete next[playerId];
          return next;
        });
      }
    }, 180);
  }

  // Get the display position for a player (animated or actual)
  const getDisplayPosition = (playerId: string, actualPosition: number): number => {
    return animatedPositions[playerId] !== undefined ? animatedPositions[playerId] : actualPosition;
  };

  return (
    <div className="relative select-none" id="game-board">
      <div
        className="grid gap-[1px] rounded-xl overflow-hidden board-glow"
        style={{
          gridTemplateColumns: 'minmax(60px, 80px) repeat(9, minmax(40px, 58px)) minmax(60px, 80px)',
          gridTemplateRows: 'minmax(60px, 80px) repeat(9, minmax(40px, 58px)) minmax(60px, 80px)',
          width: 'min(92vw, 88vh, 780px)',
          height: 'min(92vw, 88vh, 780px)',
          background: 'linear-gradient(135deg, #92713a 0%, #c9a84c 50%, #92713a 100%)',
        }}
      >
        {board.map((tile, i) => {
          const { row, col } = getTileGrid(i);
          const side = i >= 1 && i <= 9 ? 'bottom'
            : i >= 11 && i <= 19 ? 'left'
            : i >= 21 && i <= 29 ? 'top'
            : i >= 31 && i <= 39 ? 'right'
            : 'corner';

          // Use animated position for display
          const playersOnTile = players.filter(p => {
            if (p.bankrupt) return false;
            const displayPos = getDisplayPosition(p.id, p.position);
            return displayPos === i;
          });

          return (
            <div key={i} style={{ gridRow: row, gridColumn: col }} className="relative">
              <Tile tile={tile} side={side} />
              {playersOnTile.map((player, pi) => {
                const offset = TOKEN_OFFSETS[pi % 8];
                const isCurrent = player.id === currentPlayerId;
                return (
                  <motion.div
                    key={player.id}
                    className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                    initial={false}
                    animate={{
                      left: `${offset.x}%`,
                      top: `${offset.y}%`,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 30,
                      mass: 0.8,
                    }}
                  >
                    <PlayerToken
                      color={player.color}
                      name={player.name}
                      isCurrent={isCurrent}
                    />
                  </motion.div>
                );
              })}
            </div>
          );
        })}

        {/* ===== CENTER AREA ===== */}
        <div style={{ gridRow: '2 / 11', gridColumn: '2 / 11' }} className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/80 via-[#1a4a2a] to-emerald-900/60" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.05),transparent_70%)]" />

          {/* Decorative borders */}
          <div className="absolute inset-6 border border-amber-600/15 rotate-45 rounded-sm" />
          <div className="absolute inset-10 border border-amber-600/10 rotate-45 rounded-sm" />

          {/* Center content */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center gap-2">
            {/* Show dice when we have a result OR are rolling */}
            {showDice ? (
              <motion.div
                key="dice"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-3"
              >
                <Dice values={diceValues} rolling={isRolling} />
              </motion.div>
            ) : (
              <motion.div
                key="title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center"
              >
                <h2 className="font-display text-2xl md:text-4xl font-extrabold text-amber-400/90 tracking-wider drop-shadow-lg">
                  MONOPOLY
                </h2>
                <p className="font-display text-sm md:text-xl text-amber-500/60 font-bold tracking-[0.3em] mt-1">INDIA</p>
                <div className="mt-2 text-2xl md:text-3xl">🇮🇳</div>
              </motion.div>
            )}

            {/* Roll button + End Turn in board center */}
            <div className="flex gap-2 mt-3">
              {canRoll && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="btn-primary px-8 py-3 text-base font-bold"
                  onClick={() => socket.emit('game:roll')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  🎲 Roll Dice
                </motion.button>
              )}
              {isMyTurn && turnState.hasRolled && !turnState.pendingAction && turnState.phase !== 'ROLL' && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="btn-primary px-6 py-3 text-base font-bold"
                  onClick={() => socket.emit('game:end-turn')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  ✅ End Turn
                </motion.button>
              )}
            </div>

            {/* Decorative line */}
            <div className="flex items-center gap-2 mt-2">
              <div className="w-8 md:w-12 h-px bg-gradient-to-r from-transparent to-amber-500/30" />
              <div className="w-1.5 h-1.5 bg-amber-500/30 rounded-full" />
              <div className="w-8 md:w-12 h-px bg-gradient-to-l from-transparent to-amber-500/30" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
