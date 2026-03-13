import express from 'express';
const router = express.Router();
import db from '../db.js';

// Get all cultivators
router.get('/', async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM cultivators');
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err });
    }
});

// Add a cultivator
router.post('/', async (req, res) => {
    const { name, phone } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (!phone) return res.status(400).json({ error: 'Phone is required' });
    try {
        const [result] = await db.query('INSERT INTO cultivators (name, phone) VALUES (?, ?)', [name, phone]);
        res.status(201).json({ id: result.insertId, name, phone });
    } catch (err) {
        res.status(500).json({ error: err });
    }
});

// Edit a cultivator
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, phone } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (!phone) return res.status(400).json({ error: 'Phone is required' });
    try {
        await db.query('UPDATE cultivators SET name = ?, phone = ? WHERE id = ?', [name, phone, id]);
        res.json({ id, name, phone });
    } catch (err) {
        res.status(500).json({ error: err });
    }
});

// Delete a cultivator
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM cultivators WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err });
    }
});
export default router;
