// Backend configuration for ISKCON Donation Management System
// Node.js + Express + MySQL

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authenticateToken, authorizeRoleAccess, authorizeRoleNames } from './middleware/security.js';

console.log('JWT_SECRET in use:', process.env.JWT_SECRET);

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Basic health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Placeholder for routes
// ...existing code...
// API routes
import donorsRouter from './routes/donors.js';
import familyMembersRouter from './routes/familyMembers.js';
import donationsRouter from './routes/donations.js';
import usersRouter from './routes/users.js';
import rolesRouter from './routes/roles.js';
import authRouter from './routes/auth.js';
import auditLogsRouter from './routes/auditLogs.js';
import communicationLogsRouter from './routes/communicationLogs.js';
import importRouter from './routes/import.js';
import reportRouter from './routes/report.js';
import engagementRouter from './routes/engagement.js';
import swaggerRouter from './routes/swagger.js';
import emailRouter from './routes/email.js';
import cultivatorsRouter from './routes/cultivators.js';
import dashboardRouter from './routes/dashboard.js';
import giftsRouter from './routes/gifts.js';
import schemesRouter from './routes/schemes.js';
import templeSettingsRouter from './routes/templeSettings.js';

app.use('/api/auth', authRouter);
app.use('/api/docs', swaggerRouter);

const superAdminAll = authorizeRoleAccess({
    'super admin': ['*'],
});

const superAdminAndAdminReadCreate = authorizeRoleAccess({
    'super admin': ['*'],
    admin: ['GET', 'HEAD', 'OPTIONS', 'POST'],
});

const donorDonationAccess = authorizeRoleAccess({
    'super admin': ['*'],
    admin: ['GET', 'HEAD', 'OPTIONS', 'POST'],
    cultivator: ['GET', 'HEAD', 'OPTIONS'],
});

app.use('/api/donors', authenticateToken, donorDonationAccess, donorsRouter);
app.use('/api/donors', authenticateToken, donorDonationAccess, familyMembersRouter);
app.use('/api/donations', authenticateToken, donorDonationAccess, donationsRouter);
app.use('/api/cultivators', authenticateToken, superAdminAndAdminReadCreate, cultivatorsRouter);
app.use('/api/users', authenticateToken, superAdminAndAdminReadCreate, usersRouter);
app.use('/api/roles', authenticateToken, authorizeRoleNames('super admin'), rolesRouter);
app.use('/api/communication-logs', authenticateToken, superAdminAndAdminReadCreate, communicationLogsRouter);
app.use('/api/import', authenticateToken, superAdminAndAdminReadCreate, importRouter);
app.use('/api/report', authenticateToken, superAdminAndAdminReadCreate, reportRouter);
app.use('/api/engagement', authenticateToken, superAdminAndAdminReadCreate, engagementRouter);
app.use('/api/dashboard', authenticateToken, superAdminAndAdminReadCreate, dashboardRouter);
app.use('/api/email', authenticateToken, superAdminAndAdminReadCreate, emailRouter);
app.use('/api/gifts', authenticateToken, superAdminAndAdminReadCreate, giftsRouter);
app.use('/api/schemes', authenticateToken, superAdminAndAdminReadCreate, schemesRouter);
app.use('/api/temple-settings', authenticateToken, superAdminAndAdminReadCreate, templeSettingsRouter);
app.use('/api/audit-logs', authenticateToken, superAdminAll, auditLogsRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
