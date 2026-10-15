import { Router } from 'express';
import {
  getUsers,
  getUserById,
  updateUser,
  uploadAvatar,
  deactivateUser,
  reactivateUser,
  getStudentProfile,
} from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin'), getUsers);
router.get('/:id', getUserById); // self-access checked in controller
router.patch('/:id', updateUser); // self-access checked in controller
router.post('/:id/avatar', upload.single('avatar'), uploadAvatar);
router.patch('/:id/deactivate', authorize('admin'), deactivateUser);
router.patch('/:id/reactivate', authorize('admin'), reactivateUser);

// Composite profile view — accessible to admin, the student themself, and
// faculty who teach them (ownership verified inside the controller).
router.get('/:id/profile', getStudentProfile);

export default router;
