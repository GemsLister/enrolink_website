import { Router } from 'express';
import * as ctrl from '../controllers/students.controller.js';
import { auth, requireAnyRole } from '../middleware/auth.js';

const r = Router();

r.get('/', auth, requireAnyRole('DEPT_HEAD','OFFICER'), ctrl.list);
r.post('/', auth, requireAnyRole('DEPT_HEAD','OFFICER'), ctrl.upsert);
r.delete('/:id', auth, requireAnyRole('DEPT_HEAD','OFFICER'), ctrl.remove);

export default r;
