import { Router } from 'express';
import authRoutes from './auth.routes.js';
import studentsRoutes from './students.routes.js';
import batchesRoutes from './batches.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import reportsRoutes from './reports.routes.js';
import officersRoutes from './officers.routes.js';
import sheetsRoutes from './sheets.routes.js';
import bigqueryRoutes from './bigquery.routes.js';
// Calendar routes are registered directly in app.js, not here

const router = Router();
router.use('/auth', authRoutes);
router.use('/students', studentsRoutes);
router.use('/batches', batchesRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportsRoutes);
router.use('/officers', officersRoutes);
router.use('/sheets', sheetsRoutes);
router.use('/bq', bigqueryRoutes);
// Calendar routes registered in app.js at /api/calendar

export default router;
