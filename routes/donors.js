import express from 'express';
const router = express.Router();
import db from '../db.js';
import { body, validationResult } from 'express-validator';
import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

// Parse month number (1-12) from "YYYY-MM" (month input) or full date string
function parseMonthNum(str) {
    if (!str) return null;
    if (/^\d{4}-\d{2}$/.test(str)) return parseInt(str.split('-')[1], 10);
    const d = new Date(str);
    return isNaN(d) ? null : (d.getMonth() + 1);
}

function buildDonorFilterClause(query) {
    const conditions = [];
    const params = [];
    if (query.dobFrom || query.dobTo) {
        if (query.dobFrom) {
            const m = parseMonthNum(query.dobFrom);
            if (m) { conditions.push('(MONTH(donors.date_of_birth) * 100 + DAY(donors.date_of_birth)) >= ?'); params.push(m * 100 + 1); }
        }
        if (query.dobTo) {
            const m = parseMonthNum(query.dobTo);
            if (m) { conditions.push('(MONTH(donors.date_of_birth) * 100 + DAY(donors.date_of_birth)) <= ?'); params.push(m * 100 + 31); }
        }
    }
    if (query.anniversaryFrom || query.anniversaryTo) {
        if (query.anniversaryFrom) {
            const m = parseMonthNum(query.anniversaryFrom);
            if (m) { conditions.push('(MONTH(donors.anniversary_date) * 100 + DAY(donors.anniversary_date)) >= ?'); params.push(m * 100 + 1); }
        }
        if (query.anniversaryTo) {
            const m = parseMonthNum(query.anniversaryTo);
            if (m) { conditions.push('(MONTH(donors.anniversary_date) * 100 + DAY(donors.anniversary_date)) <= ?'); params.push(m * 100 + 31); }
        }
    }
    if (query.search) {
        const s = `%${query.search}%`;
        conditions.push('(donors.name LIKE ? OR donors.email LIKE ? OR donors.phone LIKE ? OR donors.pan_card LIKE ?)');
        params.push(s, s, s, s);
    }
    const whereSql = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    return { whereSql, params };
}

function fmtDate(val) {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d)) return '';
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

// Export donors to XLS (with optional DOB / anniversary range filters)
router.get('/export/xls', async (req, res) => {
    try {
        const { whereSql, params } = buildDonorFilterClause(req.query);
        const [results] = await db.query(
            `SELECT donors.name, donors.email, donors.phone, donors.date_of_birth, donors.anniversary_date,
                    donors.pan_card, donors.address, donors.city, donors.state, cultivators.name AS cultivator_name
             FROM donors
             LEFT JOIN cultivators ON donors.cultivator_id = cultivators.id
             ${whereSql}
             ORDER BY donors.name ASC`,
            params
        );
        const rows = results.map(r => ({
            'Name': r.name || '',
            'Email': r.email || '',
            'Phone': r.phone || '',
            'Date of Birth': fmtDate(r.date_of_birth),
            'Anniversary': fmtDate(r.anniversary_date),
            'PAN Card': r.pan_card || '',
            'Cultivator': r.cultivator_name || '',
            'Address': r.address || '',
            'City': r.city || '',
            'State': r.state || '',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Donors');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="donors_filtered.xlsx"');
        res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ error: String(err) });
    }
});

// Export donors to PDF (with optional DOB / anniversary range filters)
router.get('/export/pdf', async (req, res) => {
    try {
        const { whereSql, params } = buildDonorFilterClause(req.query);
        const [results] = await db.query(
            `SELECT donors.name, donors.email, donors.phone, donors.date_of_birth, donors.anniversary_date,
                    donors.pan_card, cultivators.name AS cultivator_name
             FROM donors
             LEFT JOIN cultivators ON donors.cultivator_id = cultivators.id
             ${whereSql}
             ORDER BY donors.name ASC`,
            params
        );
        const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
        res.setHeader('Content-Disposition', 'attachment; filename="donors_filtered.pdf"');
        res.type('application/pdf');
        doc.pipe(res);

        doc.fontSize(16).font('Helvetica-Bold').text('Donor Report', { align: 'center' });
        doc.moveDown(0.5);

        const columns = ['name', 'email', 'phone', 'date_of_birth', 'anniversary_date', 'pan_card', 'cultivator_name'];
        const headers = ['Name', 'Email', 'Phone', 'DOB', 'Anniversary', 'PAN Card', 'Cultivator'];
        const colWidths = [110, 130, 85, 80, 80, 80, 95];
        const tableLeft = 30;
        const rowHeight = 25;
        let y = doc.y;

        // Header row
        doc.font('Helvetica-Bold').fontSize(9);
        doc.rect(tableLeft, y, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill('#2563EB');
        let x = tableLeft;
        headers.forEach((h, i) => {
            doc.fillColor('#FFFFFF').text(h, x + 4, y + 8, { width: colWidths[i] - 8, ellipsis: true });
            x += colWidths[i];
        });
        y += rowHeight;

        // Data rows
        doc.font('Helvetica').fontSize(8).fillColor('#000000');
        results.forEach((row, idx) => {
            if (y + rowHeight > doc.page.height - 30) { doc.addPage(); y = 30; }
            const bg = idx % 2 === 0 ? '#F3F4F6' : '#FFFFFF';
            doc.rect(tableLeft, y, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill(bg);
            doc.fillColor('#000000');
            x = tableLeft;
            columns.forEach((col, i) => {
                const val = col === 'date_of_birth' || col === 'anniversary_date' ? fmtDate(row[col]) : (row[col] != null ? String(row[col]) : '-');
                doc.text(val, x + 4, y + 8, { width: colWidths[i] - 8, ellipsis: true });
                x += colWidths[i];
            });
            y += rowHeight;
        });

        doc.end();
    } catch (err) {
        res.status(500).json({ error: String(err) });
    }
});



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
            const [results] = await db.query(`
                SELECT donors.*, cultivators.name AS cultivator_name
                FROM donors
                LEFT JOIN cultivators ON donors.cultivator_id = cultivators.id
            `);
            console.log('Donor list API results:', results);
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
        body('anniversary_date').optional({ nullable: true }).isISO8601().withMessage('Invalid date'),
        body('pan_card').optional({ nullable: true }).isString(),
        body('address_house').optional({ nullable: true }).isString(),
        body('address_city').optional({ nullable: true }).isString(),
        body('address_state').optional({ nullable: true }).isString(),
        body('address_pin').optional({ nullable: true }).isString(),
        body('cultivator').optional({ nullable: true }).isString(),
        body('last_gift_details').optional({ nullable: true }).isString()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const donor = req.body;
        try {
            // Check for duplicate donor (name + phone)
            if (donor.name && donor.phone) {
                const [existing] = await db.query(
                    'SELECT id FROM donors WHERE name = ? AND phone = ? LIMIT 1',
                    [donor.name, donor.phone]
                );
                if (existing.length > 0) {
                    return res.status(409).json({ error: 'A donor with this name and phone number already exists.' });
                }
            }
            const [result] = await db.query('INSERT INTO donors SET ?', donor);
            res.json({ id: result.insertId, ...donor });
            // Audit log
            if (req.user && req.user.id) {
                db.query('INSERT INTO audit_logs SET ?', {
                    user_id: req.user.id,
                    action: 'create_donor',
                    details: JSON.stringify({ donor_id: result.insertId, donor }),
                });
            }
        } catch (err) {
            console.error('DB error:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'A donor with this name and phone number already exists.' });
            }
            return res.status(500).json({ error: 'Database error', details: err.message || err });
        }
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
        const donor = req.body;
        // Sanitize date fields
        donor.anniversary_date = sanitizeDateField(donor.anniversary_date);
        donor.date_of_birth = sanitizeDateField(donor.date_of_birth);
        // Exclude family_members from donor update
        const familyMembers = donor.family_members || [];
        delete donor.family_members;
        // Convert all date fields to YYYY-MM-DD if present
        const dateFields = ['date_of_birth', 'anniversary_date', 'created_at', 'updated_at'];
        dateFields.forEach(field => {
            if (donor[field]) {
                donor[field] = donor[field].split('T')[0];
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
        await db.query(
            `UPDATE donors SET name=?, email=?, phone=?, address=?, address_house=?, address_city=?, address_state=?, address_pin=?, pan_card=?, notes=?, last_gift_details=?, date_of_birth=?, anniversary_date=?, cultivator_id=? WHERE id=?`,
            [
                donor.name,
                donor.email,
                donor.phone,
                donor.address,
                donor.address_house,
                donor.address_city,
                donor.address_state,
                donor.address_pin,
                donor.pan_card,
                donor.notes,
                donor.last_gift_details,
                donor.date_of_birth,
                donor.anniversary_date,
                donor.cultivator_id,
                donor.id
            ]
        );
        res.json({ success: true });
        // Audit log
        if (req.user && req.user.id) {
            await db.query('INSERT INTO audit_logs SET ?', {
                user_id: req.user.id,
                action: 'update_donor',
                details: JSON.stringify({ donor_id: req.params.id, donor: donorData, family_members: familyMembers }),
            });
        }
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'A donor with this name and phone number already exists.' });
        }
        res.status(500).json({ error: err.message || err });
    }
});

// Helper to sanitize empty date fields
function sanitizeDateField(value) {
    if (!value || value === '') return null;
    return value;
}

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

// Bulk import donors from Excel
router.post('/import', async (req, res) => {
    console.log('--- Entry: POST /api/donors/import ---');
    const donors = req.body.donors;
    if (!Array.isArray(donors)) {
        return res.status(400).json({ error: 'donors must be an array' });
    }

    // Get valid column names from donors table
    let validColumns = [];
    try {
        const [columns] = await db.query('SHOW COLUMNS FROM donors');
        validColumns = columns.map(c => c.Field);
    } catch (err) {
        console.error('Could not fetch donor columns:', err);
    }

    const results = [];
    for (let i = 0; i < donors.length; i++) {
        const raw = donors[i];
        try {
            const donor = {};
            for (const [key, val] of Object.entries(raw)) {
                if (val === null || val === undefined || val === '') continue;
                // Handle cultivator name -> cultivator_id lookup
                if (key === 'cultivator' && validColumns.includes('cultivator_id')) {
                    try {
                        const [rows] = await db.query('SELECT id FROM cultivators WHERE name = ? LIMIT 1', [val]);
                        if (rows.length > 0) donor.cultivator_id = rows[0].id;
                    } catch (e) { /* skip */ }
                    continue;
                }
                // Only include fields that exist in the table
                if (validColumns.length === 0 || validColumns.includes(key)) {
                    donor[key] = val;
                }
            }
            // Fix date fields to YYYY-MM-DD if present
            if (donor.date_of_birth) {
                const d = new Date(donor.date_of_birth);
                if (!isNaN(d)) donor.date_of_birth = d.toISOString().slice(0, 10);
            }
            if (donor.anniversary_date) {
                const d = new Date(donor.anniversary_date);
                if (!isNaN(d)) donor.anniversary_date = d.toISOString().slice(0, 10);
            }
            // Remove id if present
            delete donor.id;
            console.log(`Row ${i + 1} data:`, JSON.stringify(donor));
            // Check for duplicate (name + phone)
            if (donor.name && donor.phone) {
                const [existing] = await db.query(
                    'SELECT id FROM donors WHERE name = ? AND phone = ? LIMIT 1',
                    [donor.name, donor.phone]
                );
                if (existing.length > 0) {
                    results.push({ row: i + 1, status: 'skipped', reason: `Duplicate: donor "${donor.name}" with phone "${donor.phone}" already exists` });
                    console.log(`Row ${i + 1}: skipped (duplicate)`);
                    continue;
                }
            }
            const [result] = await db.query('INSERT INTO donors SET ?', donor);
            results.push({ row: i + 1, status: 'inserted' });
            console.log(`Row ${i + 1}: inserted`);
        } catch (err) {
            results.push({ row: i + 1, status: 'failed', reason: err.message || err });
            console.error(`Row ${i + 1}: failed - ${err.message || err}`);
        }
    }
    const failed = results.filter(r => r.status === 'failed');
    const inserted = results.filter(r => r.status === 'inserted');
    const skipped = results.filter(r => r.status === 'skipped');
    let message = '';
    if (inserted.length === donors.length) {
        message = 'All rows inserted successfully.';
    } else if (inserted.length === 0 && skipped.length === 0) {
        message = 'No rows inserted.';
    } else {
        const parts = [`${inserted.length} inserted`];
        if (skipped.length > 0) parts.push(`${skipped.length} skipped (duplicates)`);
        if (failed.length > 0) parts.push(`${failed.length} failed`);
        message = parts.join(', ') + '.';
    }
    console.log(`--- Import summary: ${message} ---`);
    res.json({ message, inserted: inserted.length, failed: failed.length, skipped: skipped.length, details: results });
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
