import { Router } from 'express';
import * as ctrl from '../controllers/reports.controller.js';
import { auth } from '../middleware/auth.js';

const r = Router();

r.get('/', auth, ctrl.list);
r.get('/pdf', auth, ctrl.pdf);

export default r;
