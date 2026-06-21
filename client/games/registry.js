import { TicTacToe, serializeState } from './tictactoe/Game.mjs';
import { TicTacToeBoard } from './tictactoe/Board';

export const GAMES = {
  tictactoe: {
    id: 'tictactoe',
    name: 'Tic-Tac-Toe',
    description: 'Classic 3×3 grid. First to three in a row wins.',
    game: TicTacToe,
    Board: TicTacToeBoard,
    serializeState,
  },
};
