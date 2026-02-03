import { Router } from 'express';
import * as ctrl from '../controllers/officers.controller.js';
import { auth, requireRole } from '../middleware/auth.js';

const r = Router();

// Register specific routes BEFORE parameterized routes to ensure correct matching
r.get('/', auth, requireRole('DEPT_HEAD'), ctrl.list);
r.get('/interviewers', auth, requireRole('DEPT_HEAD'), ctrl.interviewers);
r.get('/archived', auth, requireRole('DEPT_HEAD'), ctrl.archived);

// Use a different route pattern that can't be confused with :id
r.patch('/bulk/permissions', auth, requireRole('DEPT_HEAD'), ctrl.updatePermissionsAll);

// Parameterized routes come AFTER specific routes
r.patch('/:id', auth, requireRole('DEPT_HEAD'), ctrl.update);
r.patch('/:id/archive', auth, requireRole('DEPT_HEAD'), ctrl.remove);
r.patch('/:id/restore', auth, requireRole('DEPT_HEAD'), ctrl.restore);

export default r;
