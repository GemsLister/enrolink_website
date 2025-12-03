import { Router } from 'express';
import * as ctrl from '../controllers/officers.controller.js';
import { auth, requireRole } from '../middleware/auth.js';

const r = Router();

r.get('/', auth, requireRole('DEPT_HEAD'), ctrl.list);
r.get('/interviewers', auth, requireRole('DEPT_HEAD'), ctrl.interviewers);
r.patch('/:id', auth, requireRole('DEPT_HEAD'), ctrl.update);
r.get('/archived', auth, requireRole('DEPT_HEAD'), ctrl.archived);
r.patch('/:id/archive', auth, requireRole('DEPT_HEAD'), ctrl.remove);
r.patch('/:id/restore', auth, requireRole('DEPT_HEAD'), ctrl.restore);

export default r;
