import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PERSONA_PRESETS } from '../bot/ClaudeBot';
import { GAMES } from '../games/registry';

const MODELS = [
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5 — fastest' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6 — recommended' },
  { id: 'claude-opus-4-8', label: 'Opus 4.8 — best reasoning' },
];

const MODES = [
  { id: 'hvc', label: 'Human vs Claude' },
  { id: 'hvh', label: 'Human vs Human' },
  { id: 'cvc', label: 'Claude vs Claude' },
];

const sectionStyle = { marginBottom: '1.5rem' };
const h3Style = { margin: '0 0 0.5rem', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#555' };
const selectStyle = { width: '100%', padding: '0.4rem', marginBottom: '0.5rem', fontSize: '0.95rem' };
const descStyle = { margin: 0, fontSize: '0.8rem', color: '#777', lineHeight: 1.5 };

function ClaudeConfig({ label, personaKey, onPersonaKey, customPrompt, onCustomPrompt, model, onModel }) {
  return (
    <>
      <section style={sectionStyle}>
        <h3 style={h3Style}>{label} persona</h3>
        <select value={personaKey} onChange={(e) => onPersonaKey(e.target.value)} style={selectStyle}>
          {Object.entries(PERSONA_PRESETS).map(([key, { label: l }]) => (
            <option key={key} value={key}>{l}</option>
          ))}
          <option value="custom">Custom</option>
        </select>
        {personaKey !== 'custom' ? (
          <p style={descStyle}>{PERSONA_PRESETS[personaKey].prompt}</p>
        ) : (
          <textarea
            value={customPrompt}
            onChange={(e) => onCustomPrompt(e.target.value)}
            placeholder="Enter a custom system prompt…"
            style={{ width: '100%', height: 80, boxSizing: 'border-box', fontSize: '0.875rem', padding: '0.4rem' }}
          />
        )}
      </section>
      <section style={sectionStyle}>
        <h3 style={h3Style}>{label} model</h3>
        <select value={model} onChange={(e) => onModel(e.target.value)} style={selectStyle}>
          {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </section>
    </>
  );
}

export default function PreGameSetup() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const game = GAMES[gameId];

  const [mode, setMode] = useState('hvc');
  const [humanPlayer, setHumanPlayer] = useState('0');

  // H vs C / C vs C — player 1 Claude config
  const [personaKey1, setPersonaKey1] = useState('strategist');
  const [customPrompt1, setCustomPrompt1] = useState('');
  const [model1, setModel1] = useState('claude-sonnet-4-6');

  // C vs C — player 0 Claude config
  const [personaKey0, setPersonaKey0] = useState('strategist');
  const [customPrompt0, setCustomPrompt0] = useState('');
  const [model0, setModel0] = useState('claude-sonnet-4-6');

  const [submitting, setSubmitting] = useState(false);

  if (!game) { navigate('/'); return null; }

  const claudePlayer = humanPlayer === '0' ? '1' : '0';

  const getSystemPrompt = (key, custom) =>
    key === 'custom' ? custom : PERSONA_PRESETS[key].prompt;

  const canStart = () => {
    if (mode === 'hvc') return personaKey1 !== 'custom' || customPrompt1.trim().length > 0;
    if (mode === 'hvh') return true;
    if (mode === 'cvc') {
      const ok0 = personaKey0 !== 'custom' || customPrompt0.trim().length > 0;
      const ok1 = personaKey1 !== 'custom' || customPrompt1.trim().length > 0;
      return ok0 && ok1;
    }
    return false;
  };

  const joinPlayer = async (matchID, playerID, playerName) => {
    const res = await fetch(`/games/${gameId}/${matchID}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerID, playerName }),
    });
    if (!res.ok) throw new Error(`Join failed: ${await res.text()}`);
    const { playerCredentials } = await res.json();
    return playerCredentials;
  };

  const handleStart = async () => {
    if (!canStart() || submitting) return;
    setSubmitting(true);
    try {
      // Create bgio match
      const createRes = await fetch(`/games/${gameId}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numPlayers: 2 }),
      });
      if (!createRes.ok) throw new Error('Failed to create match');
      const { matchID } = await createRes.json();

      if (mode === 'hvc') {
        const humanCreds = await joinPlayer(matchID, humanPlayer, 'You');
        const claudeCreds = await joinPlayer(matchID, claudePlayer, 'Claude');
        const systemPrompt = getSystemPrompt(personaKey1, customPrompt1);
        await fetch('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: matchID, gameId, mode: 'hvc',
            humanPlayer, claudePlayer,
            model: model1, systemPrompt,
            player0Credentials: humanPlayer === '0' ? humanCreds : claudeCreds,
            player1Credentials: humanPlayer === '1' ? humanCreds : claudeCreds,
          }),
        });
        navigate(`/game/${matchID}`, {
          state: {
            gameId, mode: 'hvc',
            humanPlayer, claudePlayer,
            model: model1, systemPrompt,
            humanCredentials: humanCreds,
            claudeCredentials: claudeCreds,
          },
        });

      } else if (mode === 'hvh') {
        const myCreds = await joinPlayer(matchID, '0', 'Player 1');
        await fetch('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: matchID, gameId, mode: 'hvh',
            humanPlayer: '0', claudePlayer: null,
            player0Credentials: myCreds,
          }),
        });
        navigate(`/lobby/${matchID}`, {
          state: { gameId, mode: 'hvh', myPlayer: '0', myCredentials: myCreds },
        });

      } else if (mode === 'cvc') {
        const creds0 = await joinPlayer(matchID, '0', 'Claude A');
        const creds1 = await joinPlayer(matchID, '1', 'Claude B');
        const systemPrompt0 = getSystemPrompt(personaKey0, customPrompt0);
        const systemPrompt1 = getSystemPrompt(personaKey1, customPrompt1);
        await fetch('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: matchID, gameId, mode: 'cvc',
            humanPlayer: null, claudePlayer: null,
            model: model1, systemPrompt: systemPrompt1,
            player0Credentials: creds0, player1Credentials: creds1,
          }),
        });
        navigate(`/game/${matchID}`, {
          state: {
            gameId, mode: 'cvc',
            claudePlayer0: '0', claudePlayer1: '1',
            model0: model0, systemPrompt0,
            model1: model1, systemPrompt1,
            credentials0: creds0, credentials1: creds1,
          },
        });
      }
    } catch (err) {
      console.error(err);
      alert(`Setup failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '4rem auto', fontFamily: 'sans-serif', padding: '0 1rem' }}>
      <button
        onClick={() => navigate('/')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#777', padding: '0 0 1.5rem', fontSize: '0.875rem' }}
      >
        ← Back
      </button>

      <h1 style={{ marginBottom: '2rem' }}>{game.name}</h1>

      <section style={sectionStyle}>
        <h3 style={h3Style}>Game mode</h3>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {MODES.map((m) => (
            <label key={m.id} style={{ cursor: 'pointer', flex: 1 }}>
              <input
                type="radio"
                value={m.id}
                checked={mode === m.id}
                onChange={() => setMode(m.id)}
                style={{ marginRight: '0.3rem' }}
              />
              {m.label}
            </label>
          ))}
        </div>
      </section>

      {mode === 'hvc' && (
        <>
          <section style={sectionStyle}>
            <h3 style={h3Style}>You play as</h3>
            <label style={{ marginRight: '2rem', cursor: 'pointer' }}>
              <input type="radio" value="0" checked={humanPlayer === '0'} onChange={(e) => setHumanPlayer(e.target.value)} /> X — goes first
            </label>
            <label style={{ cursor: 'pointer' }}>
              <input type="radio" value="1" checked={humanPlayer === '1'} onChange={(e) => setHumanPlayer(e.target.value)} /> O — goes second
            </label>
          </section>
          <ClaudeConfig
            label="Claude's"
            personaKey={personaKey1} onPersonaKey={setPersonaKey1}
            customPrompt={customPrompt1} onCustomPrompt={setCustomPrompt1}
            model={model1} onModel={setModel1}
          />
        </>
      )}

      {mode === 'hvh' && (
        <p style={{ color: '#555', fontSize: '0.9rem' }}>
          You'll be Player 1 (X). A lobby link will be generated for Player 2.
        </p>
      )}

      {mode === 'cvc' && (
        <>
          <ClaudeConfig
            label="Claude A (X)"
            personaKey={personaKey0} onPersonaKey={setPersonaKey0}
            customPrompt={customPrompt0} onCustomPrompt={setCustomPrompt0}
            model={model0} onModel={setModel0}
          />
          <ClaudeConfig
            label="Claude B (O)"
            personaKey={personaKey1} onPersonaKey={setPersonaKey1}
            customPrompt={customPrompt1} onCustomPrompt={setCustomPrompt1}
            model={model1} onModel={setModel1}
          />
        </>
      )}

      <button
        onClick={handleStart}
        disabled={!canStart() || submitting}
        style={{
          width: '100%',
          padding: '0.75rem',
          fontSize: '1rem',
          cursor: canStart() && !submitting ? 'pointer' : 'not-allowed',
          background: canStart() && !submitting ? '#333' : '#999',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          marginTop: '0.5rem',
        }}
      >
        {submitting ? 'Creating…' : mode === 'hvc' ? `Start Game vs Claude (${['X', 'O'][claudePlayer]})`
          : mode === 'hvh' ? 'Create Lobby'
          : 'Start Claude vs Claude'}
      </button>
    </div>
  );
}
