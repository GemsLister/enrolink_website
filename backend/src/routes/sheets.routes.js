import { Router } from 'express';
import * as ctrl from '../controllers/sheets.controller.js';
import { auth } from '../middleware/auth.js';

const r = Router();

r.post('/import', auth, ctrl.importStudents);

export default r;
