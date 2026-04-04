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

// Bulk import donations from Excel
router.post('/import', async (req, res) => {
    console.log('--- Entry: POST /api/donations/import ---');
    const donations = req.body.donations;
    if (!Array.isArray(donations)) {
        console.error('Import failed: donations must be an array');
        return res.status(400).json({ error: 'donations must be an array' });
    }
    const results = [];
    for (let i = 0; i < donations.length; i++) {
        const donation = donations[i];
        try {
            // Fix transaction_date to YYYY-MM-DD if present
            if (donation.transaction_date) {
                const d = new Date(donation.transaction_date);
                if (!isNaN(d)) {
                    donation.transaction_date = d.toISOString().slice(0, 10);
                }
            }
            await db.query('INSERT INTO donations SET ?', donation);
            results.push({ row: i + 1, status: 'inserted' });
            console.log(`Row ${i + 1}: inserted`);
        } catch (err) {
            results.push({ row: i + 1, status: 'failed', reason: err.message || err });
            console.error(`Row ${i + 1}: failed - ${err.message || err}`);
        }
    }
    // Summary
    const failed = results.filter(r => r.status === 'failed');
    const inserted = results.filter(r => r.status === 'inserted');
    let message = '';
    if (inserted.length === donations.length) {
        message = 'All rows inserted successfully.';
    } else if (inserted.length === 0) {
        message = 'No rows inserted.';
    } else {
        message = `Partial insert: ${inserted.length} inserted, ${failed.length} failed.`;
    }
    console.log(`--- Import summary: ${message} ---`);
    res.json({
        message,
        inserted: inserted.length,
        failed: failed.length,
        details: results
    });
});



export default router;
