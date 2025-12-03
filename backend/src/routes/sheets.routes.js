import { Router } from 'express';
import * as ctrl from '../controllers/sheets.controller.js';
import { auth, requireRole } from '../middleware/auth.js';

const r = Router();

r.post('/import', auth, ctrl.importStudents);
r.post('/export-students', auth, requireRole('DEPT_HEAD'), ctrl.exportStudentsToSheet);
r.post('/export-students/default', auth, requireRole('DEPT_HEAD'), ctrl.exportStudentsDefault);

export default r;
