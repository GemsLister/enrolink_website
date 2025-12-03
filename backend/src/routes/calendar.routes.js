// In backend/src/routes/calendar.routes.js
import { Router } from 'express';
import * as ctrl from '../controllers/calendar.controller.js';
import { auth, requireOfficerPermission } from '../middleware/auth.js';

const router = Router();

// Debug middleware - log all requests
router.use((req, res, next) => {
  console.log('Calendar route request:', {
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    baseUrl: req.baseUrl,
    fullUrl: req.originalUrl
  });
  next();
});

// Test route to verify routing works (no auth required for testing)
router.get('/test', (req, res) => {
  res.json({ message: 'Calendar routes are working!', path: req.path, baseUrl: req.baseUrl, originalUrl: req.originalUrl });
});

// These routes will be prefixed with /api/calendar
router.get('/events', auth, ctrl.list);
router.post('/events', auth, requireOfficerPermission('manageSchedule'), ctrl.create);
router.patch('/events/:id', auth, requireOfficerPermission('manageSchedule'), ctrl.update);
router.delete('/events/:id', auth, requireOfficerPermission('manageSchedule'), ctrl.remove);
router.post('/sync', auth, ctrl.syncCalendar); // Sync FROM Google Calendar to database
router.post('/push', auth, ctrl.pushToGoogleCalendar); // Push database events TO Google Calendar
router.delete('/prune', auth, ctrl.pruneGoogleToDatabase); // Delete Google events not in DB for user
router.get('/calendars', auth, ctrl.listAvailableCalendars); // List all available calendars
router.get('/test', auth, ctrl.testAccess); // Test calendar access

export default router;
