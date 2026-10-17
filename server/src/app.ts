import path from 'path';
import { fileStorage, imageContentType } from './config/storage';
import express from 'express';
import cors from 'cors';
import { config } from './config';
import prisma from './config/database';
import crypto from 'crypto';

import { errorHandler } from './middleware/error.middleware';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import employeeRoutes from './modules/employees/employee.routes';
import documentRoutes from './modules/employees/document.routes';
import departmentRoutes from './modules/departments/department.routes';
import travelRoutes from './modules/travel/travel.routes';
import expenseRoutes from './modules/expenses/expense.routes';
import uploadRoutes from './modules/upload/upload.routes';
import assetRoutes from './modules/assets/asset.routes';
import recruitmentRoutes from './modules/recruitment/recruitment.routes';
import performanceRoutes from './modules/performance/performance.routes';
import trainingRoutes from './modules/training/training.routes';
import requestRoutes from './modules/requests/request.routes';
import policyRoutes from './modules/policies/policy.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import auditRoutes from './modules/audit/audit.routes';
import permissionRoutes from './modules/permissions/permission.routes';
import loginHistoryRoutes from './modules/loginHistory/loginHistory.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import userRoutes from './modules/users/user.routes';
import leaveRoutes from './modules/leave/leave.routes';

const app = express();


// Generate Correlation ID
app.use((req, res, next) => {
  req.headers['x-correlation-id'] = req.headers['x-correlation-id'] || crypto.randomUUID();
  next();
});

// Middleware
const configuredCorsOrigins = (config.cors.origin || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedCorsOrigins = new Set([
  'https://hr.pafpl.in',
  'http://localhost:5173',
  'http://localhost:5174',
  ...configuredCorsOrigins,
]);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Requests without an Origin header (health checks, server-to-server) are allowed.
    if (!origin || allowedCorsOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
};
app.options('*', cors(corsOptions)); // Handle preflight for ALL routes
app.use(cors(corsOptions));
app.use(express.json());
// Keep file URLs private by default. Only profile images explicitly referenced by
// an employee record are public; attachments use authenticated download routes.
app.use('/api/uploads', async (req, res, next) => {
  try {
    let filename: string;
    try { filename = decodeURIComponent(req.path).slice(1); }
    catch { res.status(400).json({ success: false, message: 'Invalid file path.' }); return; }
    if (!filename || path.basename(filename) !== filename) {
      res.status(403).json({ success: false, message: 'Authenticated download required.' }); return;
    }
    const photo = await prisma.employee.findFirst({ where: { profilePhoto: `/api/uploads/${filename}` }, select: { id: true } });
    const document = await prisma.employeeDocument.findFirst({
      where: { OR: [{ filePath: { endsWith: `/${filename}` } }, { filePath: { endsWith: `\\${filename}` } }] }, select: { id: true },
    });
    if (!photo || document) { res.status(403).json({ success: false, message: 'Authenticated download required.' }); return; }
    const bytes = await fileStorage.read(filename);
    const contentType = imageContentType(bytes);
    if (!contentType) { res.sendStatus(404); return; }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.type(contentType).send(bytes);
  } catch (error) { next(error); }
});
app.use(express.urlencoded({ extended: true }));

// Liveness check
app.get('/api/live', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Readiness check
app.get('/api/ready', async (_req, res) => {
  const correlationId = crypto.randomUUID();
  try {
    // Check that the database is reachable.
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'READY', correlationId, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'UNAVAILABLE', correlationId, timestamp: new Date().toISOString() });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees/documents', documentRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/travel', travelRoutes);
app.use('/api/office-expenses', expenseRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/login-history', loginHistoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leaves', leaveRoutes);

// Global error handler
app.use(errorHandler);

export default app;

