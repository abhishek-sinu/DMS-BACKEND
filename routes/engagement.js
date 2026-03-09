import express from 'express';
const router = express.Router();
import db from '../db.js';

/**
 * @swagger
 * tags:
 *   name: Engagement
 *   description: Donor engagement endpoints
 */

/**
 * @swagger
 * /api/engagement/birthdays:
 *   get:
 *     summary: Get donors with birthdays today
 *     tags: [Engagement]
 *     responses:
 *       200:
 *         description: List of donors
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Donor'
 */
// Get donors with upcoming birthdays
router.get('/birthdays', (req, res) => {
    db.query('SELECT * FROM donors WHERE MONTH(date_of_birth) = MONTH(CURDATE()) AND DAY(date_of_birth) = DAY(CURDATE())', (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

// Get donors with upcoming anniversaries
/**
 * @swagger
 * /api/engagement/anniversaries:
 *   get:
 *     summary: Get donors with anniversaries today
 *     tags: [Engagement]
 *     responses:
 *       200:
 *         description: List of donors
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Donor'
 */
router.get('/anniversaries', (req, res) => {
    db.query('SELECT * FROM donors WHERE MONTH(anniversary_date) = MONTH(CURDATE()) AND DAY(anniversary_date) = DAY(CURDATE())', (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

export default router;
