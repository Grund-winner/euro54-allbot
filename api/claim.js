// ═══════════════════════════════════════════════════════
// EURO54 - Claim (Telegram one-time links)
// Vérifie le HMAC → check deposit >= 8.5$ → redirect simple
// Route : GET /api/claim?token=XXX
// ═══════════════════════════════════════════════════════
const crypto = require('crypto');
const { query } = require('../lib/db');
const LINK_SECRET = process.env.ADMIN_PASSWORD || 'euro54secret';
const MIN_DEPOSIT = parseFloat(process.env.MIN_DEPOSIT) || 8.5;

module.exports = async function handler(req, res) {
    try {
        const token = req.query.token;
        if (!token) return res.redirect('/access');

        // Decode base64url token
        let decoded;
        try {
            decoded = Buffer.from(token, 'base64url').toString('utf8');
        } catch (e) {
            return res.redirect('/access');
        }

        const parts = decoded.split(':');
        if (parts.length !== 3) return res.redirect('/access');

        const [telegramId, expiresAt, sig] = parts;

        // Verify HMAC signature
        const expectedSig = crypto.createHmac('sha256', LINK_SECRET)
            .update(`${telegramId}:${expiresAt}`)
            .digest('hex').substring(0, 12);

        if (sig !== expectedSig) return res.redirect('/access');

        // Verify expiry (10 minutes for one-time link)
        if (parseInt(expiresAt) < Date.now()) return res.redirect('/access');

        // Find user by telegram_id
        const users = await query('SELECT * FROM users WHERE telegram_id = $1', [parseInt(telegramId)]);
        if (users.length === 0) return res.redirect('/access');

        const user = users[0];

        // Check total deposits (deposit_amount is cumulative)
        const totalDep = parseFloat(user.deposit_amount) || 0;

        if (totalDep < MIN_DEPOSIT) {
            // Deposit insufficient → redirect to access page with info
            return res.redirect('/access?msg=deposit&amount=' + totalDep.toFixed(2));
        }

        // All good → simple redirect with auth flag
        return res.redirect('/predictions?auth=ok');
    } catch (error) {
        console.error('[CLAIM ERROR]', error);
        return res.redirect('/access');
    }
};
