import { Readable } from 'stream';
import { UploadApiResponse } from 'cloudinary';
import { getCloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';

export interface UploadedImageResult {
  url: string;
  publicId: string;
}

/**
 * Uploads a single file buffer to Cloudinary using stream.
 */
export async function uploadImageToCloudinary(
  buffer: Buffer,
  folder: string,
  options: {
    resourceType?: 'image';
    tags?: string[];
    prefix?: string;
  } = {}
): Promise<UploadedImageResult> {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      'Cloudinary image service is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the server environment.'
    );
  }

  const cld = getCloudinary();
  if (!cld) {
    throw new Error('Cloudinary failed to initialize with provided credentials.');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cld.uploader.upload_stream(
      {
        folder,
        resource_type: options.resourceType || 'image',
        tags: options.tags || ['campusfix'],
        transformation: [
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          return reject(
            new Error(`Cloudinary upload failed: ${error?.message || 'Unknown upload error'}`)
          );
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    stream.pipe(uploadStream);
  });
}

/**
 * Uploads multiple image buffers in parallel with error tracking.
 */
export async function uploadMultipleImages(
  files: Express.Multer.File[],
  folder: string,
  tags: string[] = ['campusfix']
): Promise<UploadedImageResult[]> {
  if (!files || files.length === 0) {
    return [];
  }

  const uploadPromises = files.map((file) =>
    uploadImageToCloudinary(file.buffer, folder, { tags })
  );

  try {
    return await Promise.all(uploadPromises);
  } catch (error) {
    // If any upload fails, we rethrow so controller can rollback any uploaded images
    throw error;
  }
}

/**
 * Deletes a single image from Cloudinary by its public ID.
 */
export async function deleteImageFromCloudinary(publicId: string): Promise<boolean> {
  if (!publicId || !isCloudinaryConfigured()) {
    return false;
  }

  const cld = getCloudinary();
  if (!cld) {
    return false;
  }

  try {
    const result = await cld.uploader.destroy(publicId, {
      invalidate: true,
    });
    return result.result === 'ok' || result.result === 'not found';
  } catch (error) {
    console.error(`[CloudinaryService] Failed to delete image ${publicId}:`, error);
    return false;
  }
}

/**
 * Deletes multiple images from Cloudinary by their public IDs.
 */
export async function deleteMultipleImagesFromCloudinary(publicIds: string[]): Promise<void> {
  if (!publicIds || publicIds.length === 0 || !isCloudinaryConfigured()) {
    return;
  }

  const validIds = publicIds.filter((id) => typeof id === 'string' && id.trim().length > 0);
  if (validIds.length === 0) {
    return;
  }

  const deletePromises = validIds.map((id) => deleteImageFromCloudinary(id));
  await Promise.allSettled(deletePromises);
}
