import express from 'express';
const router = express.Router();
import db from '../db.js';
import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

/**
 * @swagger
 * tags:
 *   name: Report
 *   description: Reporting endpoints
 */

/**
 * @swagger
 * /api/report/donations/xls:
 *   get:
 *     summary: Export donations to XLS
 *     tags: [Report]
 *     responses:
 *       200:
 *         description: XLS file download
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
// XLS export for donations
router.get('/donations/xls', async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM donations');
        // Remove id field from each row
        const cleaned = results.map(({ id, ...rest }) => {
            if (rest.transaction_date) rest.transaction_date = new Date(rest.transaction_date).toLocaleDateString('en-IN');
            if (rest.donation_date) rest.donation_date = new Date(rest.donation_date).toLocaleDateString('en-IN');
            if (rest.created_at) rest.created_at = new Date(rest.created_at).toLocaleDateString('en-IN');
            return rest;
        });
        const ws = XLSX.utils.json_to_sheet(cleaned);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Donations');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="donations.xlsx"');
        res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ error: err });
    }
});

// PDF export for donations
/**
 * @swagger
 * /api/report/donations/pdf:
 *   get:
 *     summary: Export donations to PDF
 *     tags: [Report]
 *     responses:
 *       200:
 *         description: PDF file download
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/donations/pdf', async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM donations');
        const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
        res.setHeader('Content-Disposition', 'attachment; filename="donations.pdf"');
        res.type('application/pdf');
        doc.pipe(res);

        doc.fontSize(18).text('Donations Report', { align: 'center' });
        doc.moveDown();

        if (results.length === 0) {
            doc.fontSize(12).text('No donations found.');
            doc.end();
            return;
        }

        // Get columns (exclude id)
        const allKeys = Object.keys(results[0]).filter(k => k !== 'id');
        const colCount = allKeys.length;
        const tableLeft = 40;
        const tableWidth = doc.page.width - 80;
        const colWidth = tableWidth / colCount;
        const rowHeight = 25;

        // Draw header
        let y = doc.y;
        doc.fontSize(9).font('Helvetica-Bold');
        doc.rect(tableLeft, y, tableWidth, rowHeight).fill('#2563EB');
        allKeys.forEach((key, i) => {
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            doc.fillColor('#FFFFFF').text(label, tableLeft + i * colWidth + 4, y + 7, { width: colWidth - 8, ellipsis: true });
        });
        y += rowHeight;

        // Draw rows
        doc.font('Helvetica').fillColor('#000000');
        results.forEach((row, rowIndex) => {
            // Add new page if needed
            if (y + rowHeight > doc.page.height - 40) {
                doc.addPage();
                y = 40;
            }
            const bgColor = rowIndex % 2 === 0 ? '#F3F4F6' : '#FFFFFF';
            doc.rect(tableLeft, y, tableWidth, rowHeight).fill(bgColor);
            doc.fillColor('#000000');
            allKeys.forEach((key, i) => {
                let val = row[key] != null ? String(row[key]) : '-';
                if ((key.includes('date') || key === 'created_at') && row[key]) {
                    try { val = new Date(row[key]).toLocaleDateString('en-IN'); } catch(e) {}
                }
                doc.fontSize(8).text(val, tableLeft + i * colWidth + 4, y + 7, { width: colWidth - 8, ellipsis: true });
            });
            y += rowHeight;
        });

        doc.end();
    } catch (err) {
        res.status(500).json({ error: err });
    }
});

export default router;
