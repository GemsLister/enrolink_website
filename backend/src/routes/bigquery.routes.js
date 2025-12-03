import { Router } from 'express';
import { migrateStudents } from '../controllers/bigquery.controller.js';
import { auth, requireRole } from '../middleware/auth.js';

const r = Router();

r.post('/migrate-students', auth, requireRole('DEPT_HEAD'), migrateStudents);

export default r
