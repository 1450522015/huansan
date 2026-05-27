const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../huansan.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS battles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    battle_id TEXT UNIQUE NOT NULL,
    battle_data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

function save(battleId, battleData) {
  const existing = db.prepare('SELECT id FROM battles WHERE battle_id = ?').get(battleId);
  if (existing) {
    db.prepare('UPDATE battles SET battle_data = ?, updated_at = datetime(\'now\') WHERE battle_id = ?').run(JSON.stringify(battleData), battleId);
  } else {
    db.prepare('INSERT INTO battles (battle_id, battle_data) VALUES (?, ?)').run(battleId, JSON.stringify(battleData));
  }
}

function findByBattleId(battleId) {
  const row = db.prepare('SELECT * FROM battles WHERE battle_id = ?').get(battleId);
  if (!row) return null;
  return { ...row, battle_data: JSON.parse(row.battle_data) };
}

module.exports = { save, findByBattleId };