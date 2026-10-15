import { Router } from 'express';
import {
  getAdminDashboard,
  getAttendanceTrend,
  getFacultyDashboard,
  getStudentDashboard,
  getBatchProgress,
  getFacultyPerformance,
  getCourseCatalogStats,
} from '../controllers/analytics.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

// Admin-specific dashboards
router.get('/admin-dashboard', authorize('admin'), getAdminDashboard);
router.get('/attendance-trend', authorize('admin'), getAttendanceTrend);
router.get('/faculty-performance/:facultyId', authorize('admin'), getFacultyPerformance);

// Faculty-specific dashboards
router.get('/faculty-dashboard', authorize('faculty', 'admin'), getFacultyDashboard);

// Student-specific dashboards
router.get('/student-dashboard', authorize('student'), getStudentDashboard);

// Shared analytics
router.get('/batch-progress/:batchId', getBatchProgress);
router.get('/course-catalog-stats', getCourseCatalogStats);

export default router;
