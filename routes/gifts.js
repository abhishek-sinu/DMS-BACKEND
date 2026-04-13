import express from 'express';
const router = express.Router();

import db from '../db.js';
import { query, validationResult } from 'express-validator';

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

export default router;