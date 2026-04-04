import express from 'express';
const router = express.Router();
import db from '../db.js';

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

        // Upcoming birthdays (next 30 days)
        const [[{ upcomingBirthdays }]] = await db.query(`
            SELECT COUNT(*) AS upcomingBirthdays FROM donors
            WHERE date_of_birth IS NOT NULL
            AND DAYOFYEAR(CONCAT(YEAR(CURDATE()), '-', MONTH(date_of_birth), '-', DAY(date_of_birth)))
                BETWEEN DAYOFYEAR(CURDATE()) AND DAYOFYEAR(CURDATE()) + 30
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
            SELECT name, phone, email, date_of_birth
            FROM donors
            WHERE date_of_birth IS NOT NULL
            AND DAYOFYEAR(CONCAT(YEAR(CURDATE()), '-', MONTH(date_of_birth), '-', DAY(date_of_birth)))
                BETWEEN DAYOFYEAR(CURDATE()) AND DAYOFYEAR(CURDATE()) + 30
            ORDER BY DAYOFYEAR(CONCAT(YEAR(CURDATE()), '-', MONTH(date_of_birth), '-', DAY(date_of_birth))) ASC
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
            SELECT name, phone, email, anniversary_date
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

export default router;
