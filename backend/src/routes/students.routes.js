import { Router } from 'express';
import * as ctrl from '../controllers/students.controller.js';
import { auth } from '../middleware/auth.js';

const r = Router();

r.get('/', auth, ctrl.list);
r.post('/', auth, ctrl.upsert);

export default r;
