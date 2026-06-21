import { INVALID_MOVE } from 'boardgame.io/dist/esm/core.js';

function IsVictory(cells) {
  const positions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  const isRowComplete = row => {
    const symbols = row.map(i => cells[i]);
    return symbols.every(i => i !== null && i === symbols[0]);
  };
  return positions.map(isRowComplete).some(i => i === true);
}

function IsDraw(cells) {
  return cells.filter(c => c === null).length === 0;
}

export const TicTacToe = {
  name: 'tictactoe',
  setup: () => ({ cells: Array(9).fill(null) }),

  turn: {
    minMoves: 1,
    maxMoves: 1,
  },

  moves: {
    clickCell: ({ G, playerID }, id) => {
      if (G.cells[id] !== null) return INVALID_MOVE;
      G.cells[id] = playerID;
    },
  },

  endIf: ({ G, ctx }) => {
    if (IsVictory(G.cells)) return { winner: ctx.currentPlayer };
    if (IsDraw(G.cells)) return { draw: true };
  },

  ai: {
    enumerate: (G) => {
      let moves = [];
      for (let i = 0; i < 9; i++) {
        if (G.cells[i] === null) moves.push({ move: 'clickCell', args: [i] });
      }
      return moves;
    },
  },
};

export function serializeState(G, ctx, playerID, legalMoves) {
  const sym = { '0': 'X', '1': 'O' };
  const mine = sym[playerID];
  const theirs = sym[playerID === '0' ? '1' : '0'];

  const cell = (i) => (G.cells[i] === null ? String(i) : sym[G.cells[i]]);

  const board = [
    `${cell(0)} | ${cell(1)} | ${cell(2)}`,
    `--+---+--`,
    `${cell(3)} | ${cell(4)} | ${cell(5)}`,
    `--+---+--`,
    `${cell(6)} | ${cell(7)} | ${cell(8)}`,
  ].join('\n');

  const movesDesc = legalMoves
    .map((m, i) => `  ${i}: cell ${m.payload.args[0]}`)
    .join('\n');

  return `Board (you are ${mine}, human is ${theirs}):\n\n${board}\n\nAvailable moves — use the number before the colon as cell_index:\n${movesDesc}`;
}
