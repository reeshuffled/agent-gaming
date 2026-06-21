import { getDb } from './db.mjs';

export function createGame({ matchId, gameId, humanPlayer, claudePlayer, model, systemPrompt }) {
  const db = getDb();
  const now = Date.now();
  db.prepare(`
    INSERT OR IGNORE INTO games (match_id, game_id, human_player, claude_player, model, system_prompt, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'in_progress', ?, ?)
  `).run(matchId, gameId, humanPlayer, claudePlayer, model, systemPrompt, now, now);
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
