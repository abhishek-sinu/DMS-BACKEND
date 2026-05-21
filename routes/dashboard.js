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

export default router;
