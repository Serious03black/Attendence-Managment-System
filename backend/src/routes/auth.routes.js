import { Router } from 'express';
import { body } from 'express-validator';
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getCurrentUser,
  changePassword,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

const registerValidators = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('A valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['admin', 'faculty', 'student']).withMessage('Role must be admin, faculty, or student'),
];

const loginValidators = [
  body('email').isEmail().withMessage('A valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Only admins provision accounts — see auth.controller.js registerUser comment.
router.post('/register', authenticate, authorize('admin'), registerValidators, validate, registerUser);

router.post('/login', loginValidators, validate, loginUser);
router.post('/refresh-token', refreshAccessToken);
router.post('/logout', authenticate, logoutUser);
router.get('/me', authenticate, getCurrentUser);

router.post(
  '/change-password',
  authenticate,
  [body('currentPassword').notEmpty(), body('newPassword').isLength({ min: 8 })],
  validate,
  changePassword
);

router.post('/forgot-password', [body('email').isEmail()], validate, forgotPassword);
router.post(
  '/reset-password',
  [body('token').notEmpty(), body('newPassword').isLength({ min: 8 })],
  validate,
  resetPassword
);

export default router;
