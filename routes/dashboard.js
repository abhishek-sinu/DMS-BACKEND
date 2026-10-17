import express from 'express';
const router = express.Router();
import db from '../db.js';
import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

function fmtDate(val) {
    if (!val) return '';
    const m = typeof val === 'string' && val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    const d = new Date(val);
    if (isNaN(d)) return '';
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

function donorAddress(donor) {
    const structured = [
        donor.address_line1, donor.address_line2, donor.post_office, donor.city,
        donor.district, donor.state, donor.pin_code, donor.country,
    ].filter(Boolean);
    if (structured.length) return structured.join(' , ');
    const legacy = [
        donor.address_house, donor.address_city, donor.address_state,
        donor.address_house || donor.address_city ? 'India' : '', donor.address_pin,
    ].filter(Boolean);
    return legacy.length ? legacy.join(' , ') : donor.address || '';
}

async function completeExportRows(results, birthdays) {
    if (!results.length) return [];
    const ids = [...new Set(results.map(row => row.donor_id))];
    const placeholders = ids.map(() => '?').join(',');
    const [donors] = await db.query(`SELECT * FROM donors WHERE id IN (${placeholders})`, ids);
    const [members] = await db.query(
        `SELECT * FROM donor_family_members WHERE donor_id IN (${placeholders}) ORDER BY id`, ids
    );
    const donorById = new Map(donors.map(donor => [donor.id, donor]));
    const familyById = new Map();
    for (const member of members) {
        if (!familyById.has(member.donor_id)) familyById.set(member.donor_id, []);
        familyById.get(member.donor_id).push(member);
    }
    return results.map((row, index) => {
        const donor = donorById.get(row.donor_id);
        if (!donor) throw new Error(`Donor ${row.donor_id} not found during export`);
        const family = familyById.get(row.donor_id) || [];
        return {
            '#': index + 1,
            'Donor Name': donor.name || '-',
            ...(birthdays ? {
                'Family Member': row.person_type === 'family' ? row.person_name || '-' : '-',
                'Relation': row.person_type === 'family' ? row.relationship || '-' : '-',
                'Birthday': fmtDate(row.birthday) || '-',
            } : {}),
            'Phone': donor.phone || '-',
            'Email': donor.email || '-',
            'Donor Date of Birth': fmtDate(donor.date_of_birth) || '-',
            'Anniversary Date': fmtDate(donor.anniversary_date) || '-',
            'Address': donorAddress(donor) || '-',
            'Family Members': family.length ? family.map(member =>
                `${member.name || '-'} | Relation: ${member.relation || '-'} | DOB: ${fmtDate(member.date_of_birth) || '-'}`
            ).join('\n') : 'No family members added.',
        };
    });
}

function sendDetailsPdf(res, rows, birthdays) {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const type = birthdays ? 'Birthdays' : 'Anniversaries';
    res.setHeader('Content-Disposition', `attachment; filename="upcoming_${type.toLowerCase()}.pdf"`);
    res.type('application/pdf');
    doc.pipe(res);
    doc.fontSize(16).font('Helvetica-Bold').text(`Upcoming ${type} (Next 30 Days)`, { align: 'center' });
    doc.moveDown();
    if (!rows.length) doc.font('Helvetica').fontSize(10).text('No upcoming events.');
    rows.forEach((row, index) => {
        if (index) doc.addPage();
        doc.font('Helvetica-Bold').fontSize(12).text(`${row['#']}. ${row['Donor Name']}`);
        doc.moveDown(0.5);
        for (const [label, value] of Object.entries(row)) {
            if (label === '#' || label === 'Donor Name') continue;
            doc.font('Helvetica-Bold').fontSize(10).text(`${label}:`);
            doc.font('Helvetica').text(String(value), { lineGap: 2 });
            doc.moveDown(0.5);
        }
    });
    doc.end();
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
        const rows = await completeExportRows(results, true);
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
        const rows = await completeExportRows(results, true);
        sendDetailsPdf(res, rows, true);
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
        const rows = await completeExportRows(results, false);
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
        const rows = await completeExportRows(results, false);
        sendDetailsPdf(res, rows, false);
    } catch (err) {
        res.status(500).json({ error: 'Export failed' });
    }
});

export default router;
