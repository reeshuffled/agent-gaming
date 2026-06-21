# ADR 0006: React Router and matchID-based routes added before multiplayer

## Status
Accepted

## Context
The current app has no routing — it's a single-page flow (setup → game → setup). This works for single-player (one human vs one ClaudeBot, local transport, no shared state).

The planned roadmap includes:
- Multiple games (game selector home screen)
- SQLite persistence (games keyed by matchID)
- Multiplayer via boardgame.io's socket.io transport (human vs human, Claude vs Claude)

Multiplayer requires shareable URLs so two players can join the same match. Once the DB keys games on matchID, routes like `/game/:matchID` become load-bearing — a user following a link must land on the right game. Retrofitting routing after the DB layer exists would require changing the DB key scheme, the client initialization flow, and the session/resume logic simultaneously.

## Decision
Add React Router with matchID-based routes (`/game/:matchID`) as part of Phase 1, before any DB work or multiplayer transport. The home screen (game card selector) is the index route. Each active game session gets a URL from the moment it's created, even while still using local transport.

matchIDs are generated client-side (crypto.randomUUID) until boardgame.io's lobby takes over when multiplayer lands.

## Consequences
- Game sessions are bookmarkable and shareable from day one, even before multiplayer transport is wired.
- DB schema can key on matchID immediately; no migration needed when multiplayer lands.
- React Router is a new dependency added before it's strictly required. Cost is low (~50KB, well-understood library).
- The setup flow gains a navigation step: home screen → game config → `/game/:matchID`. Browser back navigates to home screen, which is the correct UX.
- When socket.io transport lands, the matchID in the URL is handed to boardgame.io's `Client({ matchID })` directly — no routing changes needed.
