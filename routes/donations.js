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
    const donations = req.body.donations;
    if (!Array.isArray(donations)) {
        return res.status(400).json({ error: 'donations must be an array' });
    }

    const skippedDetails = [];
    const validRows = []; // { donation, rowIndex }

    // Step 1: Validate and normalise dates — O(n), no DB calls
    for (let i = 0; i < donations.length; i++) {
        const donation = { ...donations[i] };
        const missingFields = [];
        if (!donation.receipt_number && donation.receipt_number !== 0) missingFields.push('receipt_number');
        if (!donation.phone_number && donation.phone_number !== 0) missingFields.push('phone_number');
        if (missingFields.length > 0) {
            skippedDetails.push({ row: i + 1, status: 'skipped', reason: `Missing required field(s): ${missingFields.join(', ')}` });
            continue;
        }
        if (donation.transaction_date) {
            let dateStr = String(donation.transaction_date).trim();
            const match = dateStr.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
            if (match) {
                donation.transaction_date = `${match[3]}-${match[2]}-${match[1]}`;
            } else {
                const d = new Date(dateStr);
                donation.transaction_date = isNaN(d) ? null : d.toISOString().slice(0, 10);
            }
        }
        donation.phone_number = String(donation.phone_number).trim();
        validRows.push({ donation, rowIndex: i });
    }

    if (validRows.length === 0) {
        return res.json({
            message: skippedDetails.length ? `${skippedDetails.length} skipped (missing receipt/phone).` : 'No rows found.',
            inserted: 0, newDonors: 0, skipped: skippedDetails.length, failed: 0,
            details: skippedDetails
        });
    }

    // Step 2: Bulk donor lookup — 1 query for all unique phones
    const uniquePhones = [...new Set(validRows.map(r => r.donation.phone_number))];
    const phonePlaceholders = uniquePhones.map(() => '?').join(',');
    const [existingDonorRows] = await db.query(
        `SELECT phone FROM donors WHERE phone IN (${phonePlaceholders})`,
        uniquePhones
    );
    const existingPhones = new Set(existingDonorRows.map(r => r.phone));

    // Step 3: Bulk INSERT new donors — 1 query
    const newPhones = uniquePhones.filter(p => !existingPhones.has(p));
    const newPhoneSet = new Set(newPhones);
    let newDonors = 0;
    if (newPhones.length > 0) {
        const donorValues = newPhones.map(phone => {
            const row = validRows.find(r => r.donation.phone_number === phone);
            return [row.donation.donor_name || 'Unknown', phone];
        });
        await db.query('INSERT INTO donors (name, phone) VALUES ?', [donorValues]);
        newDonors = newPhones.length;
    }

    // Step 4: Bulk INSERT donations — 1 query (with per-row fallback on conflict)
    const donationValues = validRows.map(r => [
        r.donation.receipt_number,
        r.donation.phone_number,
        r.donation.transaction_date || null,
        r.donation.instrument_number || null,
        r.donation.donor_name || null,
        r.donation.amount || null,
        r.donation.scheme_name || null,
        r.donation.mode_of_payment || null
    ]);

    let insertedCount = 0;
    const failedDetails = [];

    try {
        await db.query(
            'INSERT INTO donations (receipt_number, phone_number, transaction_date, instrument_number, donor_name, amount, scheme_name, mode_of_payment) VALUES ?',
            [donationValues]
        );
        insertedCount = validRows.length;
    } catch (bulkErr) {
        // Bulk failed (e.g. duplicate receipt_number) — fall back to per-row inserts for error detail
        for (const { donation, rowIndex } of validRows) {
            try {
                await db.query('INSERT INTO donations SET ?', donation);
                insertedCount++;
            } catch (rowErr) {
                failedDetails.push({ row: rowIndex + 1, status: 'failed', reason: rowErr.message });
            }
        }
    }

    const allDetails = [...skippedDetails, ...failedDetails];
    const parts = [];
    if (insertedCount) parts.push(`${insertedCount} inserted`);
    if (newDonors) parts.push(`${newDonors} new donor(s) created`);
    if (skippedDetails.length) parts.push(`${skippedDetails.length} skipped (missing receipt/phone)`);
    if (failedDetails.length) parts.push(`${failedDetails.length} failed`);
    const message = parts.length ? parts.join(', ') + '.' : 'No rows processed.';

    res.json({
        message,
        inserted: insertedCount,
        newDonors,
        skipped: skippedDetails.length,
        failed: failedDetails.length,
        details: allDetails   // only skipped/failed rows — keeps payload small
    });
});



export default router;
