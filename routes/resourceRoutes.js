import { Router } from 'express';
import {
  getResources,
  getResourceById,
  getDownloadUrl,
  createResource,
  updateResource,
  deleteResource,
} from '../controllers/resourceController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { uploadPDF, handleUploadError } from '../middleware/uploadMiddleware.js';

const router = Router();

// All resource routes require authentication
router.use(protect);

router.get('/', getResources);
router.get('/:id', getResourceById);
router.get('/:id/download', getDownloadUrl);

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