import express from 'express';
const router = express.Router();

import db from '../db.js';
import { body, query, validationResult } from 'express-validator';

/**
 * @swagger
 * tags:
 *   name: Gifts
 *   description: Gift management endpoints
 */

/**
 * @swagger
 * /api/gifts:
 *   get:
 *     summary: Get all gifts
 *     tags: [Gifts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of records per page (default 10)
 *     responses:
 *       200:
 *         description: List of gifts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */

// ✅ Validation
const validateQuery = [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
];

// ✅ GET API
router.get('/', validateQuery, async (req, res) => {
    try {
        // 🔹 Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // 🔹 Pagination params
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // 🔹 Main query (ALL columns)
        const [rows] = await db.query(
            `
            SELECT 
                id,
                phone,
                gift_name,
                description,
                value,
                date_given,
                created_at
            FROM gifts
            ORDER BY id DESC
            LIMIT ? OFFSET ?
            `,
            [limit, offset]
        );

        // 🔹 Count query
        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) as total FROM gifts`
        );

        // 🔹 Response
        res.json({
            data: rows,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });

    } catch (err) {
        console.error('Error fetching gifts:', err);
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message,
        });
    }
});


// Get gifts by phone number
/**
 * @swagger
 * /api/gifts/by-phone:
 *   get:
 *     summary: Get gifts by donor phone number
 *     tags: [Gifts]
 *     parameters:
 *       - in: query
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *         description: Donor mobile number
 *     responses:
 *       200:
 *         description: List of gifts for given phone
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */

// ✅ Validation middleware
const validatePhone = [
    query('phone')
        .notEmpty().withMessage('Phone is required')
        .isLength({ min: 10, max: 15 }).withMessage('Invalid phone number'),
];

// ✅ GET API
router.get('/by-phone', validatePhone, async (req, res) => {
    try {
        // 🔹 Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { phone } = req.query;

        // 🔹 Query DB
        const [rows] = await db.query(
            `
            SELECT 
                id,
                phone,
                gift_name,
                description,
                value,
                date_given,
                created_at
            FROM gifts
            WHERE phone = ?
            ORDER BY date_given DESC
            `,
            [phone]
        );

        // 🔹 Handle no data case
        if (rows.length === 0) {
            return res.status(404).json({
                message: 'No gifts found for this phone number'
            });
        }

        // 🔹 Response
        res.json({
            count: rows.length,
            data: rows
        });

    } catch (err) {
        console.error('Error fetching gifts by phone:', err);
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message
        });
    }
});

//create gift
/**
 * @swagger
 * /api/gifts:
 *   post:
 *     summary: Create a new gift
 *     tags: [Gifts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - gift_name
 *               - value
 *               - date_given
 *             properties:
 *               phone:
 *                 type: string
 *               gift_name:
 *                 type: string
 *               description:
 *                 type: string
 *               value:
 *                 type: number
 *               date_given:
 *                 type: string
 *                 format: date
 *               created_at:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Gift created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */


// ✅ Validation rules
const validateGift = [
    body('phone')
        .notEmpty().withMessage('Phone is required')
        .isLength({ min: 10, max: 15 }).withMessage('Invalid phone number'),

    body('gift_name')
        .notEmpty().withMessage('Gift name is required'),

    body('description')
        .optional(),

    body('value')
        .notEmpty().withMessage('Value is required')
        .isFloat({ min: 0 }).withMessage('Value must be a positive number'),

    body('date_given')
        .notEmpty().withMessage('Date given is required')
        .isDate().withMessage('Invalid date format'),

    body('created_at')
        .optional()
        .isISO8601().withMessage('Invalid datetime format'),
];

// Edit a gift
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { phone, gift_name, description, value, date_given, created_at } = req.body;

  if (!phone) return res.status(400).json({ error: 'Phone is required' });
  if (!gift_name) return res.status(400).json({ error: 'Gift name is required' });
  if (!value) return res.status(400).json({ error: 'Value is required' });
  if (!date_given) return res.status(400).json({ error: 'Date given is required' });

  try {
    await db.query(
      `UPDATE gifts 
       SET phone = ?, gift_name = ?, description = ?, value = ?, date_given = ?, created_at = ?
       WHERE id = ?`,
      [phone, gift_name, description, value, date_given, created_at, id]
    );

    res.json({ id, phone, gift_name, description, value, date_given, created_at });

  } catch (err) {
    res.status(500).json({ error: err });
  }
});

// ✅ POST API
router.post('/', validateGift, async (req, res) => {
    try {
        // 🔹 Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            phone,
            gift_name,
            description,
            value,
            date_given,
            created_at
        } = req.body;

        // 🔹 Insert query
        const [result] = await db.query(
            `
            INSERT INTO gifts
            (phone, gift_name, description, value, date_given, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                phone,
                gift_name,
                description || null,
                value,
                date_given,
                created_at || new Date() // default if not provided
            ]
        );

        // 🔹 Fetch inserted row (optional but useful)
        const [rows] = await db.query(
            `SELECT * FROM gifts WHERE id = ?`,
            [result.insertId]
        );

        // 🔹 Response
        res.status(201).json({
            message: 'Gift created successfully',
            data: rows[0],
        });

    } catch (err) {
        console.error('Error creating gift:', err);
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message,
        });
    }
});


// Delete gifts by phone number
/**
 * @swagger
 * /api/gifts/by-phone:
 *   delete:
 *     summary: Delete gifts by phone number
 *     tags: [Gifts]
 *     parameters:
 *       - in: query
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *         description: Donor phone number
 *     responses:
 *       200:
 *         description: Gifts deleted successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: No gifts found
 *       500:
 *         description: Server error
 */

// ✅ Validation
const validatePhonedel = [
    query('phone')
        .notEmpty().withMessage('Phone is required')
        .isLength({ min: 10, max: 15 }).withMessage('Invalid phone number'),
];

// ✅ DELETE API
router.delete('/by-phone', validatePhonedel, async (req, res) => {
    try {
        // 🔹 Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { phone } = req.query;

        // 🔹 Check if records exist
        const [existing] = await db.query(
            `SELECT COUNT(*) AS count FROM gifts WHERE phone = ?`,
            [phone]
        );

        if (existing[0].count === 0) {
            return res.status(404).json({
                message: 'No gifts found for this phone number'
            });
        }

        // 🔹 Delete query
        const [result] = await db.query(
            `DELETE FROM gifts WHERE phone = ?`,
            [phone]
        );

        // 🔹 Response
        res.json({
            message: 'Gifts deleted successfully',
            deletedCount: result.affectedRows
        });

    } catch (err) {
        console.error('Error deleting gifts:', err);
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message
        });
    }
});

// Bulk import gifts from JSON array/Excel (POST /api/gifts/import)
/**
 * @swagger
 * /api/gifts/import:
 *   post:
 *     summary: Bulk import gifts
 *     tags: [Gifts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               gifts:
 *                 type: array
 *     responses:
 *       200:
 *         description: Import summary
 */

// ✅ Bulk Import API
router.post('/import', async (req, res) => {
    console.log('--- Entry: POST /api/gifts/import ---');

    const gifts = req.body.gifts;

    // 🔹 Validate input
    if (!Array.isArray(gifts)) {
        return res.status(400).json({ error: 'gifts must be an array' });
    }

    // 🔹 Get valid columns dynamically
    let validColumns = [];
    try {
        const [columns] = await db.query('SHOW COLUMNS FROM gifts');
        validColumns = columns.map(c => c.Field);
    } catch (err) {
        console.error('Could not fetch gift columns:', err);
    }

    const results = [];

    // 🔥 Process each row
    for (let i = 0; i < gifts.length; i++) {
        const raw = gifts[i];

        try {
            const gift = {};

            // 🔹 Clean + filter fields
            for (const [key, val] of Object.entries(raw)) {
                if (val === null || val === undefined || val === '') continue;

                if (validColumns.length === 0 || validColumns.includes(key)) {
                    gift[key] = val;
                }
            }

            // 🔹 Normalize date_given
            if (gift.date_given) {
                const d = new Date(gift.date_given);
                if (!isNaN(d)) {
                    gift.date_given = d.toISOString().slice(0, 10);
                }
            }

            // 🔹 Set created_at if missing
            if (!gift.created_at) {
                gift.created_at = new Date();
            }

            // 🔹 Remove id if present
            delete gift.id;

            console.log(`Row ${i + 1} data:`, JSON.stringify(gift));

            // 🔥 Duplicate check (phone + gift_name + date_given)
            if (gift.phone && gift.gift_name && gift.date_given) {
                const [existing] = await db.query(
                    `
                    SELECT id FROM gifts 
                    WHERE phone = ? AND gift_name = ? AND date_given = ?
                    LIMIT 1
                    `,
                    [gift.phone, gift.gift_name, gift.date_given]
                );

                if (existing.length > 0) {
                    results.push({
                        row: i + 1,
                        status: 'skipped',
                        reason: 'Duplicate gift entry'
                    });
                    console.log(`Row ${i + 1}: skipped (duplicate)`);
                    continue;
                }
            }

            // 🔹 Insert into DB
            await db.query('INSERT INTO gifts SET ?', gift);

            results.push({
                row: i + 1,
                status: 'inserted'
            });

            console.log(`Row ${i + 1}: inserted`);

        } catch (err) {
            results.push({
                row: i + 1,
                status: 'failed',
                reason: err.message || err
            });

            console.error(`Row ${i + 1}: failed - ${err.message || err}`);
        }
    }

    // 🔹 Summary
    const inserted = results.filter(r => r.status === 'inserted');
    const skipped = results.filter(r => r.status === 'skipped');
    const failed = results.filter(r => r.status === 'failed');

    let message = '';

    if (inserted.length === gifts.length) {
        message = 'All rows inserted successfully.';
    } else if (inserted.length === 0 && skipped.length === 0) {
        message = 'No rows inserted.';
    } else {
        const parts = [`${inserted.length} inserted`];
        if (skipped.length > 0) parts.push(`${skipped.length} skipped`);
        if (failed.length > 0) parts.push(`${failed.length} failed`);
        message = parts.join(', ') + '.';
    }

    console.log(`--- Import summary: ${message} ---`);

    res.json({
        message,
        inserted: inserted.length,
        skipped: skipped.length,
        failed: failed.length,
        details: results
    });
});

export default router;