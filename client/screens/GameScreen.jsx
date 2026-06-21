import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Client } from 'boardgame.io/client';
import { SocketIO } from 'boardgame.io/multiplayer';
import { ClaudeBot } from '../bot/ClaudeBot';
import GameTranscript from '../components/GameTranscript';
import { GAMES } from '../games/registry';

const SYMBOLS = { '0': 'X', '1': 'O' };
const SERVER = import.meta.env.DEV ? 'http://localhost:8000' : window.location.origin;

function makeClient(game, matchID, playerID, credentials) {
  return Client({
    game,
    matchID,
    playerID,
    credentials,
    multiplayer: SocketIO({ server: SERVER }),
    debug: false,
  });
}

export default function GameScreen() {
  const { matchID } = useParams();
  const { state: locationState } = useLocation();
  const navigate = useNavigate();

  const [config, setConfig] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [pendingReasoning, setPendingReasoning] = useState(null);
  const [loading, setLoading] = useState(true);

  // Display client (human's perspective or player 0 for CvC)
  const clientRef = useRef(null);
  // Claude's client(s) — separate socket.io connections
  const claudeClientRef = useRef(null);   // hvc: claude's client; cvc: player 0
  const claudeClient1Ref = useRef(null);  // cvc: player 1
  const botRef = useRef(null);
  const bot1Ref = useRef(null);
  const steppingRef = useRef(false);

  const onReasoningChunkRef = useRef(null);
  onReasoningChunkRef.current = (chunk) => setPendingReasoning((prev) => (prev ?? '') + chunk);

  const onReasoningRef = useRef(null);
  onReasoningRef.current = (text) => {
    setTranscript((prev) => [...prev, text]);
    setPendingReasoning(null);
  };

  const saveMoveRef = useRef(null);
  saveMoveRef.current = (player, moveType, moveArgs, reasoning) =>
    fetch(`/api/games/${matchID}/moves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player, moveType, moveArgs, reasoning: reasoning ?? null }),
    }).catch(console.error);

  const makeBot = (gameEntry, cfg, claudePlayer) => new ClaudeBot({
    enumerate: gameEntry.game.ai.enumerate,
    serializeState: gameEntry.serializeState,
    model: cfg.model,
    systemPrompt: cfg.systemPrompt,
    onReasoningChunk: (chunk) => onReasoningChunkRef.current(chunk),
    onReasoning: (text) => onReasoningRef.current(text),
    onMove: (type, args, reasoning) =>
      saveMoveRef.current(claudePlayer, type, args, reasoning),
  });

  const initClients = (cfg, savedTranscript = []) => {
    const gameEntry = GAMES[cfg.gameId];

    if (savedTranscript.length > 0) setTranscript(savedTranscript);

    if (cfg.mode === 'hvc') {
      const humanClient = makeClient(gameEntry.game, matchID, cfg.humanPlayer, cfg.humanCredentials);
      const claudeClient = makeClient(gameEntry.game, matchID, cfg.claudePlayer, cfg.claudeCredentials);
      clientRef.current = humanClient;
      claudeClientRef.current = claudeClient;
      botRef.current = makeBot(gameEntry, cfg, cfg.claudePlayer);
      humanClient.start();
      claudeClient.start();
      humanClient.subscribe((s) => { if (s) setGameState({ ...s }); });

    } else if (cfg.mode === 'hvh') {
      const humanClient = makeClient(gameEntry.game, matchID, cfg.myPlayer, cfg.myCredentials);
      clientRef.current = humanClient;
      humanClient.start();
      humanClient.subscribe((s) => { if (s) setGameState({ ...s }); });

    } else if (cfg.mode === 'cvc') {
      const client0 = makeClient(gameEntry.game, matchID, '0', cfg.credentials0);
      const client1 = makeClient(gameEntry.game, matchID, '1', cfg.credentials1);
      clientRef.current = client0;
      claudeClientRef.current = client0;
      claudeClient1Ref.current = client1;
      botRef.current = makeBot(gameEntry, { model: cfg.model0, systemPrompt: cfg.systemPrompt0 }, '0');
      bot1Ref.current = makeBot(gameEntry, { model: cfg.model1, systemPrompt: cfg.systemPrompt1 }, '1');
      client0.start();
      client1.start();
      client0.subscribe((s) => { if (s) setGameState({ ...s }); });
    }

    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      let cfg = null;

      // Resolve config: location.state is canonical for fresh game; DB is fallback for resume
      if (locationState?.mode) {
        cfg = locationState;
      } else {
        const res = await fetch(`/api/games/${matchID}`);
        if (!res.ok) { navigate('/'); return; }
        const data = await res.json();
        const g = data.game;
        if (g.mode === 'hvc') {
          cfg = {
            mode: 'hvc', gameId: g.game_id,
            humanPlayer: g.human_player, claudePlayer: g.claude_player,
            model: g.model, systemPrompt: g.system_prompt,
            humanCredentials: g.human_player === '0' ? g.player0_credentials : g.player1_credentials,
            claudeCredentials: g.claude_player === '0' ? g.player0_credentials : g.player1_credentials,
          };
        } else if (g.mode === 'hvh') {
          // Can't determine which player this browser is without session tracking;
          // redirect to lobby so they can re-identify
          navigate(`/lobby/${matchID}`);
          return;
        } else if (g.mode === 'cvc') {
          cfg = {
            mode: 'cvc', gameId: g.game_id,
            model0: g.model, systemPrompt0: g.system_prompt,
            model1: g.model, systemPrompt1: g.system_prompt,
            credentials0: g.player0_credentials,
            credentials1: g.player1_credentials,
          };
        }
        const savedTranscript = data.moves.filter((m) => m.reasoning).map((m) => m.reasoning);
        if (cancelled) return;
        setConfig(cfg);
        initClients(cfg, savedTranscript);
        return;
      }

      if (cancelled) return;
      setConfig(cfg);
      initClients(cfg);
    };

    initialize().catch(() => navigate('/'));

    return () => {
      cancelled = true;
      const toStop = new Set([clientRef.current, claudeClientRef.current, claudeClient1Ref.current].filter(Boolean));
      toStop.forEach(c => c.stop());
      clientRef.current = null;
      claudeClientRef.current = null;
      claudeClient1Ref.current = null;
      botRef.current = null;
      bot1Ref.current = null;
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
    if (ctx.gameover) return;
    if (config.mode === 'hvh') return;
    if (steppingRef.current) return;

    const currentPlayer = ctx.currentPlayer;

    let stepClient, stepBot;

    if (config.mode === 'hvc') {
      if (currentPlayer !== config.claudePlayer) return;
      stepClient = claudeClientRef.current;
      stepBot = botRef.current;
    } else if (config.mode === 'cvc') {
      stepClient = currentPlayer === '0' ? claudeClientRef.current : claudeClient1Ref.current;
      stepBot = currentPlayer === '0' ? botRef.current : bot1Ref.current;
    }

    if (!stepClient || !stepBot) return;

    steppingRef.current = true;
    (async () => {
      const state = stepClient.store.getState();
      const pid = state.ctx.currentPlayer;
      const { action } = await stepBot.play(state, pid);
      if (action) {
        const { type: moveName, args } = action.payload;
        stepClient.moves[moveName](...(args ?? []));
      }
    })().catch(console.error).finally(() => { steppingRef.current = false; });
  }, [gameState, config, loading]);

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Loading…</div>;
  if (!config || !gameState) return null;

  const gameEntry = GAMES[config.gameId];
  const { G, ctx } = gameState;
  const { Board } = gameEntry;

  const isMyTurn = () => {
    if (ctx.gameover) return false;
    if (config.mode === 'hvc') return ctx.currentPlayer === config.humanPlayer;
    if (config.mode === 'hvh') return ctx.currentPlayer === config.myPlayer;
    return false; // cvc: no human turn
  };

  // Wrap human moves to persist them (only for hvc and hvh)
  const moves = {};
  if (config.mode !== 'cvc' && clientRef.current?.moves) {
    for (const [name, fn] of Object.entries(clientRef.current.moves)) {
      moves[name] = (...args) => {
        const player = config.mode === 'hvc' ? config.humanPlayer : config.myPlayer;
        saveMoveRef.current(player, name, args, null);
        return fn(...args);
      };
    }
  }

  // Transcript header label
  const transcriptLabel = config.mode === 'cvc'
    ? 'Claude A vs Claude B'
    : `Claude (${SYMBOLS[config.claudePlayer ?? config.myPlayer === '0' ? '1' : '0']})`;

  return (
    <div style={{ display: 'flex', gap: '3rem', padding: '2rem', fontFamily: 'sans-serif', alignItems: 'flex-start' }}>
      <div>
        <Board G={G} ctx={ctx} moves={moves} isActive={isMyTurn()} waitingMessage={config.mode !== 'hvh' ? 'Claude is thinking…' : 'Waiting for opponent…'} />
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

      {config.mode !== 'hvh' && (
        <GameTranscript
          transcript={transcript}
          claudeSymbol={config.mode === 'cvc' ? 'A/B' : SYMBOLS[config.claudePlayer]}
          pendingReasoning={pendingReasoning}
        />
      )}
    </div>
  );
}
