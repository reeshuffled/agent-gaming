# ADR 0001: Server-side proxy for Claude API calls

## Status
Accepted

## Context
boardgame.io bots (`Bot` subclass) run entirely client-side — `Bot.play()` is called in the browser. The naive path is to call the Anthropic API directly from the browser inside `ClaudeBot.play()`. This exposes the `ANTHROPIC_API_KEY` in the JS bundle and network requests, making it trivially extractable by any user.

## Decision
Add a `POST /api/claude-move` route to the existing Koa server (`src/server.js`). `ClaudeBot.play()` calls this endpoint with serialized game state and conversation history. The server calls Anthropic and returns `{ cell_index, reasoning }`. The API key lives only in the server environment.

## Consequences
- API key never reaches the browser.
- Adds one extra network round-trip (~10ms on localhost, negligible vs Claude API latency of 1-5s).
- Conversation history must be serialized and sent on every turn (small payload for TicTacToe; worth monitoring for complex games).
- The existing `src/server.js` boardgame.io server gains a non-game route — keep it clearly namespaced under `/api/`.
