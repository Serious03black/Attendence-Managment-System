import { Router } from 'express';
import { body } from 'express-validator';
import {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  updateSyllabus,
  markTopicComplete,
  deleteCourse,
} from '../controllers/course.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getCourses); // all roles can browse the catalog
router.get('/:id', getCourseById);

router.post(
  '/',
  authorize('admin'),
  [
    body('name').trim().notEmpty(),
    body('code').trim().notEmpty(),
    body('durationWeeks').isInt({ min: 1 }),
  ],
  validate,
  createCourse
);
router.patch('/:id', authorize('admin'), updateCourse);
router.put('/:id/syllabus', authorize('admin', 'faculty'), updateSyllabus);
router.patch('/:id/syllabus/complete-topic', authorize('faculty', 'admin'), markTopicComplete);
router.delete('/:id', authorize('admin'), deleteCourse);

export default router;
