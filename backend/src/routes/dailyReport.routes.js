import { Router } from 'express';
import { body } from 'express-validator';
import {
  createDailyReport,
  updateDailyReport,
  getBatchTimeline,
  getStudentReportFeed,
} from '../controllers/dailyReport.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorize('faculty', 'admin'),
  upload.array('attachments', 10),
  [body('lectureId').isMongoId(), body('topicCovered').trim().notEmpty(), body('teachingHours').isFloat({ min: 0, max: 24 })],
  validate,
  createDailyReport
);
router.patch('/:id', authorize('faculty', 'admin'), upload.array('attachments', 10), updateDailyReport);

router.get('/batch/:batchId/timeline', getBatchTimeline);
router.get('/my-feed', authorize('student'), getStudentReportFeed);

export default router;
