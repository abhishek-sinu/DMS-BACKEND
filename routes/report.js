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
router.get('/donations/xls', (req, res) => {
    db.query('SELECT * FROM donations', (err, results) => {
        if (err) return res.status(500).json({ error: err });
        const ws = XLSX.utils.json_to_sheet(results);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Donations');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="donations.xlsx"');
        res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    });
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
router.get('/donations/pdf', (req, res) => {
    db.query('SELECT * FROM donations', (err, results) => {
        if (err) return res.status(500).json({ error: err });
        const doc = new PDFDocument();
        res.setHeader('Content-Disposition', 'attachment; filename="donations.pdf"');
        res.type('application/pdf');
        doc.pipe(res);
        doc.fontSize(16).text('Donations Report', { align: 'center' });
        doc.moveDown();
        results.forEach((donation) => {
            doc.fontSize(12).text(JSON.stringify(donation));
            doc.moveDown();
        });
        doc.end();
    });
});

export default router;
