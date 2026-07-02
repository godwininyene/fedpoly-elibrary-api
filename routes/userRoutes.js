import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  updateAvatar,
  getAllUsers,
  toggleUserStatus,
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { uploadAvatar, handleUploadError } from '../middleware/uploadMiddleware.js';

const router = Router();

router.use(protect);

router.get('/me', getProfile);
router.put('/me', updateProfile);
router.put('/me/avatar', handleUploadError(uploadAvatar), updateAvatar);

// Admin-only
router.get('/', authorize('librarian_admin'), getAllUsers);
router.put('/:id/status', authorize('librarian_admin'), toggleUserStatus);

export default router;