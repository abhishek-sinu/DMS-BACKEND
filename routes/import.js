import express from 'express';
const router = express.Router();
import db from '../db.js';
import XLSX from 'xlsx';
import multer from 'multer';
const upload = multer({ dest: 'uploads/' });
import fs from 'fs';

/**
 * @swagger
 * tags:
 *   name: Import
 *   description: Bulk data import endpoints
 */

/**
 * @swagger
 * /api/import/donors/upload:
 *   post:
 *     summary: Bulk import donors from XLS file
 *     tags: [Import]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Import result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
// XLS upload for donors
router.post('/donors/upload', upload.single('file'), (req, res) => {
    const filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const donors = XLSX.utils.sheet_to_json(sheet);
    let inserted = 0;
    donors.forEach((donor) => {
        db.query('INSERT INTO donors SET ?', donor, (err) => {
            if (!err) inserted++;
        });
    });
    fs.unlinkSync(filePath);
    res.json({ message: `${inserted} donors imported.` });
    // Audit log
    if (req.user && req.user.id) {
        db.query('INSERT INTO audit_logs SET ?', {
            user_id: req.user.id,
            action: 'import_donors',
            details: JSON.stringify({ count: inserted }),
        });
    }
});

export default router;
