import User from '../models/User.js';
import { uploadImageToCloudinary, deleteFromCloudinary } from '../services/cloudinaryService.js';
import { uploadAvatar, deleteFile } from '../services/storageService.js';
import ApiError from '../utils/ApiError.js';

/**
 * GET /api/users/me
 */
export const getProfile = async (req, res) => {
  res.status(200).json({ success: true, data: { user: req.user } });
};

/**
 * PUT /api/users/me
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { fullName, department, level } = req.body;
    const updates = {};
    if (fullName) updates.fullName = fullName;
    if (department !== undefined) updates.department = department;
    if (level !== undefined) updates.level = level;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/me/avatar
 */
// Replace the updateAvatar function only:

export const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) throw new ApiError(400, 'Image file is required.');

    // Delete old avatar if it exists
    if (req.user.avatar?.publicId) {
      await deleteFile(req.user.avatar.publicId).catch(() => {});
    }

    const { cloudUrl, publicId } = await uploadAvatar(
      req.file.buffer,
      req.user._id.toString()
    );

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { avatar: { cloudUrl, publicId } } },
      { new: true }
    ).select('-passwordHash');

    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users  (Admin only)
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, department } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (department) filter.department = new RegExp(department, 'i');

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: { users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/:id/status  (Admin only)
 */
export const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: req.body.isActive } },
      { new: true }
    ).select('-passwordHash');

    if (!user) throw new ApiError(404, 'User not found.');
    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};