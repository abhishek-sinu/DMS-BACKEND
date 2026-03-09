import express from 'express';
const router = express.Router();
import db from '../db.js';

// Get all family members for a donor
router.get('/:donorId/family-members', async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM donor_family_members WHERE donor_id = ?', [req.params.donorId]);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err });
    }
});

// Add a family member
router.post('/:donorId/family-members', async (req, res) => {
    const { name, relation, date_of_birth } = req.body;
    try {
        const [result] = await db.query('INSERT INTO donor_family_members SET ?', {
            donor_id: req.params.donorId,
            name,
            relation,
            date_of_birth
        });
        res.json({ id: result.insertId, donor_id: req.params.donorId, name, relation, date_of_birth });
    } catch (err) {
        res.status(500).json({ error: err });
    }
});

// Update a family member
router.put('/:donorId/family-members/:memberId', async (req, res) => {
    const { name, relation, date_of_birth } = req.body;
    try {
        await db.query('UPDATE donor_family_members SET ? WHERE id = ? AND donor_id = ?', [{ name, relation, date_of_birth }, req.params.memberId, req.params.donorId]);
        res.json({ message: 'Family member updated' });
    } catch (err) {
        res.status(500).json({ error: err });
    }
});

// Delete a family member
router.delete('/:donorId/family-members/:memberId', async (req, res) => {
    try {
        await db.query('DELETE FROM donor_family_members WHERE id = ? AND donor_id = ?', [req.params.memberId, req.params.donorId]);
        res.json({ message: 'Family member deleted' });
    } catch (err) {
        res.status(500).json({ error: err });
    }
});

export default router;
