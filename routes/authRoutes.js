import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.post(
  '/register',
  [
    body('fullName').trim().notEmpty().withMessage('Full name is required.'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters.'),
    body('email').optional().isEmail().withMessage('Invalid email address.'),
    body('matricNumber').optional().trim().notEmpty(),
  ],
  register
);

router.post(
  '/login',
  [
    body('identifier').trim().notEmpty().withMessage('Matric number or email is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  login
);

router.get('/me', protect, getMe);

export default router;