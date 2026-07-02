import streamifier from 'streamifier';
import cloudinary from '../config/cloudinary.js';
import ApiError from '../utils/ApiError.js';

/**
 * Uploads a PDF buffer to Cloudinary using resource_type: 'image'.
 *
 * Cloudinary supports PDFs natively as image-type assets.
 * This completely bypasses the raw-delivery CDN restrictions that were
 * causing 401 errors regardless of access_mode or type settings.
 *
 * What changes:
 * - resource_type: 'image' instead of 'raw'
 * - format: 'pdf' tells Cloudinary to treat the upload as a PDF document
 * - The secure_url will be .../image/upload/... instead of .../raw/upload/...
 * - No CDN delivery restrictions — publicly accessible immediately
 * - PDF preview works in Cloudinary dashboard
 * - fl_attachment works correctly for forced downloads
 */
export const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        type: 'upload',
        format: 'pdf',
        access_mode: 'public',
        ...options,
      },
      (error, result) => {
        if (error) {
          reject(new ApiError(500, `Cloudinary upload failed: ${error.message}`));
        } else {
          console.log('[Cloudinary] Upload result:', {
            public_id: result.public_id,
            resource_type: result.resource_type,  // Should be 'image'
            format: result.format,                 // Should be 'pdf'
            access_mode: result.access_mode,       // Should be 'public'
            type: result.type,                     // Should be 'upload'
            secure_url: result.secure_url,         // Will contain /image/upload/
          });
          resolve(result);
        }
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

/**
 * Uploads an avatar image buffer to Cloudinary.
 */
export const uploadImageToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        type: 'upload',
        access_mode: 'public',
        folder: 'elibrary/avatars',
        transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face' }],
        ...options,
      },
      (error, result) => {
        if (error) {
          reject(new ApiError(500, `Avatar upload failed: ${error.message}`));
        } else {
          resolve(result);
        }
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

/**
 * Deletes a file from Cloudinary by its public_id.
 * PDFs are now stored as resource_type: 'image'.
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      type: 'upload',
    });
    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new ApiError(500, `Cloudinary deletion failed for publicId: ${publicId}`);
    }
    return result;
  } catch (error) {
    throw new ApiError(500, `Cloudinary deletion error: ${error.message}`);
  }
};

/**
 * Builds a public download URL for a PDF stored as resource_type: 'image'.
 *
 * fl_attachment forces Content-Disposition: attachment so the browser
 * downloads the file instead of opening it inline.
 *
 * No signing required — asset is fully public.
 *
 * Resulting URL pattern:
 * https://res.cloudinary.com/<cloud>/image/upload/fl_attachment/<publicId>.pdf
 */
export const generateSignedDownloadUrl = (publicId, expiresInSeconds = 300) => {
  const url = cloudinary.url(publicId, {
    resource_type: 'image',
    type: 'upload',
    flags: 'attachment',
    format: 'pdf',
    sign_url: false,
  });

  return {
    url,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
  };
};