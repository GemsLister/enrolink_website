import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { auth, requireRole } from '../middleware/auth.js';

const r = Router();

r.post('/login', authController.login);
r.post('/invite', auth, requireRole('DEPT_HEAD'), authController.createInvite);
r.post('/signup-with-invite', authController.signupWithInvite);
r.post('/google', authController.googleAuth);
r.post('/request-password-reset', authController.requestPasswordReset);
r.post('/reset-password', authController.resetPassword);

export default r;
