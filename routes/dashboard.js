import express from 'express';
const router = express.Router();
import db from '../db.js';
import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

function fmtDate(val) {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d)) return '';
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

// Dashboard stats
router.get('/stats', async (req, res) => {
    try {
        // Total donors
        const [[{ totalDonors }]] = await db.query('SELECT COUNT(*) AS totalDonors FROM donors');

        // Total donation records and sum
        const [[{ totalRecords, totalAmount }]] = await db.query(
            'SELECT COUNT(*) AS totalRecords, COALESCE(SUM(amount), 0) AS totalAmount FROM donations'
        );

        // Total cultivators
        const [[{ totalCultivators }]] = await db.query('SELECT COUNT(*) AS totalCultivators FROM cultivators');

        // Upcoming birthdays (next 30 days): donors + donor family members
        const [[{ upcomingBirthdays }]] = await db.query(`
            SELECT COUNT(*) AS upcomingBirthdays
            FROM (
                SELECT d.id
                FROM donors d
                WHERE d.date_of_birth IS NOT NULL
                AND DAYOFYEAR(CONCAT(YEAR(CURDATE()), '-', MONTH(d.date_of_birth), '-', DAY(d.date_of_birth)))
                    BETWEEN DAYOFYEAR(CURDATE()) AND DAYOFYEAR(CURDATE()) + 30

                UNION ALL

                SELECT fm.id
                FROM donor_family_members fm
                WHERE fm.date_of_birth IS NOT NULL
                AND DAYOFYEAR(CONCAT(YEAR(CURDATE()), '-', MONTH(fm.date_of_birth), '-', DAY(fm.date_of_birth)))
                    BETWEEN DAYOFYEAR(CURDATE()) AND DAYOFYEAR(CURDATE()) + 30
            ) AS birthday_rows
        `);

        // Upcoming anniversaries (next 30 days)
        const [[{ upcomingAnniversaries }]] = await db.query(`
            SELECT COUNT(*) AS upcomingAnniversaries FROM donors
            WHERE anniversary_date IS NOT NULL
            AND DAYOFYEAR(CONCAT(YEAR(CURDATE()), '-', MONTH(anniversary_date), '-', DAY(anniversary_date)))
                BETWEEN DAYOFYEAR(CURDATE()) AND DAYOFYEAR(CURDATE()) + 30
        `);

        // Top donors (by total donated amount, top 5) - grouped by name + phone
        const [topDonors] = await db.query(`
            SELECT donor_name AS name, phone_number AS phone, SUM(amount) AS total
            FROM donations
            GROUP BY donor_name, phone_number
            ORDER BY total DESC
            LIMIT 5
        `);

        // Recent donations (last 5)
        const [recentDonations] = await db.query(`
            SELECT donor_name, amount, transaction_date, mode_of_payment
            FROM donations
            ORDER BY transaction_date DESC
            LIMIT 5
        `);

        res.json({
            totalDonors,
            totalRecords,
            totalAmount: parseFloat(totalAmount),
            totalCultivators,
            upcomingBirthdays,
            upcomingAnniversaries,
            topDonors,
            recentDonations,
        });
    } catch (err) {
        console.error('Dashboard stats error:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// Upcoming birthdays details
router.get('/upcoming-birthdays', async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT *
            FROM (
                SELECT
                    'donor' AS person_type,
                    d.id AS donor_id,
                    NULL AS family_member_id,
                    d.name AS donor_name,
                    d.name AS person_name,
                    NULL AS relationship,
                    d.phone,
                    d.email,
                    d.date_of_birth AS birthday
                FROM donors d
                WHERE d.date_of_birth IS NOT NULL
                AND DAYOFYEAR(CONCAT(YEAR(CURDATE()), '-', MONTH(d.date_of_birth), '-', DAY(d.date_of_birth)))
                    BETWEEN DAYOFYEAR(CURDATE()) AND DAYOFYEAR(CURDATE()) + 30

                UNION ALL

                SELECT
                    'family' AS person_type,
                    d.id AS donor_id,
                    fm.id AS family_member_id,
                    d.name AS donor_name,
                    fm.name AS person_name,
                    fm.relation AS relationship,
                    d.phone,
                    d.email,
                    fm.date_of_birth AS birthday
                FROM donor_family_members fm
                INNER JOIN donors d ON d.id = fm.donor_id
                WHERE fm.date_of_birth IS NOT NULL
                AND DAYOFYEAR(CONCAT(YEAR(CURDATE()), '-', MONTH(fm.date_of_birth), '-', DAY(fm.date_of_birth)))
                    BETWEEN DAYOFYEAR(CURDATE()) AND DAYOFYEAR(CURDATE()) + 30
            ) AS upcoming
            ORDER BY DAYOFYEAR(CONCAT(YEAR(CURDATE()), '-', MONTH(upcoming.birthday), '-', DAY(upcoming.birthday))) ASC,
                     upcoming.donor_name ASC,
                     upcoming.person_name ASC
        `);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch upcoming birthdays' });
    }
});

// Upcoming anniversaries details
router.get('/upcoming-anniversaries', async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT id AS donor_id, name, phone, email, anniversary_date
            FROM donors
            WHERE anniversary_date IS NOT NULL
            AND DAYOFYEAR(CONCAT(YEAR(CURDATE()), '-', MONTH(anniversary_date), '-', DAY(anniversary_date)))
                BETWEEN DAYOFYEAR(CURDATE()) AND DAYOFYEAR(CURDATE()) + 30
            ORDER BY DAYOFYEAR(CONCAT(YEAR(CURDATE()), '-', MONTH(anniversary_date), '-', DAY(anniversary_date))) ASC
        `);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch upcoming anniversaries' });
    }
});

// Export upcoming birthdays to XLS
router.get('/upcoming-birthdays/export/xls', async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT * FROM (
                SELECT 'donor' AS person_type, d.id AS donor_id, d.name AS donor_name,
                    d.name AS person_name, NULL AS relationship, d.phone, d.date_of_birth AS birthday
                FROM donors d WHERE d.date_of_birth IS NOT NULL
                AND DAYOFYEAR(CONCAT(YEAR(CURDATE()), '-', MONTH(d.date_of_birth), '-', DAY(d.date_of_birth)))
                    BETWEEN DAYOFYEAR(CURDATE()) AND DAYOFYEAR(CURDATE()) + 30
                UNION ALL
                SELECT 'family' AS person_type, d.id AS donor_id, d.name AS donor_name,
                    fm.name AS person_name, fm.relation AS relationship, d.phone, fm.date_of_birth AS birthday
                FROM donor_family_members fm INNER JOIN donors d ON d.id = fm.donor_id
                WHERE fm.date_of_birth IS NOT NULL
                AND DAYOFYEAR(CONCAT(YEAR(CURDATE()), '-', MONTH(fm.date_of_birth), '-', DAY(fm.date_of_birth)))
                    BETWEEN DAYOFYEAR(CURDATE()) AND DAYOFYEAR(CURDATE()) + 30
            ) AS upcoming ORDER BY DAYOFYEAR(CONCAT(YEAR(CURDATE()), '-', MONTH(upcoming.birthday), '-', DAY(upcoming.birthday))) ASC, donor_name ASC
        `);
        const rows = results.map((r, i) => ({
            '#': i + 1,
            'Donor Name': r.donor_name || '',
            'Family Member': r.person_type === 'family' ? (r.person_name || '') : '-',
            'Relation': r.person_type === 'family' ? (r.relationship || '') : '-',
            'Phone': r.phone || '',
            'Date of Birth': fmtDate(r.birthday),
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Upcoming Birthdays');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="upcoming_birthdays.xlsx"');
        res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ error: 'Export failed' });
    }
});

// Export upcoming birthdays to PDF
router.get('/upcoming-birthdays/export/pdf', async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT * FROM (
                SELECT 'donor' AS person_type, d.id AS donor_id, d.name AS donor_name,
                    d.name AS person_name, NULL AS relationship, d.phone, d.date_of_birth AS birthday
                FROM donors d WHERE d.date_of_birth IS NOT NULL
                AND DAYOFYEAR(CONCAT(YEAR(CURDATE()), '-', MONTH(d.date_of_birth), '-', DAY(d.date_of_birth)))
                    BETWEEN DAYOFYEAR(CURDATE()) AND DAYOFYEAR(CURDATE()) + 30
                UNION ALL
                SELECT 'family' AS person_type, d.id AS donor_id, d.name AS donor_name,
                    fm.name AS person_name, fm.relation AS relationship, d.phone, fm.date_of_birth AS birthday
                FROM donor_family_members fm INNER JOIN donors d ON d.id = fm.donor_id
                WHERE fm.date_of_birth IS NOT NULL
                AND DAYOFYEAR(CONCAT(YEAR(CURDATE()), '-', MONTH(fm.date_of_birth), '-', DAY(fm.date_of_birth)))
                    BETWEEN DAYOFYEAR(CURDATE()) AND DAYOFYEAR(CURDATE()) + 30
            ) AS upcoming ORDER BY DAYOFYEAR(CONCAT(YEAR(CURDATE()), '-', MONTH(upcoming.birthday), '-', DAY(upcoming.birthday))) ASC, donor_name ASC
        `);
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        res.setHeader('Content-Disposition', 'attachment; filename="upcoming_birthdays.pdf"');
        res.type('application/pdf');
        doc.pipe(res);
        doc.fontSize(16).font('Helvetica-Bold').text('Upcoming Birthdays (Next 30 Days)', { align: 'center' });
        doc.moveDown(0.5);
        const cols = ['donor_name', 'person_name', 'relationship', 'phone', 'birthday'];
        const headers = ['Donor Name', 'Family Member', 'Relation', 'Phone', 'Date of Birth'];
        const widths = [130, 110, 80, 90, 90];
        const tableLeft = 40;
        const rowH = 25;
        let y = doc.y;
        doc.font('Helvetica-Bold').fontSize(9);
        doc.rect(tableLeft, y, widths.reduce((a, b) => a + b, 0), rowH).fill('#2563EB');
        let x = tableLeft;
        headers.forEach((h, i) => { doc.fillColor('#FFFFFF').text(h, x + 4, y + 8, { width: widths[i] - 8 }); x += widths[i]; });
        y += rowH;
        doc.font('Helvetica').fontSize(8).fillColor('#000000');
        results.forEach((r, idx) => {
            if (y + rowH > doc.page.height - 40) { doc.addPage(); y = 40; }
            doc.rect(tableLeft, y, widths.reduce((a, b) => a + b, 0), rowH).fill(idx % 2 === 0 ? '#F3F4F6' : '#FFFFFF');
            doc.fillColor('#000000');
            x = tableLeft;
            const vals = [
                r.donor_name || '-',
                r.person_type === 'family' ? (r.person_name || '-') : '-',
                r.person_type === 'family' ? (r.relationship || '-') : '-',
                r.phone || '-',
                fmtDate(r.birthday),
            ];
            vals.forEach((v, i) => { doc.text(v, x + 4, y + 8, { width: widths[i] - 8, ellipsis: true }); x += widths[i]; });
            y += rowH;
        });
        doc.end();
    } catch (err) {
        res.status(500).json({ error: 'Export failed' });
    }
});

// Export upcoming anniversaries to XLS
router.get('/upcoming-anniversaries/export/xls', async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT id AS donor_id, name, phone, anniversary_date
            FROM donors WHERE anniversary_date IS NOT NULL
            AND DAYOFYEAR(CONCAT(YEAR(CURDATE()), '-', MONTH(anniversary_date), '-', DAY(anniversary_date)))
                BETWEEN DAYOFYEAR(CURDATE()) AND DAYOFYEAR(CURDATE()) + 30
            ORDER BY DAYOFYEAR(CONCAT(YEAR(CURDATE()), '-', MONTH(anniversary_date), '-', DAY(anniversary_date))) ASC
        `);
        const rows = results.map((r, i) => ({
            '#': i + 1,
            'Name': r.name || '',
            'Phone': r.phone || '',
            'Anniversary Date': fmtDate(r.anniversary_date),
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Upcoming Anniversaries');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="upcoming_anniversaries.xlsx"');
        res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ error: 'Export failed' });
    }
});

// Export upcoming anniversaries to PDF
router.get('/upcoming-anniversaries/export/pdf', async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT id AS donor_id, name, phone, anniversary_date
            FROM donors WHERE anniversary_date IS NOT NULL
            AND DAYOFYEAR(CONCAT(YEAR(CURDATE()), '-', MONTH(anniversary_date), '-', DAY(anniversary_date)))
                BETWEEN DAYOFYEAR(CURDATE()) AND DAYOFYEAR(CURDATE()) + 30
            ORDER BY DAYOFYEAR(CONCAT(YEAR(CURDATE()), '-', MONTH(anniversary_date), '-', DAY(anniversary_date))) ASC
        `);
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        res.setHeader('Content-Disposition', 'attachment; filename="upcoming_anniversaries.pdf"');
        res.type('application/pdf');
        doc.pipe(res);
        doc.fontSize(16).font('Helvetica-Bold').text('Upcoming Anniversaries (Next 30 Days)', { align: 'center' });
        doc.moveDown(0.5);
        const headers = ['Name', 'Phone', 'Anniversary Date'];
        const widths = [220, 130, 130];
        const tableLeft = 40;
        const rowH = 25;
        let y = doc.y;
        doc.font('Helvetica-Bold').fontSize(9);
        doc.rect(tableLeft, y, widths.reduce((a, b) => a + b, 0), rowH).fill('#DB2777');
        let x = tableLeft;
        headers.forEach((h, i) => { doc.fillColor('#FFFFFF').text(h, x + 4, y + 8, { width: widths[i] - 8 }); x += widths[i]; });
        y += rowH;
        doc.font('Helvetica').fontSize(8).fillColor('#000000');
        results.forEach((r, idx) => {
            if (y + rowH > doc.page.height - 40) { doc.addPage(); y = 40; }
            doc.rect(tableLeft, y, widths.reduce((a, b) => a + b, 0), rowH).fill(idx % 2 === 0 ? '#FDF2F8' : '#FFFFFF');
            doc.fillColor('#000000');
            x = tableLeft;
            [r.name || '-', r.phone || '-', fmtDate(r.anniversary_date)].forEach((v, i) => {
                doc.text(v, x + 4, y + 8, { width: widths[i] - 8, ellipsis: true }); x += widths[i];
            });
            y += rowH;
        });
        doc.end();
    } catch (err) {
        res.status(500).json({ error: 'Export failed' });
    }
});

export default router;
