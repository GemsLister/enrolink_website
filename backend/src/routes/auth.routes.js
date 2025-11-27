import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { auth, requireRole } from '../middleware/auth.js';

const r = Router();

r.post('/login', authController.login);
r.get('/me', auth, requireRole('DEPT_HEAD'), authController.me);
r.put('/me', auth, requireRole('DEPT_HEAD'), authController.updateMe);
r.post('/change-password', auth, requireRole('DEPT_HEAD'), authController.changePassword);
r.get('/officer/me', auth, requireRole('OFFICER'), authController.officerMe);
r.put('/officer/me', auth, requireRole('OFFICER'), authController.officerUpdateMe);
r.post('/officer/change-password', auth, requireRole('OFFICER'), authController.officerChangePassword);
r.get('/export', auth, requireRole('DEPT_HEAD'), authController.exportData);
r.post('/invite', auth, requireRole('DEPT_HEAD'), authController.createInvite);
r.post('/signup-with-invite', authController.signupWithInvite);
r.post('/google', authController.googleAuth);
r.post('/request-password-reset', authController.requestPasswordReset);
r.post('/reset-password', authController.resetPassword);

export default r;
