import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Client } from 'boardgame.io/client';
import { Step } from 'boardgame.io/ai';
import { ClaudeBot } from '../bot/ClaudeBot';
import GameTranscript from '../components/GameTranscript';
import { GAMES } from '../games/registry';

const SYMBOLS = { '0': 'X', '1': 'O' };

export default function GameScreen() {
  const { matchID } = useParams();
  const { state: config } = useLocation();
  const navigate = useNavigate();

  const [gameState, setGameState] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [pendingReasoning, setPendingReasoning] = useState(null);

  const clientRef = useRef(null);
  const botRef = useRef(null);
  const steppingRef = useRef(false);

  const onReasoningChunkRef = useRef(null);
  onReasoningChunkRef.current = (chunk) => setPendingReasoning((prev) => (prev ?? '') + chunk);

  const onReasoningRef = useRef(null);
  onReasoningRef.current = (text) => {
    setTranscript((prev) => [...prev, text]);
    setPendingReasoning(null);
  };

  useEffect(() => {
    if (!config) {
      navigate('/');
      return;
    }

    const gameEntry = GAMES[config.gameId];
    const client = Client({ game: gameEntry.game, playerID: config.humanPlayer, debug: false });
    client.start();
    clientRef.current = client;

    const bot = new ClaudeBot({
      enumerate: gameEntry.game.ai.enumerate,
      serializeState: gameEntry.serializeState,
      model: config.model,
      systemPrompt: config.systemPrompt,
      onReasoningChunk: (chunk) => onReasoningChunkRef.current(chunk),
      onReasoning: (text) => onReasoningRef.current(text),
    });
    botRef.current = bot;

    client.subscribe((state) => setGameState(state ? { ...state } : null));

    return () => {
      client.stop();
      clientRef.current = null;
      botRef.current = null;
      steppingRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!gameState || !config) return;
    const { ctx } = gameState;
    if (ctx.gameover || ctx.currentPlayer !== config.claudePlayer) return;
    if (steppingRef.current) return;

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
        const fresh = clientRef.current?.getState();
        if (fresh) setGameState({ ...fresh });
      });
  }, [gameState, config]);

  if (!config) return null;
  if (!gameState) return <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Loading…</div>;

  const gameEntry = GAMES[config.gameId];
  const { G, ctx } = gameState;
  const isClaudeTurn = ctx.currentPlayer === config.claudePlayer && !ctx.gameover;
  const moves = { clickCell: (id) => clientRef.current.moves.clickCell(id) };
  const { Board } = gameEntry;

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
        <Board G={G} ctx={ctx} moves={moves} isActive={!isClaudeTurn && !ctx.gameover} />
        {isClaudeTurn && (
          <p style={{ textAlign: 'center', color: '#888', marginTop: '0.5rem', fontSize: '0.875rem' }}>
            Claude is thinking…
          </p>
        )}
        {ctx.gameover && (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button
              onClick={() => navigate('/')}
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
