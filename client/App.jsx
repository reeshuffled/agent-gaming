import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Client } from 'boardgame.io/client';
import { Step } from 'boardgame.io/ai';
import { TicTacToe, serializeState } from './games/tictactoe/Game.mjs';
import { TicTacToeBoard } from './games/tictactoe/Board';
import { ClaudeBot } from './bot/ClaudeBot';
import PreGameSetup from './components/PreGameSetup';
import GameTranscript from './components/GameTranscript';

const SYMBOLS = { '0': 'X', '1': 'O' };

export default function App() {
  const [phase, setPhase] = useState('setup');
  const [config, setConfig] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [pendingReasoning, setPendingReasoning] = useState(null);

  const clientRef = useRef(null);
  const botRef = useRef(null);
  const steppingRef = useRef(false);

  const onReasoningChunkRef = useRef(null);
  onReasoningChunkRef.current = (chunk) => setPendingReasoning((prev) => (prev ?? '') + chunk);

  // Stable ref so ClaudeBot always calls the latest setter
  const onReasoningRef = useRef(null);
  onReasoningRef.current = (text) => {
    setTranscript((prev) => [...prev, text]);
    setPendingReasoning(null);
  };

  const startGame = useCallback((cfg) => {
    setConfig(cfg);
    setTranscript([]);
    setPendingReasoning(null);

    const client = Client({ game: TicTacToe, playerID: cfg.humanPlayer });
    client.start();
    clientRef.current = client;

    const bot = new ClaudeBot({
      enumerate: TicTacToe.ai.enumerate,
      serializeState,
      model: cfg.model,
      systemPrompt: cfg.systemPrompt,
      onReasoningChunk: (chunk) => onReasoningChunkRef.current(chunk),
      onReasoning: (text) => onReasoningRef.current(text),
    });
    botRef.current = bot;

    client.subscribe((state) => setGameState(state ? { ...state } : null));
    setPhase('playing');
  }, []);

  useEffect(() => {
    if (phase !== 'playing' || !gameState || !config) return;
    const { ctx } = gameState;
    if (ctx.gameover || ctx.currentPlayer !== config.claudePlayer) return;
    if (steppingRef.current) return;

    // Authoritative check: client may have gameover that React hasn't seen yet
    const actualState = clientRef.current?.getState();
    if (!actualState || actualState.ctx.gameover) {
      if (actualState) setGameState({ ...actualState });
      return;
    }

    steppingRef.current = true;
    Step(clientRef.current, botRef.current)
      .catch(console.error)
      .finally(() => {
        steppingRef.current = false;
        // Sync React state to catch any missed subscriber updates (e.g. gameover)
        const fresh = clientRef.current?.getState();
        if (fresh) setGameState({ ...fresh });
      });
  }, [gameState, config, phase]);

  const resetGame = () => {
    if (clientRef.current) {
      clientRef.current.stop();
      clientRef.current = null;
    }
    botRef.current = null;
    steppingRef.current = false;
    setGameState(null);
    setPhase('setup');
  };

  if (phase === 'setup') {
    return <PreGameSetup onStart={startGame} />;
  }

  if (!gameState) {
    return <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Loading…</div>;
  }

  const { G, ctx } = gameState;
  const client = clientRef.current;
  const isClaudeTurn = ctx.currentPlayer === config.claudePlayer && !ctx.gameover;

  const moves = { clickCell: (id) => client.moves.clickCell(id) };

  return (
    <div
      style={{
        display: 'flex',
        gap: '3rem',
        padding: '2rem',
        fontFamily: 'sans-serif',
        alignItems: 'flex-start',
      }}
    >
      <div>
        <TicTacToeBoard
          G={G}
          ctx={ctx}
          moves={moves}
          isActive={!isClaudeTurn && !ctx.gameover}
        />
        {isClaudeTurn && (
          <p style={{ textAlign: 'center', color: '#888', marginTop: '0.5rem', fontSize: '0.875rem' }}>
            Claude is thinking…
          </p>
        )}
        {ctx.gameover && (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button
              onClick={resetGame}
              style={{ padding: '0.5rem 1.5rem', cursor: 'pointer', fontSize: '0.95rem' }}
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      <GameTranscript
        transcript={transcript}
        claudeSymbol={SYMBOLS[config.claudePlayer]}
        pendingReasoning={pendingReasoning}
      />
    </div>
  );
}
