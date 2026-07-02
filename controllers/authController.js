import { validationResult } from 'express-validator';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { createTokenResponse } from '../services/tokenService.js';
import ApiError from '../utils/ApiError.js';

/**
 * POST /api/auth/register
 * Registers a new student. Admins are created manually via DB seed.
 */
export const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(422, 'Validation failed.', errors.array());
    }

    const { fullName, email, matricNumber, password, department, level } = req.body;

    // Validate: student must have either matric number or email
    if (!matricNumber && !email) {
      throw new ApiError(400, 'Either matriculation number or email is required.');
    }

    // Check for existing user
    const existingUser = await User.findOne({
      $or: [
        ...(email ? [{ email: email.toLowerCase() }] : []),
        ...(matricNumber ? [{ matricNumber: matricNumber.toUpperCase() }] : []),
      ],
    });

    if (existingUser) {
      throw new ApiError(409, 'An account with this matric number or email already exists.');
    }

    const user = await User.create({
      fullName,
      email: email?.toLowerCase(),
      matricNumber: matricNumber?.toUpperCase(),
      passwordHash: password, // Pre-save hook hashes this
      department,
      level,
      role: 'student',
    });

    const response = createTokenResponse(user);
    res.status(201).json({ success: true, ...response });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Supports login via matriculation number or email.
 */
export const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(422, 'Validation failed.', errors.array());
    }

    const { identifier, password } = req.body;

    // Find user by matric number or email
    const user = await User.findOne({
      $or: [
        { matricNumber: identifier.toUpperCase() },
        { email: identifier.toLowerCase() },
      ],
    });

    if (!user || !(await user.comparePassword(password))) {
      throw new ApiError(401, 'Invalid credentials. Please check your matric number and password.');
    }

    if (!user.isActive) {
      throw new ApiError(403, 'Your account has been deactivated. Contact the library admin.');
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Log the login event
    await AuditLog.create({
      user: user._id,
      action: 'login',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    const response = createTokenResponse(user);
    res.status(200).json({ success: true, ...response });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, user: req.user });
  } catch (error) {
    next(error);
  }
};