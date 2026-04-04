import express from 'express';
const router = express.Router();
import db from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: JWT token and user info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 */
// User login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log('[LOGIN] Incoming:', { username });
    try {
        const [results] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        console.log('[LOGIN] User lookup results:', results);
        if (!results.length) {
            console.warn('[LOGIN] Invalid credentials: user not found');
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        console.log('[LOGIN] Password compare result:', isMatch);
        if (!isMatch) {
            console.warn('[LOGIN] Invalid credentials: password mismatch');
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user.id, username: user.username, role_id: user.role_id }, JWT_SECRET, { expiresIn: '1d' });
        console.log('[LOGIN] Token generated:', token);
        res.json({ success: true, token, user: { id: user.id, username: user.username, role_id: user.role_id } });
        console.log('[LOGIN] Response sent:', { id: user.id, username: user.username, role_id: user.role_id });
    } catch (err) {
        console.error('[LOGIN] DB error:', err);
        return res.status(500).json({ error: err });
    }
});

// User registration (admin only)
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: User registration (admin only)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.post('/register', (req, res) => {
    const { username, email, password, role_id } = req.body;
    console.log('[REGISTER] Incoming:', { username, email, role_id });
    const userRoleId = role_id || 2;
    const insertUser = (roleId) => {
        try {
            bcrypt.hash(password, 10, (err, hash) => {
                if (err) {
                    console.error('[REGISTER] Password hash error:', err);
                    return res.status(500).json({ error: err });
                }
                console.log('[REGISTER] Password hashed');
                const userData = { username, email, password_hash: hash, role_id: roleId };
                console.log('[REGISTER] Attempting user insert:', userData);
                db.query('INSERT INTO users SET ?', userData, (userErr, result) => {
                    if (userErr) {
                        console.error('[REGISTER] User insert error:', userErr);
                        console.error('[REGISTER] User insert query:', 'INSERT INTO users SET ?', userData);
                        return res.status(500).json({ error: userErr });
                    }
                    console.log('[REGISTER] User created:', { id: result.insertId, username, email, role_id: roleId });
                    res.json({ id: result.insertId, username, email, role_id: roleId });
                    console.log('[REGISTER] Response sent:', { id: result.insertId, username, email, role_id: roleId });
                });
            });
        } catch (unexpectedErr) {
            console.error('[REGISTER] Unexpected error:', unexpectedErr);
            res.status(500).json({ error: 'Unexpected error during registration.' });
        }
    };
    if (!role_id) {
        // Insert Guest role if not present
        db.query('INSERT IGNORE INTO roles SET ?', { id: 2, name: 'Guest' }, (roleErr) => {
            if (roleErr) {
                console.error('[REGISTER] Role insert error:', roleErr);
                return res.status(500).json({ error: roleErr });
            }
            console.log('[REGISTER] Guest role insert success or already exists: 2');
            insertUser(2);
        });
    } else {
        // Use provided role_id
        insertUser(role_id);
    }
});

export default router;
