import { Router } from 'express';
import * as ctrl from '../controllers/reports.controller.js';
import { auth, requireAnyRole, requireOfficerPermission } from '../middleware/auth.js';

const r = Router();

r.get('/', auth, requireAnyRole('DEPT_HEAD','OFFICER'), ctrl.list);
r.get('/pdf', auth, requireAnyRole('DEPT_HEAD','OFFICER'), requireOfficerPermission('generateReports'), ctrl.pdf);
r.get('/batch/report', auth, requireAnyRole('DEPT_HEAD','OFFICER'), ctrl.getBatchReport);
r.get('/batch/pdf', auth, requireAnyRole('DEPT_HEAD','OFFICER'), ctrl.getBatchReportPdf);
r.post('/records', auth, requireAnyRole('DEPT_HEAD','OFFICER'), requireOfficerPermission('generateReports'), ctrl.createRecord);
r.post('/import', auth, requireAnyRole('DEPT_HEAD','OFFICER'), requireOfficerPermission('generateReports'), ctrl.importFromSheets);
r.delete('/:id', auth, requireAnyRole('DEPT_HEAD','OFFICER'), requireOfficerPermission('generateReports'), ctrl.remove);
r.patch('/:id', auth, requireAnyRole('DEPT_HEAD','OFFICER'), requireOfficerPermission('generateReports'), ctrl.update);

export default r;
