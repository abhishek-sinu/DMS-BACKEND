import express from 'express';
const router = express.Router();
import db from '../db.js';
import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

function normalizeMode(mode) {
    return mode === 'aggregate' ? 'aggregate' : 'individual';
}

function buildDonationWhereClause(query) {
    const conditions = [];
    const params = [];

    if (query.dateFrom) {
        conditions.push('donations.transaction_date >= ?');
        params.push(query.dateFrom);
    }
    if (query.dateTo) {
        conditions.push('donations.transaction_date <= ?');
        params.push(query.dateTo);
    }
    if (query.amountMin !== undefined && query.amountMin !== '') {
        conditions.push('donations.amount >= ?');
        params.push(Number(query.amountMin));
    }
    if (query.amountMax !== undefined && query.amountMax !== '') {
        conditions.push('donations.amount <= ?');
        params.push(Number(query.amountMax));
    }
    if (query.scheme) {
        conditions.push('LOWER(donations.scheme_name) LIKE ?');
        params.push(`%${String(query.scheme).toLowerCase()}%`);
    }

    const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereSql, params };
}

async function getReportRows(query) {
    const mode = normalizeMode(query.mode);
    const { whereSql, params } = buildDonationWhereClause(query);

    if (mode === 'aggregate') {
        const [rows] = await db.query(
            `
            SELECT
                MIN(donations.id) AS id,
                phone_group.donor_phone AS donor_phone,
                COALESCE(MAX(donors.name), MAX(donations.donor_name)) AS donor_name,
                MAX(cultivators.name) AS cultivator_name,
                COUNT(*) AS donation_count,
                SUM(donations.amount) AS amount,
                MIN(donations.transaction_date) AS first_date,
                MAX(donations.transaction_date) AS last_date,
                GROUP_CONCAT(DISTINCT donations.scheme_name ORDER BY donations.scheme_name SEPARATOR ', ') AS scheme_names
            FROM donations
            JOIN (
                SELECT id, COALESCE(NULLIF(phone_number, ''), CONCAT('NO_PHONE_', id)) AS donor_phone
                FROM donations
            ) AS phone_group ON phone_group.id = donations.id
            LEFT JOIN donors ON donations.phone_number = donors.phone
            LEFT JOIN cultivators ON donors.cultivator_id = cultivators.id
            ${whereSql}
            GROUP BY phone_group.donor_phone
            ORDER BY SUM(donations.amount) DESC
            `,
            params
        );
        return rows;
    }

    const [rows] = await db.query(
        `
        SELECT
            donations.id,
            donations.receipt_number,
            COALESCE(donors.name, donations.donor_name) AS donor_name,
            COALESCE(donors.phone, donations.phone_number) AS donor_phone,
            donations.transaction_date,
            donations.amount,
            donations.scheme_name,
            donations.mode_of_payment,
            donations.instrument_number,
            cultivators.name AS cultivator_name
        FROM donations
        LEFT JOIN donors ON donations.phone_number = donors.phone
        LEFT JOIN cultivators ON donors.cultivator_id = cultivators.id
        ${whereSql}
        ORDER BY donations.transaction_date DESC, donations.id DESC
        `,
        params
    );

    return rows;
}

function prettifyKey(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function normalizeDateFields(row) {
    const normalized = { ...row };
    Object.keys(normalized).forEach(key => {
        if ((key.includes('date') || key === 'created_at') && normalized[key]) {
            const d = new Date(normalized[key]);
            if (!isNaN(d)) {
                normalized[key] = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
            }
        }
    });
    return normalized;
}

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
        const mode = normalizeMode(req.query.mode);
        const results = await getReportRows(req.query);
        const cleaned = results.map(({ id, ...rest }) => normalizeDateFields(rest));
        const ws = XLSX.utils.json_to_sheet(cleaned);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Donations');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const filename = mode === 'aggregate' ? 'donations_aggregate.xlsx' : 'donations.xlsx';
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
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
        const mode = normalizeMode(req.query.mode);
        const results = await getReportRows(req.query);
        const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
        const filename = mode === 'aggregate' ? 'donations_aggregate.pdf' : 'donations.pdf';
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.type('application/pdf');
        doc.pipe(res);

        doc.fontSize(18).text(mode === 'aggregate' ? 'Donations Aggregate Report' : 'Donations Report', { align: 'center' });
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
            const label = prettifyKey(key);
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
