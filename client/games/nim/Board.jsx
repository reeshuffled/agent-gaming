import React from 'react';

const PILE_NAMES = ['A', 'B', 'C'];

export function NimBoard({ G, ctx, moves, isActive }) {
  let winner = null;
  if (ctx.gameover) {
    winner = ctx.gameover.winner !== undefined
      ? `Player ${ctx.gameover.winner === '0' ? 'X' : 'O'} wins!`
      : "It's a draw!";
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', minWidth: 320 }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Nim</h1>
      <p style={{ color: '#777', fontSize: '0.8rem', marginBottom: '2rem', marginTop: 0 }}>
        Take any number from one pile. Last to take wins.
      </p>

      {G.piles.map((size, pileIndex) => (
        <div key={pileIndex} style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#444', marginBottom: '0.4rem' }}>
            Pile {PILE_NAMES[pileIndex]} — {size} left
          </div>

          <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.5rem', flexWrap: 'wrap', minHeight: 24 }}>
            {size === 0 ? (
              <span style={{ color: '#bbb', fontSize: '0.8rem', fontStyle: 'italic', lineHeight: '24px' }}>empty</span>
            ) : (
              Array.from({ length: size }).map((_, i) => (
                <div
                  key={i}
                  style={{ width: 22, height: 22, borderRadius: '50%', background: '#444' }}
                />
              ))
            )}
          </div>

          {isActive && size > 0 && (
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {Array.from({ length: size }).map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => moves.take(pileIndex, i + 1)}
                  style={{
                    padding: '0.2rem 0.55rem',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    background: '#f5f5f5',
                    border: '1px solid #ccc',
                    borderRadius: 4,
                    color: '#333',
                  }}
                >
                  −{i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {winner ? (
        <div style={{ marginTop: '1rem', fontSize: '1.25rem', fontWeight: 'bold', color: '#2a7' }}>
          {winner}
        </div>
      ) : (
        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
          {isActive ? "Your turn" : "Claude is thinking…"}
        </div>
      )}
    </div>
  );
}
