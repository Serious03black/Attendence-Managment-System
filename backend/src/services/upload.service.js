import streamifier from 'streamifier';
import cloudinary from '../config/cloudinary.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Streams an in-memory Multer buffer straight to Cloudinary — no temp file
 * ever touches local disk. `resource_type: 'auto'` lets Cloudinary detect
 * images vs raw documents (PDF/docx/zip) correctly.
 */
export function uploadBufferToCloudinary(buffer, { folder, originalName }) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto', filename_override: originalName, use_filename: true },
      (error, result) => {
        if (error) return reject(ApiError.internal(`Cloudinary upload failed: ${error.message}`));
        resolve({ url: result.secure_url, publicId: result.public_id, fileType: result.resource_type });
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

export async function uploadManyToCloudinary(files, folder) {
  return Promise.all(
    files.map((file) =>
      uploadBufferToCloudinary(file.buffer, { folder, originalName: file.originalname }).then((res) => ({
        ...res,
        fileName: file.originalname,
      }))
    )
  );
}

export async function deleteFromCloudinary(publicId, resourceType = 'auto') {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
