import express from 'express';
const router = express.Router();
import db from '../db.js';

/**
 * @swagger
 * tags:
 *   name: CommunicationLogs
 *   description: Communication log endpoints
 */

/**
 * @swagger
 * /api/communication-logs:
 *   get:
 *     summary: Get all communication logs
 *     tags: [CommunicationLogs]
 *     responses:
 *       200:
 *         description: List of communication logs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CommunicationLog'
 */
// Get all communication logs
router.get('/', (req, res) => {
    db.query('SELECT * FROM communication_logs', (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

// Create communication log
/**
 * @swagger
 * /api/communication-logs:
 *   post:
 *     summary: Create a communication log
 *     tags: [CommunicationLogs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CommunicationLog'
 *     responses:
 *       200:
 *         description: Communication log created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommunicationLog'
 */
router.post('/', (req, res) => {
    const log = req.body;
    db.query('INSERT INTO communication_logs SET ?', log, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ id: result.insertId, ...log });
    });
});

export default router;
/**
 * @swagger
 * components:
 *   schemas:
 *     CommunicationLog:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         donor_id:
 *           type: integer
 *         type:
 *           type: string
 *         method:
 *           type: string
 *         status:
 *           type: string
 *         sent_at:
 *           type: string
 *           format: date-time
 *         message:
 *           type: string
 */
