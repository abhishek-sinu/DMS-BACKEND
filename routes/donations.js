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
router.post('/', async (req, res) => {
    const donation = req.body;
    // Fix transaction_date to YYYY-MM-DD if present
    if (donation.transaction_date) {
        const d = new Date(donation.transaction_date);
        if (!isNaN(d)) {
            donation.transaction_date = d.toISOString().slice(0, 10);
        }
    }
    try {
        const [result] = await db.query('INSERT INTO donations SET ?', donation);
        // Audit log
        if (req.user && req.user.id) {
            await db.query('INSERT INTO audit_logs SET ?', {
                user_id: req.user.id,
                action: 'create_donation',
                details: JSON.stringify({ donation_id: result.insertId, donation }),
            });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message || err });
    }
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
    (async () => {
        try {
            console.log('--- Donation Update API called ---');
            console.log('Request params:', req.params);
            console.log('Request body:', req.body);
            const donation = req.body;
            // Fix transaction_date to YYYY-MM-DD if present
            if (donation.transaction_date) {
                const d = new Date(donation.transaction_date);
                if (!isNaN(d)) {
                    donation.transaction_date = d.toISOString().slice(0, 10);
                }
            }
            console.log('date:',donation.transaction_date);
            const [result] = await db.query('UPDATE donations SET ? WHERE id = ?', [donation, req.params.id]);
            console.log('Donation update result:', result);
            // Audit log (awaited, like donor update)
            if (req.user && req.user.id) {
                try {
                    await db.query('INSERT INTO audit_logs SET ?', {
                        user_id: req.user.id,
                        action: 'update_donation',
                        details: JSON.stringify({ donation_id: req.params.id, donation }),
                    });
                } catch (auditErr) {
                    console.error('Audit log error:', auditErr);
                }
            }
            res.json({ success: true });
            console.log('--- Donation update response sent ---');
        } catch (e) {
            console.error('Unexpected error in update donation:', e);
            res.status(500).json({ error: 'Unexpected error' });
        }
    })();
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
router.delete('/:id', async (req, res) => {
    try {
        console.log('--- Entry: DELETE /api/donations/' + req.params.id + ' ---');
        await db.query('DELETE FROM donations WHERE id = ?', [req.params.id]);
        // Audit log
        if (req.user && req.user.id) {
            await db.query('INSERT INTO audit_logs SET ?', {
                user_id: req.user.id,
                action: 'delete_donation',
                details: JSON.stringify({ donation_id: req.params.id }),
            });
        }
        res.json({ success: true });
        console.log('--- Exit: DELETE /api/donations/' + req.params.id + ' (success) ---');
    } catch (err) {
        console.error('--- Exit: DELETE /api/donations/' + req.params.id + ' (error):', err);
        res.status(500).json({ error: err.message || err });
    }
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
