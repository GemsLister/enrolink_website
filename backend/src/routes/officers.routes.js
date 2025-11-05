import { Router } from 'express';
import * as ctrl from '../controllers/officers.controller.js';
import { auth, requireRole } from '../middleware/auth.js';

const r = Router();

r.get('/', auth, requireRole('DEPT_HEAD'), ctrl.list);
r.patch('/:id', auth, requireRole('DEPT_HEAD'), ctrl.update);

export default r;
