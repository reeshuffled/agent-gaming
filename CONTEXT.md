# Context

## Terms

### ClaudeBot
A boardgame.io `Bot` subclass that delegates move selection to the Claude API. Constructed with `enumerate` (legal moves), `serializeState` (board → prompt string), `model` (Claude model ID), `systemPrompt` (persona), `onReasoningChunk` (callback fired per streaming token during Claude's thinking), and `onReasoning` (callback fired with complete reasoning string on move completion). Maintains conversation history across turns as an instance field.

### Game Transcript
The sidebar UI element that accumulates Claude's reasoning for every move in the current game. Displays move number + reasoning string per turn. While Claude is deciding, shows a "Claude is thinking..." pending entry that accumulates streaming reasoning chunks in place; finalizes when the move lands. Stored in React state above the boardgame.io `Client` component; populated via `onReasoningChunk` (per chunk) and `onReasoning` (on completion) callbacks on `ClaudeBot`.

### Legal Moves
The output of `game.ai.enumerate(G, ctx, playerID)` — the set of moves Claude may choose from on a given turn. Passed to the Claude API call as the allowed options for the `make_move` tool. If Claude returns an index outside this set, the bot retries once before falling back to the first legal move.

### serializeState
A game-supplied function `(G, ctx) => string` that converts the current game state into a human-readable prompt description. The authoritative source of all game context Claude needs to play: current board state, legal moves, and any move history relevant to strategy. Each game defines its own. Passed to `ClaudeBot` at construction. Keeps `ClaudeBot` game-agnostic.

### Persona
A system prompt that defines Claude's playing style and communication tone. Selected by the human before the game starts. Built-in presets are provided (e.g., Strategist, Teacher, Trash Talker); a custom text field allows user-defined personas. Locked for the duration of a game — changing it mid-game would invalidate conversation history.

### Pre-Game Setup
The configuration screen shown before the board renders. Human selects: which side they play (X or O), Claude's Persona, and optionally Claude's model. Once confirmed, the game starts and these settings are locked until a new game begins.

### Server Proxy
The `POST /api/claude-move` route added to the existing Koa server (`src/server.js`). Receives serialized game state + conversation history from `ClaudeBot`, calls the Anthropic API server-side, returns `{ cell_index, reasoning }`. The Anthropic API key never reaches the browser.
