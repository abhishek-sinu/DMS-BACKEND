// Backend configuration for ISKCON Donation Management System
// Node.js + Express + MySQL

import express from 'express';
import mysql from 'mysql2';

import cors from 'cors';
const app = express();

app.use(express.json());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

import dotenv from 'dotenv';
dotenv.config();
import { authenticateToken, authorizeRoles } from './middleware/security.js';

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



app.use('/api/donors', donorsRouter);
app.use('/api/donors', familyMembersRouter);
app.use('/api/donations', donationsRouter);
app.use('/api/users', usersRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/auth', authRouter);
app.use('/api/audit-logs', auditLogsRouter);
app.use('/api/communication-logs', communicationLogsRouter);
app.use('/api/import', importRouter);
app.use('/api/report', reportRouter);
app.use('/api/engagement', engagementRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/docs', swaggerRouter);
app.use('/api/email', emailRouter);
app.use('/api/cultivators', cultivatorsRouter);
app.use('/api/gifts', giftsRouter);



// Secure sensitive routes
app.use('/api/donors', authenticateToken, authorizeRoles(1), donorsRouter);
app.use('/api/donations', authenticateToken, authorizeRoles(1), donationsRouter);
app.use('/api/users', authenticateToken, authorizeRoles(1), usersRouter);
app.use('/api/roles', authenticateToken, authorizeRoles(1), rolesRouter);
app.use('/api/audit-logs', authenticateToken, authorizeRoles(1), auditLogsRouter);
app.use('/api/communication-logs', authenticateToken, authorizeRoles(1), communicationLogsRouter);
app.use('/api/import', authenticateToken, authorizeRoles(1), importRouter);
app.use('/api/report', authenticateToken, authorizeRoles(1), reportRouter);
app.use('/api/engagement', authenticateToken, authorizeRoles(1,2), engagementRouter);
app.use('/api/gifts', authenticateToken, authorizeRoles(1), giftsRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
