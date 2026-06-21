# ADR 0005: Game resume uses board state only — no conversation history replay

## Status
Accepted

## Context
When a game is resumed after a page reload or server restart, `ClaudeBot` needs enough context to continue playing. Two approaches were considered:

1. **Replay conversation history** — persist all prior `conversationHistory` messages to the DB and re-initialize `ClaudeBot` with them on resume. Claude retains full memory of its prior reasoning thread.
2. **Board state only** — start `ClaudeBot` with an empty `conversationHistory`. The current board is described by `serializeState`, which can include recent move history as part of the prompt string.

The conversation history format is non-trivial: each turn is 3–4 messages (`user` with board state, `assistant` with `tool_use`, `user` with `tool_result`). Slicing history to replay only recent turns risks splitting a `tool_use`/`tool_result` pair, which the Anthropic API rejects with a 400 error.

For complex games (chess at move 40), replaying the full history means thousands of tokens per resume call — without the benefit of prompt caching, since the messages differ each game.

## Decision
On resume, initialize `ClaudeBot` with `conversationHistory = []`. Recent move context (what was just played and by whom) is embedded in the `serializeState` output for each game rather than replayed from message history.

`serializeState` is already the authoritative source of everything Claude needs to play (board + legal moves). Recent move history is game context — it belongs there, not in the message history.

The full reasoning transcript (Claude's text per turn) is stored separately in the DB for the human reader's archive view. This is decoupled from what Claude itself receives on resume.

## Consequences
- `ClaudeBot` is stateless with respect to persistence — no changes needed to `ClaudeBot` itself for resume support.
- Each game's `serializeState` is responsible for including relevant move history context (e.g. last 3 moves in algebraic notation for chess).
- No risk of Anthropic API rejections from split `tool_use`/`tool_result` pairs on sliced history.
- Claude loses long-range strategic memory across a resume (e.g. "I was pursuing a pin I set up 10 moves ago"). Acceptable: `serializeState` captures board state, which encodes all consequences of prior strategy.
- DB schema stores `board_snapshots` (G + ctx JSON) and `moves` (reasoning text) separately. Resume reads `board_snapshots`; archive view reads `moves`.
