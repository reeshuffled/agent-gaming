import React, { useEffect, useRef } from 'react';

export default function GameTranscript({ transcript, claudeSymbol }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  return (
    <div style={{ width: 280, fontFamily: 'sans-serif' }}>
      <h2 style={{ margin: '0 0 1rem', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#555' }}>
        Claude's Reasoning ({claudeSymbol})
      </h2>

      {transcript.length === 0 ? (
        <p style={{ color: '#aaa', fontSize: '0.875rem' }}>
          {claudeSymbol === 'X' ? 'Claude goes first — thinking…' : 'Make your move to see Claude think.'}
        </p>
      ) : (
        <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {transcript.map((text, i) => (
            <div
              key={i}
              style={{
                marginBottom: '0.75rem',
                padding: '0.65rem 0.75rem',
                background: '#f5f5f5',
                borderRadius: 6,
                borderLeft: '3px solid #ccc',
              }}
            >
              <div style={{ fontSize: '0.7rem', color: '#999', marginBottom: '0.25rem', fontWeight: 600 }}>
                MOVE {i + 1}
              </div>
              <div style={{ fontSize: '0.875rem', lineHeight: 1.55, color: '#333' }}>{text}</div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
