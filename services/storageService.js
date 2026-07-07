import path from 'path';
import fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { uploadToCloudinary, deleteFromCloudinary } from './cloudinaryService.js';
import ApiError from '../utils/ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Local uploads directory — only used in development
const LOCAL_UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Ensure the uploads folder exists when running locally
if (process.env.NODE_ENV !== 'production') {
  if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
    fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
  }
}

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Unified file upload handler.
 *
 * In production  → streams buffer to Cloudinary, returns secure_url + public_id
 * In development → saves buffer to /server/uploads/, returns local URL + filename
 *
 * Both paths return the same shape:
 * { cloudUrl: string, publicId: string }
 *
 * Controllers use this shape exclusively — they never reference Cloudinary directly.
 *
 * @param {Buffer} buffer      - File buffer from multer memoryStorage
 * @param {string} slug        - Clean filename slug (no extension)
 * @param {string} folder      - Subfolder name e.g. 'resources' or 'avatars'
 * @returns {{ cloudUrl, publicId }}
 */
export const uploadFile = async (buffer, slug, folder = 'resources') => {
  if (isProduction) {
    // ── Cloudinary path ───────────────────────────────────────────────
    const cloudResult = await uploadToCloudinary(buffer, {
      folder: `elibrary/${folder}`,
      public_id: slug,
    });
    return {
      cloudUrl: cloudResult.secure_url,
      publicId: cloudResult.public_id,
    };
  } else {
    // ── Local disk path ───────────────────────────────────────────────
    const filename = `${slug}.pdf`;
    const subDir = path.join(LOCAL_UPLOADS_DIR, folder);

    // Ensure subfolder exists
    if (!fs.existsSync(subDir)) {
      fs.mkdirSync(subDir, { recursive: true });
    }

    const filepath = path.join(subDir, filename);
    await fs.promises.writeFile(filepath, buffer);

    // publicId is the relative path — used for deletion later
    const publicId = `${folder}/${filename}`;

    // cloudUrl is the local static URL served by Express
    const cloudUrl = `/uploads/${publicId}`;

    return { cloudUrl, publicId };
  }
};

/**
 * Unified file deletion handler.
 *
 * In production  → deletes from Cloudinary by publicId
 * In development → deletes from local disk by publicId (relative path)
 *
 * @param {string} publicId
 */
export const deleteFile = async (publicId) => {
  if (isProduction) {
    await deleteFromCloudinary(publicId, 'image');
  } else {
    const filepath = path.join(LOCAL_UPLOADS_DIR, publicId);
    try {
      await fs.promises.unlink(filepath);
    } catch (err) {
      // File not found on disk is non-fatal — log and continue
      if (err.code !== 'ENOENT') {
        console.error('[deleteFile] Failed to delete local file:', err.message);
      }
    }
  }
};

/**
 * Uploads an avatar image.
 * In production  → Cloudinary image upload with face-crop transformation
 * In development → saves to /uploads/avatars/ as-is
 *
 * @param {Buffer} buffer
 * @param {string} userId   - Used to name the file uniquely
 * @returns {{ cloudUrl, publicId }}
 */
export const uploadAvatar = async (buffer, userId) => {
  if (isProduction) {
    const { uploadImageToCloudinary } = await import('./cloudinaryService.js');
    const result = await uploadImageToCloudinary(buffer, {
      folder: 'elibrary/avatars',
      public_id: `avatar_${userId}`,
    });
    return { cloudUrl: result.secure_url, publicId: result.public_id };
  } else {
    const filename = `avatar_${userId}.jpg`;
    const subDir = path.join(LOCAL_UPLOADS_DIR, 'avatars');

    if (!fs.existsSync(subDir)) {
      fs.mkdirSync(subDir, { recursive: true });
    }

    await fs.promises.writeFile(path.join(subDir, filename), buffer);
    return {
      cloudUrl: `/uploads/avatars/${filename}`,
      publicId: `avatars/${filename}`,
    };
  }
};

/**
 * Generates a download URL for a stored file.
 *
 * In production  → Cloudinary URL with fl_attachment flag
 * In development → local static URL with ?download=1 query param
 *                  (Express will handle Content-Disposition via the route)
 *
 * @param {string} publicId
 * @param {string} cloudUrl   - The stored cloudUrl (used as fallback in dev)
 * @returns {{ url, expiresAt }}
 */
export const getDownloadUrl = (publicId, cloudUrl) => {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  if (isProduction) {
    const { generateSignedDownloadUrl } = require('./cloudinaryService.js');
    const result = generateSignedDownloadUrl(publicId);
    return result;
  } else {
    // In dev, append ?download=1 — Express static middleware handles it
    return {
      url: `${cloudUrl}?download=1`,
      expiresAt,
    };
  }
};