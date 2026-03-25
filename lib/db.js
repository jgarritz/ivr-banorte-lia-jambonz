const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'call_logs.db');
let db;

function init() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS call_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      call_sid TEXT NOT NULL,
      intent TEXT NOT NULL,
      dtmf_sequence TEXT NOT NULL,
      phone_from TEXT,
      success INTEGER DEFAULT 1
    )
  `);
}

function logTransfer({ callSid, intent, dtmf, phoneFrom = null, success = true }) {
  const stmt = db.prepare(`
    INSERT INTO call_logs (timestamp, call_sid, intent, dtmf_sequence, phone_from, success)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(new Date().toISOString(), callSid, intent, dtmf, phoneFrom, success ? 1 : 0);
}

function getLogs(limit = 100) {
  return db.prepare(`
    SELECT timestamp, call_sid, intent, dtmf_sequence, phone_from, success
    FROM call_logs ORDER BY id DESC LIMIT ?
  `).all(limit);
}

function getStats() {
  const total = db.prepare('SELECT COUNT(*) as c FROM call_logs').get().c;
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = db.prepare("SELECT COUNT(*) as c FROM call_logs WHERE timestamp LIKE ?").get(`${today}%`).c;
  const topIntent = db.prepare(`
    SELECT intent, COUNT(*) as count FROM call_logs
    GROUP BY intent ORDER BY count DESC LIMIT 1
  `).get();
  const successCount = db.prepare('SELECT COUNT(*) as c FROM call_logs WHERE success = 1').get().c;
  const successRate = total > 0 ? Math.round((successCount / total) * 1000) / 10 : 0;

  return {
    total,
    today: todayCount,
    topIntent: topIntent ? topIntent.intent : 'N/A',
    topIntentCount: topIntent ? topIntent.count : 0,
    successRate,
  };
}

module.exports = { init, logTransfer, getLogs, getStats };
