import express from 'express';
const router = express.Router();
import db from '../db.js';

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: Role management endpoints
 */

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Roles]
 *     responses:
 *       200:
 *         description: List of roles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Role'
 */
// Get all roles
router.get('/', (req, res) => {
    (async () => {
        try {
            const [results] = await db.query('SELECT * FROM roles');
            res.json(results);
        } catch (err) {
            res.status(500).json({ error: err });
        }
    })();
});

// Get role by ID
/**
 * @swagger
 * /api/roles/{id}:
 *   get:
 *     summary: Get role by ID
 *     tags: [Roles]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Role'
 */
router.get('/:id', (req, res) => {
    (async () => {
        try {
            const [results] = await db.query('SELECT * FROM roles WHERE id = ?', [req.params.id]);
            res.json(results[0]);
        } catch (err) {
            res.status(500).json({ error: err });
        }
    })();
});

// Create role
/**
 * @swagger
 * /api/roles:
 *   post:
 *     summary: Create a new role
 *     tags: [Roles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Role'
 *     responses:
 *       200:
 *         description: Role created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Role'
 */
router.post('/', (req, res) => {
    const role = req.body;
    db.query('INSERT INTO roles SET ?', role, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ id: result.insertId, ...role });
        // Audit log
        if (req.user && req.user.id) {
            db.query('INSERT INTO audit_logs SET ?', {
                user_id: req.user.id,
                action: 'create_role',
                details: JSON.stringify({ role_id: result.insertId, role }),
            });
        }
    });
});

// Update role
/**
 * @swagger
 * /api/roles/{id}:
 *   put:
 *     summary: Update role by ID
 *     tags: [Roles]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Role'
 *     responses:
 *       200:
 *         description: Role updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.put('/:id', (req, res) => {
    db.query('UPDATE roles SET ? WHERE id = ?', [req.body, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: 'Role updated' });
        // Audit log
        if (req.user && req.user.id) {
            db.query('INSERT INTO audit_logs SET ?', {
                user_id: req.user.id,
                action: 'update_role',
                details: JSON.stringify({ role_id: req.params.id, role: req.body }),
            });
        }
    });
});

// Delete role
/**
 * @swagger
 * /api/roles/{id}:
 *   delete:
 *     summary: Delete role by ID
 *     tags: [Roles]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.delete('/:id', (req, res) => {
    db.query('DELETE FROM roles WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: 'Role deleted' });
        // Audit log
        if (req.user && req.user.id) {
            db.query('INSERT INTO audit_logs SET ?', {
                user_id: req.user.id,
                action: 'delete_role',
                details: JSON.stringify({ role_id: req.params.id }),
            });
        }
    });
});

export default router;
/**
 * @swagger
 * components:
 *   schemas:
 *     Role:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         permissions:
 *           type: object
 *           description: JSON permissions
 */
