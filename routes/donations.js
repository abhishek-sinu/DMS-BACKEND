import express from 'express';
const router = express.Router();
import db from '../db.js';

/**
 * @swagger
 * tags:
 *   name: Donations
 *   description: Donation management endpoints
 */

/**
 * @swagger
 * /api/donations:
 *   get:
 *     summary: Get all donations
 *     tags: [Donations]
 *     responses:
 *       200:
 *         description: List of donations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Donation'
 */
// Get all donations
router.get('/', (req, res) => {
    (async () => {
        try {
            const [results] = await db.query('SELECT * FROM donations');
            res.json(results);
        } catch (err) {
            res.status(500).json({ error: err });
        }
    })();
});

// Get donation by ID
/**
 * @swagger
 * /api/donations/{id}:
 *   get:
 *     summary: Get donation by ID
 *     tags: [Donations]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Donation ID
 *     responses:
 *       200:
 *         description: Donation object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Donation'
 */
router.get('/:id', (req, res) => {
    (async () => {
        try {
            const [results] = await db.query('SELECT * FROM donations WHERE id = ?', [req.params.id]);
            res.json(results[0]);
        } catch (err) {
            res.status(500).json({ error: err });
        }
    })();
});

// Create donation
/**
 * @swagger
 * /api/donations:
 *   post:
 *     summary: Create a new donation
 *     tags: [Donations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Donation'
 *     responses:
 *       200:
 *         description: Donation created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Donation'
 */
router.post('/', (req, res) => {
    const donation = req.body;
    db.query('INSERT INTO donations SET ?', donation, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ id: result.insertId, ...donation });
        // Audit log
        if (req.user && req.user.id) {
            db.query('INSERT INTO audit_logs SET ?', {
                user_id: req.user.id,
                action: 'create_donation',
                details: JSON.stringify({ donation_id: result.insertId, donation }),
            });
        }
    });
});

// Update donation
/**
 * @swagger
 * /api/donations/{id}:
 *   put:
 *     summary: Update donation by ID
 *     tags: [Donations]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Donation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Donation'
 *     responses:
 *       200:
 *         description: Donation updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.put('/:id', (req, res) => {
    db.query('UPDATE donations SET ? WHERE id = ?', [req.body, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: 'Donation updated' });
        // Audit log
        if (req.user && req.user.id) {
            db.query('INSERT INTO audit_logs SET ?', {
                user_id: req.user.id,
                action: 'update_donation',
                details: JSON.stringify({ donation_id: req.params.id, donation: req.body }),
            });
        }
    });
});

// Delete donation
/**
 * @swagger
 * /api/donations/{id}:
 *   delete:
 *     summary: Delete donation by ID
 *     tags: [Donations]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Donation ID
 *     responses:
 *       200:
 *         description: Donation deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.delete('/:id', (req, res) => {
    db.query('DELETE FROM donations WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: 'Donation deleted' });
        // Audit log
        if (req.user && req.user.id) {
            db.query('INSERT INTO audit_logs SET ?', {
                user_id: req.user.id,
                action: 'delete_donation',
                details: JSON.stringify({ donation_id: req.params.id }),
            });
        }
    });
});

export default router;
/**
 * @swagger
 * components:
 *   schemas:
 *     Donation:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         donor_id:
 *           type: integer
 *         amount:
 *           type: number
 *           format: float
 *         donation_date:
 *           type: string
 *           format: date
 *         donation_type:
 *           type: string
 *         purpose:
 *           type: string
 *         receipt_number:
 *           type: string
 *         payment_details:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */
