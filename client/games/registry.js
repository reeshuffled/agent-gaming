import { TicTacToe, serializeState as tttSerializeState } from './tictactoe/Game.mjs';
import { TicTacToeBoard } from './tictactoe/Board';
import { Nim, serializeState as nimSerializeState } from './nim/Game.mjs';
import { NimBoard } from './nim/Board';

export const GAMES = {
  tictactoe: {
    id: 'tictactoe',
    name: 'Tic-Tac-Toe',
    description: 'Classic 3×3 grid. First to three in a row wins.',
    game: TicTacToe,
    Board: TicTacToeBoard,
    serializeState: tttSerializeState,
  },
  nim: {
    id: 'nim',
    name: 'Nim',
    description: 'Three piles (3, 5, 7). Take any number from one pile. Last to take wins.',
    game: Nim,
    Board: NimBoard,
    serializeState: nimSerializeState,
  },
};
