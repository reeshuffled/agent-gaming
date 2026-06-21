import { getDb } from './db.mjs';

export function createGame({ matchId, gameId, mode, humanPlayer, claudePlayer, model, systemPrompt, player0Credentials, player1Credentials }) {
  const db = getDb();
  const now = Date.now();
  db.prepare(`
    INSERT OR IGNORE INTO games
      (match_id, game_id, mode, human_player, claude_player, model, system_prompt,
       player0_credentials, player1_credentials, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_progress', ?, ?)
  `).run(matchId, gameId, mode ?? 'hvc', humanPlayer ?? null, claudePlayer ?? null,
         model ?? null, systemPrompt ?? null,
         player0Credentials ?? null, player1Credentials ?? null, now, now);
}

export function updatePlayerCredentials(matchId, player0Credentials, player1Credentials) {
  const db = getDb();
  db.prepare(`
    UPDATE games SET
      player0_credentials = COALESCE(?, player0_credentials),
      player1_credentials = COALESCE(?, player1_credentials),
      updated_at = ?
    WHERE match_id = ?
  `).run(player0Credentials ?? null, player1Credentials ?? null, Date.now(), matchId);
}

export function getGame(matchId) {
  const db = getDb();
  const game = db.prepare('SELECT * FROM games WHERE match_id = ?').get(matchId);
  if (!game) return null;
  const moves = db.prepare('SELECT * FROM game_moves WHERE match_id = ? ORDER BY id ASC').all(matchId);
  return { game, moves };
}

export function addMove({ matchId, player, moveType, moveArgs, reasoning }) {
  const db = getDb();
  db.prepare(`
    INSERT INTO game_moves (match_id, player, move_type, move_args, reasoning, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(matchId, player, moveType, JSON.stringify(moveArgs), reasoning ?? null, Date.now());
}

export function updateGameStatus(matchId, status) {
  const db = getDb();
  db.prepare('UPDATE games SET status = ?, updated_at = ? WHERE match_id = ?')
    .run(status, Date.now(), matchId);
}
