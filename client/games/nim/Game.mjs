import { INVALID_MOVE } from 'boardgame.io/dist/esm/core.js';

export const Nim = {
  name: 'nim',
  setup: () => ({
    piles: [3, 5, 7],
    lastMove: null,
  }),

  turn: {
    minMoves: 1,
    maxMoves: 1,
  },

  moves: {
    take: ({ G, playerID }, pileIndex, amount) => {
      if (pileIndex < 0 || pileIndex >= G.piles.length) return INVALID_MOVE;
      if (amount < 1 || amount > G.piles[pileIndex]) return INVALID_MOVE;
      G.piles[pileIndex] -= amount;
      G.lastMove = { player: playerID, pile: pileIndex, amount };
    },
  },

  endIf: ({ G, ctx }) => {
    if (G.piles.every((p) => p === 0)) {
      return { winner: ctx.currentPlayer };
    }
  },

  ai: {
    enumerate: (G, ctx, playerID) => {
      const moves = [];
      G.piles.forEach((size, pileIndex) => {
        for (let amount = 1; amount <= size; amount++) {
          moves.push({ move: 'take', args: [pileIndex, amount] });
        }
      });
      return moves;
    },
  },
};

const PILE_NAMES = ['A', 'B', 'C'];

export function serializeState(G, ctx, playerID, legalMoves) {
  const sym = { '0': 'X', '1': 'O' };
  const mine = sym[playerID];
  const theirs = sym[playerID === '0' ? '1' : '0'];

  const pilesDesc = G.piles
    .map((size, i) => `  Pile ${PILE_NAMES[i]}: ${size} object${size !== 1 ? 's' : ''}`)
    .join('\n');

  let recentContext = '';
  if (G.lastMove) {
    const mover = G.lastMove.player === playerID ? 'You' : 'Opponent';
    recentContext = `\nLast move: ${mover} took ${G.lastMove.amount} from Pile ${PILE_NAMES[G.lastMove.pile]}.\n`;
  }

  const movesDesc = legalMoves
    .map((m, i) => {
      const [pileIndex, amount] = m.payload.args;
      return `  ${i}: take ${amount} from Pile ${PILE_NAMES[pileIndex]}`;
    })
    .join('\n');

  return `Game: Nim
You are ${mine}, opponent is ${theirs}.
${recentContext}
Current piles:
${pilesDesc}

Rule: take any number of objects from exactly one pile. Player who takes the last object wins.

Available moves (use the number before the colon as cell_index):
${movesDesc}`;
}
