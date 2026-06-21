import { DatabaseSync } from 'node:sqlite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { applySchema } from './schema.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

let _db;

export function getDb() {
  if (!_db) {
    const dbPath = process.env.DB_PATH ?? join(__dirname, '../../data/agent-gaming.db');
    _db = new DatabaseSync(dbPath);
    applySchema(_db);
  }
  return _db;
}
