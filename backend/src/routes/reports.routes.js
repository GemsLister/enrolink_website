import { Router } from 'express';
import * as ctrl from '../controllers/reports.controller.js';
import { auth, requireAnyRole } from '../middleware/auth.js';

const r = Router();

r.get('/', auth, requireAnyRole('DEPT_HEAD','OFFICER'), ctrl.list);
r.get('/pdf', auth, requireAnyRole('DEPT_HEAD','OFFICER'), ctrl.pdf);
r.post('/records', auth, requireAnyRole('DEPT_HEAD','OFFICER'), ctrl.createRecord);
r.post('/import', auth, requireAnyRole('DEPT_HEAD','OFFICER'), ctrl.importFromSheets);
r.delete('/:id', auth, requireAnyRole('DEPT_HEAD','OFFICER'), ctrl.remove);
r.patch('/:id', auth, requireAnyRole('DEPT_HEAD','OFFICER'), ctrl.update);

export default r;
