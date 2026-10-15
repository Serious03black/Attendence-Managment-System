import { Router } from 'express';
import { body } from 'express-validator';
import {
  createAnnouncement,
  getAnnouncements,
  deleteAnnouncement,
} from '../controllers/announcement.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

router.use(authenticate);

// Admin/Faculty publishes announcement
router.post(
  '/',
  authorize('admin', 'faculty'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('body').trim().notEmpty().withMessage('Body content is required'),
    body('audience').isIn(['all', 'faculty', 'students', 'batch']).withMessage('Invalid audience target'),
    body('targetBatch').optional().isMongoId().withMessage('targetBatch must be a valid Mongo ID'),
    body('isPinned').optional().isBoolean(),
    body('expiresAt').optional().isISO8601(),
  ],
  validate,
  createAnnouncement
);

// View announcements relative to user role
router.get('/', getAnnouncements);

// Delete announcement (only creator or admin)
router.delete('/:id', deleteAnnouncement);

export default router;
