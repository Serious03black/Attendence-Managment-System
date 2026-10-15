import { Router } from 'express';
import { body } from 'express-validator';
import {
  createBatch,
  checkBatchConflicts,
  getBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
  enrollStudent,
  transferStudent,
} from '../controllers/batch.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

router.use(authenticate);

const batchValidators = [
  body('name').trim().notEmpty(),
  body('batchCode').trim().notEmpty(),
  body('course').isMongoId(),
  body('assignedFaculty').isMongoId(),
  body('mode').isIn(['classroom', 'online', 'hybrid']),
  body('recurrencePattern').isIn(['daily', 'alternate', 'weekend', 'saturday-fullday', 'custom']),
  body('weekdays').isArray({ min: 1 }),
  body('startTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
  body('endTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
  body('batchStartDate').isISO8601(),
  body('batchEndDate').isISO8601(),
  body('maxCapacity').isInt({ min: 1 }),
];

router.get('/', getBatches); // faculty auto-scoped to their own in the controller
router.get('/:id', getBatchById);

router.post('/', authorize('admin', 'faculty'), batchValidators, validate, createBatch);
router.post('/check-conflicts', authorize('admin', 'faculty'), checkBatchConflicts); // live validation while filling the form
router.patch('/:id', authorize('admin', 'faculty'), updateBatch);
router.delete('/:id', authorize('admin'), deleteBatch);

router.post('/:id/enroll', authorize('admin', 'faculty'), [body('studentId').isMongoId()], validate, enrollStudent);
router.post(
  '/transfer-student',
  authorize('admin', 'faculty'),
  [body('studentId').isMongoId(), body('fromBatchId').isMongoId(), body('toBatchId').isMongoId()],
  validate,
  transferStudent
);

export default router;
