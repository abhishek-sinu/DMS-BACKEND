import express from 'express';
const router = express.Router();
import db from '../db.js';
import { body, validationResult } from 'express-validator';

/**
 * @swagger
 * tags:
 *   name: TempleSettings
 *   description: Temple / trust details printed on donation receipts
 */

// Default temple details used to seed the settings row the first time.
const DEFAULT_SETTINGS = {
    name: 'INTERNATIONAL SOCIETY FOR KRISHNA CONSCIOUSNESS (ISKCON)',
    founder: 'Founder Acharya: His Divine Grace A.C. Bhaktivedanta Swami Prabhupada',
    head_office: '(Head Office: Hare Krishna Land, Juhu, Mumbai - 400 049)',
    address:
        'Temple : Hare Krishna Land, 5-4-743-745, Nampally Station Road, Opp. G Pulla Reddy Sweets Shop, Abids, Hyderabad, Telangana, India 500001',
    phones: 'Phone Nos: 9182822719 / 9849104991',
    email: 'Email id : iskconhyddonations@gmail.com',
    registration:
        '(Registered under Bombay Public Trusts Act Vide Registration No. F2179(Bom), PAN-AAATI0017P)',
    logo_url: '/logo.png',
    bank: 'RAZORPAY',
    branch: '',
};

const COLUMNS = Object.keys(DEFAULT_SETTINGS);

// Make sure the table exists and always has the single settings row (id = 1).
async function ensureSettings() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS temple_settings (
            id INT NOT NULL DEFAULT 1,
            name VARCHAR(255) NOT NULL DEFAULT '',
            founder VARCHAR(255) NOT NULL DEFAULT '',
            head_office VARCHAR(255) NOT NULL DEFAULT '',
            address VARCHAR(500) NOT NULL DEFAULT '',
            phones VARCHAR(255) NOT NULL DEFAULT '',
            email VARCHAR(255) NOT NULL DEFAULT '',
            registration VARCHAR(500) NOT NULL DEFAULT '',
            logo_url VARCHAR(255) NOT NULL DEFAULT '/logo.png',
            bank VARCHAR(150) NOT NULL DEFAULT '',
            branch VARCHAR(150) NOT NULL DEFAULT '',
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    const [rows] = await db.query('SELECT id FROM temple_settings WHERE id = 1');
    if (rows.length === 0) {
        await db.query(
            `INSERT INTO temple_settings (id, ${COLUMNS.join(', ')}) VALUES (1, ${COLUMNS.map(() => '?').join(', ')})`,
            COLUMNS.map((c) => DEFAULT_SETTINGS[c])
        );
    }
}

/**
 * @swagger
 * /api/temple-settings:
 *   get:
 *     summary: Get the temple receipt settings
 *     tags: [TempleSettings]
 *     responses:
 *       200:
 *         description: Temple settings object
 */
// Get temple settings (creates and seeds the row if it does not exist yet)
router.get('/', async (req, res) => {
    try {
        await ensureSettings();
        const [rows] = await db.query(
            `SELECT id, ${COLUMNS.join(', ')}, updated_at FROM temple_settings WHERE id = 1`
        );
        res.json({ data: rows[0] || { id: 1, ...DEFAULT_SETTINGS } });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
});

// Validation rules — every field is optional but length-limited.
const validateSettings = [
    body('name').optional().isString().isLength({ max: 255 }),
    body('founder').optional().isString().isLength({ max: 255 }),
    body('head_office').optional().isString().isLength({ max: 255 }),
    body('address').optional().isString().isLength({ max: 500 }),
    body('phones').optional().isString().isLength({ max: 255 }),
    body('email').optional().isString().isLength({ max: 255 }),
    body('registration').optional().isString().isLength({ max: 500 }),
    body('logo_url').optional().isString().isLength({ max: 255 }),
    body('bank').optional().isString().isLength({ max: 150 }),
    body('branch').optional().isString().isLength({ max: 150 }),
];

/**
 * @swagger
 * /api/temple-settings:
 *   put:
 *     summary: Update the temple receipt settings
 *     tags: [TempleSettings]
 *     responses:
 *       200:
 *         description: Updated temple settings
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden (admin only)
 */
// Update temple settings (admin only)
router.put('/', validateSettings, async (req, res) => {
    try {
        if (req.user && req.user.role_id !== 1) {
            return res.status(403).json({ error: 'Only administrators can update temple settings.' });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        await ensureSettings();

        // Build update from provided fields only, trimming strings.
        const updates = COLUMNS.filter((c) => req.body[c] !== undefined);
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields provided to update.' });
        }
        const setClause = updates.map((c) => `${c} = ?`).join(', ');
        const values = updates.map((c) => String(req.body[c]).trim());
        await db.query(`UPDATE temple_settings SET ${setClause} WHERE id = 1`, values);

        // Audit log (best effort)
        if (req.user && req.user.id) {
            db.query('INSERT INTO audit_logs SET ?', {
                user_id: req.user.id,
                action: 'update_temple_settings',
                details: JSON.stringify({ fields: updates }),
            }).catch(() => {});
        }

        const [rows] = await db.query(
            `SELECT id, ${COLUMNS.join(', ')}, updated_at FROM temple_settings WHERE id = 1`
        );
        res.json({ message: 'Temple settings updated', data: rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
});

export default router;
