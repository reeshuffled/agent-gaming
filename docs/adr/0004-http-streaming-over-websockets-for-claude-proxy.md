# ADR 0004: HTTP streaming over WebSockets for Claude move proxy

We will stream Claude's reasoning tokens to the client using a chunked HTTP response on the existing `POST /api/claude-move` route rather than switching to WebSockets or SSE.

## Context

The current proxy returns a complete response after Claude finishes thinking. The goal: stream reasoning tokens progressively into the Game Transcript while Claude is deciding, before the move lands on the board.

Three options were considered:

**WebSockets** — boardgame.io already uses Socket.io; piggybacking on it for Claude streaming was attractive. Rejected after confirming that boardgame.io has no server-side bot trigger mechanism. `bot.play()` is purely client-side, invoked by `LocalMaster` (`local.ts:104-123`). The SocketIO server transport creates ephemeral Master instances per socket event with no subscribe hook. Moving `ClaudeBot` server-side would require restructuring the SocketIO transport — fighting the framework for no gain.

**SSE (Server-Sent Events)** — clean unidirectional push, native `EventSource` API. Rejected because `EventSource` doesn't support `POST`, and `ClaudeBot._callClaude()` must send conversation history in the request body. Workarounds (query params, polyfills) add complexity without benefit over chunked HTTP.

**Chunked HTTP streaming (chosen)** — keep `POST /api/claude-move`, return a streaming body. Client reads via `response.body.getReader()`. Fits the existing call shape in `_callClaude()` with minimal surgery. Server uses the Anthropic SDK's `.stream()` API, parses `input_json_delta` events to extract the `reasoning` field as it accumulates, and forwards clean text chunks. No protocol change. ADR 0002 (tool use) stays intact.

## Consequences

- Server parses partial JSON deltas to extract the `reasoning` field before the full tool input is complete. This logic is contained server-side; clients receive clean text chunks.
- `ClaudeBot` gains an `onReasoningChunk` callback (fired per chunk) alongside the existing `onReasoning` (fired on completion).
- `GameTranscript` gains a "pending" entry with a "Claude is thinking..." label that accumulates chunks in place and finalizes when the move is applied.
- Reasoning is visible to the human *before* the move lands — the board is frozen on Claude's turn while the transcript streams.
- Conversation history persistence (surviving page refresh) remains unsolved. Deferred to a separate decision: localStorage or SQLite session storage.
