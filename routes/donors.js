import express from 'express';
const router = express.Router();
import db from '../db.js';
import { body, validationResult } from 'express-validator';

/**
 * @swagger
 * tags:
 *   name: Donors
 *   description: Donor management endpoints
 */

/**
 * @swagger
 * /api/donors:
 *   get:
 *     summary: Get all donors
 *     tags: [Donors]
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
// Get all donors
router.get('/', (req, res) => {
    (async () => {
        try {
            const [results] = await db.query('SELECT * FROM donors');
            res.json(results);
        } catch (err) {
            res.status(500).json({ error: err });
        }
    })();
});

// Get donor by ID
/**
 * @swagger
 * /api/donors/{id}:
 *   get:
 *     summary: Get donor by ID
 *     tags: [Donors]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Donor ID
 *     responses:
 *       200:
 *         description: Donor object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Donor'
 */
router.get('/:id', (req, res) => {
    (async () => {
        try {
            const [donorResults] = await db.query('SELECT * FROM donors WHERE id = ?', [req.params.id]);
            if (!donorResults[0]) return res.status(404).json({ error: 'Donor not found' });
            const [familyResults] = await db.query('SELECT * FROM donor_family_members WHERE donor_id = ?', [req.params.id]);
            res.json({ ...donorResults[0], family_members: familyResults });
        } catch (err) {
            res.status(500).json({ error: err });
        }
    })();
});

// Create donor
/**
 * @swagger
 * /api/donors:
 *   post:
 *     summary: Create a new donor
 *     tags: [Donors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Donor'
 *     responses:
 *       200:
 *         description: Donor created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Donor'
 */
router.post('/',
    [
        body('name').notEmpty().withMessage('Name is required'),
        body('email').isEmail().optional({ nullable: true }).withMessage('Invalid email'),
        body('phone').isString().optional({ nullable: true }),
        body('date_of_birth').optional({ nullable: true }).isISO8601().withMessage('Invalid date'),
        body('anniversary_date').optional({ nullable: true }).isISO8601().withMessage('Invalid date')
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const donor = req.body;
        db.query('INSERT INTO donors SET ?', donor, (err, result) => {
            if (err) {
                console.error('DB error:', err);
                return res.status(500).json({ error: 'Database error', details: err });
            }
            res.json({ id: result.insertId, ...donor });
            // Audit log
            if (req.user && req.user.id) {
                db.query('INSERT INTO audit_logs SET ?', {
                    user_id: req.user.id,
                    action: 'create_donor',
                    details: JSON.stringify({ donor_id: result.insertId, donor }),
                });
            }
        });
    }
);

// Update donor
/**
 * @swagger
 * /api/donors/{id}:
 *   put:
 *     summary: Update donor by ID
 *     tags: [Donors]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Donor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Donor'
 *     responses:
 *       200:
 *         description: Donor updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.put('/:id', async (req, res) => {
    try {
        // Exclude family_members from donor update
        const donorData = { ...req.body };
        const familyMembers = donorData.family_members || [];
        delete donorData.family_members;
        // Convert all date fields to YYYY-MM-DD if present
        const dateFields = ['date_of_birth', 'anniversary_date', 'created_at', 'updated_at'];
        dateFields.forEach(field => {
            if (donorData[field]) {
                donorData[field] = donorData[field].split('T')[0];
            }
        });
        // Also convert family member date_of_birth
        if (Array.isArray(familyMembers)) {
            familyMembers.forEach(member => {
                if (member.date_of_birth) {
                    member.date_of_birth = member.date_of_birth.split('T')[0];
                }
            });
        }
        await db.query('UPDATE donors SET ? WHERE id = ?', [donorData, req.params.id]);
        // Upsert family members if provided
        if (Array.isArray(familyMembers) && familyMembers.length > 0) {
            for (const member of familyMembers) {
                if (member.id) {
                    // Update existing family member
                    await db.query('UPDATE donor_family_members SET ? WHERE id = ? AND donor_id = ?', [{ name: member.name, relation: member.relation, date_of_birth: member.date_of_birth }, member.id, req.params.id]);
                } else {
                    // Insert new family member
                    await db.query('INSERT INTO donor_family_members SET ?', { donor_id: req.params.id, name: member.name, relation: member.relation, date_of_birth: member.date_of_birth });
                }
            }
        }
        res.json({ message: 'Donor updated' });
        // Audit log
        if (req.user && req.user.id) {
            await db.query('INSERT INTO audit_logs SET ?', {
                user_id: req.user.id,
                action: 'update_donor',
                details: JSON.stringify({ donor_id: req.params.id, donor: donorData, family_members: familyMembers }),
            });
        }
    } catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});

// Delete donor
/**
 * @swagger
 * /api/donors/{id}:
 *   delete:
 *     summary: Delete donor by ID
 *     tags: [Donors]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Donor ID
 *     responses:
 *       200:
 *         description: Donor deleted
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
        // Delete all family members for this donor
        await db.query('DELETE FROM donor_family_members WHERE donor_id = ?', [req.params.id]);
        // Delete the donor
        await db.query('DELETE FROM donors WHERE id = ?', [req.params.id]);
        res.json({ message: 'Donor deleted' });
        // Audit log
        if (req.user && req.user.id) {
            await db.query('INSERT INTO audit_logs SET ?', {
                user_id: req.user.id,
                action: 'delete_donor',
                details: JSON.stringify({ donor_id: req.params.id }),
            });
        }
    } catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});

export default router;
/**
 * @swagger
 * components:
 *   schemas:
 *     Donor:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         phone:
 *           type: string
 *         address:
 *           type: string
 *         date_of_birth:
 *           type: string
 *           format: date
 *         anniversary_date:
 *           type: string
 *           format: date
 *         notes:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */
