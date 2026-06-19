import express from 'express';
const router = express.Router();
import db from '../db.js';
import { body, validationResult } from 'express-validator';

/**
 * @swagger
 * tags:
 *   name: Schemes
 *   description: Donation scheme (seva) management endpoints
 */

/**
 * @swagger
 * /api/schemes:
 *   get:
 *     summary: Get all schemes
 *     tags: [Schemes]
 *     responses:
 *       200:
 *         description: List of schemes
 */
// Get all schemes
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name, created_at FROM schemes ORDER BY name ASC');
        res.json({ count: rows.length, data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
});

// ✅ Validation rules
const validateScheme = [
    body('name')
        .trim()
        .notEmpty().withMessage('Scheme name is required')
        .isLength({ max: 150 }).withMessage('Scheme name is too long'),
];

/**
 * @swagger
 * /api/schemes:
 *   post:
 *     summary: Create a new scheme
 *     tags: [Schemes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Scheme created
 *       400:
 *         description: Validation error
 *       409:
 *         description: Scheme already exists
 */
// Create scheme
router.post('/', validateScheme, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const name = req.body.name.trim();
        const [result] = await db.query('INSERT INTO schemes (name) VALUES (?)', [name]);

        // Audit log (best effort)
        if (req.user && req.user.id) {
            db.query('INSERT INTO audit_logs SET ?', {
                user_id: req.user.id,
                action: 'create_scheme',
                details: JSON.stringify({ scheme_id: result.insertId, name }),
            }).catch(() => {});
        }

        res.status(201).json({ id: result.insertId, name });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'A scheme with this name already exists.' });
        }
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /api/schemes/{id}:
 *   delete:
 *     summary: Delete a scheme by ID
 *     tags: [Schemes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Scheme ID
 *     responses:
 *       200:
 *         description: Scheme deleted
 *       404:
 *         description: Scheme not found
 */
// Delete scheme
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM schemes WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Scheme not found' });
        }

        // Audit log (best effort)
        if (req.user && req.user.id) {
            db.query('INSERT INTO audit_logs SET ?', {
                user_id: req.user.id,
                action: 'delete_scheme',
                details: JSON.stringify({ scheme_id: req.params.id }),
            }).catch(() => {});
        }

        res.json({ message: 'Scheme deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
});

export default router;
