import { Router } from 'express';
import * as ctrl from '../controllers/calendar.controller.js';
import { auth } from '../middleware/auth.js';

const r = Router();

r.get('/events', auth, ctrl.list);

export default r;
