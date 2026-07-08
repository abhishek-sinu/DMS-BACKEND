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
// Get all donations with donor and cultivator info
router.get('/', (req, res) => {
    (async () => {
        try {
        const [results] = await db.query(`
                SELECT 
                    donations.*,
                    COALESCE(donors.name, donations.donor_name) AS donor_name,
                    COALESCE(donors.phone, donations.phone_number) AS donor_phone,
                    cultivators.name AS cultivator_name
                FROM donations
                LEFT JOIN donors ON donations.phone_number = donors.phone
                LEFT JOIN cultivators ON donors.cultivator_id = cultivators.id
            `);
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
    const body = req.body || {};
    // Separate donor-related fields from donation columns
    const {
        initiated_name,
        address_line1,
        address_line2,
        post_office,
        city,
        district,
        state,
        pin_code,
        country,
        cultivator_id,
        ...donation
    } = body;
    // Fix transaction_date to YYYY-MM-DD if present
    if (donation.transaction_date) {
        const d = new Date(donation.transaction_date);
        if (!isNaN(d)) {
            donation.transaction_date = d.toISOString().slice(0, 10);
        }
    }
    try {
        // Auto-create donor if phone not found in donors table
        const phone = donation.phone_number ? String(donation.phone_number).trim() : '';
        if (phone) {
            const [existingDonors] = await db.query(
                'SELECT id FROM donors WHERE phone = ? LIMIT 1', [phone]
            );
            if (existingDonors.length === 0) {
                await db.query('INSERT INTO donors SET ?', {
                    name: donation.donor_name || 'Unknown',
                    phone,
                    initiated_name: initiated_name || null,
                    address_line1: address_line1 || null,
                    address_line2: address_line2 || null,
                    post_office: post_office || null,
                    city: city || null,
                    district: district || null,
                    state: state || null,
                    pin_code: pin_code || null,
                    country: country || null,
                    cultivator_id: cultivator_id || null,
                });
            } else if (cultivator_id) {
                // Assign cultivator if not already set on the existing donor
                await db.query(
                    'UPDATE donors SET cultivator_id = ? WHERE id = ? AND cultivator_id IS NULL',
                    [cultivator_id, existingDonors[0].id]
                );
            }
        }
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
        // Require both receipt_number and phone_number
        const missingFields = [];
        if (!donation.receipt_number && donation.receipt_number !== 0) missingFields.push('receipt_number');
        if (!donation.phone_number && donation.phone_number !== 0) missingFields.push('phone_number');
        if (missingFields.length > 0) {
            const reason = `Missing required field(s): ${missingFields.join(', ')}`;
            results.push({ row: i + 1, status: 'skipped', reason });
            console.warn(`Row ${i + 1}: skipped - ${reason}`);
            continue;
        }
        try {
                // Convert transaction_date to YYYY-MM-DD for MySQL DATE column
                if (donation.transaction_date) {
                    let dateStr = String(donation.transaction_date).trim();
                    // Handle DD/MM/YYYY or DD-MM-YYYY → convert to YYYY-MM-DD
                    let match = dateStr.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
                    if (match) {
                        // match[1]=DD, match[2]=MM, match[3]=YYYY
                        donation.transaction_date = `${match[3]}-${match[2]}-${match[1]}`;
                    } else {
                        // Try native Date parse for other formats (e.g. YYYY-MM-DD already)
                        const d = new Date(dateStr);
                        if (!isNaN(d)) {
                            donation.transaction_date = d.toISOString().slice(0, 10);
                        } else {
                            donation.transaction_date = null;
                        }
                    }
                }
            // Auto-create donor if phone not found in donors table
            let donorCreated = false;
            const phone = String(donation.phone_number).trim();
            const [existingDonors] = await db.query(
                'SELECT id FROM donors WHERE phone = ? LIMIT 1', [phone]
            );
            if (existingDonors.length === 0) {
                const donorName = donation.donor_name || 'Unknown';
                await db.query(
                    'INSERT INTO donors (name, phone) VALUES (?, ?)',
                    [donorName, phone]
                );
                donorCreated = true;
                console.log(`Row ${i + 1}: new donor created for phone ${phone}`);
            }
            await db.query('INSERT INTO donations SET ?', donation);
            results.push({ row: i + 1, status: 'inserted', donorCreated });
            console.log(`Row ${i + 1}: inserted`);
        } catch (err) {
            results.push({ row: i + 1, status: 'failed', reason: err.message || err });
            console.error(`Row ${i + 1}: failed - ${err.message || err}`);
        }
    }
    // Summary
    const failed = results.filter(r => r.status === 'failed');
    const skipped = results.filter(r => r.status === 'skipped');
    const inserted = results.filter(r => r.status === 'inserted');
    const newDonors = inserted.filter(r => r.donorCreated).length;
    const parts = [];
    if (inserted.length) parts.push(`${inserted.length} inserted`);
    if (newDonors) parts.push(`${newDonors} new donor(s) created`);
    if (skipped.length) parts.push(`${skipped.length} skipped (missing receipt/phone)`);
    if (failed.length) parts.push(`${failed.length} failed`);
    const message = parts.length ? parts.join(', ') + '.' : 'No rows processed.';
    console.log(`--- Import summary: ${message} ---`);
    res.json({
        message,
        inserted: inserted.length,
        newDonors,
        skipped: skipped.length,
        failed: failed.length,
        details: results
    });
});



export default router;
