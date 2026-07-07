import { Router } from 'express';
import {
  getResources,
  getResourceById,
  getDownloadUrlHandler,
  createResource,
  updateResource,
  deleteResource,
} from '../controllers/resourceController';
import { protect, authorize } from '../middleware/authMiddleware';
import { uploadPDF, handleUploadError } from '../middleware/uploadMiddleware';

const router = Router();

// All resource routes require authentication
router.use(protect);

router.get('/', getResources);
router.get('/:id', getResourceById);
router.get('/:id/download', getDownloadUrlHandler);

// Admin-only routes
router.post(
  '/',
  authorize('librarian_admin'),
  handleUploadError(uploadPDF),
  createResource
);
router.put('/:id', authorize('librarian_admin'), updateResource);
router.delete('/:id', authorize('librarian_admin'), deleteResource);

export default router;