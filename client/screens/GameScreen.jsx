import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Client } from 'boardgame.io/client';
import { Step } from 'boardgame.io/ai';
import { CreateGameReducer } from 'boardgame.io/internal';
import { ClaudeBot } from '../bot/ClaudeBot';
import GameTranscript from '../components/GameTranscript';
import { GAMES } from '../games/registry';

const SYMBOLS = { '0': 'X', '1': 'O' };

export default function GameScreen() {
  const { matchID } = useParams();
  const { state: locationConfig } = useLocation();
  const navigate = useNavigate();

  const [config, setConfig] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [pendingReasoning, setPendingReasoning] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // Stable ref so save logic always has the current matchID in scope
  const saveMoveRef = useRef(null);
  saveMoveRef.current = (player, moveType, moveArgs, reasoning) =>
    fetch(`/api/games/${matchID}/moves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player, moveType, moveArgs, reasoning: reasoning ?? null }),
    }).catch(console.error);

  const initClient = (cfg, movesToReplay = [], savedTranscript = []) => {
    const gameEntry = GAMES[cfg.gameId];
    const client = Client({ game: gameEntry.game, playerID: cfg.humanPlayer, debug: false });
    client.start();
    clientRef.current = client;

    const bot = new ClaudeBot({
      enumerate: gameEntry.game.ai.enumerate,
      serializeState: gameEntry.serializeState,
      model: cfg.model,
      systemPrompt: cfg.systemPrompt,
      onReasoningChunk: (chunk) => onReasoningChunkRef.current(chunk),
      onReasoning: (text) => onReasoningRef.current(text),
      onMove: (type, args, reasoning) =>
        saveMoveRef.current(cfg.claudePlayer, type, args, reasoning),
    });
    botRef.current = bot;

    if (savedTranscript.length > 0) setTranscript(savedTranscript);

    // Compute final state via game reducer (bypasses transport/master/playerID checks)
    if (movesToReplay.length > 0) {
      const reducer = CreateGameReducer({ game: gameEntry.game });
      let state = client.getState();
      for (const move of movesToReplay) {
        const args = JSON.parse(move.move_args);
        state = reducer(state, {
          type: 'MAKE_MOVE',
          payload: { type: move.move_type, args, playerID: move.player },
        });
      }
      // UPDATE action: reducer returns action.state directly, master ignores (no payload)
      client.store.dispatch({ type: 'UPDATE', state, deltalog: [] });
    }

    client.subscribe((state) => setGameState(state ? { ...state } : null));
    const current = client.getState();
    setGameState(current ? { ...current } : null);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      // DB is the source of truth. Always check it first.
      const res = await fetch(`/api/games/${matchID}`);

      if (!res.ok) {
        // Game not in DB yet — must be a fresh start with locationConfig
        if (!locationConfig) { navigate('/'); return; }
        await fetch('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: matchID,
            gameId: locationConfig.gameId,
            humanPlayer: locationConfig.humanPlayer,
            claudePlayer: locationConfig.claudePlayer,
            model: locationConfig.model,
            systemPrompt: locationConfig.systemPrompt,
          }),
        });
        if (cancelled) return;
        setConfig(locationConfig);
        initClient(locationConfig);
        return;
      }

      const data = await res.json();
      if (cancelled) return;

      const cfg = {
        gameId: data.game.game_id,
        humanPlayer: data.game.human_player,
        claudePlayer: data.game.claude_player,
        model: data.game.model,
        systemPrompt: data.game.system_prompt,
      };
      setConfig(cfg);

      if (data.moves.length > 0) {
        // Resume: replay saved moves
        const savedTranscript = data.moves
          .filter((m) => m.reasoning)
          .map((m) => m.reasoning);
        initClient(cfg, data.moves, savedTranscript);
      } else {
        // Fresh game (just created, no moves yet)
        initClient(cfg);
      }
    };

    initialize().catch(() => navigate('/'));

    return () => {
      cancelled = true;
      clientRef.current?.stop();
      clientRef.current = null;
      botRef.current = null;
      steppingRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Mark game completed in DB
  useEffect(() => {
    if (!gameState?.ctx?.gameover) return;
    fetch(`/api/games/${matchID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    }).catch(console.error);
  }, [gameState?.ctx?.gameover, matchID]);

  // Bot stepping
  useEffect(() => {
    if (loading || !gameState || !config) return;
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
  }, [gameState, config, loading]);

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Loading…</div>;
  if (!config || !gameState) return null;

  const gameEntry = GAMES[config.gameId];
  const { G, ctx } = gameState;
  const isClaudeTurn = ctx.currentPlayer === config.claudePlayer && !ctx.gameover;
  const { Board } = gameEntry;

  // Wrap human moves to persist them
  const moves = {};
  for (const [name, fn] of Object.entries(clientRef.current.moves)) {
    moves[name] = (...args) => {
      saveMoveRef.current(config.humanPlayer, name, args, null);
      return fn(...args);
    };
  }

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
