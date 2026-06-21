export function applySchema(db) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS games (
      match_id      TEXT PRIMARY KEY,
      game_id       TEXT NOT NULL,
      human_player  TEXT NOT NULL,
      claude_player TEXT NOT NULL,
      model         TEXT NOT NULL,
      system_prompt TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'in_progress',
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS game_moves (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id   TEXT NOT NULL REFERENCES games(match_id),
      player     TEXT NOT NULL,
      move_type  TEXT NOT NULL,
      move_args  TEXT NOT NULL,
      reasoning  TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_game_moves_match ON game_moves(match_id);
  `);
}
