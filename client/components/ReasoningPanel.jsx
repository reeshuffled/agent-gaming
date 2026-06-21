import React from 'react';

function ReasoningCard({ moveNum, text, isPending }) {
  return (
    <div style={{
      padding: '0.6rem 0.75rem',
      background: isPending ? '#f0f4ff' : '#f5f5f5',
      borderRadius: 6,
      borderLeft: `3px solid ${isPending ? '#7ba4f0' : '#ddd'}`,
      flexShrink: 0,
    }}>
      <div style={{ fontSize: '0.65rem', color: isPending ? '#7ba4f0' : '#aaa', fontWeight: 700, marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {isPending ? `Move ${moveNum} — thinking…` : `Move ${moveNum}`}
      </div>
      <div style={{ fontSize: '0.85rem', lineHeight: 1.55, color: '#333', whiteSpace: 'pre-wrap' }}>{text}</div>
    </div>
  );
}

export default function ReasoningPanel({ entries, pending, label }) {
  const reversed = [...entries].reverse();
  const totalMoves = entries.length + (pending !== null ? 1 : 0);
  const isEmpty = entries.length === 0 && pending === null;

  return (
    <div style={{
      width: 300,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      maxHeight: 'calc(100vh - 4rem)',
      fontFamily: 'sans-serif',
    }}>
      <div style={{
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        color: '#888',
        fontWeight: 600,
        marginBottom: '0.75rem',
        paddingBottom: '0.5rem',
        borderBottom: '1px solid #eee',
        flexShrink: 0,
      }}>
        {label}
      </div>

      {isEmpty ? (
        <p style={{ color: '#bbb', fontSize: '0.85rem', margin: 0 }}>Waiting for first move…</p>
      ) : (
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {pending !== null && (
            <ReasoningCard moveNum={totalMoves} text={pending} isPending />
          )}
          {reversed.map((entry, i) => (
            <ReasoningCard key={i} moveNum={entries.length - i} text={entry.text} isPending={false} />
          ))}
        </div>
      )}
    </div>
  );
}
