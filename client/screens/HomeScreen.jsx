import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GAMES } from '../games/registry';

export default function HomeScreen() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: 560, margin: '4rem auto', padding: '0 1rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Play vs Claude</h1>
      <p style={{ color: '#888', marginBottom: '2.5rem', fontSize: '1rem' }}>Choose a game</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {Object.values(GAMES).map((g) => (
          <button
            key={g.id}
            onClick={() => navigate(`/setup/${g.id}`)}
            style={{
              padding: '1.5rem',
              textAlign: 'left',
              background: '#fff',
              border: '2px solid #e0e0e0',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#333')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e0e0e0')}
          >
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem', color: '#111' }}>
              {g.name}
            </div>
            <div style={{ color: '#777', fontSize: '0.875rem' }}>{g.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
