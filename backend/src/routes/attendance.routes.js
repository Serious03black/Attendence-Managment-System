import { Router } from 'express';
import { body } from 'express-validator';
import {
  submitAttendance,
  getPendingApprovals,
  reviewAttendance,
  getMonthlySummary,
  getCalendar,
  updateLectureStatus,
} from '../controllers/attendance.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

router.use(authenticate);

// Student self-marking
router.post(
  '/',
  authorize('student'),
  [
    body('lectureId').isMongoId().withMessage('Valid lectureId is required'),
    body('status').isIn(['present', 'absent', 'leave', 'late']).withMessage('status must be one of present/absent/leave/late'),
  ],
  validate,
  submitAttendance
);

// Faculty view of pending requests
router.get('/pending', authorize('faculty', 'admin'), getPendingApprovals);

// Faculty review approval/rejection
router.patch(
  '/:id/review',
  authorize('faculty', 'admin'),
  [
    body('action').isIn(['approve', 'reject']).withMessage('action must be approve or reject'),
    body('finalStatus').optional().isIn(['present', 'absent', 'leave', 'late']),
    body('remark').optional().trim(),
  ],
  validate,
  reviewAttendance
);

// Monthly summary stats
router.get('/monthly-summary', getMonthlySummary);

// Calendar display
router.get('/calendar', getCalendar);

// Cancel lecture or declare holiday
router.patch(
  '/lectures/:lectureId/status',
  authorize('faculty', 'admin'),
  [
    body('status').isIn(['completed', 'cancelled', 'holiday']).withMessage('status must be completed, cancelled, or holiday'),
    body('cancellationReason').optional().trim(),
  ],
  validate,
  updateLectureStatus
);

export default router;
