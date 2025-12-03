import { Router } from 'express';
import * as ctrl from '../controllers/events.controller.js';
import { auth } from '../middleware/auth.js';

const router = Router();

// Protected routes (require authentication)
router.get('/', auth, ctrl.getEvents);
router.post('/', auth, ctrl.createEvent);
router.put('/:id', auth, ctrl.updateEvent);
router.delete('/:id', auth, ctrl.deleteEvent);

export default router;