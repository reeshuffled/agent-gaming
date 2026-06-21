# ADR 0003: Prompt caching on system prompt; conversation history deferred

We added `cache_control: { type: 'ephemeral' }` to the system prompt block in the Claude API call. The system prompt is the right caching target because it will grow with game rules (static per game, reused across every turn), while conversation history is too short in Tic-Tac-Toe to justify caching.

## Considered Options

**Cache conversation history** — rejected. Tic-Tac-Toe games are 5–9 turns (~100 tokens of history). Well below the 1,024-token minimum for Sonnet 4.6, and too short-lived for cache TTL to matter. Revisit when longer games (Chess, Go) are added.

**Automatic caching** (top-level `cache_control`) — rejected. Automatic mode places the breakpoint on the last message block, which changes every turn, producing cache misses on every call. Explicit breakpoint on the system block is required.

**1-hour TTL** — deferred. Default 5-minute TTL is sufficient while games are short and active. If games exceed 5 minutes or usage becomes sporadic, upgrade to `ttl: "1h"`.

## Consequences

- Caching silently no-ops until the system prompt exceeds 1,024 tokens (the Sonnet 4.6 minimum). It becomes effective once game rules are baked in.
- Server logs `cache_read_input_tokens` and `cache_creation_input_tokens` per call for visibility.
