import express from 'express';
const router = express.Router();
import db from '../db.js';
import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

// Get all cultivators
router.get('/', async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM cultivators');
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err });
    }
});

// XLS export for cultivators
router.get('/export/xls', async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM cultivators');
        const cleaned = results.map(({ id, ...rest }) => rest);
        const ws = XLSX.utils.json_to_sheet(cleaned);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Cultivators');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="cultivators.xlsx"');
        res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ error: err });
    }
});

// PDF export for cultivators
router.get('/export/pdf', async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM cultivators');
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        res.setHeader('Content-Disposition', 'attachment; filename="cultivators.pdf"');
        res.type('application/pdf');
        doc.pipe(res);

        doc.fontSize(18).text('Cultivators Report', { align: 'center' });
        doc.moveDown();

        if (results.length === 0) {
            doc.fontSize(12).text('No cultivators found.');
            doc.end();
            return;
        }

        const columns = ['name', 'phone'];
        const headers = ['Name', 'Phone Number'];
        const tableLeft = 40;
        const tableWidth = doc.page.width - 80;
        const colWidth = tableWidth / columns.length;
        const rowHeight = 30;

        // Draw header
        let y = doc.y;
        doc.fontSize(11).font('Helvetica-Bold');
        doc.rect(tableLeft, y, tableWidth, rowHeight).fill('#2563EB');
        headers.forEach((h, i) => {
            doc.fillColor('#FFFFFF').text(h, tableLeft + i * colWidth + 8, y + 9, { width: colWidth - 16 });
        });
        y += rowHeight;

        // Draw rows
        doc.font('Helvetica').fillColor('#000000');
        results.forEach((row, idx) => {
            if (y + rowHeight > doc.page.height - 40) {
                doc.addPage();
                y = 40;
            }
            const bg = idx % 2 === 0 ? '#F3F4F6' : '#FFFFFF';
            doc.rect(tableLeft, y, tableWidth, rowHeight).fill(bg);
            doc.fillColor('#000000');
            columns.forEach((col, i) => {
                doc.fontSize(10).text(row[col] != null ? String(row[col]) : '-', tableLeft + i * colWidth + 8, y + 9, { width: colWidth - 16 });
            });
            y += rowHeight;
        });

        doc.end();
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

// Bulk import cultivators from Excel
router.post('/import', async (req, res) => {
    const cultivators = req.body.cultivators;
    if (!Array.isArray(cultivators)) {
        return res.status(400).json({ error: 'cultivators must be an array' });
    }
    const results = [];
    for (let i = 0; i < cultivators.length; i++) {
        const c = cultivators[i];
        if (!c.name) {
            results.push({ row: i + 1, status: 'failed', reason: 'Name is required' });
            continue;
        }
        try {
            await db.query('INSERT INTO cultivators SET ?', { name: c.name, phone: c.phone || null });
            results.push({ row: i + 1, status: 'inserted' });
        } catch (err) {
            results.push({ row: i + 1, status: 'failed', reason: err.message || err });
        }
    }
    const failed = results.filter(r => r.status === 'failed');
    const inserted = results.filter(r => r.status === 'inserted');
    let message = '';
    if (inserted.length === cultivators.length) {
        message = 'All rows inserted successfully.';
    } else if (inserted.length === 0) {
        message = 'No rows inserted.';
    } else {
        message = `Partial insert: ${inserted.length} inserted, ${failed.length} failed.`;
    }
    res.json({ message, inserted: inserted.length, failed: failed.length, details: results });
});

export default router;
