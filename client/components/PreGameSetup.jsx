import React, { useState } from 'react';
import { PERSONA_PRESETS } from '../bot/ClaudeBot';

const MODELS = [
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5 — fastest' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6 — recommended' },
  { id: 'claude-opus-4-8', label: 'Opus 4.8 — best reasoning' },
];

const sectionStyle = { marginBottom: '1.5rem' };
const h3Style = { margin: '0 0 0.5rem', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#555' };
const selectStyle = { width: '100%', padding: '0.4rem', marginBottom: '0.5rem', fontSize: '0.95rem' };
const descStyle = { margin: 0, fontSize: '0.8rem', color: '#777', lineHeight: 1.5 };

export default function PreGameSetup({ onStart }) {
  const [humanPlayer, setHumanPlayer] = useState('0');
  const [personaKey, setPersonaKey] = useState('strategist');
  const [customPrompt, setCustomPrompt] = useState('');
  const [model, setModel] = useState('claude-sonnet-4-6');

  const claudePlayer = humanPlayer === '0' ? '1' : '0';

  const handleStart = () => {
    const systemPrompt =
      personaKey === 'custom' ? customPrompt : PERSONA_PRESETS[personaKey].prompt;
    onStart({ humanPlayer, claudePlayer, model, systemPrompt });
  };

  const canStart = personaKey !== 'custom' || customPrompt.trim().length > 0;

  return (
    <div style={{ maxWidth: 420, margin: '4rem auto', fontFamily: 'sans-serif', padding: '0 1rem' }}>
      <h1 style={{ marginBottom: '2rem' }}>Tic-Tac-Toe vs Claude</h1>

      <section style={sectionStyle}>
        <h3 style={h3Style}>You play as</h3>
        <label style={{ marginRight: '2rem', cursor: 'pointer' }}>
          <input
            type="radio"
            value="0"
            checked={humanPlayer === '0'}
            onChange={(e) => setHumanPlayer(e.target.value)}
          />{' '}
          X — goes first
        </label>
        <label style={{ cursor: 'pointer' }}>
          <input
            type="radio"
            value="1"
            checked={humanPlayer === '1'}
            onChange={(e) => setHumanPlayer(e.target.value)}
          />{' '}
          O — goes second
        </label>
      </section>

      <section style={sectionStyle}>
        <h3 style={h3Style}>Claude's persona</h3>
        <select
          value={personaKey}
          onChange={(e) => setPersonaKey(e.target.value)}
          style={selectStyle}
        >
          {Object.entries(PERSONA_PRESETS).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
          <option value="custom">Custom</option>
        </select>
        {personaKey !== 'custom' ? (
          <p style={descStyle}>{PERSONA_PRESETS[personaKey].prompt}</p>
        ) : (
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Enter a custom system prompt for Claude…"
            style={{ width: '100%', height: 80, boxSizing: 'border-box', fontSize: '0.875rem', padding: '0.4rem' }}
          />
        )}
      </section>

      <section style={sectionStyle}>
        <h3 style={h3Style}>Model</h3>
        <select value={model} onChange={(e) => setModel(e.target.value)} style={selectStyle}>
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </section>

      <button
        onClick={handleStart}
        disabled={!canStart}
        style={{
          width: '100%',
          padding: '0.75rem',
          fontSize: '1rem',
          cursor: canStart ? 'pointer' : 'not-allowed',
          background: canStart ? '#333' : '#999',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
        }}
      >
        Start Game vs Claude ({['X', 'O'][claudePlayer]})
      </button>
    </div>
  );
}
