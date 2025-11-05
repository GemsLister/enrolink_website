import { Router } from 'express';
import authRoutes from './auth.routes.js';
import studentsRoutes from './students.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import reportsRoutes from './reports.routes.js';
import officersRoutes from './officers.routes.js';
import sheetsRoutes from './sheets.routes.js';
import calendarRoutes from './calendar.routes.js';

const router = Router();
router.use('/auth', authRoutes);
router.use('/students', studentsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportsRoutes);
router.use('/officers', officersRoutes);
router.use('/sheets', sheetsRoutes);
router.use('/calendar', calendarRoutes);

export default router;
