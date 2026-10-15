import { Router } from 'express';
import { body } from 'express-validator';
import {
  createTask,
  getMyTasks,
  getBatchTasks,
  submitTask,
  gradeSubmission,
  getTaskSubmissions,
} from '../controllers/task.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

router.use(authenticate);

// Faculty assigns task (supports attachments)
router.post(
  '/',
  authorize('faculty', 'admin'),
  upload.array('attachments', 10),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('type').isIn(['assignment', 'homework', 'quiz', 'practice', 'project', 'presentation', 'research', 'reading']),
    body('batch').isMongoId().withMessage('Valid batch ID is required'),
    body('scope').isIn(['batch', 'individual']).withMessage('scope must be batch or individual'),
    body('deadline').isISO8601().withMessage('Valid deadline date is required'),
    body('maxMarks').isInt({ min: 0 }).withMessage('maxMarks must be a non-negative integer'),
  ],
  validate,
  createTask
);

// Student views their own tasks
router.get('/my', authorize('student'), getMyTasks);

// Faculty views tasks of a batch
router.get('/batch/:batchId', getBatchTasks);

// Student submits task solution (supports attachments)
router.post(
  '/:taskId/submit',
  authorize('student'),
  upload.array('attachments', 10),
  submitTask
);

// Faculty grades student submission
router.patch(
  '/submissions/:submissionId/grade',
  authorize('faculty', 'admin'),
  [
    body('marksObtained').isFloat({ min: 0 }).withMessage('marksObtained must be a non-negative number'),
    body('feedback').optional().trim(),
    body('status').isIn(['graded', 'returned-for-revision']).withMessage('status must be graded or returned-for-revision'),
  ],
  validate,
  gradeSubmission
);

// Faculty views submissions for a task
router.get('/:taskId/submissions', getTaskSubmissions);

export default router;
