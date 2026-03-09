import express from 'express';
const router = express.Router();
import db from '../db.js';
import nodemailer from 'nodemailer';

// Configure email transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
    }
});

// Send birthday email
router.post('/birthday-email', async (req, res) => {
    const { donorId, subject, message } = req.body;
    db.query('SELECT email, name FROM donors WHERE id = ?', [donorId], async (err, results) => {
        if (err || !results.length) return res.status(404).json({ error: 'Donor not found' });
        const donor = results[0];
        try {
            await transporter.sendMail({
                from: process.env.SMTP_FROM || 'noreply@example.com',
                to: donor.email,
                subject,
                text: message.replace('{{name}}', donor.name)
            });
            res.json({ status: 'sent', email: donor.email });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
});

export default router;
