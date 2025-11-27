import { Router } from 'express';
import * as ctrl from '../controllers/dashboard.controller.js';
import { auth } from '../middleware/auth.js';

const r = Router();

r.get('/stats', auth, ctrl.stats);
r.get('/activity', auth, ctrl.activity);

export default r;
