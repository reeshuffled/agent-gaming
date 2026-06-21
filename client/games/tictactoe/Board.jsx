import React from 'react';

const cellStyle = {
  border: '2px solid #555',
  width: '80px',
  height: '80px',
  lineHeight: '80px',
  textAlign: 'center',
  fontSize: '2rem',
  fontWeight: 'bold',
  cursor: 'pointer',
  background: '#fff',
  color: '#333',
};

const disabledCellStyle = {
  ...cellStyle,
  cursor: 'default',
  color: '#888',
};

export function TicTacToeBoard({ ctx, G, moves, isActive, waitingMessage = 'Waiting for opponent…' }) {
  const onClick = (id) => {
    if (isActive) moves.clickCell(id);
  };

  let status = 'Your turn';
  let winner = null;

  if (ctx.gameover) {
    if (ctx.gameover.winner !== undefined) {
      status = '';
      winner = `Player ${ctx.gameover.winner} wins!`;
    } else {
      status = '';
      winner = "It's a draw!";
    }
  }

  let tbody = [];
  for (let i = 0; i < 3; i++) {
    let cells = [];
    for (let j = 0; j < 3; j++) {
      const id = 3 * i + j;
      const val = G.cells[id];
      cells.push(
        <td key={id}>
          <div
            style={val || !isActive ? disabledCellStyle : cellStyle}
            onClick={() => onClick(id)}
          >
            {val === '0' ? '✕' : val === '1' ? '○' : ''}
          </div>
        </td>
      );
    }
    tbody.push(<tr key={i}>{cells}</tr>);
  }

  return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '2rem' }}>
      <h1>Tic-Tac-Toe</h1>
      <table style={{ margin: '0 auto', borderCollapse: 'collapse' }}>
        <tbody>{tbody}</tbody>
      </table>
      {winner && (
        <div style={{ marginTop: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold', color: '#2a7' }}>
          {winner}
        </div>
      )}
      {!winner && (
        <div style={{ marginTop: '1rem', fontSize: '1rem', color: '#555' }}>
          {isActive ? status : waitingMessage}
        </div>
      )}
    </div>
  );
}
