# ADR 0007: ClaudeBot runs client-side in multiplayer — joins as a player

## Status
Accepted

## Context
When boardgame.io's socket.io transport is added, game state moves server-side. `ClaudeBot` currently runs in the browser using local transport. Two approaches for multiplayer were considered:

1. **Client-side bot** — `ClaudeBot` connects to the match as a player via socket.io (same as a human would), watches for its turn, calls `/api/claude-move`, and submits moves through the socket. The browser driving the bot can be a dedicated "bot tab" or the same session as the human watching.
2. **Server-side bot runner** — `ClaudeBot` logic moves to the server. A worker process watches game state and drives Claude's turns without any browser involvement. Cleaner for Claude vs Claude (no browser required).

The current `ClaudeBot` is already transport-agnostic: it calls `Step(client, bot)` where `client` is a boardgame.io `Client`. Swapping to socket.io transport requires changing only how `Client` is initialized — `ClaudeBot` itself is unchanged.

## Decision
Keep `ClaudeBot` client-side. For human vs Claude, the human's browser also drives the bot (same session). For Claude vs Claude, a dedicated browser session runs both bots. The `/api/claude-move` proxy is unchanged.

Server-side bot runner is deferred. It becomes relevant when Claude vs Claude needs to run unattended (no browser), but that use case can be addressed as a separate decision when it's prioritized.

## Consequences
- `ClaudeBot` requires zero changes when socket.io transport is added — only `Client` initialization changes.
- Human vs Claude works identically to today from `ClaudeBot`'s perspective: same `Step()` loop, same proxy call.
- Claude vs Claude requires a browser tab to be open and running both bots. Acceptable for the initial implementation.
- The reasoning transcript (`onReasoningChunk` / `onReasoning` callbacks) continues to work client-side — no streaming architecture changes needed.
- Server-side bot runner remains a valid future path. If unattended Claude vs Claude becomes a priority, the proxy architecture (`/api/claude-move`) is already on the server and the runner would call it directly.
