import { Router } from 'express';
import { body } from 'express-validator';
import { createStudentReport, getStudentReports } from '../controllers/studentReport.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

router.use(authenticate);

// Faculty creates student review report card
router.post(
  '/',
  authorize('faculty', 'admin'),
  [
    body('student').isMongoId().withMessage('Valid student ID is required'),
    body('batch').isMongoId().withMessage('Valid batch ID is required'),
    body('reportPeriod').trim().notEmpty().withMessage('Report period is required'),
    body('communicationSkills').isInt({ min: 1, max: 10 }),
    body('programmingAbility').isInt({ min: 1, max: 10 }),
    body('attendanceDiscipline').isInt({ min: 1, max: 10 }),
    body('assignmentCompletion').isInt({ min: 1, max: 10 }),
    body('codingSkills').isInt({ min: 1, max: 10 }),
    body('confidence').isInt({ min: 1, max: 10 }),
    body('behavior').isInt({ min: 1, max: 10 }),
    body('technicalUnderstanding').isInt({ min: 1, max: 10 }),
    body('overallPerformance').isInt({ min: 1, max: 10 }),
    body('summary').trim().notEmpty().withMessage('Summary remark is required'),
  ],
  validate,
  createStudentReport
);

// Get student reports history
router.get('/student/:studentId', getStudentReports);

export default router;
