// ═══════════════════════════════════════════════════════
// EURO54 - Helpers partagés pour bots secondaires
// ═══════════════════════════════════════════════════════
const { query } = require('./db');

async function ensureBotTables() {
    await query(`CREATE TABLE IF NOT EXISTS bot_admins (
        telegram_id BIGINT PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await query(`CREATE TABLE IF NOT EXISTS bot_sessions (
        bot_type TEXT NOT NULL,
        admin_id BIGINT NOT NULL,
        action TEXT,
        step INTEGER DEFAULT 0,
        temp_data TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (bot_type, admin_id)
    )`);
}

async function getSession(botType, adminId) {
    const r = await query('SELECT * FROM bot_sessions WHERE bot_type = $1 AND admin_id = $2', [botType, adminId]);
    return r[0] || null;
}

async function setSession(botType, adminId, action, step, data = {}) {
    await query(`
        INSERT INTO bot_sessions (bot_type, admin_id, action, step, temp_data, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (bot_type, admin_id) DO UPDATE SET action = $3, step = $4, temp_data = $5, updated_at = NOW()
    `, [botType, adminId, action, step, JSON.stringify(data)]);
}

async function clearSession(botType, adminId) {
    await query('DELETE FROM bot_sessions WHERE bot_type = $1 AND admin_id = $2', [botType, adminId]);
}

async function isAuthorizedAdmin(telegramId) {
    const r = await query('SELECT * FROM bot_admins WHERE telegram_id = $1', [telegramId]);
    return r.length > 0;
}

async function authorizeAdmin(telegramId) {
    await query('INSERT INTO bot_admins (telegram_id, created_at) VALUES ($1, NOW()) ON CONFLICT DO NOTHING', [telegramId]);
}

async function getUserCount(whereClause) {
    const r = await query(`SELECT COUNT(*) as c FROM users ${whereClause}`);
    return parseInt(r[0].c);
}

module.exports = { ensureBotTables, getSession, setSession, clearSession, isAuthorizedAdmin, authorizeAdmin, getUserCount };
