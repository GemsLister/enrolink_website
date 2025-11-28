import { Router } from 'express';
import * as ctrl from '../controllers/batches.controller.js';
import { auth, requireAnyRole } from '../middleware/auth.js';
import { setSchedule, applyInterviewDate } from '../controllers/batches.controller.js';

const r = Router();

r.get('/', auth, requireAnyRole('DEPT_HEAD','OFFICER'), ctrl.list);
r.post('/', auth, requireAnyRole('DEPT_HEAD','OFFICER'), ctrl.create);
r.put('/:id', auth, requireAnyRole('DEPT_HEAD','OFFICER'), ctrl.update);
r.delete('/:id', auth, requireAnyRole('DEPT_HEAD','OFFICER'), ctrl.remove);
r.get('/:id/students', auth, requireAnyRole('DEPT_HEAD','OFFICER'), ctrl.students);
r.patch('/:id/schedule', auth, requireAnyRole('DEPT_HEAD','OFFICER'), setSchedule);
r.post('/:id/interviews/apply', auth, requireAnyRole('DEPT_HEAD','OFFICER'), applyInterviewDate);
r.get('/archived', auth, requireAnyRole('DEPT_HEAD','OFFICER'), ctrl.archived);
r.patch('/:id/archive', auth, requireAnyRole('DEPT_HEAD','OFFICER'), ctrl.remove);
r.patch('/:id/restore', auth, requireAnyRole('DEPT_HEAD','OFFICER'), ctrl.restore);

export default r;
