# agent-gaming

Play board games against Claude as a Bot with [boardgame.io](https://github.com/lean-poker/boardgame.io). 

This repo is part framework and part game library.

## Why?

Put simply, to expand the possibilities of work and play with AI agents.

Some examples of activities include:
* Passing time by playing games
* (In)formally learning game strategy 
* Playtesting your game
* Benchmarking various strategies or models

## How it works

```
Browser (React + boardgame.io client)
  └── ClaudeBot.play()
        └── POST /api/claude-move  ← Koa server (port 8000)
              └── Anthropic API (make_move tool)
```

`ClaudeBot` is a `boardgame.io` `Bot` subclass. Each turn it serializes the board state, appends to its conversation history, and POSTs to the server proxy. The server calls Claude with a `make_move` tool forced on every turn (`tool_choice: any`), returning a typed `{ cell_index, reasoning }`. The API key never reaches the browser.

Claude picks moves via the Anthropic API, explains its reasoning, and maintains a per-game conversation history so its thinking evolves across turns.

Claude's reasoning for each move accumulates in the Game Transcript sidebar.

## Setup

```sh
cp .env.example .env
# add your ANTHROPIC_API_KEY to .env
npm install
npm run dev        # Vite (port 3000) + Koa server (port 8000)
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite + Koa server concurrently (development) |
| `npm start` | Vite only |
| `npm run server` | Koa server only |
| `npm run build` | Production Vite build |
| `npm run prod` | Build + serve from Koa (single port 8000) |

## Adding a new game

1. Define a `boardgame.io` `Game` object with `ai.enumerate` — returns legal moves as `{ move, args }` objects.
2. Export `serializeState(G, ctx, playerID, legalMoves) => string` — converts board state to a human-readable prompt. This is the only game-specific logic Claude sees.
3. Register the game in `server/index.mjs` and wire up `ClaudeBot` in the client with the new `serializeState`.

## Personas

Three built-in Claude personas selectable before each game:

- **Strategist** — plays to win, explains reasoning
- **Teacher** — explains each move for learning
- **Trash Talker** — confident, playful trash talk

Custom persona text is also supported. Persona is locked for the duration of a game.

## Key files

```
client/bot/ClaudeBot.js              — Bot subclass, conversation history, retry logic
client/games/tictactoe/Game.mjs      — TicTacToe game definition + serializeState
client/components/PreGameSetup.jsx   — Persona/model/side selection screen
client/components/GameTranscript.jsx — Sidebar showing Claude's reasoning per turn
server/index.mjs                     — Koa server, boardgame.io Server, /api/claude-move route
```
