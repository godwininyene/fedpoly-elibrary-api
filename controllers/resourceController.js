import Resource from '../models/Resource.js';
import AuditLog from '../models/AuditLog.js';
import Interaction from '../models/Interaction.js';
import { trackInteraction } from '../utils/trackInteraction.js';
import { uploadFile, deleteFile, getDownloadUrl } from '../services/storageService.js';
import ApiError from '../utils/ApiError.js';

export const getResources = async (req, res, next) => {
  try {
    const {
      search = '', category, department,
      level, page = 1, limit = 20,
    } = req.query;

    const filter = { isPublished: true };
    if (search.trim()) filter.$text = { $search: search.trim() };
    if (category) filter.category = category;
    if (department) filter.department = new RegExp(department, 'i');
    if (level && level !== 'ALL') filter.level = { $in: [level, 'ALL'] };

    const skip = (Number(page) - 1) * Number(limit);
    const [resources, total] = await Promise.all([
      Resource.find(filter)
        .select('-publicId')
        .populate('uploadedBy', 'fullName')
        .sort(search.trim() ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Resource.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: { resources, total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

export const getResourceById = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .select('-publicId')
      .populate('uploadedBy', 'fullName email');

    if (!resource || !resource.isPublished) {
      throw new ApiError(404, 'Resource not found.');
    }

    trackInteraction({
      userId: req.user._id,
      resourceId: resource._id,
      action: 'view',
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, data: { resource } });
  } catch (error) {
    next(error);
  }
};

export const getDownloadUrlHandler = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .select('publicId cloudUrl title isPublished');

    if (!resource || !resource.isPublished) {
      throw new ApiError(404, 'Resource not found.');
    }
    if (!resource.publicId) {
      throw new ApiError(500, 'This resource is missing its file reference.');
    }

    // getDownloadUrl works for both Cloudinary (prod) and local files (dev)
    const { url, expiresAt } = getDownloadUrl(resource.publicId, resource.cloudUrl);

    trackInteraction({
      userId: req.user._id,
      resourceId: resource._id,
      action: 'download',
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: { downloadUrl: url, expiresAt, title: resource.title },
    });
  } catch (error) {
    next(error);
  }
};

export const createResource = async (req, res, next) => {
  try {
    if (!req.file) throw new ApiError(400, 'PDF file is required.');

    const {
      title, author, description, category,
      department, level, year, course, tags,
      pages, isbn, edition, publisher,
    } = req.body;

    const slug = `${Date.now()}_${title
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 60)}`;

    // Single call — Cloudinary in prod, local disk in dev
    const { cloudUrl, publicId } = await uploadFile(req.file.buffer, slug, 'resources');

    const tagsArray = tags
      ? (Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim().toLowerCase()))
      : [];

    const resource = await Resource.create({
      title, author, description, category, department,
      level: level || 'ALL',
      year: year ? Number(year) : undefined,
      course, tags: tagsArray,
      cloudUrl,
      publicId,
      format: 'pdf',
      fileSize: req.file.size,
      metadata: { pages, isbn, edition, publisher },
      uploadedBy: req.user._id,
    });

    AuditLog.create({
      user: req.user._id, action: 'upload',
      resource: resource._id, ipAddress: req.ip,
    }).catch(() => {});

    res.status(201).json({ success: true, data: { resource } });
  } catch (error) {
    next(error);
  }
};

export const updateResource = async (req, res, next) => {
  try {
    const allowedUpdates = [
      'title', 'author', 'description', 'category',
      'department', 'level', 'year', 'course', 'tags',
      'isPublished', 'metadata',
    ];
    const updates = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const resource = await Resource.findByIdAndUpdate(
      req.params.id, { $set: updates }, { new: true, runValidators: true }
    ).select('-publicId');

    if (!resource) throw new ApiError(404, 'Resource not found.');
    res.status(200).json({ success: true, data: { resource } });
  } catch (error) {
    next(error);
  }
};

export const deleteResource = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) throw new ApiError(404, 'Resource not found.');

    // deleteFile works for both Cloudinary (prod) and local disk (dev)
    await deleteFile(resource.publicId);
    await resource.deleteOne();

    Interaction.deleteMany({ resource: resource._id }).catch(() => {});
    AuditLog.create({
      user: req.user._id, action: 'delete', ipAddress: req.ip,
    }).catch(() => {});

    res.status(200).json({ success: true, message: 'Resource deleted successfully.' });
  } catch (error) {
    next(error);
  }
};