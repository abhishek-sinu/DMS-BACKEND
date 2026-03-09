import express from 'express';
const router = express.Router();
import db from '../db.js';

/**
 * @swagger
 * tags:
 *   name: AuditLogs
 *   description: Audit log endpoints
 */

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: Get all audit logs
 *     tags: [AuditLogs]
 *     responses:
 *       200:
 *         description: List of audit logs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AuditLog'
 */
// Get all audit logs
router.get('/', (req, res) => {
    db.query('SELECT * FROM audit_logs', (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

// Create audit log
/**
 * @swagger
 * /api/audit-logs:
 *   post:
 *     summary: Create an audit log
 *     tags: [AuditLogs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuditLog'
 *     responses:
 *       200:
 *         description: Audit log created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditLog'
 */
router.post('/', (req, res) => {
    const log = req.body;
    db.query('INSERT INTO audit_logs SET ?', log, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ id: result.insertId, ...log });
    });
});

export default router;
/**
 * @swagger
 * components:
 *   schemas:
 *     AuditLog:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         action:
 *           type: string
 *         timestamp:
 *           type: string
 *           format: date-time
 *         details:
 *           type: string
 */
